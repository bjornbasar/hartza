import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  amount: z.number().positive(),
  frequency: z.enum(['ONE_OFF', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.budgetItem.findUnique({ where: { id } })
  if (!existing || existing.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const data = schema.parse(body)

  const item = await prisma.budgetItem.update({
    where: { id },
    data: {
      name: data.name,
      category: data.category ?? null,
      amount: data.amount,
      frequency: data.frequency,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes ?? null,
      active: data.active ?? true,
    },
  })

  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.budgetItem.findUnique({ where: { id } })
  if (!existing || existing.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.budgetItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
