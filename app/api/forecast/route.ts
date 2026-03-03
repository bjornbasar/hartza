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
