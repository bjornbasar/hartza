import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { Frequency, TransactionType } from '@prisma/client'
import {
  eachDayOfInterval,
  format,
  parseISO,
  isSameDay,
  getDay,
  differenceInDays,
  isBefore,
  isAfter,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfDay,
} from 'date-fns'

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
      const startDow = getDay(startDate)
      const nowDow = getDay(now)
      const daysSinceLast = ((nowDow - startDow) % 7 + 7) % 7
      const periodStart = startOfDay(subDays(now, daysSinceLast))
      const periodEnd = startOfDay(addDays(periodStart, 6))
      return { periodStart, periodEnd }
    }
    case 'FORTNIGHTLY': {
      const diff = differenceInDays(now, startDate)
      const periodsElapsed = Math.floor(diff / 14)
      const periodStart = startOfDay(addDays(startDate, periodsElapsed * 14))
      const periodEnd = startOfDay(addDays(periodStart, 13))
      return { periodStart, periodEnd }
    }
    case 'MONTHLY': {
      const day = startDate.getDate()
      let periodStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), day))
      if (isAfter(periodStart, now)) {
        periodStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, day))
      }
      const nextOcc = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, day)
      const periodEnd = startOfDay(subDays(nextOcc, 1))
      return { periodStart, periodEnd }
    }
  }
}

function hitsDay(frequency: Frequency, startDate: Date, day: Date): boolean {
  switch (frequency) {
    case 'ONE_OFF':      return isSameDay(day, startDate)
    case 'WEEKLY':       return getDay(day) === getDay(startDate)
    case 'FORTNIGHTLY': {
      const diff = differenceInDays(day, startDate)
      return diff >= 0 && diff % 14 === 0
    }
    case 'MONTHLY':      return day.getDate() === startDate.getDate()
  }
}

export async function GET(req: Request) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { householdId } = session
  const { searchParams } = new URL(req.url)
  const now = startOfDay(new Date())

  const from = searchParams.get('from') ? parseISO(searchParams.get('from')!) : startOfMonth(now)
  const to   = searchParams.get('to')   ? parseISO(searchParams.get('to')!)   : endOfMonth(now)

  // --- Config (starting balance) ---
  const config = await prisma.config.findUnique({ where: { householdId } })
  const startingBalance = config?.startingBalance ?? 0
  const balanceDate     = config?.balanceDate ?? now

  // --- Load data ---
  const [incomes, budgetItems, allTransactions] = await Promise.all([
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
  ])

  // Compute opening balance at `from` by replaying transactions before the range
  let openingBalance = startingBalance
  for (const t of allTransactions) {
    if (t.date >= from) break
    openingBalance += t.type === 'INCOME' ? t.amount : -t.amount
  }

  // Index in-range transactions by date
  const txnsByDay = new Map<DayKey, ActualEvent[]>()
  for (const t of allTransactions) {
    if (t.date < from || t.date > to) continue
    const key = format(t.date, 'yyyy-MM-dd')
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

  // --- Remaining budget for current periods ---
  // For each recurring budget item, figure out how much of the current period
  // is unspent and project it as a future event on the period's last day.
  const remainingBudget = new Map<string, { item: typeof budgetItems[0]; remaining: number; periodEndKey: string }>()

  for (const item of budgetItems) {
    if (!item.active) continue
    const bounds = currentPeriodBounds(item.frequency as Frequency, item.startDate, now)
    if (!bounds) continue
    if (!isAfter(bounds.periodEnd, now)) continue // period already ended

    const spent = allTransactions
      .filter(t =>
        t.budgetItemId === item.id &&
        t.type === 'EXPENSE' &&
        !isBefore(t.date, bounds.periodStart) &&
        !isAfter(t.date, now)
      )
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

  const series = days.map((day) => {
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
      // Projected: use income schedules and budget allocations
      for (const inc of incomes) {
        if (!inc.active) continue
        if (isBefore(day, inc.startDate)) continue
        if (inc.endDate && isAfter(day, inc.endDate)) continue
        if (hitsDay(inc.frequency as Frequency, inc.startDate, day)) {
          incomeEvents.push({ name: inc.name, amount: inc.amount })
          balance += inc.amount
        }
      }
      for (const item of budgetItems) {
        if (!item.active) continue
        if (isBefore(day, item.startDate)) continue
        if (item.endDate && isAfter(day, item.endDate)) continue
        if (hitsDay(item.frequency as Frequency, item.startDate, day)) {
          budgetEvents.push({ id: item.id, name: item.name, category: item.category, amount: item.amount })
          balance -= item.amount
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
