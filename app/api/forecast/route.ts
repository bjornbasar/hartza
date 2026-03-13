import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { Frequency, TransactionType } from '@prisma/client'
import {
  eachDayOfInterval,
  format,
  parseISO,
  isSameDay,
  differenceInDays,
  isBefore,
  isAfter,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { normalizeDate } from '@/lib/dates'

type DayKey = string

type IncomeEvent  = { name: string; amount: number }
type BudgetEvent  = { id: string; name: string; category: string | null; amount: number }
type ActualEvent  = {
  type: TransactionType
  description: string | null
  label: string      // budget item name or income source name or 'One-off income'
  amount: number
}

/** Return the start/end of the current billing period for a recurring item */
function currentPeriodBounds(
  frequency: Frequency,
  startDate: Date,
  now: Date,
): { periodStart: Date; periodEnd: Date } | null {
  if (frequency === 'ONE_OFF') return null
  if (isBefore(now, startDate)) return null // hasn't started yet

  switch (frequency) {
    case 'WEEKLY': {
      const startDow = startDate.getUTCDay()
      const nowDow = now.getUTCDay()
      const daysSinceLast = ((nowDow - startDow) % 7 + 7) % 7
      const periodStart = subDays(now, daysSinceLast)
      const periodEnd = addDays(periodStart, 6)
      return { periodStart, periodEnd }
    }
    case 'FORTNIGHTLY': {
      const diff = differenceInDays(now, startDate)
      const periodsElapsed = Math.floor(diff / 14)
      const periodStart = addDays(startDate, periodsElapsed * 14)
      const periodEnd = addDays(periodStart, 13)
      return { periodStart, periodEnd }
    }
    case 'MONTHLY': {
      const day = startDate.getUTCDate()
      let periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day))
      if (isAfter(periodStart, now)) {
        periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day))
      }
      const nextOcc = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, day))
      const periodEnd = subDays(nextOcc, 1)
      return { periodStart, periodEnd }
    }
  }
}

function hitsDay(frequency: Frequency, startDate: Date, day: Date): boolean {
  switch (frequency) {
    case 'ONE_OFF':      return isSameDay(day, startDate)
    case 'WEEKLY':       return day.getUTCDay() === startDate.getUTCDay()
    case 'FORTNIGHTLY': {
      const diff = differenceInDays(day, startDate)
      return diff >= 0 && diff % 14 === 0
    }
    case 'MONTHLY':      return day.getUTCDate() === startDate.getUTCDate()
  }
}

