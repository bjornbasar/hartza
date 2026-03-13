import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { getCurrentPeriod, toMonthly, isActiveOn } from '@/lib/budget'
import { Frequency } from '@prisma/client'
import { format, isBefore, isAfter, startOfDay } from 'date-fns'

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = startOfDay(new Date())
  const { householdId } = session

  // --- Income ---
  const incomes = await prisma.income.findMany({ where: { active: true, householdId } })

  let monthlyIncome = 0
  for (const inc of incomes) {
    if (!isActiveOn(inc.startDate, inc.endDate, now)) continue
    monthlyIncome += toMonthly(inc.amount, inc.frequency as Frequency)
  }

  // --- Budget items with current-period spend ---
  const budgetItems = await prisma.budgetItem.findMany({
    where: { active: true, householdId },
    include: { transactions: { where: { householdId } } },
  })

  let monthlyBudget = 0
  const itemSummaries = []

  for (const item of budgetItems) {
    const freq = item.frequency as Frequency
    if (!isActiveOn(item.startDate, item.endDate, now)) continue

    monthlyBudget += toMonthly(item.amount, freq)

    const period = getCurrentPeriod(freq, item.startDate, now)
    const periodBudget = item.amount

    // Per-period spend: only count transactions within the current period.
    // Exception: if the budget hasn't started yet (advance payments), count
    // all transactions before startDate toward the first period.
    const hasStarted = !isBefore(now, item.startDate)
    const spent = item.transactions
      .filter(t => {
        const d = startOfDay(t.effectiveDate ?? t.date)
        if (freq === 'ONE_OFF') return true
        if (!hasStarted) {
          // Pre-start: count transactions up to startDate (advance payments)
          return isBefore(d, item.startDate) || !isAfter(d, item.startDate)
        }
        // Active: only count transactions within current period
        return !isBefore(d, period.start) && !isAfter(d, period.end)
      })
      .reduce((s, t) => s + t.amount, 0)
    const remaining = periodBudget - spent
    const percentUsed = periodBudget > 0 ? Math.min((spent / periodBudget) * 100, 100) : 0

    itemSummaries.push({
      id: item.id,
      name: item.name,
      category: item.category,
      frequency: freq,
      amount: periodBudget,
      periodStart: format(period.start, 'yyyy-MM-dd'),
      periodEnd: format(period.end, 'yyyy-MM-dd'),
      spent: Math.round(spent * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      percentUsed: Math.round(percentUsed * 10) / 10,
      isOverBudget: spent > periodBudget,
    })
  }

  // Sort: over-budget first, then by percent used descending
  itemSummaries.sort((a, b) => {
    if (a.isOverBudget !== b.isOverBudget) return a.isOverBudget ? -1 : 1
    return b.percentUsed - a.percentUsed
  })

  return NextResponse.json({
    monthlyIncome: Math.round(monthlyIncome * 100) / 100,
    monthlyBudget: Math.round(monthlyBudget * 100) / 100,
    monthlySurplus: Math.round((monthlyIncome - monthlyBudget) * 100) / 100,
    budgetItems: itemSummaries,
  })
}
