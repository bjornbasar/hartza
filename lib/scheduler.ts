// lib/scheduler.ts
import { PrismaClient, BudgetItem, Frequency } from "@prisma/client";
import {
  pickMonthDay,
  periodFor,
  moveBoundaryToNextCycle,
  periodBounds,
  maybeAdjustWeekend,
} from "@/lib/dateRules";

export const prisma = new PrismaClient();

/* ------------------------------ expand logic ------------------------------ */

function* expandWeekly(item: BudgetItem, start: Date, end: Date): Generator<Date> {
    const s = new Date(Math.max(new Date(item.startDate).getTime(), start.getTime()));
    const until = item.endDate ? new Date(Math.min(new Date(item.endDate).getTime(), end.getTime())) : end;

    // 0=Sun..6=Sat; default to Monday if undefined
    const want = (item.weeklyDay ?? 1) % 7;

    const first = new Date(s);
    while (first.getDay() !== want) first.setDate(first.getDate() + 1);

    for (let d = new Date(first); d < until; d.setDate(d.getDate() + 7)) {
        yield maybeAdjustWeekend(d);
    }
}

function* expandFortnightly(item: BudgetItem, start: Date, end: Date): Generator<Date> {
    const s = new Date(Math.max(new Date(item.startDate).getTime(), start.getTime()));
    const until = item.endDate ? new Date(Math.min(new Date(item.endDate).getTime(), end.getTime())) : end;

    const anchor = new Date(item.fortnightAnchor ?? item.startDate);
    anchor.setHours(0, 0, 0, 0);

    const first = new Date(anchor);
    while (first < s) first.setDate(first.getDate() + 14);

    for (let d = new Date(first); d < until; d.setDate(d.getDate() + 14)) {
        yield maybeAdjustWeekend(d);
    }
}

function* expandMonthly(item: BudgetItem, start: Date, end: Date): Generator<Date> {
    const s = new Date(Math.max(new Date(item.startDate).getTime(), start.getTime()));
    const until = item.endDate ? new Date(Math.min(new Date(item.endDate).getTime(), end.getTime())) : end;

    const base = item.monthDay ?? 1;

    // If 28/29/30/31 → EOM preference list; else fixed day
    const preferences =
        base >= 28
            ? Array.from({ length: base - 27 }, (_, i) => base - i) // e.g., 31→[31,30,29,28]
            : [base];

    // iterate month by month
    let y = s.getFullYear();
    let m = s.getMonth();
    while (true) {
        const lastDay = new Date(y, m + 1, 0).getDate();
        const dom =
            preferences.length > 1
                ? pickMonthDay(y, m, preferences)
                : Math.min(preferences[0], lastDay);

        let occ = new Date(y, m, dom);
        occ = maybeAdjustWeekend(occ);

        if (occ >= s && occ < until) yield occ;

        // next month
        m += 1;
        if (m > 11) {
            m = 0;
            y += 1;
        }
        const nextMonthStart = new Date(y, m, 1);
        if (nextMonthStart >= until) break;
    }
}

/**
 * Expand a BudgetItem into concrete dates within [rangeStart, rangeEnd).
 * Applies weekend shifting and EOM rules. Does NOT apply boundary-to-next-cycle;
 * that can be applied later when you know the user's chosen cycle mode.
 */
export function* expandOccurrences(item: BudgetItem, rangeStart: Date, rangeEnd: Date): Generator<Date> {
    if (item.frequency === "WEEKLY") {
        yield* expandWeekly(item, rangeStart, rangeEnd);
    } else if (item.frequency === "FORTNIGHTLY") {
        yield* expandFortnightly(item, rangeStart, rangeEnd);
    } else {
        yield* expandMonthly(item, rangeStart, rangeEnd);
    }
}

/* -------------------------------- generator ------------------------------- */

type BoundaryMode = Frequency | null;

export async function runGenerationForUser(
    userId: string,
    now = new Date(),
    opts?: {
        /** how far back to backfill (days) */
        backfillDays?: number;
        /** how far ahead to generate (days) */
        horizonDays?: number;
        /**
         * If provided, apply the "end-of-cycle falls into next cycle" rule
         * using this mode to compute the period window for each occurrence date.
         * If null/omitted, no boundary shifting is applied at write-time
         * (you can still apply it at read-time in the dashboard).
         */
        applyBoundaryForMode?: BoundaryMode;
    }
) {
    const backfillDays = opts?.backfillDays ?? 7;
    const horizonDays = opts?.horizonDays ?? 45;
    const applyBoundaryForMode = opts?.applyBoundaryForMode ?? null;

    const { start, end } = periodBounds(backfillDays, horizonDays, now);

    const items = await prisma.budgetItem.findMany({
        where: {
            userId,
            isActive: true,
            startDate: { lt: end },
            OR: [{ endDate: null }, { endDate: { gte: start } }],
        },
    });

    let created = 0,
        skipped = 0;

    for (const it of items) {
        for (const when of expandOccurrences(it as BudgetItem, start, end)) {
            // Optionally move boundary occurrences into the next cycle for write-time materialization
            let occ = new Date(when);
            if (applyBoundaryForMode) {
                const p = periodFor(occ, applyBoundaryForMode);
                occ = moveBoundaryToNextCycle(occ, p);
            }

            const amount = it.amountCents * (it.type === "EXPENSE" ? -1 : 1);
            const generatedFrom = `item:${it.id}`;

            try {
                await prisma.actualTransaction.create({
                    data: {
                        userId,
                        date: occ,
                        amountCents: amount,
                        description: it.name,
                        category: null,
                        source: "generated",
                        isGenerated: true,
                        generatedFrom,
                    },
                });
                created++;
            } catch (e: any) {
                // P2002 = unique constraint violation (duplicate) — safe to skip
                if (e?.code === "P2002") skipped++;
                else throw e;
            }
        }
    }

    return { created, skipped, start, end };
}
