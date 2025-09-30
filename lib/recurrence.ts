import { addDays, addMonths, endOfMonth, isAfter, isBefore, startOfWeek } from "date-fns";

export type Frequency = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";

export interface BudgetItem {
    id: string;
    type: "INCOME" | "EXPENSE";
    amountCents: number;
    frequency: Frequency;
    weeklyDay?: number;       // 0..6
    fortnightAnchor?: Date;   // first occurrence
    monthDay?: number;        // 1..31
    startDate: Date;
    endDate?: Date | null;
}

export interface Period { start: Date; end: Date; }

export function periodFor(date: Date, mode: Frequency, userAnchor?: Date): Period {
    if (mode === "WEEKLY") {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        return { start, end: addDays(start, 6) };
    }
    if (mode === "FORTNIGHTLY") {
        const anchor = userAnchor ?? startOfWeek(date, { weekStartsOn: 1 });
        const diffDays = Math.floor((date.getTime() - anchor.getTime()) / 86400000);
        const k = Math.floor(diffDays / 14);
        const start = addDays(anchor, k * 14);
        return { start, end: addDays(start, 13) };
    }
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    return { start, end: endOfMonth(date) };
}

export function* occurrencesInRange(item: BudgetItem, range: Period): Generator<Date> {
    const activeStart = maxDate(item.startDate, range.start);
    const activeEnd = minDate(item.endDate ?? range.end, range.end);
    if (isAfter(activeStart, activeEnd)) return;

    if (item.frequency === "WEEKLY") {
        const first = nextWeekdayOnOrAfter(activeStart, item.weeklyDay ?? 0);
        for (let d = first; !isAfter(d, activeEnd); d = addDays(d, 7)) yield d;
        return;
    }

    if (item.frequency === "FORTNIGHTLY") {
        const anchor = item.fortnightAnchor ?? item.startDate;
        const n = Math.ceil((activeStart.getTime() - anchor.getTime()) / (14 * 86400000));
        const first = addDays(anchor, Math.max(0, n) * 14);
        for (let d = first; !isAfter(d, activeEnd); d = addDays(d, 14)) yield d;
        return;
    }

    const md = item.monthDay ?? item.startDate.getDate();
    let cur = new Date(activeStart.getFullYear(), activeStart.getMonth(), 1);
    while (!isAfter(cur, activeEnd)) {
        const occ = monthDayOccurrence(cur, md);
        if (!isBefore(occ, activeStart) && !isAfter(occ, activeEnd)) yield occ;
        cur = addMonths(cur, 1);
    }
}

function nextWeekdayOnOrAfter(d: Date, weekday: number): Date {
    const w = d.getDay();
    const delta = (weekday - w + 7) % 7;
    return addDays(d, delta);
}

function monthDayOccurrence(monthRef: Date, md: number): Date {
    const last = endOfMonth(monthRef);
    const lastDay = last.getDate();
    const day = Math.min(md, lastDay);
    return new Date(monthRef.getFullYear(), monthRef.getMonth(), day);
}

function maxDate(a: Date, b: Date) { return isAfter(a, b) ? a : b; }
function minDate(a: Date, b: Date) { return isAfter(a, b) ? b : a; }
