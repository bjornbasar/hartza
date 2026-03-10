'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { frequencyLabel, toMonthly } from '@/lib/budget'
import { Frequency } from '@prisma/client'

type BudgetItem = {
  id: string
  name: string
  category: string | null
  amount: number
  frequency: Frequency
  startDate: string
  endDate: string | null
  notes: string | null
  active: boolean
}

const EMPTY: Omit<BudgetItem, 'id' | 'active'> = {
  name: '',
  category: null,
  amount: 0,
  frequency: 'MONTHLY',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: null,
  notes: null,
}

function fmt(n: number) {
  return n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })
}

// Group items by category
function groupByCategory(items: BudgetItem[]): Map<string, BudgetItem[]> {
  const map = new Map<string, BudgetItem[]>()
  for (const item of items) {
    const key = item.category ?? 'Uncategorised'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

export default function BudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<BudgetItem | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = () =>
    fetch('/api/budget')
      .then((r) => r.json())
      .then((d) => {
        setItems(d)
        setLoading(false)
      })

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(item: BudgetItem) {
    setEditing(item)
    setForm({
      name: item.name,
      category: item.category,
      amount: item.amount,
      frequency: item.frequency,
      startDate: format(parseISO(item.startDate), 'yyyy-MM-dd'),
      endDate: item.endDate ? format(parseISO(item.endDate), 'yyyy-MM-dd') : null,
      notes: item.notes,
    })
    setShowForm(true)
  }

  async function save() {
    setSaving(true)
    const payload = {
      ...form,
      amount: Number(form.amount),
      category: form.category || null,
      endDate: form.endDate || null,
      notes: form.notes || null,
    }
    if (editing) {
      await fetch(`/api/budget/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this budget item? All linked transactions will also be removed.')) return
    await fetch(`/api/budget/${id}`, { method: 'DELETE' })
    load()
  }

  const monthlyTotal = items
    .filter((i) => i.active)
    .reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0)

  const grouped = groupByCategory(items)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Budget Items</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Est. monthly total:{' '}
            <span className="text-blue-400 font-medium">{fmt(monthlyTotal)}</span>
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Budget Item
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No budget items yet.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, catItems]) => (
            <div key={category}>
              <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-1">
                {category}
              </h3>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {frequencyLabel(item.frequency)} · from{' '}
                        {format(parseISO(item.startDate), 'dd MMM yyyy')}
                        {item.endDate
                          ? ` to ${format(parseISO(item.endDate), 'dd MMM yyyy')}`
                          : ''}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-slate-600 mt-1">{item.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-blue-400">{fmt(item.amount)}</p>
                      <p className="text-xs text-slate-500">{frequencyLabel(item.frequency)}</p>
                      <p className="text-xs text-slate-600">
                        ≈ {fmt(toMonthly(item.amount, item.frequency))} / mo
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(item.id)}
                        className="text-xs text-slate-600 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-5">
              {editing ? 'Edit Budget Item' : 'New Budget Item'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block col-span-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Name</span>
                  <input
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Groceries"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Category <span className="text-slate-600">(optional)</span>
                  </span>
                  <input
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.category ?? ''}
                    onChange={(e) => setForm({ ...form, category: e.target.value || null })}
                    placeholder="e.g. Food"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Frequency</span>
                  <select
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="FORTNIGHTLY">Fortnightly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ONE_OFF">One-off</option>
                  </select>
                </label>
              </div>

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

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Start Date</span>
                  <input
                    type="date"
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    End Date <span className="text-slate-600">(optional)</span>
                  </span>
                  <input
                    type="date"
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={form.endDate ?? ''}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value || null })}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Notes <span className="text-slate-600">(optional)</span>
                </span>
                <input
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
                />
              </label>
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
                disabled={saving || !form.name || !form.amount}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
