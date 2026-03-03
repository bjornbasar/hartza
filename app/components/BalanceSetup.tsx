'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

type Config = {
  startingBalance: number
  balanceDate: string | null
}

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

export default function BalanceSetup({ onSave }: { onSave?: () => void }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ startingBalance: 0, balanceDate: format(new Date(), 'yyyy-MM-dd') })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => { if (!r.ok) throw new Error(`/api/config ${r.status}`); return r.json() })
      .then((d) => {
        setConfig(d)
        if (d.startingBalance !== undefined) {
          setForm({
            startingBalance: d.startingBalance,
            balanceDate: d.balanceDate
              ? format(new Date(d.balanceDate), 'yyyy-MM-dd')
              : format(new Date(), 'yyyy-MM-dd'),
          })

        }
      })
      .catch(console.error)
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startingBalance: Number(form.startingBalance),
          balanceDate: form.balanceDate,
        }),
      })
      if (!res.ok) throw new Error(`/api/config PUT ${res.status}`)
      const d = await res.json()
      setConfig(d)
      setEditing(false)
      onSave?.()
    } catch (e) {
      console.error('Failed to save config:', e)
    } finally {
      setSaving(false)
    }
  }

  const isSet = config && config.balanceDate

  return (
    <>
      {/* Compact display */}
      <button
        onClick={() => setEditing(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
          isSet
            ? 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            : 'border-amber-800 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10'
        }`}
      >
        {isSet ? (
          <>
            <span className="text-slate-500">Balance as of {format(new Date(config.balanceDate!), 'dd MMM yy')}:</span>
            <span className="font-medium text-slate-200">{fmt(config.startingBalance)}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">edit</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            Set starting balance to anchor the chart
          </>
        )}
      </button>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-100 mb-1">Starting balance</h2>
            <p className="text-xs text-slate-500 mb-5">
              Your actual bank balance on a known date. The chart projects forward from here.
            </p>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Balance</span>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={form.startingBalance}
                  onChange={(e) => setForm({ ...form, startingBalance: parseFloat(e.target.value) || 0 })}
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-400 uppercase tracking-wider">As of date</span>
                <input
                  type="date"
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={form.balanceDate}
                  onChange={(e) => setForm({ ...form, balanceDate: e.target.value })}
                />
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 border border-slate-700 text-slate-400 hover:text-slate-100 text-sm py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
