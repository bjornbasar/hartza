'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'

const nav = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/cashflow', label: 'Cash Flow', icon: '≋' },
  { href: '/income', label: 'Income', icon: '↑' },
  { href: '/budget', label: 'Budget', icon: '◉' },
  { href: '/savings', label: 'Savings', icon: '⊕' },
  { href: '/transactions', label: 'Transactions', icon: '↔' },
  { href: '/data', label: 'Import / Export', icon: '⇅' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  // Close menu on navigation
  useEffect(() => { setOpen(false) }, [pathname])

  if (!session) return null

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 flex flex-col bg-slate-900 border-r border-slate-800 transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:shrink-0
      `}>
        <div className="px-5 py-6 border-b border-slate-800 flex items-center justify-between">
          <Image
            src="/images/inline-logo.png"
            alt="Hartza"
            width={120}
            height={32}
            className="object-contain"
            priority
          />
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-slate-500 hover:text-slate-200 p-1"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-slate-800 space-y-1">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/settings'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <span className="text-base leading-none">⚙</span>
            Settings
          </Link>

          {session?.user && (
            <div className="px-3 py-2">
              <p className="text-xs text-slate-300 font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            </div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <span className="text-base leading-none">→</span>
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
