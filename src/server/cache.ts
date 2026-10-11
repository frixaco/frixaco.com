// A tiny in-memory TTL cache for fetched data (READMEs, npm). One server process,
// so this is enough; a failed fetch is not cached and the last good value is kept.
const entries = new Map<string, { value: unknown; expires: number }>()

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = entries.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  try {
    const value = await load()
    entries.set(key, { value, expires: Date.now() + ttlMs })
    return value
  } catch (error) {
    if (hit) return hit.value as T // stale beats nothing
    throw error
  }
}
