'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { frequencyLabel } from '@/lib/budget'
import { Frequency } from '@prisma/client'

type Deposit = {
  id: string
  amount: number
  date: string
  description: string | null
}

type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  amount: number
  frequency: Frequency
  startDate: string
  notes: string | null
  active: boolean
  deposits: Deposit[]
}

type GoalForm = {
  name: string
  targetAmount: number
  amount: number
  frequency: Frequency
  startDate: string
  notes: string | null
}

type DepositForm = {
  amount: number
  date: string
  description: string
}

const EMPTY_GOAL: GoalForm = {
  name: '',
  targetAmount: 0,
  amount: 0,
  frequency: 'MONTHLY',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  notes: null,
}

const today = format(new Date(), 'yyyy-MM-dd')

function fmt(n: number) {
  return n.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [goalForm, setGoalForm] = useState<GoalForm>(EMPTY_GOAL)
  const [saving, setSaving] = useState(false)

  // Deposit form
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [depositForm, setDepositForm] = useState<DepositForm>({ amount: 0, date: today, description: '' })

  // Expanded goal (to see deposits)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = () =>
    fetch('/api/savings')
      .then((r) => r.json())
      .then((d) => { setGoals(d); setLoading(false) })

  useEffect(() => { load() }, [])

  // Goal CRUD
  function openNewGoal() {
    setEditingGoal(null)
    setGoalForm(EMPTY_GOAL)
    setShowGoalForm(true)
  }

  function openEditGoal(g: SavingsGoal) {
    setEditingGoal(g)
    setGoalForm({
      name: g.name,
      targetAmount: g.targetAmount,
      amount: g.amount,
      frequency: g.frequency,
      startDate: format(parseISO(g.startDate), 'yyyy-MM-dd'),
      notes: g.notes,
    })
    setShowGoalForm(true)
  }

  async function saveGoal() {
    setSaving(true)
    const payload = {
      ...goalForm,
      targetAmount: Number(goalForm.targetAmount),
      amount: Number(goalForm.amount),
      notes: goalForm.notes || null,
    }
    if (editingGoal) {
      await fetch(`/api/savings/${editingGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    setShowGoalForm(false)
    load()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Delete this savings goal and all its deposits?')) return
    await fetch(`/api/savings/${id}`, { method: 'DELETE' })
    load()
  }

  // Deposit CRUD
  function openDeposit(goalId: string, prefillAmount?: number) {
    setDepositGoalId(goalId)
    setDepositForm({ amount: prefillAmount ?? 0, date: today, description: '' })
    setShowDepositForm(true)
  }

  async function saveDeposit() {
    if (!depositGoalId) return
    setSaving(true)
    await fetch(`/api/savings/${depositGoalId}/deposits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Number(depositForm.amount),
        date: depositForm.date,
        description: depositForm.description || null,
      }),
    })
    setSaving(false)
    setShowDepositForm(false)
    load()
  }

  async function deleteDeposit(goalId: string, depositId: string) {
    if (!confirm('Delete this deposit?')) return
    await fetch(`/api/savings/${goalId}/deposits/${depositId}`, { method: 'DELETE' })
    load()
  }

  const totalSaved = goals.reduce((s, g) => s + g.deposits.reduce((ds, d) => ds + d.amount, 0), 0)
  const totalTarget = goals.filter(g => g.active).reduce((s, g) => s + g.targetAmount, 0)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Savings</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {fmt(totalSaved)} saved of {fmt(totalTarget)} target
          </p>
        </div>
        <button
          onClick={openNewGoal}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Goal
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : goals.length === 0 ? (
        <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No savings goals yet.
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const saved = goal.deposits.reduce((s, d) => s + d.amount, 0)
            const pct = goal.targetAmount > 0 ? Math.min((saved / goal.targetAmount) * 100, 100) : 0
            const remaining = Math.max(goal.targetAmount - saved, 0)
            const isExpanded = expandedId === goal.id

            return (
              <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Goal header */}
                <div className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-100">{goal.name}</p>
                        {!goal.active && (
                          <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fmt(goal.amount)} {frequencyLabel(goal.frequency).toLowerCase()} · started{' '}
                        {format(parseISO(goal.startDate), 'dd MMM yyyy')}
                      </p>
                      {goal.notes && (
                        <p className="text-xs text-slate-600 mt-1">{goal.notes}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-semibold text-emerald-400">{fmt(saved)}</p>
                      <p className="text-xs text-slate-500">of {fmt(goal.targetAmount)}</p>
                      {remaining > 0 && (
                        <p className="text-xs text-slate-600">{fmt(remaining)} to go</p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 100 ? 'bg-emerald-400' : 'bg-emerald-500/70'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{pct.toFixed(1)}% complete</p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openDeposit(goal.id, goal.amount)}
                      className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + Deposit
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : goal.id)}
                      className="text-xs text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? 'Hide' : 'History'} ({goal.deposits.length})
                    </button>
                    <button
                      onClick={() => openEditGoal(goal)}
                      className="text-xs text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="text-xs text-slate-600 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Deposit history (expandable) */}
                {isExpanded && (
                  <div className="border-t border-slate-800 px-5 py-3">
                    {goal.deposits.length === 0 ? (
                      <p className="text-xs text-slate-600 py-2">No deposits yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {goal.deposits.map((d) => (
                          <div key={d.id} className="flex items-center gap-3 py-1.5">
                            <span className="w-1.5 h-4 rounded-full bg-emerald-500/50 shrink-0" />
                            <span className="text-xs text-slate-500 shrink-0">
                              {format(parseISO(d.date), 'dd MMM yyyy')}
                            </span>
                            <span className="text-sm text-slate-300 flex-1 min-w-0 truncate">
                              {d.description || '-'}
                            </span>
                            <span className="text-sm font-medium text-emerald-400 shrink-0">
                              +{fmt(d.amount)}
                            </span>
                            <button
                              onClick={() => deleteDeposit(goal.id, d.id)}
                              className="text-xs text-slate-700 hover:text-red-400 px-1 transition-colors"
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Goal Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-5">
              {editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Name</span>
                <input
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  placeholder="e.g. Emergency Fund"
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Target Amount</span>
                <input
                  type="number" min="0" step="0.01"
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={goalForm.targetAmount || ''}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: parseFloat(e.target.value) || 0 })}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Contribution</span>
                  <input
                    type="number" min="0" step="0.01"
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={goalForm.amount || ''}
                    onChange={(e) => setGoalForm({ ...goalForm, amount: parseFloat(e.target.value) || 0 })}
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Frequency</span>
                  <select
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={goalForm.frequency}
                    onChange={(e) => setGoalForm({ ...goalForm, frequency: e.target.value as Frequency })}
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="FORTNIGHTLY">Fortnightly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ONE_OFF">One-off</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Start Date</span>
                <input
                  type="date"
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={goalForm.startDate}
                  onChange={(e) => setGoalForm({ ...goalForm, startDate: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Notes <span className="text-slate-600">(optional)</span>
                </span>
                <input
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={goalForm.notes ?? ''}
                  onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value || null })}
                />
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGoalForm(false)}
                className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-100 text-sm py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveGoal}
                disabled={saving || !goalForm.name || !goalForm.targetAmount || !goalForm.amount}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : editingGoal ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-5">Log Deposit</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Amount</span>
                  <input
                    type="number" min="0" step="0.01"
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={depositForm.amount || ''}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: parseFloat(e.target.value) || 0 })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Date</span>
                  <input
                    type="date"
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    value={depositForm.date}
                    onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Description <span className="text-slate-600">(optional)</span>
                </span>
                <input
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={depositForm.description}
                  onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
                  placeholder="e.g. Weekly transfer"
                />
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDepositForm(false)}
                className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-100 text-sm py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveDeposit}
                disabled={saving || !depositForm.amount}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Log Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
