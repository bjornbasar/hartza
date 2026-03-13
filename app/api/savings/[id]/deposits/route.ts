import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'
import { toUTCDate } from '@/lib/dates'

const schema = z.object({
  amount: z.number().positive(),
  date: z.string(),
  description: z.string().nullable().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const goal = await prisma.savingsGoal.findUnique({ where: { id } })
  if (!goal || goal.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const data = schema.parse(body)

  const deposit = await prisma.savingsDeposit.create({
    data: {
      amount: data.amount,
      date: toUTCDate(data.date),
      description: data.description ?? null,
      savingsGoalId: id,
    },
  })

  return NextResponse.json(deposit, { status: 201 })
}
