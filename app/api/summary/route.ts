import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { getCurrentPeriod, toMonthly, isActiveOn } from '@/lib/budget'
import { Frequency } from '@prisma/client'
import { format, isBefore, isAfter, startOfDay } from 'date-fns'
import { normalizeDate } from '@/lib/dates'

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = normalizeDate(new Date())
  const { householdId } = session

  // --- Income ---
  const rawIncomes = await prisma.income.findMany({ where: { active: true, householdId } })
  const incomes = rawIncomes.map(i => ({
    ...i,
    startDate: normalizeDate(i.startDate),
    endDate: i.endDate ? normalizeDate(i.endDate) : null,
  }))

  let monthlyIncome = 0
  for (const inc of incomes) {
    if (!isActiveOn(inc.startDate, inc.endDate, now)) continue
    monthlyIncome += toMonthly(inc.amount, inc.frequency as Frequency)
  }

  // --- Budget items with current-period spend ---
  const rawBudgetItems = await prisma.budgetItem.findMany({
    where: { active: true, householdId },
    include: { transactions: { where: { householdId } } },
  })
  const budgetItems = rawBudgetItems.map(b => ({
    ...b,
    startDate: normalizeDate(b.startDate),
    endDate: b.endDate ? normalizeDate(b.endDate) : null,
    transactions: b.transactions.map(t => ({
      ...t,
      date: normalizeDate(t.date),
      effectiveDate: t.effectiveDate ? normalizeDate(t.effectiveDate) : null,
    })),
  }))

  let monthlyBudget = 0
  const itemSummaries = []

  for (const item of budgetItems) {
    const freq = item.frequency as Frequency
    if (!isActiveOn(item.startDate, item.endDate, now)) {
      // Check for early payment — include item if a transaction exists in its first period
      const firstPeriod = getCurrentPeriod(freq, item.startDate, item.startDate)
      const hasEarlyPayment = item.transactions.some(t => {
        const d = t.effectiveDate ?? t.date
        return !isBefore(d, firstPeriod.start) && !isAfter(d, firstPeriod.end)
      })
      if (!hasEarlyPayment) continue
    }

    monthlyBudget += toMonthly(item.amount, freq)

    const period = getCurrentPeriod(freq, item.startDate, now)
    const periodBudget = item.amount

    // Per-period spend: only count transactions within the current period.
    // Exception: if the budget hasn't started yet (advance payments), count
    // all transactions before startDate toward the first period.
    const hasStarted = !isBefore(now, item.startDate)
    const spent = item.transactions
      .filter(t => {
        const d = t.effectiveDate ?? t.date
        if (freq === 'ONE_OFF') return true
        if (!hasStarted) {
          // Pre-start: count transactions up to startDate (advance payments)
          return isBefore(d, item.startDate) || !isAfter(d, item.startDate)
        }
        // Active: only count transactions within current period
        const inPeriod = !isBefore(d, period.start) && !isAfter(d, period.end)
        if (item.name === 'Rent') {
          console.log('RENT DEBUG', {
            txId: t.id,
            effectiveDate: t.effectiveDate?.toISOString(),
            date: t.date.toISOString(),
            d: d.toISOString(),
            periodStart: period.start.toISOString(),
            periodEnd: period.end.toISOString(),
            isBefore: isBefore(d, period.start),
            isAfter: isAfter(d, period.end),
            inPeriod,
          })
        }
        return inPeriod
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
