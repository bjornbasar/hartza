'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { type RangeType, xTickFormatter, xTickInterval } from '@/lib/dateRange'

type ActualEvent = {
  type: 'EXPENSE' | 'INCOME'
  description: string | null
  label: string
  amount: number
}
type IncomeEvent  = { name: string; amount: number }
type BudgetEvent  = { id: string; name: string; category: string | null; amount: number }

type DataPoint = {
  date: string
  isPast: boolean
  balance: number
  incomeEvents: IncomeEvent[]
  budgetEvents: BudgetEvent[]
  actualEvents: ActualEvent[]
}

type ChartPoint = DataPoint & {
  balanceHistorical: number | null
  balanceProjected: number | null
}

function currency(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartPoint

  const hasIncome  = d.incomeEvents?.length > 0
  const hasBudget  = d.budgetEvents?.length > 0
  const hasActual  = d.actualEvents?.length > 0
  const isPositive = d.balance >= 0

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs shadow-xl min-w-[220px] max-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-300 font-semibold">{format(parseISO(label), 'EEE dd MMM yyyy')}</p>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${d.isPast ? 'bg-slate-700 text-slate-400' : 'bg-slate-700/50 text-slate-500'}`}>
          {d.isPast ? 'actual' : 'projected'}
        </span>
      </div>

      <div className="flex justify-between items-baseline mb-3">
        <span className="text-slate-500">Balance</span>
        <span className={`text-base font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {currency(d.balance)}
        </span>
      </div>

      {/* Income received (actual) */}
      {hasActual && d.actualEvents.filter(e => e.type === 'INCOME').length > 0 && (
        <div className="border-t border-slate-700 pt-2 mb-2">
          <p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Received</p>
          {d.actualEvents.filter(e => e.type === 'INCOME').map((e, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span className="text-slate-400 truncate">{e.description || e.label}</span>
              <span className="text-emerald-400 shrink-0">+{currency(e.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expenses (actual) */}
      {hasActual && d.actualEvents.filter(e => e.type === 'EXPENSE').length > 0 && (
        <div className="border-t border-slate-700 pt-2 mb-2">
          <p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Spent</p>
          {d.actualEvents.filter(e => e.type === 'EXPENSE').map((e, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span className="text-slate-400 truncate">
                {e.description || e.label}
                {e.description ? <span className="text-slate-600"> · {e.label}</span> : null}
              </span>
              <span className="text-red-400 shrink-0">-{currency(e.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Projected income */}
      {hasIncome && (
        <div className="border-t border-slate-700 pt-2 mb-2">
          <p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Expected income</p>
          {d.incomeEvents.map((e, i) => (
            <div key={i} className="flex justify-between gap-4">
              <span className="text-slate-400 truncate">{e.name}</span>
              <span className="text-emerald-400 shrink-0">+{currency(e.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Projected budget allocations */}
      {hasBudget && (
        <div className="border-t border-slate-700 pt-2">
          <p className="text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">Budget due</p>
          {d.budgetEvents.map((e) => (
            <div key={e.id} className="flex justify-between gap-4">
              <span className="text-slate-400 truncate">
                {e.name}
                {e.category ? <span className="text-slate-600"> · {e.category}</span> : null}
              </span>
              <span className="text-blue-400 shrink-0">-{currency(e.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CashFlowChart({
  data,
  rangeType,
}: {
  data: DataPoint[]
  rangeType: RangeType
}) {
  if (!data.length) return null

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Split into historical (solid) and projected (dashed) — they share the today point
  const chartData: ChartPoint[] = data.map((d) => ({
    ...d,
    balanceHistorical: d.isPast  ? d.balance : null,
    balanceProjected:  !d.isPast ? d.balance : null,
  }))

  // Inject today's balance into projected start so the lines connect visually
  const todayIndex = chartData.findIndex((d) => d.date === todayStr)
  if (todayIndex !== -1 && todayIndex < chartData.length - 1) {
    chartData[todayIndex].balanceProjected = chartData[todayIndex].balance
  }

  const formatTick  = xTickFormatter(rangeType)
  const tickInterval = xTickInterval(rangeType)

  const allBalances = data.map((d) => d.balance)
  const minBalance  = Math.min(...allBalances)
  const yDomain: [number | string, number | string] = [
    minBalance < 0 ? 'auto' : 0,
    'auto',
  ]

  const yFormat = (v: number) =>
    Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="projectedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickFormatter={formatTick}
          tickLine={false}
          axisLine={false}
          interval={tickInterval}
        />

        <YAxis
          domain={yDomain}
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickFormatter={yFormat}
          tickLine={false}
          axisLine={false}
          width={48}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Zero line */}
        <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />

        {/* Today marker */}
        {data.some((d) => d.date === todayStr) && (
          <ReferenceLine
            x={todayStr}
            stroke="#475569"
            strokeDasharray="3 3"
            label={{ value: 'today', position: 'insideTopRight', fill: '#64748b', fontSize: 10 }}
          />
        )}

        {/* Projected shaded area */}
        <Area
          type="stepAfter"
          dataKey="balanceProjected"
          fill="url(#projectedFill)"
          stroke="none"
          connectNulls={false}
          isAnimationActive={false}
        />

        {/* Historical — solid */}
        <Line
          type="stepAfter"
          dataKey="balanceHistorical"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
          connectNulls={false}
          isAnimationActive={false}
        />

        {/* Projected — dashed */}
        <Line
          type="stepAfter"
          dataKey="balanceProjected"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeOpacity={0.5}
          dot={false}
          activeDot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
