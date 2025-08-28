// app/api/dashboard/route.ts
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();

type Mode = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
type View = "ACTUALS" | "FORECAST";

function getPeriod(mode: Mode, offset: number, now = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (mode === "WEEKLY") {
        // start of week (Mon)
        const day = (start.getDay() + 6) % 7; // 0=Mon
        start.setDate(start.getDate() - day + offset * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { start, end };
    }

    if (mode === "FORTNIGHTLY") {
        // align to nearest fortnight starting from current week's Monday
        const day = (start.getDay() + 6) % 7;
        const monday = new Date(start);
        monday.setDate(monday.getDate() - day);
        monday.setDate(monday.getDate() + offset * 14);
        const end = new Date(monday);
        end.setDate(end.getDate() + 14);
        return { start: monday, end };
    }

    // MONTHLY
    const monthStart = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + offset + 1, 1);
    return { start: monthStart, end: monthEnd };
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { mode, offset = 0, view = "ACTUALS" } = await req.json() as {
        mode: Mode; offset: number; view?: View;
    };

    const period = getPeriod(mode, offset);

    // Opening balance = sum(all actuals strictly before period.start)
    const openingAgg = await prisma.actualTransaction.aggregate({
        where: { userId: user.id, date: { lt: period.start } },
        _sum: { amountCents: true },
    });
    const openingBalanceCents = openingAgg._sum.amountCents ?? 0;

    if (view === "ACTUALS") {
        // Events are actual transactions in period
        const txns = await prisma.actualTransaction.findMany({
            where: { userId: user.id, date: { gte: period.start, lt: period.end } },
            orderBy: { date: "asc" },
        });
        const totals = txns.reduce(
            (acc, t) => {
                if (t.amountCents >= 0) acc.incomeCents += t.amountCents;
                else acc.expenseCents += Math.abs(t.amountCents);
                acc.netCents += t.amountCents;
                return acc;
            },
            { incomeCents: 0, expenseCents: 0, netCents: 0 }
        );

        const closingBalanceCents = openingBalanceCents + totals.netCents;

        const events = txns.map((t) => ({
            id: t.id,
            date: t.date,
            name: t.description,
            type: t.amountCents >= 0 ? "INCOME" : "EXPENSE",
            amountCents: Math.abs(t.amountCents),
            source: "ACTUAL",
        }));

        return Response.json({
            period,
            openingBalanceCents,
            closingBalanceCents,
            totals,
            events,
            view,
        });
    }

    // FORECAST view: expand BudgetItems to occurrences in the period
    const items = await prisma.budgetItem.findMany({
        where: {
            userId: user.id,
            isActive: true,
            startDate: { lt: period.end },
            OR: [{ endDate: null }, { endDate: { gte: period.start } }],
        },
    });

    // Helper: expand an item into dates within [start, end)
    function* expandOccurrences(item: any, start: Date, end: Date) {
        const s = new Date(Math.max(new Date(item.startDate).getTime(), start.getTime()));
        const until = item.endDate ? new Date(Math.min(new Date(item.endDate).getTime(), end.getTime())) : end;

        if (item.frequency === "WEEKLY") {
            // weeklyDay: 0=Sun..6=Sat
            const first = new Date(s);
            const want = item.weeklyDay ?? 1;
            while (first.getDay() !== want) first.setDate(first.getDate() + 1);
            for (let d = new Date(first); d < until; d.setDate(d.getDate() + 7)) {
                yield new Date(d);
            }
        } else if (item.frequency === "FORTNIGHTLY") {
            // fortnightAnchor: 'YYYY-MM-DD' used to align every 14 days
            const anchor = new Date(item.fortnightAnchor ?? item.startDate);
            // find first occurrence >= s by stepping 14 days
            const first = new Date(anchor);
            while (first < s) first.setDate(first.getDate() + 14);
            for (let d = new Date(first); d < until; d.setDate(d.getDate() + 14)) {
                yield new Date(d);
            }
        } else if (item.frequency === "MONTHLY") {
            const day = item.monthDay ?? 1; // 1..31
            const first = new Date(s.getFullYear(), s.getMonth(), day);
            if (first < s) first.setMonth(first.getMonth() + 1);
            for (let d = new Date(first); d < until; d.setMonth(d.getMonth() + 1)) {
                // clamp to month end if needed (e.g., day 31 on shorter months)
                const wanted = new Date(d.getFullYear(), d.getMonth(), day);
                if (wanted.getMonth() === d.getMonth()) yield wanted;
                else yield new Date(d.getFullYear(), d.getMonth() + 1, 0);
            }
        }
    }

    const forecastEvents: Array<{
        id: string;
        date: Date;
        name: string;
        type: "INCOME" | "EXPENSE";
        amountCents: number;
        source: "FORECAST" | "ACTUAL";
    }> = [];

    for (const item of items) {
        for (const when of expandOccurrences(item, period.start, period.end)) {
            forecastEvents.push({
                id: item.id + "-" + when.toISOString(),
                date: when,
                name: item.name,
                type: item.type, // INCOME | EXPENSE from your existing model
                amountCents: item.amountCents,
                source: "FORECAST",
            });
        }
    }

    // Include any future-dated actuals within the period (e.g., scheduled payments already entered)
    const futureActuals = await prisma.actualTransaction.findMany({
        where: { userId: user.id, date: { gte: period.start, lt: period.end } },
        orderBy: { date: "asc" },
    });
    for (const t of futureActuals) {
        forecastEvents.push({
            id: t.id,
            date: t.date,
            name: t.description,
            type: t.amountCents >= 0 ? "INCOME" : "EXPENSE",
            amountCents: Math.abs(t.amountCents),
            source: "ACTUAL",
        });
    }

    // Totals/closing
    forecastEvents.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const totals = forecastEvents.reduce(
        (acc, e) => {
            if (e.type === "INCOME") acc.incomeCents += e.amountCents;
            else acc.expenseCents += e.amountCents;
            acc.netCents = acc.incomeCents - acc.expenseCents;
            return acc;
        },
        { incomeCents: 0, expenseCents: 0, netCents: 0 }
    );
    const closingBalanceCents = openingBalanceCents + totals.netCents;

    return Response.json({
        period,
        openingBalanceCents,
        closingBalanceCents,
        totals,
        events: forecastEvents,
        view,
    });
}
