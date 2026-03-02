import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  amount: z.number().positive(),
  date: z.string(),
  description: z.string().nullable().optional(),
  budgetItemId: z.string().min(1),
})

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const data = schema.parse(body)

  const item = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      amount: data.amount,
      date: new Date(data.date),
      description: data.description ?? null,
      budgetItemId: data.budgetItemId,
    },
    include: { budgetItem: { select: { id: true, name: true, category: true } } },
  })

  return NextResponse.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.transaction.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
