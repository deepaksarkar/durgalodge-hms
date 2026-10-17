// src/lib/date-utils.ts
import { format, parseISO, startOfDay, endOfDay, addDays, isBefore, isAfter } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export const HOTEL_TIMEZONE = process.env.HOTEL_TIMEZONE || 'Asia/Kolkata'

/**
 * Returns the current date in the Hotel's timezone (Asia/Kolkata)
 */
export function getHotelNow(): Date {
  return toZonedTime(new Date(), HOTEL_TIMEZONE)
}

/**
 * Returns the current hotel business date as start of day in Asia/Kolkata
 */
export function getHotelBusinessDate(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, HOTEL_TIMEZONE)
  return startOfDay(zoned)
}

/**
 * Formats a Date object or ISO string in Indian standard presentation
 */
export function formatHotelDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  const zoned = toZonedTime(d, HOTEL_TIMEZONE)
  return format(zoned, 'dd MMM yyyy')
}

/**
 * Formats a Date object with time in 12-hour format with AM/PM
 */
export function formatHotelDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  const zoned = toZonedTime(d, HOTEL_TIMEZONE)
  return format(zoned, 'dd MMM yyyy, hh:mm a')
}

/**
 * Formats time only in 12-hour format: hh:mm a (e.g. 02:30 PM)
 */
export function formatHotelTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  const zoned = toZonedTime(d, HOTEL_TIMEZONE)
  return format(zoned, 'hh:mm a')
}

/**
 * Returns current time as HH:mm string in hotel timezone for HTML time inputs
 */
export function getHotelCurrentTimeString(date: Date = new Date()): string {
  const zoned = toZonedTime(date, HOTEL_TIMEZONE)
  return format(zoned, 'HH:mm')
}

/**
 * Combines date string YYYY-MM-DD and time string HH:mm into a Date object in hotel timezone
 */
export function combineDateAndTime(dateStr: string, timeStr?: string): Date {
  const time = timeStr && timeStr.trim() ? timeStr.trim() : '12:00'
  const isoString = `${dateStr}T${time}:00`
  return fromZonedTime(isoString, HOTEL_TIMEZONE)
}

/**
 * Formats for HTML date input: YYYY-MM-DD
 */
export function formatInputDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  const zoned = toZonedTime(d, HOTEL_TIMEZONE)
  return format(zoned, 'yyyy-MM-dd')
}

/**
 * Checks if two date ranges overlap.
 * Range 1: [start1, end1)
 * Range 2: [start2, end2)
 * If either end date is undefined (open-ended indefinite stay), any range starting on or after or overlapping with start conflicts!
 */
export function hasDateOverlap(
  start1: Date,
  end1: Date | null | undefined,
  start2: Date,
  end2: Date | null | undefined
): boolean {
  if (!end1 && !end2) {
    return true
  }
  if (!end1) {
    // Range 1 is open ended from start1 onwards: conflicts if end2 > start1
    return isAfter(end2!, start1)
  }
  if (!end2) {
    // Range 2 is open ended from start2 onwards: conflicts if end1 > start2
    return isAfter(end1, start2)
  }
  return isBefore(start1, end2) && isAfter(end1, start2)
}
