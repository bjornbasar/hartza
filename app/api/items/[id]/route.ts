// app/api/items/[id]/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/app/api/items/route"; // reuse singleton
import { budgetItemSchema } from "@/lib/schemas";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.user.findUnique({ where: { email: session.user.email } });
}

// GET /api/items/:id
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const item = await prisma.budgetItem.findFirst({
        where: { id: params.id, userId: user.id, isActive: true },
    });
    if (!item) return new Response("Not found", { status: 404 });

    return Response.json({ item });
}

// PUT /api/items/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const existing = await prisma.budgetItem.findFirst({
        where: { id: params.id, userId: user.id, isActive: true },
    });
    if (!existing) return new Response("Not found", { status: 404 });

    try {
        const body = await req.json();
        const parsed = budgetItemSchema.parse(body);

        const updated = await prisma.budgetItem.update({
            where: { id: params.id },
            data: parsed,
        });
        return Response.json({ item: updated });
    } catch (err: any) {
        return new Response(err?.message ?? "Invalid payload", { status: 400 });
    }
}

// DELETE /api/items/:id  (soft delete)
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const existing = await prisma.budgetItem.findFirst({
        where: { id: params.id, userId: user.id, isActive: true },
    });
    if (!existing) return new Response("Not found", { status: 404 });

    await prisma.budgetItem.update({
        where: { id: params.id },
        data: { isActive: false },
    });

    return Response.json({ ok: true });
}
