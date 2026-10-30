import { useEffect } from 'react'
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import type { PostHogConfig } from 'posthog-js'
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
      { name: 'theme-color', content: '#f2eee5' },
      { name: 'color-scheme', content: 'light' },
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

// The player lives in the home layout (_home.tsx), so music keeps playing across its views.
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

  return <Outlet />
}

function NotFound() {
  return (
    <main className="not-found">
      <span className="faint">404</span>
      <Link className="link" to="/">
        frixaco.com
      </Link>
    </main>
  )
}
