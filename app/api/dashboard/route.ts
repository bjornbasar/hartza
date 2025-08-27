import { NextRequest } from "next/server";
import { PrismaClient, Frequency } from "@prisma/client";
import { getServerSession } from "next-auth";
import { periodFor, occurrencesInRange } from "@/lib/recurrence";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    const { mode, offset }: { mode: Frequency; offset?: number } = await req.json();

    const today = new Date();
    let cursor = new Date(today);
    if (offset && offset !== 0) {
        if (mode === "WEEKLY") cursor.setDate(cursor.getDate() + 7 * offset);
        else if (mode === "FORTNIGHTLY") cursor.setDate(cursor.getDate() + 14 * offset);
        else cursor.setMonth(cursor.getMonth() + offset);
    }

    const period = periodFor(cursor, mode as any, user?.periodAnchor ?? undefined);
    const items = await prisma.budgetItem.findMany({ where: { userId: user!.id, isActive: true } });

    let incomeCents = 0, expenseCents = 0;
    const events: Array<{ id: string; date: string; name: string; amountCents: number; type: "INCOME" | "EXPENSE" }> = [];

    for (const it of items as any[]) {
        for (const occ of occurrencesInRange(it, period)) {
            const amount = it.amountCents;
            if (it.type === "INCOME") incomeCents += amount; else expenseCents += amount;
            events.push({ id: it.id, date: occ.toISOString(), name: it.name, amountCents: amount, type: it.type });
        }
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    const netCents = incomeCents - expenseCents;
    return Response.json({ period, events, totals: { incomeCents, expenseCents, netCents } });
}
