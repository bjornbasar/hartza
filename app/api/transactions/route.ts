import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  amount: z.number().positive(),
  date: z.string(),
  description: z.string().nullable().optional(),
  budgetItemId: z.string().min(1),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const budgetItemId = searchParams.get('budgetItemId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: Record<string, unknown> = {}
  if (budgetItemId) where.budgetItemId = budgetItemId
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const items = await prisma.transaction.findMany({
    where,
    include: { budgetItem: { select: { id: true, name: true, category: true } } },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const body = await req.json()
  const data = schema.parse(body)

  const item = await prisma.transaction.create({
    data: {
      amount: data.amount,
      date: new Date(data.date),
      description: data.description ?? null,
      budgetItemId: data.budgetItemId,
    },
    include: { budgetItem: { select: { id: true, name: true, category: true } } },
  })

  return NextResponse.json(item, { status: 201 })
}
