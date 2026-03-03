import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { parseCSV } from '@/lib/csv'
import { z } from 'zod'

// ── schemas ──────────────────────────────────────────────────────────────────

const boolish = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === 'true' || v === '1')
  .optional()
  .default(true)

const freq = z.enum(['ONE_OFF', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'])

const incomeSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().positive(),
  frequency: freq,
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  active: boolish,
})

const budgetSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  amount: z.coerce.number().positive(),
  frequency: freq,
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  active: boolish,
})

const transactionSchema = z.object({
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  description: z.string().optional(),
  budgetItem: z.string().optional(),
  income: z.string().optional(),
})

// ── helpers ───────────────────────────────────────────────────────────────────

function parseRows(text: string, filename: string): Record<string, string>[] {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'json') return JSON.parse(text)
  return parseCSV(text)
}

// ── route ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const type = form.get('type') as string
  const file = form.get('file') as File | null

  if (!file || !type) {
    return NextResponse.json({ error: 'Missing type or file' }, { status: 400 })
  }

  const text = await file.text()
  const rows = parseRows(text, file.name)
  const { householdId } = session

  let imported = 0
  const errors: string[] = []

  // ── income ──────────────────────────────────────────────────────────────────
  if (type === 'income') {
    for (let i = 0; i < rows.length; i++) {
      const parsed = incomeSchema.safeParse(rows[i])
      if (!parsed.success) {
        errors.push(`Row ${i + 2}: ${parsed.error.issues.map((e) => e.message).join(', ')}`)
        continue
      }
      const d = parsed.data
      await prisma.income.create({
        data: {
          name: d.name,
          amount: d.amount,
          frequency: d.frequency,
          startDate: new Date(d.startDate),
          endDate: d.endDate ? new Date(d.endDate) : null,
          notes: d.notes || null,
          active: d.active,
          householdId,
        },
      })
      imported++
    }
  }

  // ── budget ───────────────────────────────────────────────────────────────────
  else if (type === 'budget') {
    for (let i = 0; i < rows.length; i++) {
      const parsed = budgetSchema.safeParse(rows[i])
      if (!parsed.success) {
        errors.push(`Row ${i + 2}: ${parsed.error.issues.map((e) => e.message).join(', ')}`)
        continue
      }
      const d = parsed.data
      await prisma.budgetItem.create({
        data: {
          name: d.name,
          category: d.category || null,
          amount: d.amount,
          frequency: d.frequency,
          startDate: new Date(d.startDate),
          endDate: d.endDate ? new Date(d.endDate) : null,
          notes: d.notes || null,
          active: d.active,
          householdId,
        },
      })
      imported++
    }
  }

  // ── transactions ──────────────────────────────────────────────────────────
  else if (type === 'transactions') {
    // Build name → id lookup maps for this household
    const [budgetItems, incomes] = await Promise.all([
      prisma.budgetItem.findMany({ where: { householdId }, select: { id: true, name: true } }),
      prisma.income.findMany({ where: { householdId }, select: { id: true, name: true } }),
    ])
    const budgetMap = new Map(budgetItems.map((b) => [b.name, b.id]))
    const incomeMap = new Map(incomes.map((inc) => [inc.name, inc.id]))

    for (let i = 0; i < rows.length; i++) {
      const parsed = transactionSchema.safeParse(rows[i])
      if (!parsed.success) {
        errors.push(`Row ${i + 2}: ${parsed.error.issues.map((e) => e.message).join(', ')}`)
        continue
      }
      const d = parsed.data
      await prisma.transaction.create({
        data: {
          type: d.type,
          amount: d.amount,
          date: new Date(d.date),
          description: d.description || null,
          budgetItemId: d.budgetItem ? (budgetMap.get(d.budgetItem) ?? null) : null,
          incomeId: d.income ? (incomeMap.get(d.income) ?? null) : null,
          householdId,
        },
      })
      imported++
    }
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  return NextResponse.json({ imported, errors })
}
