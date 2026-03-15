import { Frequency } from '@prisma/client'
import {
  addDays,
  subDays,
  differenceInDays,
  isBefore,
  isAfter,
} from 'date-fns'

export type Period = { start: Date; end: Date }

/**
 * Returns the current period boundaries for a given frequency.
 * For FORTNIGHTLY, the period is anchored to the item's startDate.
 */
export function getCurrentPeriod(
  frequency: Frequency,
  startDate: Date,
  ref: Date = new Date(),
): Period {
  switch (frequency) {
    case 'WEEKLY': {
      if (isBefore(ref, startDate)) {
        return { start: startDate, end: addDays(startDate, 6) }
      }
      const startDow = startDate.getUTCDay()
      const refDow = ref.getUTCDay()
      const daysSinceLast = ((refDow - startDow) % 7 + 7) % 7
      const periodStart = subDays(ref, daysSinceLast)
      return {
        start: periodStart,
        end: addDays(periodStart, 6),
      }
    }

    case 'FORTNIGHTLY': {
      const daysDiff = differenceInDays(ref, startDate)
      // Handle the case where ref is before startDate
      if (daysDiff < 0) {
        return { start: startDate, end: addDays(startDate, 13) }
      }
      const fortnightIndex = Math.floor(daysDiff / 14)
      const periodStart = addDays(startDate, fortnightIndex * 14)
      return {
        start: periodStart,
        end: addDays(periodStart, 13),
      }
    }

    case 'MONTHLY': {
      if (isBefore(ref, startDate)) {
        const nextMonth = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, startDate.getUTCDate()))
        return { start: startDate, end: subDays(nextMonth, 1) }
      }
      const day = startDate.getUTCDate()
      let periodStart = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), day))
      if (isAfter(periodStart, ref)) {
        periodStart = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, day))
      }
      const nextOcc = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, day))
      const periodEnd = subDays(nextOcc, 1)
      return {
        start: periodStart,
        end: periodEnd,
      }
    }

    case 'ONE_OFF':
      return {
        start: startDate,
        end: startDate,
      }
  }
}

/**
 * Returns the start of the next period after the current one.
 */
export function getNextPeriodStart(
  frequency: Frequency,
  startDate: Date,
  ref: Date = new Date(),
): Date {
  const current = getCurrentPeriod(frequency, startDate, ref)
  return addDays(current.end, 1)
}

export function periodLabel(frequency: Frequency): string {
  switch (frequency) {
    case 'WEEKLY':
      return 'This Week'
    case 'FORTNIGHTLY':
      return 'This Fortnight'
    case 'MONTHLY':
      return 'This Month'
    case 'ONE_OFF':
      return 'One-off'
  }
}

export function frequencyLabel(frequency: Frequency): string {
  switch (frequency) {
    case 'WEEKLY':
      return 'Weekly'
    case 'FORTNIGHTLY':
      return 'Fortnightly'
    case 'MONTHLY':
      return 'Monthly'
    case 'ONE_OFF':
      return 'One-off'
  }
}

/**
 * Normalise any amount to a monthly equivalent.
 * ONE_OFF returns the raw amount (caller decides how to handle).
 */
export function toMonthly(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case 'WEEKLY':
      return amount * (52 / 12)
    case 'FORTNIGHTLY':
      return amount * (26 / 12)
    case 'MONTHLY':
      return amount
    case 'ONE_OFF':
      return amount
  }
}

export function isActiveOn(
  startDate: Date,
  endDate: Date | null,
  ref: Date = new Date(),
): boolean {
  if (startDate && isBefore(ref, startDate)) return false
  if (endDate && isAfter(ref, endDate)) return false
  return true
}

/**
 * Returns the number of periods elapsed since startDate (minimum 1).
 * Before startDate → 1 (first period, accepting early payments).
 * After endDate → total periods that existed.
 */
export function getPeriodsElapsed(
  frequency: Frequency,
  startDate: Date,
  endDate: Date | null,
  ref: Date = new Date(),
): number {
  if (frequency === 'ONE_OFF') return 1

  // Before start: first period (early payment)
  if (isBefore(ref, startDate)) return 1

  // Cap ref to endDate if past
  const effective = endDate && isAfter(ref, endDate) ? endDate : ref
  const days = differenceInDays(effective, startDate)

  switch (frequency) {
    case 'WEEKLY':
      return Math.floor(days / 7) + 1
    case 'FORTNIGHTLY':
      return Math.floor(days / 14) + 1
    case 'MONTHLY': {
      const months =
        (effective.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
        (effective.getUTCMonth() - startDate.getUTCMonth())
      return Math.max(months, 0) + 1
    }
  }
}
