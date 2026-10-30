// Home: every section on one page (the paper design), plus the opened views (README, post, more) on top of it.
// Child routes only pick the section to scroll to or the view to open.
import { useEffect, useReducer, useRef, type ReactNode } from 'react'
import { createFileRoute, useLocation, useMatch, useNavigate, useRouter } from '@tanstack/react-router'
import { Paper } from '#/components/Paper'
import { MoreWindow, PostWindow, ProjectWindow } from '#/components/Windows'
import {
  isProgrammaticScroll,
  isWindowPath,
  pathForSection,
  scrollToSection,
  sectionAtScroll,
  sectionFromPath,
} from '#/lib/sections'
import { getPosts, getXportNpm } from '#/server/functions'

export const Route = createFileRoute('/_home')({
  // The npm data streams in later: the page doesn't wait for the registry.
  loader: async () => ({ posts: await getPosts(), xportNpm: getXportNpm().catch(() => null) }),
  // Section changes are just scrolling: never re-run this loader for them.
  staleTime: Infinity,
  component: HomeRoute,
})

function HomeRoute() {
  const { posts, xportNpm } = Route.useLoaderData()
  return (
    <>
      <SectionScroll />
      {/* Inside the paper, so the opened views take its colors. */}
      <Paper posts={posts} xportNpm={xportNpm}>
        <WindowHost />
      </Paper>
    </>
  )
}

/** Its own component: the URL changes as you scroll, and only this (not all of Home) should re-render. */
function SectionScroll() {
  useSectionScroll()
  return null
}

/** Navigations that only mirror the scroll position (or a window closing) must not scroll. */
let quiet = false

function useSectionScroll() {
  const pathname = useLocation({ select: (l) => l.pathname })
  const navigate = useNavigate()
  const router = useRouter()
  const first = useRef(true)
  const popped = useRef(false)

  // Back/forward: the router restores the exact scroll position; don't fight it.
  useEffect(
    () =>
      router.history.subscribe(({ action }) => {
        popped.current = action.type === 'BACK' || action.type === 'FORWARD' || action.type === 'GO'
      }),
    [router],
  )

  useEffect(() => {
    const section = sectionFromPath(pathname)
    const wasFirst = first.current
    first.current = false
    if (isWindowPath(pathname) || quiet || popped.current) {
      quiet = false
      popped.current = false
      return
    }
    if (wasFirst && section === 'about') return
    scrollToSection(section, !wasFirst)
  }, [pathname])

  // Scroll spy: the URL follows the scroll position the moment it crosses into another section
  // (checked at most once a frame). The tabs highlight from the URL, so they move with it.
  useEffect(() => {
    let frame = 0
    const sync = () => {
      frame = 0
      if (isProgrammaticScroll() || isWindowPath(window.location.pathname)) return
      const path = pathForSection(sectionAtScroll())
      if (path === window.location.pathname) return
      quiet = true
      void navigate({ to: path, replace: true, resetScroll: false })
    }
    const onScroll = () => {
      frame ||= requestAnimationFrame(sync)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [navigate])
}

/** Keeps a closing window on screen until its exit animation is done. */
function WindowHost() {
  const navigate = useNavigate()
  const project = useMatch({ from: '/_home/projects/$repo', shouldThrow: false })
  const post = useMatch({ from: '/_home/blog/$slug', shouldThrow: false })
  const moreOpen = useMatch({ from: '/_home/more', shouldThrow: false })
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const hydrated = useRef(false)
  useEffect(() => {
    hydrated.current = true
  }, [])

  type Render = (open: boolean, onExited: () => void) => ReactNode
  const kept = useRef<{ key: string; render: Render; deepLink: boolean } | null>(null)

  const close = (to: '/projects' | '/blog') => () => {
    quiet = true
    void navigate({ to, resetScroll: false })
  }

  let current: { key: string; render: Render } | null = null
  if (project?.loaderData) {
    const { readme } = project.loaderData
    const id = project.params.repo
    current = {
      key: `project:${id}`,
      render: (open, onExited) => (
        <ProjectWindow
          id={id}
          readme={readme}
          open={open}
          deepLink={deepLinkFor(`project:${id}`)}
          onClose={close('/projects')}
          onExited={onExited}
        />
      ),
    }
  } else if (post?.loaderData) {
    const data = post.loaderData
    current = {
      key: `blog:${data.meta.slug}`,
      render: (open, onExited) => (
        <PostWindow
          post={data}
          open={open}
          deepLink={deepLinkFor(`blog:${data.meta.slug}`)}
          onClose={close('/blog')}
          onExited={onExited}
        />
      ),
    }
  } else if (moreOpen) {
    current = {
      key: 'more',
      // The "more" bar sits right under the blog: closing lands back there.
      render: (open, onExited) => (
        <MoreWindow open={open} deepLink={deepLinkFor('more')} onClose={close('/blog')} onExited={onExited} />
      ),
    }
  }

  function deepLinkFor(key: string) {
    return kept.current?.key === key ? kept.current.deepLink : !hydrated.current
  }

  if (current) kept.current = { ...current, deepLink: deepLinkFor(current.key) }
  const shown = kept.current
  if (!shown) return null
  return (
    <div key={shown.key} className="window-layer">
      {shown.render(current?.key === shown.key, () => {
        if (kept.current?.key === shown.key) kept.current = null
        rerender()
      })}
    </div>
  )
}
