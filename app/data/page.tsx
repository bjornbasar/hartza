'use client'

import { useRef, useState } from 'react'

type DataType = 'income' | 'budget' | 'transactions'

const SECTIONS: { type: DataType; label: string }[] = [
  { type: 'income', label: 'Income' },
  { type: 'budget', label: 'Budget' },
  { type: 'transactions', label: 'Transactions' },
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Section({ type, label }: { type: DataType; label: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null)

  async function handleExport(fmt: 'csv' | 'json') {
    setExporting(fmt)
    const res = await fetch(`/api/export?type=${type}&format=${fmt}`)
    const blob = await res.blob()
    const date = new Date().toISOString().slice(0, 10)
    downloadBlob(blob, `${type}-${date}.${fmt}`)
    setExporting(null)
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setImporting(true)
    setResult(null)

    const form = new FormData()
    form.append('type', type)
    form.append('file', file)

    const res = await fetch('/api/import', { method: 'POST', body: form })
    const data = await res.json()
    setResult(data)
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-slate-300 mb-5">{label}</h2>

      {/* Export */}
      <div className="mb-5">
        <p className="text-xs text-slate-500 mb-2">Export</p>
        <div className="flex gap-2">
          {(['csv', 'json'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={exporting !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 transition-colors uppercase tracking-wide"
            >
              {exporting === fmt ? 'Exporting…' : fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Import */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Import</p>
        <form onSubmit={handleImport} className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json"
            required
            className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 file:cursor-pointer"
          />
          <button
            type="submit"
            disabled={importing}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </form>

        {result && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-emerald-400">
              {result.imported} record{result.imported !== 1 ? 's' : ''} imported
            </p>
            {result.errors.map((err, i) => (
              <p key={i} className="text-xs text-red-400">
                {err}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DataPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-100 mb-2">Import / Export</h1>
      <p className="text-sm text-slate-500 mb-8">
        CSV and JSON formats supported. Exported files match the import schema.
      </p>

      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <Section key={s.type} {...s} />
        ))}
      </div>
    </div>
  )
}
