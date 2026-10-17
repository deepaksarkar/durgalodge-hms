// src/lib/kolkata-time.ts
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export const HOTEL_TIMEZONE = process.env.HOTEL_TIMEZONE || 'Asia/Kolkata'

export interface LiveKolkataTime {
  date: Date
  source: 'timeapi' | 'system'
  timeString: string      // HH:mm format for input[type="time"]
  dateString: string      // YYYY-MM-DD format for input[type="date"]
  dateTimeString: string
}

/**
 * Fetches real-time date and time for Asia/Kolkata from:
 * https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata
 * Gracefully falls back to system clock in Asia/Kolkata timezone on failure/timeout.
 */
export async function getLiveKolkataTime(): Promise<LiveKolkataTime> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500) // 2.5 second timeout

    const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata', {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data && data.dateTime) {
        // e.g. "2026-10-07T20:23:40.2730082" in Asia/Kolkata (+05:30)
        const date = fromZonedTime(data.dateTime, HOTEL_TIMEZONE)
        if (!isNaN(date.getTime())) {
          const hours = String(data.hour).padStart(2, '0')
          const minutes = String(data.minute).padStart(2, '0')
          const year = data.year
          const month = String(data.month).padStart(2, '0')
          const day = String(data.day).padStart(2, '0')

          return {
            date,
            source: 'timeapi',
            timeString: `${hours}:${minutes}`,
            dateString: `${year}-${month}-${day}`,
            dateTimeString: data.dateTime,
          }
        }
      }
    }
  } catch {
    // Network error or timeout, safely fall back
  }

  // Graceful fallback to system clock in Asia/Kolkata
  const now = new Date()
  const zoned = toZonedTime(now, HOTEL_TIMEZONE)
  const pad = (n: number) => String(n).padStart(2, '0')

  return {
    date: now,
    source: 'system',
    timeString: `${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`,
    dateString: `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}`,
    dateTimeString: now.toISOString(),
  }
}

/**
 * Calculates the total number of nights from check-in / reservation time to checkout / current time.
 * Takes reservation time as check-in anchor.
 * Counts 1 night minimum, and every 24-hour cycle (or part thereof) as an additional night.
 */
export function calculateStayNights(startTime: Date, endTime: Date): number {
  const diffMs = Math.max(0, endTime.getTime() - startTime.getTime())
  // 1 full night minimum; each elapsed 24-hour block (or part thereof) adds 1 night
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}
