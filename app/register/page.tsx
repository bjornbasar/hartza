'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

type Step = 'account' | 'household'
type HouseholdAction = 'create' | 'join'

export default function RegisterPage() {
  const router = useRouter()

  // Step 1 fields
  const [step, setStep] = useState<Step>('account')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 2 fields
  const [action, setAction] = useState<HouseholdAction>('create')
  const [householdName, setHouseholdName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleAccountNext(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setStep('household')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload =
      action === 'create'
        ? { action: 'create', name, email, password, householdName }
        : { action: 'join', name, email, password, joinCode: joinCode.trim().toUpperCase() }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Registration failed')
      setLoading(false)
      return
    }

    // Auto-sign in after registration
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('Registered but could not sign in. Please log in manually.')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image
            src="/images/inline-logo.png"
            alt="Hartza"
            width={140}
            height={38}
            className="object-contain"
            priority
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          {step === 'account' ? (
            <>
              <h1 className="text-lg font-semibold text-slate-100 mb-1">Create account</h1>
              <p className="text-xs text-slate-500 mb-6">Step 1 of 2 — your details</p>

              <form onSubmit={handleAccountNext} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Min 8 characters"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                >
                  Continue
                </button>
              </form>

              <p className="text-xs text-slate-500 text-center mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => { setError(''); setStep('account') }}
                  className="text-slate-500 hover:text-slate-300 transition-colors text-sm"
                >
                  ←
                </button>
                <h1 className="text-lg font-semibold text-slate-100">Your household</h1>
              </div>
              <p className="text-xs text-slate-500 mb-6">Step 2 of 2 — set up or join a household</p>

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Toggle */}
                <div className="flex rounded-lg overflow-hidden border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAction('create')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      action === 'create'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Create new
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('join')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      action === 'join'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Join with code
                  </button>
                </div>

                {action === 'create' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Household name
                    </label>
                    <input
                      type="text"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      required
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      placeholder="e.g. Smith Family"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Join code
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      required
                      autoFocus
                      maxLength={8}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono tracking-widest uppercase"
                      placeholder="ABCD1234"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Ask the household owner for their 8-character code.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                >
                  {loading ? 'Creating account…' : action === 'create' ? 'Create household' : 'Join household'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
