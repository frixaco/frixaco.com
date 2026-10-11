// Home sections <-> URLs. Each tab has its own URL (/, /projects, /work, /blog, /more);
// the tab highlight follows the scroll position live, and the URL follows it (replace)
// once scrolling settles. Opened views (/projects/$repo, /blog/$slug) belong to their tab.
// "more" is only a collapsed bar on the page: its URL is the opened view itself.
import { useSyncExternalStore } from 'react'
import { SECTIONS, type Section } from '#/content/site'

export function sectionFromPath(pathname: string): Section {
  const first = pathname.split('/')[1] ?? ''
  return (SECTIONS as readonly string[]).includes(first) ? (first as Section) : 'about'
}

export const pathForSection = (section: Section) => (section === 'about' ? '/' : `/${section}`)

/** True for an opened view: /projects/letui, /blog/some-post, /more. */
export const isWindowPath = (pathname: string) => /^\/((projects|blog)\/[^/]+|more)\/?$/.test(pathname)

/** Sections the scroll position can land on (scrolling past the "more" bar mustn't open it). */
const SCROLLED = SECTIONS.filter((s) => s !== 'more')

let active: Section = typeof window === 'undefined' ? 'about' : sectionFromPath(window.location.pathname)
const listeners = new Set<() => void>()

export function setActiveSection(section: Section) {
  if (section === active) return
  active = section
  for (const fn of listeners) fn()
}

/** The highlighted tab; `serverSection` comes from the URL so SSR and hydration agree. */
export function useActiveSection(serverSection: Section) {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => active,
    () => serverSection,
  )
}

const reduceMotion = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** While a programmatic scroll runs, the spy holds still (no tab flicker on the way). */
let scrollingTo: Section | null = null
let scrollTimer = 0

export function scrollToSection(section: Section, smooth = true) {
  const el = document.getElementById(section)
  if (!el) return
  const behavior: ScrollBehavior = smooth && !reduceMotion() ? 'smooth' : 'instant'
  scrollingTo = section
  setActiveSection(section)
  if (section === 'about') window.scrollTo({ top: 0, behavior })
  else el.scrollIntoView({ behavior, block: 'start' })
  // scrollend isn't everywhere yet; a timer is the fallback.
  window.clearTimeout(scrollTimer)
  const done = () => {
    scrollingTo = null
    window.removeEventListener('scrollend', done)
  }
  window.addEventListener('scrollend', done, { once: true })
  scrollTimer = window.setTimeout(done, behavior === 'smooth' ? 1200 : 50)
}

/** The section whose top has passed a line just under the sticky app bar. */
export function sectionAtScroll(): Section {
  const line = (document.querySelector('.appbar')?.getBoundingClientRect().bottom ?? 0) + window.innerHeight * 0.25
  // At the very bottom the last section wins even if it's short.
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) return SCROLLED[SCROLLED.length - 1]
  let current: Section = 'about'
  for (const section of SCROLLED) {
    const el = document.getElementById(section)
    if (el && el.getBoundingClientRect().top <= line) current = section
  }
  return current
}

export const isProgrammaticScroll = () => scrollingTo !== null
