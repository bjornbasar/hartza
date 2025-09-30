// app/api/transactions/allocate/route.ts
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.user.findUnique({ where: { email: session.user.email } });
}

// Bulk allocate/deallocate transactions
export async function POST(req: NextRequest) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { transactionIds, isAllocated, budgetItemId } = body;

    if (!Array.isArray(transactionIds) || typeof isAllocated !== "boolean") {
        return new Response("Invalid payload", { status: 400 });
    }

    // If allocating to a budget item, validate it belongs to the user
    if (isAllocated && budgetItemId) {
        const budgetItem = await prisma.budgetItem.findFirst({
            where: { id: budgetItemId, userId: user.id }
        });
        if (!budgetItem) {
            return new Response("Invalid budget item", { status: 400 });
        }
    }

    // Verify all transactions belong to the user
    const transactions = await prisma.actualTransaction.findMany({
        where: { 
            id: { in: transactionIds }, 
            userId: user.id 
        }
    });

    if (transactions.length !== transactionIds.length) {
        return new Response("Some transactions not found", { status: 400 });
    }

    // Update transactions
    const updated = await prisma.actualTransaction.updateMany({
        where: { 
            id: { in: transactionIds },
            userId: user.id 
        },
        data: {
            isAllocated,
            budgetItemId: isAllocated ? budgetItemId : null,
        }
    });

    return Response.json({ 
        updated: updated.count,
        message: `${updated.count} transactions ${isAllocated ? 'allocated' : 'deallocated'}`
    });
}

// Get allocation summary
export async function GET(req: NextRequest) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = { userId: user.id };
    if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lt = new Date(to);
    }

    // Get allocation summary
    const [allocated, unallocated, onTheDay] = await Promise.all([
        prisma.actualTransaction.aggregate({
            where: { ...where, isAllocated: true, isOnTheDay: false },
            _sum: { amountCents: true },
            _count: true,
        }),
        prisma.actualTransaction.aggregate({
            where: { ...where, isAllocated: false, isOnTheDay: false },
            _sum: { amountCents: true },
            _count: true,
        }),
        prisma.actualTransaction.aggregate({
            where: { ...where, isOnTheDay: true },
            _sum: { amountCents: true },
            _count: true,
        }),
    ]);

    const totalAllocated = allocated._sum.amountCents || 0;
    const totalUnallocated = unallocated._sum.amountCents || 0;
    const totalOnTheDay = onTheDay._sum.amountCents || 0;

    return Response.json({
        period: from && to ? { from, to } : null,
        allocated: {
            amountCents: totalAllocated,
            count: allocated._count,
        },
        unallocated: {
            amountCents: totalUnallocated,
            count: unallocated._count,
        },
        onTheDay: {
            amountCents: totalOnTheDay,
            count: onTheDay._count,
        },
        remainingAfterAllocation: totalUnallocated - totalOnTheDay,
    });
}