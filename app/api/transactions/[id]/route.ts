// app/api/transactions/[id]/route.ts
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

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const tx = await prisma.actualTransaction.findFirst({
        where: { id: params.id, userId: user.id },
        include: {
            budgetItem: true,
        },
    });
    if (!tx) return new Response("Not found", { status: 404 });
    return Response.json({ transaction: tx });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const existing = await prisma.actualTransaction.findFirst({
        where: { id: params.id, userId: user.id },
    });
    if (!existing) return new Response("Not found", { status: 404 });

    const body = await req.json();
    const { date, amountCents, description, category, source, isAllocated, budgetItemId, isOnTheDay } = body;

    // If budgetItemId is provided, validate it belongs to the user
    if (budgetItemId && budgetItemId !== existing.budgetItemId) {
        const budgetItem = await prisma.budgetItem.findFirst({
            where: { id: budgetItemId, userId: user.id }
        });
        if (!budgetItem) {
            return new Response("Invalid budget item", { status: 400 });
        }
    }

    const updated = await prisma.actualTransaction.update({
        where: { id: params.id },
        data: {
            ...(date ? { date: new Date(date) } : {}),
            ...(typeof amountCents === "number" ? { amountCents: Math.trunc(amountCents) } : {}),
            ...(description ? { description } : {}),
            category: category ?? existing.category ?? null,
            source: source ?? existing.source ?? "manual",
            ...(typeof isAllocated === "boolean" ? { isAllocated } : {}),
            ...(budgetItemId !== undefined ? { budgetItemId } : {}),
            ...(typeof isOnTheDay === "boolean" ? { isOnTheDay } : {}),
        },
    });
    return Response.json({ transaction: updated });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const existing = await prisma.actualTransaction.findFirst({
        where: { id: params.id, userId: user.id },
    });
    if (!existing) return new Response("Not found", { status: 404 });

    await prisma.actualTransaction.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
}
