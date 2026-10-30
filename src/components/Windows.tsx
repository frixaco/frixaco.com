// The opened views: a project's README, a blog post, and "more".
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Await } from '@tanstack/react-router'
import { more, projectById } from '#/content/site'
import { formatPostDate } from '#/lib/format'
import { readmeIfReady } from '#/lib/readme'
import type { Heading, Rendered } from '#/server/markdown'
import type { PostMeta } from '#/server/content'
import { Underline } from './Paper'
import { Window } from './Window'

interface Presence {
  open: boolean
  deepLink: boolean
  onClose(): void
  onExited(): void
}

export function ProjectWindow({ id, readme, ...presence }: Presence & { id: string; readme: Promise<Rendered | null> }) {
  const project = projectById(id)!
  // Decided once, at open: switching branches mid-window would remount the content.
  const [ready] = useState(() => readmeIfReady(id))
  return (
    <Window
      {...presence}
      label={`${project.repo} README`}
      links={
        <a className="link" href={`https://github.com/${project.repo}`} target="_blank" rel="noopener noreferrer">
          github ↗
        </a>
      }
    >
      {ready !== undefined ? (
        // Already here (prefetched): part of the window's own reveal, no loading state.
        <Readme id={id} rendered={ready} />
      ) : (
        <Suspense fallback={<ProseSkeleton />}>
          <Await promise={readme}>{(r) => <Readme id={id} rendered={r} arriving />}</Await>
        </Suspense>
      )}
    </Window>
  )
}

function Readme({ id, rendered, arriving }: { id: string; rendered: Rendered | null; arriving?: boolean }) {
  const project = projectById(id)!
  const className = `md readme${arriving ? ' arriving' : ''}`
  const article = useRef<HTMLElement>(null)
  // An image still on its way holds its (server-measured) box as a placeholder, not a hole.
  useLayoutEffect(() => {
    for (const img of article.current?.querySelectorAll('img') ?? []) {
      if (img.complete) continue
      img.dataset.loading = ''
      const done = () => delete img.dataset.loading
      img.addEventListener('load', done, { once: true })
      img.addEventListener('error', done, { once: true })
    }
  }, [rendered])
  return rendered ? (
    <article ref={article} className={className} dangerouslySetInnerHTML={{ __html: rendered.html }} />
  ) : (
    // GitHub didn't answer: the card's own copy, and the way to the repo.
    <article className={className}>
      <h1>{project.name}</h1>
      <p>{project.description}</p>
      <p>
        <a className="link" href={`https://github.com/${project.repo}`} target="_blank" rel="noopener noreferrer">
          github ↗
        </a>
      </p>
    </article>
  )
}

function ProseSkeleton() {
  return (
    <div className="prose-skeleton" aria-busy="true" aria-label="Loading README">
      <div>
        <i style={{ width: '32%', height: 32 }} />
        <i style={{ width: '88%' }} />
        <i style={{ width: '64%' }} />
      </div>
      <div>
        <i style={{ width: '24%', height: 24 }} />
        <i style={{ width: '80%' }} />
        <i style={{ width: '56%' }} />
      </div>
    </div>
  )
}

/** The rail lists each part (h2) with its sections (h4), skipping the "Things I learned:"-style labels and repost notes. */
function toc(headings: Heading[]) {
  const groups: Array<{ head: Heading; items: Heading[] }> = []
  for (const h of headings) {
    if (h.depth === 2) groups.push({ head: h, items: [] })
    else if (h.depth === 4 && groups.length && !/:$/.test(h.text) && !/^(Title was|Description was|Originally posted)/.test(h.text)) {
      groups[groups.length - 1].items.push(h)
    }
  }
  return groups
}

