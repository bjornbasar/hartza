import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createSavingsGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetCents: z.number().int().min(1),
  targetDate: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const goals = await prisma.savingsGoal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ goals });

  } catch (error) {
    console.error('Get savings goals error:', error);
    return NextResponse.json({ error: 'Failed to fetch savings goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createSavingsGoalSchema.parse(body);

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        targetCents: validatedData.targetCents,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
        currentCents: 0
      }
    });

    return NextResponse.json({ goal }, { status: 201 });

  } catch (error) {
    console.error('Create savings goal error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create savings goal' }, { status: 500 });
  }
}