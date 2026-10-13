// An opened view (project README, blog post): a window that grows out of the card or
// row it was opened from and shrinks back into it. The page stays mounted underneath,
// so closing returns to exactly where you were. Desktop: below the app bar; phones: full screen.
//
// Motion: the window is laid out at its final size; the animation only moves it
// (translate) and reveals it (clip-path), so text never scales. Both run on the
// compositor, and WAAPI lets a close interrupt an open mid-flight from where it is.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { ShrinkIcon } from './icons'

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)' // iOS-like sheet curve
const OPEN_MS = 460
const CLOSE_MS = 360

export interface WindowProps {
  /** Matches `data-window-source` on the element this window grows out of. */
  source: string
  open: boolean
  onClose(): void
  onExited(): void
  barClass?: string
  barStyle?: React.CSSProperties
  title: ReactNode
  subtitle: ReactNode
  action?: ReactNode
  label: string
  children: ReactNode
  /** Rendered open on page load (a deep link): appear without growing out of anything. */
  deepLink: boolean
  /** The scroll container, for in-window navigation (contents rail). */
  scrollRef?: React.RefObject<HTMLDivElement | null>
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Keyframes that place the window over the source element's box. */
function fromSource(win: HTMLElement, source: Element | null): Keyframe | null {
  if (!source) return null
  const a = source.getBoundingClientRect()
  const b = win.getBoundingClientRect()
  // Off screen (e.g. after a deep link): nothing sensible to grow out of.
  if (a.bottom < 0 || a.top > window.innerHeight || a.width === 0) return null
  const dx = a.left - b.left
  const dy = a.top - b.top
  return {
    transform: `translate(${dx}px, ${dy}px)`,
    // Start with the source's own corners (rounded project cards, square post rows).
    clipPath: `inset(0px ${Math.max(0, b.width - a.width)}px ${Math.max(0, b.height - a.height)}px 0px round ${corners(source)})`,
  }
}
function corners(el: Element) {
  const s = getComputedStyle(el)
  return `${s.borderTopLeftRadius} ${s.borderTopRightRadius} ${s.borderBottomRightRadius} ${s.borderBottomLeftRadius}`
}
const FULL: Keyframe = { transform: 'translate(0px, 0px)', clipPath: 'inset(0px 0px 0px 0px round 3px)' }

export function Window(props: WindowProps) {
  const { source, open, onClose, onExited, children } = props
  const win = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const ownScroll = useRef<HTMLDivElement>(null)
  const scroll = props.scrollRef ?? ownScroll
  const anim = useRef<Animation | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  // Open: grow out of the source. On a deep link (server-rendered open) just appear.
  useLayoutEffect(() => {
    const el = win.current!
    // The page behind stops scrolling via CSS (html:has(.window)).
    const page = document.querySelector<HTMLElement>('.home')
    page?.setAttribute('inert', '')
    returnFocus.current = (document.activeElement as HTMLElement) ?? null

    // Measure the window at rest: no transform or clip left over from an earlier run.
    const clear = () => [el, body.current].forEach((node) => node?.getAnimations().forEach((a) => a.cancel()))
    clear()
    const { deepLink } = props
    const from = deepLink || reduced() ? null : fromSource(el, document.querySelector(`[data-window-source="${source}"]`))
    if (from) {
      anim.current = el.animate([from, FULL], { duration: OPEN_MS, easing: EASE })
      // Crossfade off the source instead of covering it with a blank box in one frame.
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear', fill: 'backwards' })
      body.current?.animate(
        [
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 320, delay: 140, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' },
      )
    } else if (!deepLink) {
      anim.current = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' })
    }
    el.focus({ preventScroll: true })
    return () => {
      // StrictMode runs this effect twice in dev: drop this run's animations so the
      // second run measures and animates alone (two stacked opens fight each other).
      clear()
      anim.current = null
      page?.removeAttribute('inert')
    }
    // Open once per window; `source` doesn't change for a mounted window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close: shrink back into the source, from wherever the open animation is.
  useEffect(() => {
    if (open) return
    const el = win.current!
    // The page is live again as soon as closing starts (and can take focus back).
    document.querySelector('.home')?.removeAttribute('inert')
    const sourceEl = document.querySelector<HTMLElement>(`[data-window-source="${source}"]`)
    // Bring the source into view behind the window first (invisible: the window covers the page).
    if (sourceEl) {
      const r = sourceEl.getBoundingClientRect()
      if (r.top < 0 || r.bottom > window.innerHeight) {
        window.scrollTo({ top: window.scrollY + r.top - (window.innerHeight - r.height) / 2, behavior: 'instant' })
      }
    }
    const current = anim.current
    const to = reduced() ? null : fromSource(el, sourceEl)
    let geometry: Animation | null = null
    let remaining = 160
    const interrupted = Boolean(current && current.playState === 'running' && to)
    if (current && interrupted) {
      // Interrupted open: reverse from the live position (same path back), and hold
      // the source position at the end instead of snapping back to full size.
      current.effect?.updateTiming({ fill: 'both' })
      current.reverse()
      geometry = current
      // Time back to the source; an open that hasn't started yet has no current time.
      remaining = Math.max(80, Number(current.currentTime ?? 0))
    } else if (to) {
      current?.cancel()
      geometry = el.animate([FULL, to], { duration: CLOSE_MS, easing: EASE, fill: 'forwards' })
      remaining = CLOSE_MS
    }
    // The content stays while the window travels (the shrinking clip hides it), and the
    // window dissolves over the second half so the card or row underneath shows through
    // as it lands, rather than an empty box popping into the real content on the last frame.
    // Each fade starts from the live opacity, so an interrupted open doesn't flash.
    const fadeFrom = (node: HTMLElement) => Number(getComputedStyle(node).opacity)
    if (body.current) {
      const b = body.current
      const from = fadeFrom(b)
      for (const a of b.getAnimations()) a.cancel()
      b.animate([{ opacity: from }, { opacity: 0 }], {
        duration: Math.min(240, remaining * 0.7),
        easing: 'ease-out',
        fill: 'forwards',
      })
    }
    const opacity = fadeFrom(el)
    // An unfinished fade-in would keep raising the opacity under a delayed fade-out.
    for (const a of el.getAnimations()) if (a !== geometry) a.cancel()
    const travel = Boolean(geometry) && !interrupted
    const fade = el.animate([{ opacity }, { opacity: 0 }], {
      duration: travel ? remaining * 0.6 : remaining,
      delay: travel ? remaining * 0.4 : 0,
      easing: 'linear',
      fill: 'forwards',
    })
    let done = false
    const finish = () => {
      if (done) return
      done = true
      const focusTarget = sourceEl?.querySelector<HTMLElement>('a') ?? returnFocus.current
      focusTarget?.focus({ preventScroll: true })
      onExited()
    }
    Promise.all([geometry?.finished, fade.finished]).then(finish, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      ref={win}
      className="window"
      role="dialog"
      aria-modal="true"
      aria-label={props.label}
      tabIndex={-1}
      data-open={open}
    >
      <div className={`window-bar ${props.barClass ?? ''}`} style={props.barStyle}>
        {/* The whole bar (but its action) shrinks the window, as the card's bar opened it. */}
        <button type="button" className="window-close" onClick={onClose} aria-label="Close">
          <ShrinkIcon />
          <span className="window-title">{props.title}</span>
          <span className="window-subtitle">{props.subtitle}</span>
        </button>
        {props.action}
      </div>
      <div ref={scroll} className="window-scroll">
        <div ref={body} className="window-body">
          {children}
        </div>
      </div>
    </div>
  )
}
