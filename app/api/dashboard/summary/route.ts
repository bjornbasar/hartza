import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_ICONS = {
  food: "🍕",
  housing: "🏠", 
  transportation: "🚗",
  shopping: "🛍️",
  entertainment: "🎬",
  healthcare: "⚕️",
  utilities: "💡",
  salary: "💼",
  freelance: "💻",
  investment: "📈",
  gift: "🎁",
  other: "📦"
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get transactions for current month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Calculate totals
    const incomeCents = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amountCents, 0);

    const expensesCents = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);

    const availableCents = incomeCents - expensesCents;

    // Get savings goals
    const savingsGoals = await prisma.savingsGoal.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedSavingsGoals = savingsGoals.map(goal => ({
      id: goal.id,
      name: goal.name,
      currentCents: goal.currentCents,
      targetCents: goal.targetCents,
      progressPercent: Math.round((goal.currentCents / goal.targetCents) * 100)
    }));

    // Category breakdown for expenses
    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');
    const categoryTotals = new Map<string, number>();

    expenseTransactions.forEach(t => {
      const category = t.category || 'other';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(t.amountCents));
    });

    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([category, amountCents]) => ({
        category,
        amountCents,
        percentage: expensesCents > 0 ? Math.round((amountCents / expensesCents) * 100) : 0,
        icon: CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || "📦"
      }))
      .sort((a, b) => b.amountCents - a.amountCents);

    // Recent transactions (last 10)
    const recentTransactions = transactions.slice(0, 10).map(t => ({
      id: t.id,
      description: t.description,
      amountCents: t.amountCents,
      category: t.category || 'other',
      date: t.date.toISOString(),
      type: t.type
    }));

    const summary = {
      month: startOfMonth.toLocaleDateString('en-NZ', { 
        month: 'long', 
        year: 'numeric' 
      }),
      incomeCents,
      expensesCents,
      availableCents,
      savingsGoals: formattedSavingsGoals,
      categoryBreakdown,
      recentTransactions
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard summary' },
      { status: 500 }
    );
  }
}