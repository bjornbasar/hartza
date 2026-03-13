import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'
import { toUTCDate, normalizeDate } from '@/lib/dates'

const schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('EXPENSE'),
    amount: z.number().positive(),
    date: z.string(),
    effectiveDate: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    budgetItemId: z.string().optional().nullable(),
  }),
  z.object({
    type: z.literal('INCOME'),
    amount: z.number().positive(),
    date: z.string(),
    effectiveDate: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    incomeId: z.string().nullable().optional(),
  }),
])

export async function GET(req: Request) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const budgetItemId = searchParams.get('budgetItemId')
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  const where: Record<string, unknown> = { householdId: session.householdId }
  if (budgetItemId) where.budgetItemId = budgetItemId
  if (from || to) {
    where.date = {
      ...(from ? { gte: toUTCDate(from) } : {}),
      ...(to   ? { lte: toUTCDate(to) }   : {}),
    }
  }

  const items = await prisma.transaction.findMany({
    where,
    include: {
      budgetItem: { select: { id: true, name: true, category: true } },
      income:     { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  // Normalize dates to UTC midnight for consistent client display
  const normalized = items.map(t => ({
    ...t,
    date: normalizeDate(t.date),
    effectiveDate: t.effectiveDate ? normalizeDate(t.effectiveDate) : null,
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: Request) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = schema.parse(body)

  const item = await prisma.transaction.create({
    data:
      data.type === 'EXPENSE'
        ? {
            type: 'EXPENSE',
            amount: data.amount,
            date: toUTCDate(data.date),
            effectiveDate: data.effectiveDate ? toUTCDate(data.effectiveDate) : null,
            description: data.description ?? null,
            budgetItemId: data.budgetItemId || null,
            householdId: session.householdId,
          }
        : {
            type: 'INCOME',
            amount: data.amount,
            date: toUTCDate(data.date),
            effectiveDate: data.effectiveDate ? toUTCDate(data.effectiveDate) : null,
            description: data.description ?? null,
            incomeId: data.incomeId ?? null,
            householdId: session.householdId,
          },
    include: {
      budgetItem: { select: { id: true, name: true, category: true } },
      income:     { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(item, { status: 201 })
}
