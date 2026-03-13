/**
 * Convert a date-only string ("2026-03-10") to a JS Date at UTC midnight.
 * This ensures PostgreSQL DATE fields are stored without timezone shift.
 */
export function toUTCDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z')
}

/**
 * Normalize a Date from Prisma (which may be at local midnight due to pg driver)
 * back to UTC midnight. Extracts the local date components and reconstructs in UTC.
 */
export function normalizeDate(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}
