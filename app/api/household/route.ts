import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const household = await prisma.household.findUnique({
    where: { id: session.householdId },
    include: {
      members: {
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!household) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: household.id,
    name: household.name,
    joinCode: session.role === 'OWNER' ? household.joinCode : null,
    members: household.members,
  })
}

const updateSchema = z.object({
  name: z.string().min(1),
})

export async function PUT(req: Request) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const data = updateSchema.parse(body)

  const household = await prisma.household.update({
    where: { id: session.householdId },
    data: { name: data.name },
  })

  return NextResponse.json({ id: household.id, name: household.name })
}
