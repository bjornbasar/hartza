import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; depositId: string }> },
) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, depositId } = await params

  const goal = await prisma.savingsGoal.findUnique({ where: { id } })
  if (!goal || goal.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const deposit = await prisma.savingsDeposit.findUnique({ where: { id: depositId } })
  if (!deposit || deposit.savingsGoalId !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.savingsDeposit.delete({ where: { id: depositId } })
  return NextResponse.json({ ok: true })
}
