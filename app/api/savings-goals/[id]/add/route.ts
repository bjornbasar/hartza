import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const addMoneySchema = z.object({
  amountCents: z.number().int().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { amountCents } = addMoneySchema.parse(body);

    // Verify the goal belongs to the user
    const goal = await prisma.savingsGoal.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        isActive: true
      }
    });

    if (!goal) {
      return NextResponse.json({ error: 'Savings goal not found' }, { status: 404 });
    }

    // Update the goal's current amount
    const updatedGoal = await prisma.savingsGoal.update({
      where: { id: params.id },
      data: {
        currentCents: {
          increment: amountCents
        }
      }
    });

    // Create a transaction record for this savings contribution
    await prisma.transaction.create({
      data: {
        userId: user.id,
        amountCents: -amountCents, // Negative because it's money going to savings
        description: `Savings: ${goal.name}`,
        category: 'savings',
        type: 'EXPENSE',
        date: new Date(),
        source: 'SAVINGS_GOAL'
      }
    });

    return NextResponse.json({ 
      goal: updatedGoal,
      message: 'Money added to savings goal successfully' 
    });

  } catch (error) {
    console.error('Add money to savings goal error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      error: 'Failed to add money to savings goal' 
    }, { status: 500 });
  }
}