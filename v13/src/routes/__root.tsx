import { useEffect } from 'react'
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import type { PostHogConfig } from 'posthog-js'
import { AppBar } from '#/components/AppBar'
import appCss from '../styles.css?url'

const DESCRIPTION = 'i like engineering software: interfaces, backend and tools.'

// PostHog (US Cloud). The project key is public: it ships to every browser.
const POSTHOG_KEY = 'phc_mg6WREyxK4GiujQhjPGxEXG3i5Ko7pwdLsLFXwQmuhVF'
const POSTHOG_OPTIONS: Partial<PostHogConfig> = {
  // Same-origin proxy (routes/ingest.$.ts), so ad blockers don't drop events.
  api_host: '/ingest',
  ui_host: 'https://us.posthog.com',
  defaults: '2026-08-30',
  capture_exceptions: true,
  // No cookies or storage, so no consent banner: PostHog tells visitors apart with a daily hash
  // on its servers (needs cookieless mode turned on in the project's settings).
  cookieless_mode: 'always',
  disable_session_recording: true,
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#2b2b2b' },
      { name: 'color-scheme', content: 'dark' },
      { title: 'frixaco' },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: 'frixaco' },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:image', content: '/pfp.jpg' },
    ],
    links: [
      { rel: 'preload', href: '/fonts/PaperMono-Variable.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

// The app bar (and its player) sits outside the routes, so music keeps playing across navigation.
function RootLayout() {
  // Analytics in production builds only, so local dev doesn't pollute the numbers. posthog-js
  // (~100 KB gzipped) loads once the page is idle instead of in the entry bundle.
  useEffect(() => {
    if (!import.meta.env.PROD) return
    const load = () => import('posthog-js').then(({ default: posthog }) => posthog.init(POSTHOG_KEY, POSTHOG_OPTIONS))
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1))
    idle(() => void load())
  }, [])

  // Focus rings only for keyboard users: Tab turns them on, any tap or click turns them off
  // (styles/focus.css gates every ring on [data-keys]).
  useEffect(() => {
    const root = document.documentElement
    const keys = (e: KeyboardEvent) => e.key === 'Tab' && root.setAttribute('data-keys', '')
    const pointer = () => root.removeAttribute('data-keys')
    window.addEventListener('keydown', keys, true)
    window.addEventListener('pointerdown', pointer, true)
    return () => {
      window.removeEventListener('keydown', keys, true)
      window.removeEventListener('pointerdown', pointer, true)
    }
  }, [])

  return (
    <div className="page">
      <Banner />
      <AppBar />
      <Outlet />
    </div>
  )
}

// Marquee: four copies, so half the track is wider than the page and the -50% loop is seamless.
// Screen readers get the first copy only.
const BANNER = '🚧 doing 14th complete redesign and will be focusing on giving more personality 🚧'

function Banner() {
  return (
    <div className="banner">
      <div className="banner-track">
        {[0, 1, 2, 3].map((i) => (
          <p key={i} aria-hidden={i > 0 || undefined}>
            {BANNER}
          </p>
        ))}
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <main className="not-found panel">
      <span className="faint">404</span>
      <Link className="link" to="/">
        frixaco.com
      </Link>
    </main>
  )
}
