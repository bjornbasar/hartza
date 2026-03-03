import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'

const schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('EXPENSE'),
    amount: z.number().positive(),
    date: z.string(),
    description: z.string().nullable().optional(),
    budgetItemId: z.string().min(1),
  }),
  z.object({
    type: z.literal('INCOME'),
    amount: z.number().positive(),
    date: z.string(),
    description: z.string().nullable().optional(),
    incomeId: z.string().nullable().optional(),
  }),
])

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!existing || existing.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const data = schema.parse(body)

  const item = await prisma.transaction.update({
    where: { id: params.id },
    data:
      data.type === 'EXPENSE'
        ? {
            type: 'EXPENSE',
            amount: data.amount,
            date: new Date(data.date),
            description: data.description ?? null,
            budgetItemId: data.budgetItemId,
            incomeId: null,
          }
        : {
            type: 'INCOME',
            amount: data.amount,
            date: new Date(data.date),
            description: data.description ?? null,
            incomeId: data.incomeId ?? null,
            budgetItemId: null,
          },
    include: {
      budgetItem: { select: { id: true, name: true, category: true } },
      income:     { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!existing || existing.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.transaction.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
