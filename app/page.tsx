'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { frequencyLabel } from '@/lib/budget'
import { Frequency } from '@prisma/client'

type BudgetSummary = {
  id: string
  name: string
  category: string | null
  frequency: Frequency
  amount: number
  periodStart: string
  periodEnd: string
  spent: number
  remaining: number
  percentUsed: number
  isOverBudget: boolean
}

type Summary = {
  monthlyIncome: number
  monthlyBudget: number
  monthlySurplus: number
  budgetItems: BudgetSummary[]
}

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function ProgressBar({ pct, over }: { pct: number; over: boolean }) {
  return (
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/summary')
      .then((r) => r.json())
      .then((d) => {
        setSummary(d)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen text-slate-500">
        Loading…
      </div>
    )
  }

  if (!summary) return null

  const { monthlyIncome, monthlyBudget, monthlySurplus, budgetItems } = summary
  const surplus = monthlySurplus >= 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">Dashboard</h1>
      <p className="text-slate-500 text-sm mb-8">Monthly overview · estimated figures</p>

      {/* Top stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly Income</p>
          <p className="text-2xl font-semibold text-emerald-400">{fmt(monthlyIncome)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly Budget</p>
          <p className="text-2xl font-semibold text-blue-400">{fmt(monthlyBudget)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
            {surplus ? 'Surplus' : 'Deficit'}
          </p>
          <p className={`text-2xl font-semibold ${surplus ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(Math.abs(monthlySurplus))}
          </p>
        </div>
      </div>

      {/* Budget items */}
      <h2 className="text-base font-semibold text-slate-300 mb-4">Budget items — current period</h2>

      {budgetItems.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center border border-dashed border-slate-800 rounded-xl">
          No budget items yet. <a href="/budget" className="text-emerald-400 underline">Add one →</a>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {budgetItems.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-xl p-5 ${item.isOverBudget ? 'border-red-800' : 'border-slate-800'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-100">{item.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {frequencyLabel(item.frequency)}
                    {item.category ? ` · ${item.category}` : ''}
                  </p>
                </div>
                {item.isOverBudget && (
                  <span className="text-xs bg-red-500/10 text-red-400 border border-red-800 px-2 py-0.5 rounded-full">
                    Over
                  </span>
                )}
              </div>

              <ProgressBar pct={item.percentUsed} over={item.isOverBudget} />

              <div className="flex justify-between mt-2 text-sm">
                <span className="text-slate-400">
                  {fmt(item.spent)} <span className="text-slate-600">of {fmt(item.amount)}</span>
                </span>
                <span className={item.remaining < 0 ? 'text-red-400' : 'text-slate-300'}>
                  {item.remaining < 0 ? '-' : ''}{fmt(Math.abs(item.remaining))} left
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-2">
                {format(parseISO(item.periodStart), 'dd MMM')} –{' '}
                {format(parseISO(item.periodEnd), 'dd MMM')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
