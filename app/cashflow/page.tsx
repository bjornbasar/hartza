'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { computeRange, RANGE_OPTIONS, type RangeType } from '@/lib/dateRange'
import dynamic from 'next/dynamic'
import BalanceSetup from '../components/BalanceSetup'

const CashFlowChart = dynamic(() => import('../components/CashFlowChart'), { ssr: false })

type ForecastPoint = {
  date: string
  isPast: boolean
  balance: number
  incomeEvents: { name: string; amount: number }[]
  budgetEvents: { id: string; name: string; category: string | null; amount: number }[]
  actualEvents: { type: 'EXPENSE' | 'INCOME'; description: string | null; label: string; amount: number }[]
}

type EventItem = {
  kind: 'actual-income' | 'actual-expense' | 'projected-income' | 'projected-budget'
  name: string
  amount: number
  notes: string | null
}

const PADDING_OPTIONS = [0, 3, 7]

function fmt(n: number) {
  return n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })
}

function flattenEvents(points: ForecastPoint[]): Map<string, EventItem[]> {
  const map = new Map<string, EventItem[]>()

  for (const pt of points) {
    const items: EventItem[] = []

    for (const ev of pt.actualEvents) {
      items.push({
        kind: ev.type === 'INCOME' ? 'actual-income' : 'actual-expense',
        name: ev.label || ev.description || (ev.type === 'INCOME' ? 'Income' : 'Expense'),
        amount: ev.amount,
        notes: ev.description && ev.label && ev.description !== ev.label ? ev.description : null,
      })
    }

    for (const ev of pt.incomeEvents) {
      items.push({ kind: 'projected-income', name: ev.name, amount: ev.amount, notes: null })
    }

    for (const ev of pt.budgetEvents) {
      items.push({ kind: 'projected-budget', name: ev.name, amount: ev.amount, notes: null })
    }

    if (items.length > 0) map.set(pt.date, items)
  }

  return map
}

const EVENT_STYLES: Record<EventItem['kind'], { bar: string; text: string; sign: '+' | '-' }> = {
  'actual-income':  { bar: 'bg-emerald-500', text: 'text-emerald-400', sign: '+' },
  'actual-expense': { bar: 'bg-slate-600',   text: 'text-red-400',    sign: '-' },
  'projected-income':  { bar: 'bg-emerald-500/50 border border-dashed border-emerald-500', text: 'text-emerald-400', sign: '+' },
  'projected-budget':  { bar: 'bg-blue-500',  text: 'text-blue-400',  sign: '-' },
}

export default function CashFlowPage() {
  const [forecast, setForecast] = useState<ForecastPoint[]>([])
  const [loading, setLoading] = useState(true)

  const [rangeType, setRangeType] = useState<RangeType>('month')
  const [offset, setOffset] = useState(0)
  const [paddingIdx, setPaddingIdx] = useState(0)

  const padding = PADDING_OPTIONS[paddingIdx]
  const range = computeRange(rangeType, offset, padding)
  const fromStr = format(range.paddedFrom, 'yyyy-MM-dd')
  const toStr = format(range.paddedTo, 'yyyy-MM-dd')

  function switchRange(type: RangeType) {
    setRangeType(type)
    setOffset(0)
  }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/forecast?from=${fromStr}&to=${toStr}`)
      .then((r) => { if (!r.ok) throw new Error(`/api/forecast ${r.status}`); return r.json() })
      .then((d) => { setForecast(d); setLoading(false) })
      .catch((e) => { console.error(e); setLoading(false) })
  }, [fromStr, toStr])

  const eventsByDate = flattenEvents(forecast)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-100 mb-1">Cash Flow</h1>
      <p className="text-slate-500 text-sm mb-8">Forecast and event breakdown</p>

      {/* Chart section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-300">Cash flow</h2>
            <p className="text-xs text-slate-500 mt-0.5">{range.label}</p>
          </div>
          <BalanceSetup onSave={() => {
            setLoading(true)
            fetch(`/api/forecast?from=${fromStr}&to=${toStr}`)
              .then(r => r.json()).then(d => { setForecast(d); setLoading(false) })
          }} />

          <div className="flex items-center gap-2 flex-wrap">
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

        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-slate-600 text-sm">
            Loading…
          </div>
        ) : (
          <CashFlowChart data={forecast} rangeType={rangeType} />
        )}
      </div>

      {/* Events list */}
      <h2 className="text-base font-semibold text-slate-300 mb-4">Events</h2>

      {eventsByDate.size === 0 && !loading ? (
        <div className="text-slate-500 text-sm py-8 text-center border border-dashed border-slate-800 rounded-xl">
          No events in this period.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(eventsByDate.entries()).map(([date, events]) => {
            const income = events
              .filter((e) => e.kind === 'actual-income' || e.kind === 'projected-income')
              .reduce((s, e) => s + e.amount, 0)
            const expenses = events
              .filter((e) => e.kind === 'actual-expense' || e.kind === 'projected-budget')
              .reduce((s, e) => s + e.amount, 0)

            return (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                  </span>
                  <span className="text-xs space-x-3">
                    {income > 0 && <span className="text-emerald-400">+{fmt(income)}</span>}
                    {expenses > 0 && <span className="text-red-400">-{fmt(expenses)}</span>}
                  </span>
                </div>

                {/* Event rows */}
                <div className="space-y-1">
                  {events.map((ev, i) => {
                    const style = EVENT_STYLES[ev.kind]
                    return (
                      <div
                        key={i}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 flex items-center gap-3"
                      >
                        <span className={`w-1 h-6 rounded-full shrink-0 ${style.bar}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-200 truncate block">{ev.name}</span>
                          {ev.notes && (
                            <span className="text-xs text-slate-500 truncate block">{ev.notes}</span>
                          )}
                        </div>
                        <span className={`text-sm font-medium shrink-0 ${style.text}`}>
                          {style.sign === '+' ? '+' : '-'}{fmt(ev.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
