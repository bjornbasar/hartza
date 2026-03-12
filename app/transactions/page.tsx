'use client'

import { useEffect, useState } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns'
import { Frequency } from '@prisma/client'
import { frequencyLabel, getCurrentPeriod, getNextPeriodStart } from '@/lib/budget'

type BudgetItem = { id: string; name: string; category: string | null; frequency: Frequency; amount: number; startDate: string }
type IncomeSource = { id: string; name: string; amount: number; frequency: Frequency }

type Transaction = {
  id: string
  type: 'EXPENSE' | 'INCOME'
  amount: number
  date: string
  effectiveDate: string | null
  description: string | null
  budgetItemId: string | null
  incomeId: string | null
  budgetItem: { id: string; name: string; category: string | null } | null
  income: { id: string; name: string } | null
}

const today = format(new Date(), 'yyyy-MM-dd')

const EMPTY_EXPENSE = { type: 'EXPENSE' as const, amount: 0, date: today, effectiveDate: '', description: '', budgetItemId: '', incomeId: '' }
const EMPTY_INCOME  = { type: 'INCOME'  as const, amount: 0, date: today, effectiveDate: '', description: '', budgetItemId: '', incomeId: '' }

function fmt(n: number) {
  return n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })
}

function groupByDate(txns: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>()
  for (const t of txns) {
    if (!map.has(t.date)) map.set(t.date, [])
    map.get(t.date)!.push(t)
  }
  return map
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<typeof EMPTY_EXPENSE | typeof EMPTY_INCOME>(EMPTY_EXPENSE)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterBudgetItem, setFilterBudgetItem] = useState('')
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))

  const loadTxns = () => {
    const from = format(startOfMonth(parseISO(`${filterMonth}-01`)), 'yyyy-MM-dd')
    const to   = format(endOfMonth(parseISO(`${filterMonth}-01`)),   'yyyy-MM-dd')
    const params = new URLSearchParams({ from, to })
    if (filterBudgetItem) params.set('budgetItemId', filterBudgetItem)

    return fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((d) => { setTxns(d); setLoading(false) })
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/budget').then(r => r.json()),
      fetch('/api/income').then(r => r.json()),
    ]).then(([b, i]) => { setBudgetItems(b); setIncomeSources(i) })
  }, [])

  useEffect(() => { setLoading(true); loadTxns() }, [filterBudgetItem, filterMonth])

  function openNew(type: 'EXPENSE' | 'INCOME' = 'EXPENSE') {
    setEditing(null)
    setForm(type === 'EXPENSE' ? { ...EMPTY_EXPENSE } : { ...EMPTY_INCOME })
    setShowForm(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setForm({
      type: t.type,
      amount: t.amount,
      date: format(parseISO(t.date), 'yyyy-MM-dd'),
      effectiveDate: t.effectiveDate ? format(parseISO(t.effectiveDate), 'yyyy-MM-dd') : '',
      description: t.description ?? '',
      budgetItemId: t.budgetItemId ?? '',
      incomeId: t.incomeId ?? '',
    })
    setShowForm(true)
  }

  function suggestEffectiveDate(txnDate: string, budgetItemId: string): string {
    if (!budgetItemId || !txnDate) return ''
    const bi = budgetItems.find(b => b.id === budgetItemId)
    if (!bi || bi.frequency === 'ONE_OFF') return ''

    const d = parseISO(txnDate)
    const biStart = parseISO(bi.startDate)
    const period = getCurrentPeriod(bi.frequency, biStart, d)

    // If transaction date falls within the current period → default to period start
    if (!isBefore(d, period.start) && !isAfter(d, period.end)) {
      return format(period.start, 'yyyy-MM-dd')
    }
    // Outside current period → suggest next period start
    const next = getNextPeriodStart(bi.frequency, biStart, d)
    return format(next, 'yyyy-MM-dd')
  }

  async function save() {
    setSaving(true)
    const effectiveDate = form.effectiveDate || null
    const payload =
      form.type === 'EXPENSE'
        ? { type: 'EXPENSE', amount: Number(form.amount), date: form.date, effectiveDate, description: form.description || null, budgetItemId: form.budgetItemId }
        : { type: 'INCOME',  amount: Number(form.amount), date: form.date, effectiveDate, description: form.description || null, incomeId: form.incomeId || null }

    if (editing) {
      await fetch(`/api/transactions/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setSaving(false)
    setShowForm(false)
    loadTxns()
  }

  async function del(id: string) {
    if (!confirm('Delete this transaction?')) return
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    loadTxns()
  }

  const totalSpent    = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const totalReceived = txns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const grouped = groupByDate(txns)

  const canSave = form.amount > 0 && Boolean(form.date)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Transactions</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {format(parseISO(`${filterMonth}-01`), 'MMMM yyyy')} ·{' '}
            <span className="text-red-400">{fmt(totalSpent)} spent</span>
            {totalReceived > 0 && (
              <> · <span className="text-emerald-400">{fmt(totalReceived)} received</span></>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openNew('INCOME')}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Income
          </button>
          <button
            onClick={() => openNew('EXPENSE')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="month"
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        />
        <select
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 flex-1"
          value={filterBudgetItem}
          onChange={(e) => setFilterBudgetItem(e.target.value)}
        >
          <option value="">All items</option>
          {budgetItems.map((b) => (
            <option key={b.id} value={b.id}>{b.name} {b.category ? `(${b.category})` : ''}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : txns.length === 0 ? (
        <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No transactions for this period.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([date, dayTxns]) => {
            const dayExpense  = dayTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
            const dayIncome   = dayTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                  </span>
                  <span className="text-xs text-slate-500 flex gap-2">
                    {dayIncome  > 0 && <span className="text-emerald-500">+{fmt(dayIncome)}</span>}
                    {dayExpense > 0 && <span className="text-red-400">-{fmt(dayExpense)}</span>}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayTxns.map((t) => (
                    <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-4">
                      {/* Type indicator */}
                      <span className={`w-1.5 h-6 rounded-full shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-500' : 'bg-slate-600'}`} />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-100 text-sm">{t.description || '—'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t.type === 'INCOME'
                            ? <span className="text-emerald-600">{t.income?.name ?? 'One-off income'}</span>
                            : t.budgetItem
                              ? <><span className="text-slate-400">{t.budgetItem.name}</span>{t.budgetItem.category && <span className="text-slate-600"> · {t.budgetItem.category}</span>}</>
                              : <span className="text-amber-600/80 italic">Unplanned</span>
                          }
                          {t.effectiveDate && t.effectiveDate !== t.date && (
                            <span className="text-blue-500/70 ml-1.5" title="Budget period date">
                              → {format(parseISO(t.effectiveDate), 'dd MMM')}
                            </span>
                          )}
                        </p>
                      </div>

                      <p className={`font-semibold shrink-0 ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount)}
                      </p>

                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEdit(t)} className="text-xs text-slate-400 hover:text-slate-100 px-2 py-1 rounded hover:bg-slate-800 transition-colors">Edit</button>
                        <button onClick={() => del(t.id)} className="text-xs text-slate-600 hover:text-red-400 px-2 py-1 rounded hover:bg-slate-800 transition-colors">Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            {/* Type toggle */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 mb-5">
              {(['EXPENSE', 'INCOME'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm(t === 'EXPENSE'
                    ? { ...form, type: 'EXPENSE', budgetItemId: '', incomeId: '' }
                    : { ...form, type: 'INCOME',  budgetItemId: '', incomeId: '' }
                  )}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    form.type === t
                      ? t === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600 text-slate-100'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t === 'INCOME' ? '+ Income' : '− Expense'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {/* Expense: budget item selector */}
              {form.type === 'EXPENSE' && (
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Budget Item <span className="text-slate-600">(optional)</span>
                  </span>
                  <select
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.budgetItemId}
                    onChange={(e) => {
                      const bid = e.target.value
                      const suggested = suggestEffectiveDate(form.date, bid)
                      setForm({ ...form, budgetItemId: bid, effectiveDate: suggested })
                    }}
                  >
                    <option value="">Unplanned</option>
                    {budgetItems.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {fmt(b.amount)} / {frequencyLabel(b.frequency)}{b.category ? ` (${b.category})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* Income: optional income source selector */}
              {form.type === 'INCOME' && (
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Income source <span className="text-slate-600">(optional)</span>
                  </span>
                  <select
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.incomeId}
                    onChange={(e) => setForm({ ...form, incomeId: e.target.value })}
                  >
                    <option value="">One-off / unlisted</option>
                    {incomeSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {fmt(s.amount)} / {frequencyLabel(s.frequency)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Amount</span>
                  <input
                    type="number" min="0" step="0.01"
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Date</span>
                  <input
                    type="date"
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.date}
                    onChange={(e) => {
                      const newDate = e.target.value
                      const suggested = form.type === 'EXPENSE' ? suggestEffectiveDate(newDate, form.budgetItemId) : ''
                      setForm({ ...form, date: newDate, effectiveDate: suggested })
                    }}
                  />
                </label>
              </div>

              {/* Effective date — shown when a budget item or income source is linked */}
              {((form.type === 'EXPENSE' && form.budgetItemId) || (form.type === 'INCOME' && form.incomeId)) && (
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Budget period date <span className="text-slate-600">(which period this counts toward)</span>
                  </span>
                  <input
                    type="date"
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.effectiveDate}
                    onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                  />
                  {!form.effectiveDate && (
                    <p className="text-xs text-slate-600 mt-1">Leave blank to use the transaction date</p>
                  )}
                </label>
              )}

              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Description <span className="text-slate-600">(optional)</span>
                </span>
                <input
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={form.type === 'INCOME' ? 'e.g. Freelance payment from Acme' : 'e.g. Woolworths weekly shop'}
                />
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-100 text-sm py-2 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !canSave}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : form.type === 'INCOME' ? 'Log Income' : 'Log Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
