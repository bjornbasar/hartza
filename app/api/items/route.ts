// app/api/items/route.ts
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { budgetItemSchema } from "@/lib/schemas";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// (optional) prisma singleton to avoid hot-reload issues in dev
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.user.findUnique({ where: { email: session.user.email } });
}

// GET /api/items → list active items for user
export async function GET() {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const items = await prisma.budgetItem.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: "desc" },
    });

    return Response.json({ items }); // <-- wrapped
}

// POST /api/items → create
export async function POST(req: NextRequest) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    try {
        const body = await req.json();
        const parsed = budgetItemSchema.parse(body);
        const created = await prisma.budgetItem.create({
            data: { ...parsed, userId: user.id },
        });
        return Response.json({ item: created }, { status: 201 }); // <-- wrapped
    } catch (err: any) {
        // zod/prisma errors
        return new Response(err?.message ?? "Invalid payload", { status: 400 });
    }
}
