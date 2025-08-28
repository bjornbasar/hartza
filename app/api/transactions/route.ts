// app/api/transactions/route.ts
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;
    return prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function GET(req: NextRequest) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    // optional query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = { userId: user.id };
    if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lt = new Date(to); // end-exclusive
    }

    const transactions = await prisma.actualTransaction.findMany({
        where,
        orderBy: { date: "desc" },
    });
    return Response.json({ transactions });
}

export async function POST(req: NextRequest) {
    const user = await requireUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    // Minimal validation (use Zod if you like):
    const { date, amountCents, description, category, source } = body;
    if (!date || typeof amountCents !== "number" || !description) {
        return new Response("Invalid payload", { status: 400 });
    }

    const tx = await prisma.actualTransaction.create({
        data: {
            userId: user.id,
            date: new Date(date),
            amountCents: Math.trunc(amountCents), // signed
            description,
            category: category ?? null,
            source: source ?? "manual",
        },
    });
    return Response.json({ transaction: tx }, { status: 201 });
}
