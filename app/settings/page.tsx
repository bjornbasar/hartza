'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

type Member = {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'MEMBER'
  createdAt: string
}

type HouseholdData = {
  id: string
  name: string
  joinCode: string | null
  members: Member[]
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const isOwner = session?.user?.role === 'OWNER'

  const [household, setHousehold] = useState<HouseholdData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/household')
    if (res.ok) {
      const data = await res.json()
      setHousehold(data)
      setEditName(data.name)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/household', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setHousehold((h) => h ? { ...h, name: data.name } : h)
    } else {
      setError('Failed to save name')
    }
    setSaving(false)
  }

  async function handleCopyCode() {
    if (!household?.joinCode) return
    await navigator.clipboard.writeText(household.joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRemoveMember(id: string) {
    if (!confirm('Remove this member?')) return
    setRemovingId(id)
    setError('')
    const res = await fetch(`/api/household/members/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setHousehold((h) => h ? { ...h, members: h.members.filter((m) => m.id !== id) } : h)
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to remove member')
    }
    setRemovingId(null)
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-100 mb-8">Settings</h1>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-6">
          {error}
        </p>
      )}

      {/* Household name */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Household</h2>

        {isOwner ? (
          <form onSubmit={handleSaveName} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        ) : (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Name</p>
            <p className="text-sm text-slate-100">{household?.name}</p>
          </div>
        )}

        {household?.joinCode && (
          <div className="mt-5">
            <p className="text-xs font-medium text-slate-400 mb-1.5">Join code</p>
            <div className="flex items-center gap-3">
              <code className="font-mono text-lg font-bold text-emerald-400 tracking-widest bg-slate-800 px-4 py-2 rounded-lg">
                {household.joinCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="text-xs text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Share this code with people you want to invite.
            </p>
          </div>
        )}
      </section>

      {/* Members */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Members ({household?.members.length ?? 0})
        </h2>

        <ul className="space-y-2">
          {household?.members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
            >
              <div>
                <p className="text-sm text-slate-200 font-medium">{member.name}</p>
                <p className="text-xs text-slate-500">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    member.role === 'OWNER'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {member.role === 'OWNER' ? 'Owner' : 'Member'}
                </span>
                {isOwner && member.id !== session?.user?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removingId === member.id}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                  >
                    {removingId === member.id ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
