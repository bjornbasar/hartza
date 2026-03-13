import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'
import { toUTCDate } from '@/lib/dates'

const schema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  amount: z.number().positive(),
  frequency: z.enum(['ONE_OFF', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  startDate: z.string(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.savingsGoal.findUnique({ where: { id } })
  if (!existing || existing.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const data = schema.parse(body)

  const goal = await prisma.savingsGoal.update({
    where: { id },
    data: {
      name: data.name,
      targetAmount: data.targetAmount,
      amount: data.amount,
      frequency: data.frequency,
      startDate: toUTCDate(data.startDate),
      notes: data.notes ?? null,
      active: data.active ?? true,
    },
    include: { deposits: { orderBy: { date: 'desc' } } },
  })

  return NextResponse.json(goal)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.savingsGoal.findUnique({ where: { id } })
  if (!existing || existing.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.savingsGoal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
