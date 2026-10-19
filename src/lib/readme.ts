// READMEs on the client: fetched once per visit, ahead of the click, so an opened
// project usually has its README before the window finishes growing.
import { getReadme } from '#/server/functions'
import type { Rendered } from '#/server/markdown'

const pending = new Map<string, Promise<Rendered | null>>()
const settled = new Map<string, Rendered | null>()

export function loadReadme(id: string): Promise<Rendered | null> {
  // The server has its own cache; per-visit memory only makes sense in the browser.
  if (typeof window === 'undefined') return getReadme({ data: id }).catch(() => null)
  let promise = pending.get(id)
  if (!promise) {
    promise = getReadme({ data: id })
      .catch(() => null)
      .then((r) => {
        // A failed fetch is tried again on the next open instead of being remembered.
        if (r) {
          settled.set(id, r)
          prefetchReadmeImages(r)
        } else pending.delete(id)
        return r
      })
    pending.set(id, promise)
  }
  return promise
}

/** The README if it has already arrived, so the window can render it without a loading state. */
export const readmeIfReady = (id: string) => settled.get(id)

// Each image is fetched once per visit; its element is held so the browser keeps it in memory.
const warmed = new Map<string, (priority: 'low' | 'auto') => Promise<void>>()
let queue = Promise.resolve()

function warmer(src: string) {
  let started = false
  const img = new Image()
  const done = new Promise<void>((resolve) => (img.onload = img.onerror = () => resolve()))
  const start = (priority: 'low' | 'auto') => {
    if (started) return done
    started = true
    img.fetchPriority = priority
    img.src = src
    return done
  }
  // One at a time in the background, so they never compete with the page or each other.
  queue = queue.then(() => start('low'))
  return start
}

/** Fetches a README's images (in the background, or `now` for an imminent open). */
function warmImages(r: Rendered | null, now = false) {
  for (const [, raw] of r?.html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g) ?? []) {
    const src = raw.replace(/&amp;/g, '&')
    let start = warmed.get(src)
    if (!start) warmed.set(src, (start = warmer(src)))
    if (now) void start('auto')
  }
}

/**
 * Once the page is idle, every README's images: they're there when a project opens. Only with a
 * mouse on a fast connection: the screenshots weigh megabytes, and on a phone's data plan they
 * load when a project is actually opened.
 */
function prefetchReadmeImages(r: Rendered | null) {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  if (nav.connection?.saveData || (nav.connection?.effectiveType ?? '4g') !== '4g') return
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const idle = (fn: () => void) =>
    typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1000)
  idle(() => warmImages(r))
}

/** Pointing at a card: its images jump the queue. */
export function warmReadme(id: string) {
  void loadReadme(id).then((r) => warmImages(r, true))
}
