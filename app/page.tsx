'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { frequencyLabel } from '@/lib/budget'
import { computeRange, RANGE_OPTIONS, type RangeType } from '@/lib/dateRange'
import { Frequency } from '@prisma/client'
import dynamic from 'next/dynamic'
import BalanceSetup from './components/BalanceSetup'

const CashFlowChart = dynamic(() => import('./components/CashFlowChart'), { ssr: false })

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

type ForecastPoint = {
  date: string
  isPast: boolean
  balance: number
  incomeEvents: { name: string; amount: number }[]
  budgetEvents: { id: string; name: string; category: string | null; amount: number }[]
  actualEvents: { type: 'EXPENSE' | 'INCOME'; description: string | null; label: string; amount: number }[]
}

const PADDING_OPTIONS = [0, 3, 7] // days before/after

function fmt(n: number) {
  return n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })
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
  const [forecast, setForecast] = useState<ForecastPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)

  // Chart range controls
  const [rangeType, setRangeType] = useState<RangeType>('month')
  const [offset, setOffset] = useState(0)
  const [paddingIdx, setPaddingIdx] = useState(0) // index into PADDING_OPTIONS

  const padding = PADDING_OPTIONS[paddingIdx]
  const range = computeRange(rangeType, offset, padding)
  const fromStr = format(range.paddedFrom, 'yyyy-MM-dd')
  const toStr = format(range.paddedTo, 'yyyy-MM-dd')

  // Reset offset when switching range type
  function switchRange(type: RangeType) {
    setRangeType(type)
    setOffset(0)
  }

  useEffect(() => {
    fetch('/api/summary')
      .then((r) => { if (!r.ok) throw new Error(`/api/summary ${r.status}`); return r.json() })
      .then((d) => { setSummary(d); setLoading(false) })
      .catch((e) => { console.error(e); setLoading(false) })
  }, [])

  useEffect(() => {
    setChartLoading(true)
    fetch(`/api/forecast?from=${fromStr}&to=${toStr}`)
      .then((r) => { if (!r.ok) throw new Error(`/api/forecast ${r.status}`); return r.json() })
      .then((d) => { setForecast(d); setChartLoading(false) })
      .catch((e) => { console.error(e); setChartLoading(false) })
  }, [fromStr, toStr])

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

      {/* Stat cards */}
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

      {/* Cash flow chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-10">

        {/* Chart header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-300">Cash flow</h2>
            <p className="text-xs text-slate-500 mt-0.5">{range.label}</p>
          </div>
          <BalanceSetup onSave={() => {
            setChartLoading(true)
            fetch(`/api/forecast?from=${fromStr}&to=${toStr}`)
              .then(r => r.json()).then(d => { setForecast(d); setChartLoading(false) })
          }} />

          <div className="flex items-center gap-2 flex-wrap">
            {/* Range type selector */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {RANGE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => switchRange(value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    rangeType === value
                      ? 'bg-slate-600 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Padding toggle */}
            <button
              onClick={() => setPaddingIdx((i) => (i + 1) % PADDING_OPTIONS.length)}
              title="Toggle padding days before/after period"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                padding > 0
                  ? 'border-emerald-700 text-emerald-400 bg-emerald-500/10'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {padding > 0 ? `± ${padding}d` : '± 0d'}
            </button>

            {/* Period navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOffset((o) => o - 1)}
                className="text-slate-400 hover:text-slate-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
              >
                ‹
              </button>
              <button
                onClick={() => setOffset(0)}
                disabled={offset === 0}
                className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 px-2 py-1 rounded transition-colors"
                title="Jump to current period"
              >
                now
              </button>
              <button
                onClick={() => setOffset((o) => o + 1)}
                className="text-slate-400 hover:text-slate-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-5 mb-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-5 h-0.5 bg-emerald-500 inline-block rounded" />
            Actual balance
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-5 border-t-2 border-dashed border-emerald-500/50 inline-block" />
            Projected
          </span>
        </div>

        {chartLoading ? (
          <div className="h-[300px] flex items-center justify-center text-slate-600 text-sm">
            Loading…
          </div>
        ) : (
          <CashFlowChart data={forecast} rangeType={rangeType} />
        )}
      </div>

      {/* Budget items */}
      <h2 className="text-base font-semibold text-slate-300 mb-4">Budget items — current period</h2>

      {budgetItems.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center border border-dashed border-slate-800 rounded-xl">
          No budget items yet.{' '}
          <a href="/budget" className="text-emerald-400 underline">
            Add one →
          </a>
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
                  {fmt(item.spent)}{' '}
                  <span className="text-slate-600">of {fmt(item.amount)}</span>
                </span>
                <span className={item.remaining < 0 ? 'text-red-400' : 'text-slate-300'}>
                  {item.remaining < 0 ? '-' : ''}
                  {fmt(Math.abs(item.remaining))} left
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
