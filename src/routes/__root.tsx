import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { Drawer } from '@/components/drawer'
import { ModeToggle } from '@/components/mode-toggle'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'frixaco',
      },
      {
        name: 'description',
        content:
          'Rustam Ashurmatov - Software Engineer. Exploring and building cool stuff, interested in everything, breaking free from mediocrity.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const isWIP = false

  return (
    <html lang="en" className="overscroll-none scroll-smooth">
      <head>
        <HeadContent />
      </head>
      <body className="font-ibm-plex-mono bg-cyber-bg relative flex min-h-screen flex-col items-center justify-start text-sm antialiased">
        <div className="flex size-full max-w-2xl flex-col gap-2 px-8">
          <div className="bg-cyber-bg sticky top-0 flex flex-col gap-4 pt-4">
            <div className="border-b-cyber-bg-alt flex items-start justify-between gap-8 border-b pb-4">
              <div className="flex h-8 flex-row items-center justify-start gap-8">
                <h1 className="text-cyber-fg hover:text-cyber-red font-bold tracking-wide">
                  <Link to="/">rustam</Link>
                </h1>

                <span className="bg-cyber-bg-alt hidden h-0.5 w-12 rounded-full md:inline-block"></span>

                <div className="text-cyber-grey flex items-center justify-center gap-6">
                  <h2 className="hover:text-cyber-fg cursor-pointer transition-colors duration-200">
                    <Link to="/">home</Link>
                  </h2>
                  <h2 className="hover:text-cyber-fg cursor-pointer transition-colors duration-200">
                    <Link to="/blog">blog</Link>
                  </h2>
                  <h2 className="hover:text-cyber-fg cursor-pointer transition-colors duration-200">
                    <Link to="/more">more</Link>
                  </h2>
                </div>
              </div>

              <ModeToggle />
            </div>
          </div>

          {children}
        </div>

        {isWIP && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <h1 className="text-center text-4xl font-bold text-white">
              making some changes
              <br />
              will be back soon
              <br />
              keyboard navigation is working though
            </h1>
          </div>
        )}

        <Drawer isOpen={false} />

        <div className="absolute right-0 bottom-0 flex gap-4 p-4">
          <span>
            <a
              className="hover:underline"
              target="_blank"
              href="https://frixaco-nncl2ucfa-frixaco-personal.vercel.app/"
              aria-label="View version 1 of the website"
            >
              v1
            </a>
          </span>
          <span>
            <a
              className="hover:underline"
              target="_blank"
              href="https://frixaco-7uw1r14e8-frixaco-personal.vercel.app/"
              aria-label="View version 2 of the website"
            >
              v2
            </a>
          </span>
        </div>

        {/* <TanStackDevtools */}
        {/*   config={{ */}
        {/*     position: 'bottom-right', */}
        {/*   }} */}
        {/*   plugins={[ */}
        {/*     { */}
        {/*       name: 'Tanstack Router', */}
        {/*       render: <TanStackRouterDevtoolsPanel />, */}
        {/*     }, */}
        {/*   ]} */}
        {/* /> */}
        <Scripts />
      </body>
    </html>
  )
}
