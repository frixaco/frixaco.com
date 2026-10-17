// The opened views: a project's README, a blog post, and "more".
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Await } from '@tanstack/react-router'
import { more, projectById } from '#/content/site'
import { formatPostDate } from '#/lib/format'
import { readmeIfReady } from '#/lib/readme'
import type { Heading, Rendered } from '#/server/markdown'
import type { PostMeta } from '#/server/content'
import { Tags } from './Home'
import { Arrow } from './icons'
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
      source={`project:${id}`}
      label={`${project.repo} README`}
      barClass="on-color"
      barStyle={{ background: project.color }}
      title={project.repo}
      subtitle="README.md"
      action={
        <a className="window-action" href={`https://github.com/${project.repo}`} target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
      }
    >
      <div className="prose-column" style={{ '--project': project.color } as React.CSSProperties}>
        {ready !== undefined ? (
          // Already here (prefetched): part of the window's own reveal, no loading state.
          <Readme id={id} rendered={ready} />
        ) : (
          <Suspense fallback={<ProseSkeleton />}>
            <Await promise={readme}>{(r) => <Readme id={id} rendered={r} arriving />}</Await>
          </Suspense>
        )}
      </div>
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
        <a className="pill" href={`https://github.com/${project.repo}`} target="_blank" rel="noopener noreferrer">
          <span>GitHub</span>
          <Arrow />
        </a>
      </p>
    </article>
  )
}

function ProseSkeleton() {
  return (
    <div className="prose-skeleton" aria-busy="true" aria-label="Loading README">
      <i style={{ width: '32%', height: 32 }} />
      <i style={{ width: '88%' }} />
      <i style={{ width: '64%' }} />
      <i style={{ width: '24%', height: 24, marginTop: 16 }} />
      <i style={{ width: '80%' }} />
      <i style={{ width: '56%' }} />
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
    const update = () => {
      const top = el.getBoundingClientRect().top + 96
      // Before any heading has passed, the first section is current.
      let id: string | null = groups[0]?.items[0]?.id ?? null
      for (const h of ids) {
        const node = document.getElementById(h)
        if (node && node.getBoundingClientRect().top <= top) id = h
      }
      setCurrent(id)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
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
      source={`blog:${post.meta.slug}`}
      label={post.meta.title}
      title="blog"
      subtitle={`${post.meta.slug}.md`}
    >
      <div className="post-layout">
        {groups.length > 1 || (groups[0]?.items.length ?? 0) > 0 ? (
          <nav className="toc" aria-label="Contents">
            {groups.map((g, gi) =>
              gi === activeGroup ? (
                <div key={g.head.id} className="toc-group open">
                  <a className="toc-head" href={`#${g.head.id}`} onClick={jump(g.head.id)}>
                    {g.head.text}
                  </a>
                  {g.items.length ? (
                    <div className="toc-items">
                      {g.items.map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          onClick={jump(item.id)}
                          aria-current={item.id === current ? 'location' : undefined}
                        >
                          {item.text}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <a key={g.head.id} className="toc-group closed" href={`#${g.head.id}`} onClick={jump(g.head.id)}>
                  <span>{g.head.text}</span>
                </a>
              ),
            )}
          </nav>
        ) : null}
        <div
          className="prose-column"
          style={{ '--project': projectById(post.meta.project ?? '')?.color } as React.CSSProperties}
        >
          <header className="post-header">
            <time dateTime={post.meta.date.slice(0, 10)}>{formatPostDate(post.meta.date)}</time>
            <h1>{post.meta.title}</h1>
            <Tags tags={post.meta.tags} />
            <p>{post.meta.description}</p>
          </header>
          <article className="md" dangerouslySetInnerHTML={{ __html: post.html }} />
        </div>
      </div>
    </Window>
  )
}

/** "more": a short document of name / details sections, like the work roles on Home. */
export function MoreWindow(presence: Presence) {
  const { pc, games, anime, learning } = more
  return (
    <Window {...presence} source="more" label="more" barClass="section-bar" title="more" subtitle="">
      <div className="more-doc">
        <p className="more-lede">{more.lede}</p>

        <section className="more-section" aria-label={pc.title}>
          <h3 className="more-name">{pc.title}</h3>
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
          <h3 className="more-name">{games.title}</h3>
          <ul className="more-games">
            {games.titles.map((title) => (
              <li key={title}>{title}</li>
            ))}
            <li className="faint">{games.more}</li>
          </ul>
        </section>

        <section className="more-section" aria-label={anime.title}>
          <h3 className="more-name">{anime.title}</h3>
          <div className="more-body">
            <p className="more-count">
              <span>{anime.count}</span>
              <span>{anime.unit}</span>
            </p>
            <p className="more-note">{anime.note}</p>
          </div>
        </section>

        <section className="more-section" aria-label={learning.title}>
          <h3 className="more-name">{learning.title}</h3>
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
