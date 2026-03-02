'use client'

import { useEffect, useState } from 'react'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { Frequency } from '@prisma/client'
import { frequencyLabel } from '@/lib/budget'

type BudgetItem = {
  id: string
  name: string
  category: string | null
  frequency: Frequency
  amount: number
}

type Transaction = {
  id: string
  amount: number
  date: string
  description: string | null
  budgetItemId: string
  budgetItem: {
    id: string
    name: string
    category: string | null
  }
}

const today = format(new Date(), 'yyyy-MM-dd')

const EMPTY = {
  amount: 0,
  date: today,
  description: '',
  budgetItemId: '',
}

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

// Group transactions by date
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
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filter state
  const [filterBudgetItem, setFilterBudgetItem] = useState('')
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'))

  const loadTxns = () => {
    const from = format(startOfMonth(parseISO(`${filterMonth}-01`)), 'yyyy-MM-dd')
    const to = format(endOfMonth(parseISO(`${filterMonth}-01`)), 'yyyy-MM-dd')
    const params = new URLSearchParams({ from, to })
    if (filterBudgetItem) params.set('budgetItemId', filterBudgetItem)

    return fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setTxns(d)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetch('/api/budget')
      .then((r) => r.json())
      .then(setBudgetItems)
  }, [])

  useEffect(() => {
    setLoading(true)
    loadTxns()
  }, [filterBudgetItem, filterMonth])

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY, budgetItemId: budgetItems[0]?.id ?? '' })
    setShowForm(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setForm({
      amount: t.amount,
      date: format(parseISO(t.date), 'yyyy-MM-dd'),
      description: t.description ?? '',
      budgetItemId: t.budgetItemId,
    })
    setShowForm(true)
  }

  async function save() {
    setSaving(true)
    const payload = {
      amount: Number(form.amount),
      date: form.date,
      description: form.description || null,
      budgetItemId: form.budgetItemId,
    }
    if (editing) {
      await fetch(`/api/transactions/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
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

  const totalSpent = txns.reduce((s, t) => s + t.amount, 0)
  const grouped = groupByDate(txns)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Transactions</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {format(parseISO(`${filterMonth}-01`), 'MMMM yyyy')} ·{' '}
            <span className="text-slate-300">{fmt(totalSpent)} spent</span>
          </p>
        </div>
        <button
          onClick={openNew}
          disabled={budgetItems.length === 0}
          title={budgetItems.length === 0 ? 'Add a budget item first' : ''}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Log Expense
        </button>
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
          <option value="">All budget items</option>
          {budgetItems.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.category ? `(${b.category})` : ''}
            </option>
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
            const dayTotal = dayTxns.reduce((s, t) => s + t.amount, 0)
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">
                    {format(parseISO(date), 'EEEE, dd MMM yyyy')}
                  </span>
                  <span className="text-xs text-slate-500">{fmt(dayTotal)}</span>
                </div>
                <div className="space-y-2">
                  {dayTxns.map((t) => (
                    <div
                      key={t.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-100 text-sm">
                            {t.description || '—'}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="text-slate-400">{t.budgetItem.name}</span>
                          {t.budgetItem.category ? (
                            <span className="text-slate-600"> · {t.budgetItem.category}</span>
                          ) : null}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-100 shrink-0">{fmt(t.amount)}</p>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => openEdit(t)}
                          className="text-xs text-slate-400 hover:text-slate-100 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => del(t.id)}
                          className="text-xs text-slate-600 hover:text-red-400 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                        >
                          Del
                        </button>
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
            <h2 className="text-lg font-semibold text-slate-100 mb-5">
              {editing ? 'Edit Transaction' : 'Log Expense'}
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Budget Item</span>
                <select
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={form.budgetItemId}
                  onChange={(e) => setForm({ ...form, budgetItemId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {budgetItems.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {fmt(b.amount)} / {frequencyLabel(b.frequency)}
                      {b.category ? ` (${b.category})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
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
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Description <span className="text-slate-600">(optional)</span>
                </span>
                <input
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Woolworths run"
                />
              </label>

              {/* Live budget preview */}
              {form.budgetItemId && (() => {
                const item = budgetItems.find((b) => b.id === form.budgetItemId)
                if (!item) return null
                return (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-xs text-slate-400">
                    <span className="font-medium text-slate-300">{item.name}</span> budget:{' '}
                    <span className="text-blue-400">{fmt(item.amount)}</span>{' '}
                    {frequencyLabel(item.frequency)}
                  </div>
                )
              })()}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-100 text-sm py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.budgetItemId || !form.amount || !form.date}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Log Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
