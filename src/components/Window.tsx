// An opened view (project README, blog post): a window that grows out of the card or
// row it was opened from and shrinks back into it. The page stays mounted underneath,
// so closing returns to exactly where you were. Desktop: below the app bar; phones: full screen.
//
// Motion: the window is laid out at its final size; the animation only moves it
// (translate) and reveals it (clip-path), so text never scales. Both run on the
// compositor, and WAAPI lets a close interrupt an open mid-flight from where it is.
//
// It is one solid object the whole way (a container transform): it starts as a copy of
// the card or row, the copy dissolves into the window's own content early in the trip,
// and on close the copy returns early, so the window lands as the card and hands off
// to the real one on an identical frame. Nothing fades as it lands.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { ShrinkIcon } from './icons'

export const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)' // iOS-like sheet curve
const OPEN_MS = 460
const CLOSE_MS = 360
// Copy ↔ content: a fade-through, not a crossfade (two unrelated layouts at 50% read as
// a double exposure). What leaves goes first and fast; what arrives follows, and both are
// done while the window is still travelling fast. Leaving is linear (an even fade reads
// as one), arriving eases out.
const OUT_MS = 100
const IN_DELAY_MS = 70
const IN_MS = 180
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

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

/** A static copy of the source, pixel-matched outside its page context. */
function copyOf(source: HTMLElement) {
  const copy = source.cloneNode(true) as HTMLElement
  freezeSubgrids(source, copy)
  copy.removeAttribute('data-window-source')
  for (const el of [copy, ...copy.querySelectorAll('[id]')]) el.removeAttribute('id')
  for (const img of copy.querySelectorAll('img')) img.loading = 'eager'
  const r = source.getBoundingClientRect()
  const s = getComputedStyle(source)
  Object.assign(copy.style, {
    width: `${r.width}px`,
    height: `${r.height}px`,
    margin: '0',
    // A blog row takes its fill from the panel around it, and its divider from `li + li`.
    background: backdrop(source),
    borderTop: s.borderTop,
  })
  return copy
}

/** Subgrid lanes come from the row of cards; the copy has no row, so pin its tracks. */
function freezeSubgrids(src: Element, dst: HTMLElement) {
  const s = getComputedStyle(src)
  if (s.display === 'grid' && s.gridTemplateRows.startsWith('subgrid')) {
    const gap = parseFloat(s.rowGap) || 0
    const end = src.getBoundingClientRect().bottom - parseFloat(s.paddingBottom) - parseFloat(s.borderBottomWidth)
    const tops = [...src.children].map((c) => c.getBoundingClientRect().top)
    dst.style.display = 'grid'
    dst.style.rowGap = `${gap}px`
    dst.style.gridTemplateRows = tops.map((top, i) => `${(i + 1 < tops.length ? tops[i + 1] - gap : end) - top}px`).join(' ')
  }
  ;[...src.children].forEach((c, i) => freezeSubgrids(c, dst.children[i] as HTMLElement))
}

function backdrop(el: Element | null): string {
  for (; el; el = el.parentElement) {
    const bg = getComputedStyle(el).backgroundColor
    if (bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg
  }
  return 'var(--color-bg-panel)'
}

export function Window(props: WindowProps) {
  const { source, open, onClose, onExited, children } = props
  const win = useRef<HTMLDivElement>(null)
  const ghost = useRef<HTMLDivElement>(null)
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
    const clear = () =>
      [el, ghost.current, scroll.current].forEach((node) => node?.getAnimations().forEach((a) => a.cancel()))
    clear()
    const { deepLink } = props
    const sourceEl = document.querySelector<HTMLElement>(`[data-window-source="${source}"]`)
    const from = deepLink || reduced() ? null : fromSource(el, sourceEl)
    if (from && sourceEl) {
      // Frame one is the card itself; its copy gives way to the window's content as it grows.
      ghost.current!.replaceChildren(copyOf(sourceEl))
      anim.current = el.animate([from, FULL], { duration: OPEN_MS, easing: EASE })
      ghost.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, easing: 'linear', fill: 'forwards' })
      scroll.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: IN_MS,
        delay: IN_DELAY_MS,
        easing: EASE_OUT,
        fill: 'backwards',
      })
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
    // Travelling home, the same fade-through mirrored: the content leaves, then the card's
    // copy returns, each from its live opacity (an interrupted open may be mid-swap), so
    // the window lands solid as the card. Without a path (reduced motion, no source) the
    // window just fades out.
    const live = (node: Element) => Number(getComputedStyle(node).opacity)
    let fade: Animation | null = null
    if (geometry && sourceEl) {
      const content = scroll.current
      if (content) {
        const opacity = live(content)
        for (const a of content.getAnimations()) a.cancel()
        content.animate([{ opacity }, { opacity: 0 }], {
          duration: Math.min(OUT_MS, remaining * 0.4) * opacity,
          easing: 'linear',
          fill: 'forwards',
        })
      }
      const g = ghost.current!
      const opacity = live(g)
      for (const a of g.getAnimations()) a.cancel()
      g.replaceChildren(copyOf(sourceEl))
      g.animate([{ opacity }, { opacity: 1 }], {
        duration: Math.min(IN_MS, remaining * 0.5) * (1 - opacity),
        delay: Math.min(IN_DELAY_MS, remaining * 0.25) * (1 - opacity),
        easing: EASE_OUT,
        fill: 'both',
      })
    } else {
      const opacity = live(el)
      for (const a of el.getAnimations()) a.cancel()
      fade = el.animate([{ opacity }, { opacity: 0 }], { duration: remaining, easing: 'linear', fill: 'forwards' })
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      const focusTarget = sourceEl?.querySelector<HTMLElement>('a') ?? returnFocus.current
      focusTarget?.focus({ preventScroll: true })
      onExited()
    }
    Promise.all([geometry?.finished, fade?.finished]).then(finish, finish)
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
        <button type="button" className="window-close inset-ring" onClick={onClose} aria-label="Close">
          <ShrinkIcon />
          <span className="window-title">{props.title}</span>
          <span className="window-subtitle">{props.subtitle}</span>
        </button>
        {props.action}
      </div>
      <div ref={scroll} className="window-scroll">
        <div className="window-body">
          {children}
        </div>
      </div>
      {/* The source's copy while the window travels (filled imperatively, never by React). */}
      <div ref={ghost} className="window-ghost" aria-hidden="true" inert />
    </div>
  )
}
