// Formatting shared by server and client (no locale APIs, so SSR and hydration agree).

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** "2026-02-21T16:00:00" -> "feb 21, 2026" */
export function formatPostDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

/** 58567 -> "58.6 kB" (npm's decimal kilobytes) */
export const formatKB = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`
