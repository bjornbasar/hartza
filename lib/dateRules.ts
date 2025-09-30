// lib/dateRules.ts

/** If Sat/Sun, move back to Friday */
export function adjustToFridayBeforeIfWeekend(d: Date) {
  const out = new Date(d);
  const dow = out.getDay(); // 0=Sun..6=Sat
  if (dow === 6) out.setDate(out.getDate() - 1);     // Sat -> Fri
  else if (dow === 0) out.setDate(out.getDate() - 2); // Sun -> Fri
  return out;
}

export function maybeAdjustWeekend(d: Date, policy: "FRIDAY_BEFORE" | "AS_IS" ="AS_IS") {
  if (policy === "AS_IS") return d;
  const out = new Date(d);
  const dow = out.getDay(); // 0=Sun..6=Sat
  if (dow === 6) out.setDate(out.getDate() - 1);
  else if (dow === 0) out.setDate(out.getDate() - 2);
  return out;
}

/** Returns the last valid DOM for a month given preferences like [31,30,29,28] */
export function pickMonthDay(year: number, monthZero: number, preferences: number[]) {
  const lastDay = new Date(year, monthZero + 1, 0).getDate(); // 28..31
  for (const pref of preferences) if (pref <= lastDay) return pref;
  return lastDay;
}

/** Compute [start,end) period containing `anchor` for a given mode */
export function periodFor(anchor: Date, mode: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY") {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);

  if (mode === "WEEKLY") {
    const day = (start.getDay() + 6) % 7; // 0=Mon..6=Sun
    start.setDate(start.getDate() - day);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  if (mode === "FORTNIGHTLY") {
    const day = (start.getDay() + 6) % 7;
    const monday = new Date(start);
    monday.setDate(monday.getDate() - day);
    const end = new Date(monday);
    end.setDate(end.getDate() + 14);
    return { start: monday, end };
  }

  // MONTHLY
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { start: monthStart, end: monthEnd };
}

/** True if `d` is the last calendar day in [period.start, period.end) */
export function isCycleLastDay(d: Date, period: { start: Date; end: Date }) {
  const lastDay = new Date(period.end);
  lastDay.setDate(lastDay.getDate() - 1); // inclusive last day
  lastDay.setHours(0, 0, 0, 0);

  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime() === lastDay.getTime();
}

/** If occurrence is on the cycle’s last day, shift to next cycle (period.end) */
export function moveBoundaryToNextCycle(d: Date, period: { start: Date; end: Date }) {
  return isCycleLastDay(d, period) ? new Date(period.end) : d;
}

export function periodBounds(daysBack = 7, daysAhead = 45, now = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - daysBack);

    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + daysAhead);

    return { start, end };
}
