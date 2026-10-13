import { useEffect } from 'react'
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { AppBar } from '#/components/AppBar'
import appCss from '../styles.css?url'

const DESCRIPTION = 'i like engineering software: interfaces, backend and tools.'

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
      <AppBar />
      <Outlet />
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
