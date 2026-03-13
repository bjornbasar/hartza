import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'
import { toUTCDate } from '@/lib/dates'

const schema = z.object({
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  amount: z.number().positive(),
  frequency: z.enum(['ONE_OFF', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.budgetItem.findMany({
    where: { householdId: session.householdId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = schema.parse(body)

  const item = await prisma.budgetItem.create({
    data: {
      name: data.name,
      category: data.category ?? null,
      amount: data.amount,
      frequency: data.frequency,
      startDate: toUTCDate(data.startDate),
      endDate: data.endDate ? toUTCDate(data.endDate) : null,
      notes: data.notes ?? null,
      householdId: session.householdId,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
