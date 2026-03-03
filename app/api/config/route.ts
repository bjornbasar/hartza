import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await prisma.config.findUnique({ where: { householdId: session.householdId } })
  return NextResponse.json(config ?? { startingBalance: 0, balanceDate: null })
}

const schema = z.object({
  startingBalance: z.number(),
  balanceDate: z.string().nullable().optional(),
})

export async function PUT(req: Request) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = schema.parse(body)

  const config = await prisma.config.upsert({
    where: { householdId: session.householdId },
    update: {
      startingBalance: data.startingBalance,
      balanceDate: data.balanceDate ? new Date(data.balanceDate) : null,
    },
    create: {
      householdId: session.householdId,
      startingBalance: data.startingBalance,
      balanceDate: data.balanceDate ? new Date(data.balanceDate) : null,
    },
  })

  return NextResponse.json(config)
}