export async function GET(req: Request) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { householdId } = session
  const { searchParams } = new URL(req.url)
  const now = normalizeDate(new Date())

  const from = normalizeDate(searchParams.get('from') ? parseISO(searchParams.get('from')!) : startOfMonth(now))
  const to   = normalizeDate(searchParams.get('to')   ? parseISO(searchParams.get('to')!)   : endOfMonth(now))

  // --- Config (starting balance) ---
  const config = await prisma.config.findUnique({ where: { householdId } })
  const startingBalance = config?.startingBalance ?? 0
  const balanceDate     = config?.balanceDate ? normalizeDate(config.balanceDate) : now

  // --- Load data ---
  // Balance anchor is a hard reset — ignore all transactions before it.
  // Load transactions from anchor onward (for balance) + all transactions (for dedup)
  const [rawIncomes, rawBudgetItems, rawTransactions, rawAllTransactions] = await Promise.all([
    prisma.income.findMany({ where: { active: true, householdId } }),
    prisma.budgetItem.findMany({ where: { active: true, householdId } }),
    prisma.transaction.findMany({
      where: { householdId, date: { gte: balanceDate } },
      include: {
        budgetItem: { select: { name: true } },
        income:     { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.transaction.findMany({
      where: { householdId },
      select: { budgetItemId: true, incomeId: true, type: true, date: true, effectiveDate: true, amount: true },
    }),
  ])

  // Normalize all Prisma dates to UTC midnight to avoid timezone shifts
  const incomes = rawIncomes.map(i => ({
    ...i,
    startDate: normalizeDate(i.startDate),
    endDate: i.endDate ? normalizeDate(i.endDate) : null,
  }))
  const budgetItems = rawBudgetItems.map(b => ({
    ...b,
    startDate: normalizeDate(b.startDate),
    endDate: b.endDate ? normalizeDate(b.endDate) : null,
  }))

  // Hard filter: exclude any transaction whose actual date is before the anchor.
  // The anchor balance already accounts for these — including them would double-count.
  // Normalize dates and sort by effective date for correct balance reconstruction.
  const allTransactions = rawTransactions
    .map(t => ({
      ...t,
      date: normalizeDate(t.date),
      effectiveDate: t.effectiveDate ? normalizeDate(t.effectiveDate) : null,
    }))
    .filter(t => !isBefore(t.date, balanceDate))
    .sort((a, b) => {
      const da = (a.effectiveDate ?? a.date).getTime()
      const db = (b.effectiveDate ?? b.date).getTime()
      return da - db
    })

  // Unfiltered transactions for dedup checks (includes pre-anchor payments)
  const allTransactionsUnfiltered = rawAllTransactions.map(t => ({
    ...t,
    date: normalizeDate(t.date),
    effectiveDate: t.effectiveDate ? normalizeDate(t.effectiveDate) : null,
  }))

  // Compute opening balance at `from` by replaying transactions from
  // the anchor date up to `from`.
  let openingBalance = startingBalance
  for (const t of allTransactions) {
    const d = t.effectiveDate ?? t.date
    if (!isBefore(d, from)) break
    openingBalance += t.type === 'INCOME' ? t.amount : -t.amount
  }

  // Index in-range transactions by effective date (or transaction date)
  const txnsByDay = new Map<DayKey, ActualEvent[]>()
  for (const t of allTransactions) {
    const d = t.effectiveDate ?? t.date
    if (isBefore(d, from) || isAfter(d, to)) continue
    const key = format(d, 'yyyy-MM-dd')
    if (!txnsByDay.has(key)) txnsByDay.set(key, [])
    txnsByDay.get(key)!.push({
      type: t.type,
      description: t.description,
      label:
        t.type === 'EXPENSE'
          ? (t.budgetItem?.name ?? 'Unknown')
          : (t.income?.name ?? 'One-off income'),
      amount: t.amount,
    })
  }

  // For dedup: compute how much each budget/income item is covered by actual
  // transactions in the current period (so projections can be suppressed)
  function periodSpentFor(itemId: string, freq: Frequency, startDate: Date, refDay: Date): number {
    const bounds = currentPeriodBounds(freq, startDate, refDay)
    if (!bounds) return 0
    return allTransactionsUnfiltered
      .filter(t => {
        const d = t.effectiveDate ?? t.date
        return t.budgetItemId === itemId &&
          t.type === 'EXPENSE' &&
          !isBefore(d, bounds.periodStart) &&
          !isAfter(d, bounds.periodEnd)
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }
  function periodReceivedFor(incId: string, freq: Frequency, startDate: Date, refDay: Date): number {
    const bounds = currentPeriodBounds(freq, startDate, refDay)
    if (!bounds) return 0
    return allTransactionsUnfiltered
      .filter(t => {
        const d = t.effectiveDate ?? t.date
        return t.incomeId === incId &&
          t.type === 'INCOME' &&
          !isBefore(d, bounds.periodStart) &&
          !isAfter(d, bounds.periodEnd)
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }

  // --- Remaining budget for current periods ---
  // For each recurring budget item, figure out how much of the current period
  // is unspent and project it as a future event on the period's last day.
  const remainingBudget = new Map<string, { item: typeof budgetItems[0]; remaining: number; periodEndKey: string }>()

  for (const item of budgetItems) {
    if (!item.active) continue
    const bounds = currentPeriodBounds(item.frequency as Frequency, item.startDate, now)
    if (!bounds) continue
    if (!isAfter(bounds.periodEnd, now)) continue // period already ended
    const spent = allTransactionsUnfiltered
      .filter(t => {
        const d = t.effectiveDate ?? t.date
        return t.budgetItemId === item.id &&
          t.type === 'EXPENSE' &&
          !isBefore(d, bounds.periodStart) &&
          !isAfter(d, bounds.periodEnd)
      })
      .reduce((sum, t) => sum + t.amount, 0)

    const remaining = item.amount - spent
    if (remaining > 0) {
      remainingBudget.set(item.id, {
        item,
        remaining: Math.round(remaining * 100) / 100,
        periodEndKey: format(bounds.periodEnd, 'yyyy-MM-dd'),
      })
    }
  }

  // Build daily series
  const days = eachDayOfInterval({ start: from, end: to })
  let balance = openingBalance

  const series = days.map((rawDay) => {
    const day = normalizeDate(rawDay)
    const key    = format(day, 'yyyy-MM-dd')
    const isPast = !isAfter(day, now)

    const incomeEvents: IncomeEvent[] = []
    const budgetEvents: BudgetEvent[] = []
    const actualEvents: ActualEvent[] = txnsByDay.get(key) ?? []

    if (isPast) {
      // Historical: use actual transactions
      for (const t of actualEvents) {
        balance += t.type === 'INCOME' ? t.amount : -t.amount
      }
    } else {
      // Projected: use income schedules and budget allocations.
      // Deduplicate: if actual transactions cover a budget/income item
      // in this period with the same amount, suppress the projection
      // (the actual transaction is already shown). Show both if amounts differ.
      for (const inc of incomes) {
        if (!inc.active) continue
        if (isBefore(day, inc.startDate)) continue
        if (inc.endDate && isAfter(day, inc.endDate)) continue
        if (hitsDay(inc.frequency as Frequency, inc.startDate, day)) {
          const received = periodReceivedFor(inc.id, inc.frequency as Frequency, inc.startDate, day)
          if (received > 0 && received === inc.amount) {
            // Fully covered by actual transaction — skip projection, use actual for balance
            balance += received
          } else {
            incomeEvents.push({ name: inc.name, amount: inc.amount })
            balance += inc.amount
          }
        }
      }
      for (const item of budgetItems) {
        if (!item.active) continue
        if (isBefore(day, item.startDate)) continue
        if (item.endDate && isAfter(day, item.endDate)) continue
        if (hitsDay(item.frequency as Frequency, item.startDate, day)) {
          const spent = periodSpentFor(item.id, item.frequency as Frequency, item.startDate, day)
          if (spent > 0 && spent === item.amount) {
            // Fully covered by actual transaction — skip projection, use actual for balance
            balance -= spent
          } else {
            budgetEvents.push({ id: item.id, name: item.name, category: item.category, amount: item.amount })
            balance -= item.amount
          }
        }
      }

      // Inject remaining from current period on the period's last day
      for (const [, { item, remaining, periodEndKey }] of remainingBudget) {
        if (key === periodEndKey) {
          budgetEvents.push({
            id: item.id,
            name: `${item.name} (remaining)`,
            category: item.category,
            amount: remaining,
          })
          balance -= remaining
        }
      }
    }

    return {
      date: key,
      isPast,
      balance: Math.round(balance * 100) / 100,
      incomeEvents,
      budgetEvents,
      actualEvents,
    }
  })

  return NextResponse.json(series)
}
