// Formatting shared by server and client (no locale APIs, so SSR and hydration agree).
import type { YM } from '#/content/site'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** "2026-02-21T16:00:00" -> "feb 21, 2026" */
export function formatPostDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

/** The build month: "present" for the timeline and durations. */
export const BUILD_YM: YM = [Number(__BUILD_DATE__.slice(0, 4)), Number(__BUILD_DATE__.slice(5, 7))]

/** Inclusive month count, e.g. dec 2022 - jun 2023 = 7. */
export const monthsBetween = (a: YM, b: YM) => (b[0] - a[0]) * 12 + (b[1] - a[1]) + 1

/** 15 -> "1y 3mo", 7 -> "7mo", 24 -> "2y" */
export function formatDuration(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y ? `${y}y` : '', m ? `${m}mo` : ''].filter(Boolean).join(' ')
}

/** 58567 -> "58.6 kB" (npm's decimal kilobytes) */
export const formatKB = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`
