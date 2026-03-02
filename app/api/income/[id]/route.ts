import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
  await prisma.income.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
