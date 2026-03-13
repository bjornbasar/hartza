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
})

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goals = await prisma.savingsGoal.findMany({
    where: { householdId: session.householdId },
    include: { deposits: { orderBy: { date: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(goals)
}

export async function POST(req: Request) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = schema.parse(body)

  const goal = await prisma.savingsGoal.create({
    data: {
      name: data.name,
      targetAmount: data.targetAmount,
      amount: data.amount,
      frequency: data.frequency,
      startDate: toUTCDate(data.startDate),
      notes: data.notes ?? null,
      householdId: session.householdId,
    },
    include: { deposits: true },
  })

  return NextResponse.json(goal, { status: 201 })
}