export function PostWindow({
  post,
  ...presence
}: Presence & { post: { meta: PostMeta; html: string; headings: Heading[] } }) {
  const scroll = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => toc(post.headings), [post.headings])
  const [current, setCurrent] = useState<string | null>(null)

  // Scroll spy: the last heading that has passed the top of the window.
  useEffect(() => {
    const el = scroll.current
    if (!el) return
    const ids = groups.flatMap((g) => [g.head.id, ...g.items.map((i) => i.id)])
    let frame = 0
    const update = () => {
      frame = 0
      const top = el.getBoundingClientRect().top + 96
      // Before any heading has passed, the first section is current.
      let id: string | null = groups[0]?.items[0]?.id ?? null
      for (const h of ids) {
        const node = document.getElementById(h)
        if (node && node.getBoundingClientRect().top <= top) id = h
      }
      setCurrent(id)
    }
    // At most once a frame.
    const onScroll = () => {
      frame ||= requestAnimationFrame(update)
    }
    update()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [groups])

  const activeGroup = Math.max(
    0,
    groups.findIndex((g) => g.head.id === current || g.items.some((i) => i.id === current)),
  )

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const el = scroll.current
    const target = document.getElementById(id)
    if (!el || !target) return
    const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 24
    el.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return (
    <Window
      {...presence}
      scrollRef={scroll}
      label={post.meta.title}
      nav={
        groups.length > 1 || (groups[0]?.items.length ?? 0) > 0 ? (
          // After the home index: faint, the current part in ink and underlined in pencil.
          <nav className="window-index" aria-label="Contents">
            {groups.map((g, gi) => {
              const open = gi === activeGroup
              return (
                <div key={g.head.id} className="window-index-group" data-open={open || undefined}>
                  <a href={`#${g.head.id}`} onClick={jump(g.head.id)}>
                    {g.head.text}
                    {g.items.length ? null : <Underline on={open} />}
                  </a>
                  {open && g.items.length ? (
                    <div className="window-index-items">
                      {g.items.map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          onClick={jump(item.id)}
                          aria-current={item.id === current ? 'location' : undefined}
                        >
                          {item.text}
                          <Underline on={item.id === current} />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </nav>
        ) : null
      }
    >
      <header className="post-header">
        <time className="paper-caption" dateTime={post.meta.date.slice(0, 10)}>{formatPostDate(post.meta.date)}</time>
        <h1>{post.meta.title}</h1>
        <p>{post.meta.description}</p>
        {post.meta.tags.length ? <p className="paper-caption">{post.meta.tags.join(' · ')}</p> : null}
      </header>
      <article className="md" dangerouslySetInnerHTML={{ __html: post.html }} />
    </Window>
  )
}

/** "more": a short document of name / details sections, like the work roles on Home. */
export function MoreWindow(presence: Presence) {
  const { pc, games, anime, learning } = more
  return (
    <Window {...presence} label="more">
      <div className="more-doc">
        <p className="more-lede">{more.lede}</p>

        <section className="more-section" aria-label={pc.title}>
          <h3 className="paper-label">{pc.title}</h3>
          <dl className="more-specs">
            {pc.specs.map((spec) => (
              <div key={spec.part}>
                <dt>{spec.part}</dt>
                <dd>{spec.model}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="more-section" aria-label={games.title}>
          <h3 className="paper-label">{games.title}</h3>
          <ul className="more-games">
            {games.titles.map((title) => (
              <li key={title}>{title}</li>
            ))}
            <li className="faint">{games.more}</li>
          </ul>
        </section>

        <section className="more-section" aria-label={anime.title}>
          <h3 className="paper-label">{anime.title}</h3>
          <div className="more-body">
            <p className="more-count">
              <span>{anime.count}</span>
              <span>{anime.unit}</span>
            </p>
            <p className="more-note">{anime.note}</p>
          </div>
          <dl className="more-specs more-favorites">
            {anime.favorites.map((f) => (
              <div key={f.kind}>
                <dt>{f.kind}</dt>
                <dd>
                  <ul className="more-games">
                    {f.titles.map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                    {'more' in f ? <li className="faint">{f.more}</li> : null}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="more-section" aria-label={learning.title}>
          <h3 className="paper-label">{learning.title}</h3>
          <ul className="more-learning">
            {learning.items.map((item) => (
              <li key={item.name} className={item.paused ? 'paused' : undefined}>
                <p className="more-item">
                  {item.paused ? (
                    <>
                      <s>{item.name}</s>
                      <span className="more-status">{item.paused}</span>
                    </>
                  ) : (
                    item.name
                  )}
                </p>
                <p className="more-note">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Window>
  )
}
