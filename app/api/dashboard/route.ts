// app/api/dashboard/route.ts
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import {
    pickMonthDay,
    maybeAdjustWeekend,
    moveBoundaryToNextCycle,
} from "@/lib/dateRules";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

type Mode = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
type View = "ACTUALS" | "FORECAST";

/* ------------------------------ periods ------------------------------ */

function getPeriod(mode: Mode, offset: number, now = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (mode === "WEEKLY") {
        // Monday start
        const day = (start.getDay() + 6) % 7; // 0=Mon
        start.setDate(start.getDate() - day + offset * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { start, end };
    }

    if (mode === "FORTNIGHTLY") {
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

/* --------------------------- look-back logic --------------------------- */

// ★ Include a small look-back so boundary-shifted items from the previous
//   cycle can slide into *this* cycle.
function lookbackDaysFor(mode: Mode) {
    // 1 day is enough for weekly/fortnightly boundary (last day -> next start).
    // Monthly can need a couple days for EOM weekend adjustments; be generous.
    return mode === "MONTHLY" ? 3 : 1;
}

function withLookback(period: { start: Date; end: Date }, days: number) {
    const lb = new Date(period.start);
    lb.setDate(lb.getDate() - days);
    return { start: lb, end: period.end };
}

/* --------------------------------- API -------------------------------- */

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { mode, offset = 0, view = "ACTUALS" } = (await req.json()) as {
        mode: Mode; offset: number; view?: View;
    };

    const period = getPeriod(mode, offset);

    // Opening balance = sum(all actuals strictly before period.start)
    const openingAgg = await prisma.actualTransaction.aggregate({
        where: { userId: user.id, date: { lt: period.start } },
        _sum: { amountCents: true },
    });
    const openingBalanceCents = openingAgg._sum.amountCents ?? 0;

    /* ------------------------------ ACTUALS ------------------------------ */

    if (view === "ACTUALS") {
        // ★ fetch with look-back window
        const lb = withLookback(period, lookbackDaysFor(mode));
        const raw = await prisma.actualTransaction.findMany({
            where: { userId: user.id, date: { gte: lb.start, lt: lb.end } },
            orderBy: { date: "asc" },
        });

        // apply boundary attribution, then keep only those that land in [period.start, period.end)
        const txns = raw
            .map((t) => {
                const shifted = moveBoundaryToNextCycle(new Date(t.date), period);
                return { ...t, effectiveDate: shifted };
            })
            .filter((t) => t.effectiveDate >= period.start && t.effectiveDate < period.end)
            .sort((a, b) => +a.effectiveDate - +b.effectiveDate);

        const totals = txns.reduce(
            (acc, t) => {
                if (t.amountCents >= 0) acc.incomeCents += t.amountCents;
                else acc.expenseCents += Math.abs(t.amountCents);
                acc.netCents += t.amountCents;
                
                // Track allocation status
                if (t.isAllocated) {
                    acc.allocatedCents += Math.abs(t.amountCents);
                } else if (t.isOnTheDay) {
                    acc.onTheDayCents += Math.abs(t.amountCents);
                } else {
                    acc.unallocatedCents += Math.abs(t.amountCents);
                }
                
                return acc;
            },
            { 
                incomeCents: 0, 
                expenseCents: 0, 
                netCents: 0,
                allocatedCents: 0,
                unallocatedCents: 0,
                onTheDayCents: 0
            }
        );

        // Calculate remaining balance after allocated items
        const remainingBalanceCents = openingBalanceCents + totals.incomeCents - totals.allocatedCents - totals.onTheDayCents;

        const closingBalanceCents = openingBalanceCents + totals.netCents;

        const events = txns.map((t) => ({
            id: t.id,
            date: t.effectiveDate, // show the attributed date (may be period.end)
            name: t.description,
            type: t.amountCents >= 0 ? "INCOME" : "EXPENSE",
            amountCents: Math.abs(t.amountCents),
            source: "ACTUAL" as const,
            isAllocated: t.isAllocated,
            isOnTheDay: t.isOnTheDay,
            budgetItemId: t.budgetItemId,
        }));

        return Response.json({
            period,
            openingBalanceCents,
            closingBalanceCents,
            remainingBalanceCents,
            totals,
            events,
            view,
        });
    }

    /* ----------------------------- FORECAST ------------------------------ */

    // Expand BudgetItems with EOM + weekend rules
    const items = await prisma.budgetItem.findMany({
        where: {
            userId: user.id,
            isActive: true,
            startDate: { lt: period.end },
            OR: [{ endDate: null }, { endDate: { gte: period.start } }],
        },
    });

    // ★ expand with look-back so that last-day occurrences from the previous cycle
    //   (that move to this period) are considered.
    const expandWindow = withLookback(period, lookbackDaysFor(mode));

    function* expandOccurrences(item: any, start: Date, end: Date) {
        const s = new Date(Math.max(new Date(item.startDate).getTime(), start.getTime()));
        const until = item.endDate ? new Date(Math.min(new Date(item.endDate).getTime(), end.getTime())) : end;

        if (item.frequency === "WEEKLY") {
            const first = new Date(s);
            const want = (item.weeklyDay ?? 1) % 7; // 0..6
            while (first.getDay() !== want) first.setDate(first.getDate() + 1);
            for (let d = new Date(first); d < until; d.setDate(d.getDate() + 7)) {
                yield maybeAdjustWeekend(new Date(d));
            }
        } else if (item.frequency === "FORTNIGHTLY") {
            const anchor = new Date(item.fortnightAnchor ?? item.startDate);
            anchor.setHours(0, 0, 0, 0);
            const first = new Date(anchor);
            while (first < s) first.setDate(first.getDate() + 14);
            for (let d = new Date(first); d < until; d.setDate(d.getDate() + 14)) {
                yield maybeAdjustWeekend(new Date(d));
            }
        } else if (item.frequency === "MONTHLY") {
            const base = item.monthDay ?? 1;
            // EOM preferences: 31→[31,30,29,28], 30→[30,29,28], 29→[29,28], 28→[28]
            const preferences =
                base >= 28 ? Array.from({ length: base - 27 }, (_, i) => base - i) : [base];

            let y = s.getFullYear();
            let m = s.getMonth();
            while (true) {
                const dom =
                    preferences.length > 1
                        ? pickMonthDay(y, m, preferences)
                        : Math.min(preferences[0], new Date(y, m + 1, 0).getDate());

                let occ = new Date(y, m, dom);
                occ = maybeAdjustWeekend(occ);

                if (occ >= s && occ < until) yield occ;

                // next month
                m += 1;
                if (m > 11) { m = 0; y += 1; }
                const nextMonthStart = new Date(y, m, 1);
                if (nextMonthStart >= until) break;
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
        console.log("Expanding item", item.id, item.name, expandWindow);
        for (const when of expandOccurrences(item, expandWindow.start, expandWindow.end)) {
            const effective = moveBoundaryToNextCycle(when, period);
            // keep only those that end up in THIS period after boundary rule
            if (effective < expandWindow.start || effective >= expandWindow.end) continue;

            forecastEvents.push({
                id: item.id + "-" + effective.toISOString(),
                date: effective,
                name: item.name,
                type: item.type,
                amountCents: item.amountCents,
                source: "FORECAST",
            });
        }
    }

    // (Optional) also include future-dated actuals in the same expandWindow if desired.
    // Then apply moveBoundaryToNextCycle and the same [start,end) filter.

    forecastEvents.sort((a, b) => +a.date - +b.date);

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
