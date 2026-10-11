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
        if (r) settled.set(id, r)
        else pending.delete(id)
        return r
      })
    pending.set(id, promise)
  }
  return promise
}

/** The README if it has already arrived, so the window can render it without a loading state. */
export const readmeIfReady = (id: string) => settled.get(id)

/** Pointing at a card: also start its images, so screenshots are there when it opens. */
export function warmReadme(id: string) {
  void loadReadme(id).then((r) => {
    for (const [, src] of r?.html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g) ?? []) {
      new Image().src = src.replace(/&amp;/g, '&')
    }
  })
}
