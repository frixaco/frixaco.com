// Home sections <-> URLs. Each section has its own URL (/, /projects, /work, /blog), and scrolling
// into another section replaces it right away. Opened views (/projects/$repo, /blog/$slug, /more)
// belong to their section. "more" is only the hand on the page: its URL is the opened view itself.
import { SECTIONS, type Section } from '#/content/site'

export function sectionFromPath(pathname: string): Section {
  const first = pathname.split('/')[1] ?? ''
  return (SECTIONS as readonly string[]).includes(first) ? (first as Section) : 'about'
}

export const pathForSection = (section: Section) => (section === 'about' ? '/' : `/${section}`)

/** True for an opened view: /projects/letui, /blog/some-post, /more. */
export const isWindowPath = (pathname: string) => /^\/((projects|blog)\/[^/]+|more)\/?$/.test(pathname)

/** Sections the URL can follow the scroll to (scrolling past the hand mustn't open "more"). */
const SCROLLED = SECTIONS.filter((s) => s !== 'more')

const reduceMotion = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** While a programmatic scroll runs, the spy holds still (no URL flicker on the way). */
let scrollingTo: Section | null = null
let scrollTimer = 0

export function scrollToSection(section: Section, smooth = true) {
  const el = document.getElementById(section)
  if (!el) return
  const behavior: ScrollBehavior = smooth && !reduceMotion() ? 'smooth' : 'instant'
  scrollingTo = section
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

/**
 * The last of `sections` whose top has passed a line `share` of the way down the screen. The line
 * moves down with the first scroll, so a short intro keeps "about" at the top of the page. At the
 * very bottom the last section wins, even if it is too short to reach the line.
 */
export function sectionAtScroll(share = 0.25, sections: readonly Section[] = SCROLLED): Section {
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) return sections[sections.length - 1]
  const line = Math.min(window.innerHeight * share, window.scrollY)
  let current: Section = 'about'
  for (const section of sections) {
    const el = document.getElementById(section)
    if (el && el.getBoundingClientRect().top <= line) current = section
  }
  return current
}

export const isProgrammaticScroll = () => scrollingTo !== null
