import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { parseCSV, parseMultiCSV } from '@/lib/csv'
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

function ext(filename: string) {
  return filename.split('.').pop()?.toLowerCase()
}

async function importIncome(
  rows: Record<string, string>[],
  householdId: string,
  errors: string[],
  prefix = '',
) {
  let imported = 0
  for (let i = 0; i < rows.length; i++) {
    const parsed = incomeSchema.safeParse(rows[i])
    if (!parsed.success) {
      errors.push(`${prefix}Row ${i + 2}: ${parsed.error.issues.map((e) => e.message).join(', ')}`)
      continue
    }
    const d = parsed.data
    await prisma.income.create({
      data: {
        name: d.name, amount: d.amount, frequency: d.frequency,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        notes: d.notes || null, active: d.active, householdId,
      },
    })
    imported++
  }
  return imported
}

async function importBudget(
  rows: Record<string, string>[],
  householdId: string,
  errors: string[],
  prefix = '',
) {
  let imported = 0
  for (let i = 0; i < rows.length; i++) {
    const parsed = budgetSchema.safeParse(rows[i])
    if (!parsed.success) {
      errors.push(`${prefix}Row ${i + 2}: ${parsed.error.issues.map((e) => e.message).join(', ')}`)
      continue
    }
    const d = parsed.data
    await prisma.budgetItem.create({
      data: {
        name: d.name, category: d.category || null, amount: d.amount, frequency: d.frequency,
        startDate: new Date(d.startDate),
        endDate: d.endDate ? new Date(d.endDate) : null,
        notes: d.notes || null, active: d.active, householdId,
      },
    })
    imported++
  }
  return imported
}

async function importTransactions(
  rows: Record<string, string>[],
  householdId: string,
  errors: string[],
  prefix = '',
) {
  const [budgetItems, incomes] = await Promise.all([
    prisma.budgetItem.findMany({ where: { householdId }, select: { id: true, name: true } }),
    prisma.income.findMany({ where: { householdId }, select: { id: true, name: true } }),
  ])
  const budgetMap = new Map(budgetItems.map((b) => [b.name, b.id]))
  const incomeMap = new Map(incomes.map((inc) => [inc.name, inc.id]))

  let imported = 0
  for (let i = 0; i < rows.length; i++) {
    const parsed = transactionSchema.safeParse(rows[i])
    if (!parsed.success) {
      errors.push(`${prefix}Row ${i + 2}: ${parsed.error.issues.map((e) => e.message).join(', ')}`)
      continue
    }
    const d = parsed.data
    await prisma.transaction.create({
      data: {
        type: d.type, amount: d.amount, date: new Date(d.date),
        description: d.description || null,
        budgetItemId: d.budgetItem ? (budgetMap.get(d.budgetItem) ?? null) : null,
        incomeId: d.income ? (incomeMap.get(d.income) ?? null) : null,
        householdId,
      },
    })
    imported++
  }
  return imported
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
  const { householdId } = session
  let imported = 0
  const errors: string[] = []

  if (type === 'income') {
    const rows = ext(file.name) === 'json' ? JSON.parse(text) : parseCSV(text)
    imported = await importIncome(rows, householdId, errors)
  }

  else if (type === 'budget') {
    const rows = ext(file.name) === 'json' ? JSON.parse(text) : parseCSV(text)
    imported = await importBudget(rows, householdId, errors)
  }

  else if (type === 'transactions') {
    const rows = ext(file.name) === 'json' ? JSON.parse(text) : parseCSV(text)
    imported = await importTransactions(rows, householdId, errors)
  }

  else if (type === 'all') {
    if (ext(file.name) === 'json') {
      const data = JSON.parse(text) as {
        income?: Record<string, string>[]
        budget?: Record<string, string>[]
        transactions?: Record<string, string>[]
      }
      imported += await importIncome(data.income ?? [], householdId, errors, '[income] ')
      imported += await importBudget(data.budget ?? [], householdId, errors, '[budget] ')
      // transactions run after income+budget so name lookups find newly imported items
      imported += await importTransactions(data.transactions ?? [], householdId, errors, '[transactions] ')
    } else {
      const sections = parseMultiCSV(text)
      imported += await importIncome(sections.income ?? [], householdId, errors, '[income] ')
      imported += await importBudget(sections.budget ?? [], householdId, errors, '[budget] ')
      imported += await importTransactions(sections.transactions ?? [], householdId, errors, '[transactions] ')
    }
  }

  else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  return NextResponse.json({ imported, errors })
}
