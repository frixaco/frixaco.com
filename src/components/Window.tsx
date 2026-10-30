// An opened view (project README, blog post, "more"): a sheet of paper over the whole screen,
// faded in over the page and out again. The page stays mounted underneath, so closing returns to
// exactly where you were. WAAPI lets a close interrupt an open mid-fade from where it is.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

const FADE_MS = 160

export interface WindowProps {
  open: boolean
  onClose(): void
  onExited(): void
  /** In the margin column on wide screens (a post's contents). */
  nav?: ReactNode
  /** Next to the way back: in the margin column, or the dock at the bottom on narrow screens. */
  links?: ReactNode
  label: string
  children: ReactNode
  /** Rendered open on page load (a deep link): just there, no fade. */
  deepLink: boolean
  /** The scroll container, for in-window navigation (contents rail). */
  scrollRef?: React.RefObject<HTMLDivElement | null>
}

/** The page under the windows: inert while one is open. */
const page = (inert: boolean) =>
  document.querySelectorAll('.paper > :not(.window-layer)').forEach((el) => el.toggleAttribute('inert', inert))

export function Window({ open, onClose, onExited, nav, links, label, children, deepLink, scrollRef }: WindowProps) {
  const win = useRef<HTMLDivElement>(null)
  const anim = useRef<Animation | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  // Open: fade in (on a deep link, a server-rendered open, just be there).
  useLayoutEffect(() => {
    const el = win.current!
    page(true)
    returnFocus.current = document.activeElement as HTMLElement | null
    anim.current = deepLink ? null : el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: 'ease-out' })
    // The page behind stops scrolling only while the window covers it (html:has(.window[data-covering])):
    // from the end of the open to the start of the close. Locked any longer, iOS Safari clips the
    // page it reveals at the layout viewport, leaving a dark strip behind its toolbar.
    const cover = () => {
      if (el.dataset.open === 'true') el.setAttribute('data-covering', '')
    }
    if (anim.current) anim.current.finished.then(cover, () => {})
    else cover()
    el.focus({ preventScroll: true })
    return () => {
      // StrictMode runs this effect twice in dev: the second run starts from a clean window.
      anim.current?.cancel()
      anim.current = null
      el.removeAttribute('data-covering')
      page(false)
    }
    // Open once per window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close: fade out from wherever the open is.
  useEffect(() => {
    if (open) return
    const el = win.current!
    // The page is live again as soon as closing starts (scrolls, and can take focus back).
    el.removeAttribute('data-covering')
    page(false)
    const opacity = Number(getComputedStyle(el).opacity)
    anim.current?.cancel()
    const fade = el.animate([{ opacity }, { opacity: 0 }], { duration: FADE_MS, easing: 'linear', fill: 'forwards' })
    const finish = () => {
      returnFocus.current?.focus({ preventScroll: true })
      onExited()
    }
    fade.finished.then(finish, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div ref={win} className="window" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} data-open={open}>
      <div ref={scrollRef} className="window-scroll">
        {/* The home page's layout: the margin column, then the column of text. */}
        <div className="window-sheet">
          <aside className="window-aside">
            <div className="window-dock">
              <button type="button" className="link window-back" onClick={onClose}>
                home
              </button>
              {links}
            </div>
            {nav}
          </aside>
          <div className="window-body">{children}</div>
        </div>
      </div>
    </div>
  )
}
