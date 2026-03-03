import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  addDays,
  subDays,
  differenceInDays,
  format,
} from 'date-fns'

export type RangeType = 'week' | 'fortnight' | 'month' | '3m' | '6m' | '12m'

export const RANGE_OPTIONS: { value: RangeType; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'fortnight', label: 'Fortnight' },
  { value: 'month', label: 'Month' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
]

// Jan 1 2026 is a Thursday — anchor for all fortnightly calculations
const FORTNIGHT_ANCHOR = new Date('2026-01-01')

export type DateRange = {
  from: Date      // true period start (no padding)
  to: Date        // true period end
  label: string
  paddedFrom: Date
  paddedTo: Date
}

export function computeRange(
  type: RangeType,
  offset: number,
  padding: number,
  now = new Date(),
): DateRange {
  let from: Date
  let to: Date
  let label: string

  switch (type) {
    case 'week': {
      const base = startOfWeek(addWeeks(now, offset), { weekStartsOn: 1 }) // Mon
      from = base
      to = endOfWeek(base, { weekStartsOn: 1 })
      label = `${format(from, 'dd MMM')} – ${format(to, 'dd MMM')}`
      break
    }

    case 'fortnight': {
      // Calculate which fortnight (relative to anchor) contains `now + offset periods`
      const daysDiff = differenceInDays(now, FORTNIGHT_ANCHOR)
      const currentIndex = Math.floor(daysDiff / 14)
      const targetIndex = currentIndex + offset
      from = addDays(FORTNIGHT_ANCHOR, targetIndex * 14)
      to = addDays(from, 13)
      label = `${format(from, 'dd MMM')} – ${format(to, 'dd MMM yyyy')}`
      break
    }

    case 'month': {
      const ref = addMonths(now, offset)
      from = startOfMonth(ref)
      to = endOfMonth(ref)
      label = format(from, 'MMMM yyyy')
      break
    }

    case '3m': {
      from = startOfMonth(addMonths(now, offset * 3))
      to = endOfMonth(addMonths(from, 2))
      label = `${format(from, 'MMM')} – ${format(to, 'MMM yyyy')}`
      break
    }

    case '6m': {
      from = startOfMonth(addMonths(now, offset * 6))
      to = endOfMonth(addMonths(from, 5))
      label = `${format(from, 'MMM')} – ${format(to, 'MMM yyyy')}`
      break
    }

    case '12m': {
      from = startOfMonth(addMonths(now, offset * 12))
      to = endOfMonth(addMonths(from, 11))
      label = `${format(from, 'MMM yyyy')} – ${format(to, 'MMM yyyy')}`
      break
    }
  }

  return {
    from,
    to,
    label,
    paddedFrom: padding > 0 ? subDays(from, padding) : from,
    paddedTo: padding > 0 ? addDays(to, padding) : to,
  }
}

/** X-axis tick formatter adapted to range density */
export function xTickFormatter(type: RangeType): (v: string) => string {
  if (type === 'week' || type === 'fortnight') return (v) => format(new Date(v), 'EEE d')
  if (type === 'month') return (v) => format(new Date(v), 'd')
  if (type === '3m') return (v) => format(new Date(v), 'd MMM')
  return (v) => format(new Date(v), 'MMM yy') // 6m / 12m
}

/** How many ticks to skip so the axis isn't crowded */
export function xTickInterval(type: RangeType): number | 'preserveStartEnd' {
  if (type === 'week') return 0          // every day
  if (type === 'fortnight') return 1     // every 2 days
  if (type === 'month') return 4         // every 5 days
  if (type === '3m') return 6            // weekly
  if (type === '6m') return 13           // fortnightly
  return 30                              // monthly for 12m
}
