import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  if (id === session.userId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  const member = await prisma.user.findUnique({ where: { id } })
  if (!member || member.householdId !== session.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
