'use client'

import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

const nav = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/income', label: 'Income', icon: '↑' },
  { href: '/budget', label: 'Budget', icon: '◉' },
  { href: '/transactions', label: 'Transactions', icon: '↔' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <html lang="en">
      <body className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
          <div className="px-5 py-6 border-b border-slate-800">
            <Image
              src="/images/inline-logo.png"
              alt="Hartza"
              width={120}
              height={32}
              className="object-contain"
              priority
            />
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

          <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-600">
            hartza budget
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
