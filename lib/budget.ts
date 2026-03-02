import { Frequency } from '@prisma/client'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
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
    case 'WEEKLY':
      return {
        start: startOfWeek(ref, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(ref, { weekStartsOn: 1 }),
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

    case 'MONTHLY':
      return {
        start: startOfMonth(ref),
        end: endOfMonth(ref),
      }

    case 'ONE_OFF':
      return {
        start: startDate,
        end: startDate,
      }
  }
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
  if (isBefore(ref, startDate)) return false
  if (endDate && isAfter(ref, endDate)) return false
  return true
}
