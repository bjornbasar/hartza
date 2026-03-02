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
})

export async function GET() {
  const items = await prisma.income.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const body = await req.json()
  const data = schema.parse(body)

  const item = await prisma.income.create({
    data: {
      name: data.name,
      amount: data.amount,
      frequency: data.frequency,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes ?? null,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
