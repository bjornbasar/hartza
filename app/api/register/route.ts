import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    householdName: z.string().min(1),
  }),
  z.object({
    action: z.literal('join'),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    joinCode: z.string().min(1),
  }),
])

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(req: Request) {
  const body = await req.json()
  const data = schema.parse(body)

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(data.password, 12)

  if (data.action === 'create') {
    // Generate a unique join code
    let joinCode = generateJoinCode()
    while (await prisma.household.findUnique({ where: { joinCode } })) {
      joinCode = generateJoinCode()
    }

    const household = await prisma.household.create({
      data: { name: data.householdName, joinCode },
    })

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'OWNER',
        householdId: household.id,
      },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } else {
    const household = await prisma.household.findUnique({
      where: { joinCode: data.joinCode.toUpperCase() },
      include: { _count: { select: { members: true } } },
    })
    if (!household) {
      return NextResponse.json({ error: 'Invalid join code' }, { status: 404 })
    }

    // First person to join an empty household becomes OWNER (handles data migration case)
    const role = household._count.members === 0 ? 'OWNER' : 'MEMBER'

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role,
        householdId: household.id,
      },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  }
}
