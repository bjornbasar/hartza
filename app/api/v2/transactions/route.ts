import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for new transactions
const createTransactionSchema = z.object({
  amountCents: z.number().int(),
  description: z.string().min(1).max(255),
  category: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTransactionSchema.parse(body);

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amountCents: validatedData.amountCents,
        description: validatedData.description,
        category: validatedData.category,
        type: validatedData.type,
        date: new Date(validatedData.date),
        source: 'MANUAL'
      }
    });

    // Update monthly budget totals
    const transactionDate = new Date(validatedData.date);
    const year = transactionDate.getFullYear();
    const month = transactionDate.getMonth() + 1;

    await prisma.monthlyBudget.upsert({
      where: {
        userId_year_month: {
          userId: user.id,
          year,
          month
        }
      },
      update: validatedData.type === 'INCOME' 
        ? { incomeCents: { increment: Math.abs(validatedData.amountCents) } }
        : { expenseCents: { increment: Math.abs(validatedData.amountCents) } },
      create: {
        userId: user.id,
        year,
        month,
        incomeCents: validatedData.type === 'INCOME' ? Math.abs(validatedData.amountCents) : 0,
        expenseCents: validatedData.type === 'EXPENSE' ? Math.abs(validatedData.amountCents) : 0,
        savingsCents: 0
      }
    });

    return NextResponse.json({
      id: transaction.id,
      message: 'Transaction added successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create transaction error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const category = searchParams.get('category');
    const type = searchParams.get('type') as 'INCOME' | 'EXPENSE' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const whereClause: any = { userId: user.id };

    if (category) {
      whereClause.category = category;
    }

    if (type) {
      whereClause.type = type;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    // Get transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where: whereClause })
    ]);

    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      amountCents: t.amountCents,
      description: t.description,
      category: t.category,
      type: t.type,
      date: t.date.toISOString(),
      createdAt: t.createdAt.toISOString()
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}