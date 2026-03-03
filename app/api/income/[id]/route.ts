import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(['ONE_OFF', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const existing = await prisma.income.findUnique({ where: { id: params.id } })
  if (!existing || existing.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const data = schema.parse(body)

  const item = await prisma.income.update({
    where: { id: params.id },
    data: {
      name: data.name,
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

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.income.findUnique({ where: { id: params.id } })
  if (!existing || existing.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.income.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
