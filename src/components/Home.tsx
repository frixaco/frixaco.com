// The Home screen: every section of the mock, in order. Tabs in the app bar scroll here.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  GITHUB_URL,
  RESUME_URL,
  TAG_COLORS,
  contacts,
  headline,
  projects,
  roles,
  timelineLabel,
  type Project,
} from '#/content/site'
import { loadReadme, warmReadme } from '#/lib/readme'
import { BUILD_YM, formatDuration, formatPostDate, monthsBetween } from '#/lib/format'
import type { NpmInfo } from '#/server/functions'
import type { PostMeta } from '#/server/content'
import { LetuiStats, SenmeiStats, XportStats } from './ProjectStats'
import { ShapeLab } from './ShapeLab'
import { Arrow, ExpandIcon } from './icons'

export function Home({ posts, npm }: { posts: PostMeta[]; npm: Promise<NpmInfo | null> }) {
  // The READMEs are small: fetch them once the page has settled, so opening a project
  // never waits on GitHub. Their screenshots wait for intent (warmReadme on the card).
  useEffect(() => {
    const fetchAll = () => projects.forEach((p) => void loadReadme(p.id))
    const start = () =>
      typeof requestIdleCallback === 'function' ? requestIdleCallback(fetchAll, { timeout: 3000 }) : setTimeout(fetchAll, 1000)
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    return () => window.removeEventListener('load', start)
  }, [])

  return (
    <main className="home">
      <section id="about" className="section hero-row" aria-label="about">
        <Portrait />
        <ShapeLab />
      </section>

      <section id="projects" className="section" aria-labelledby="projects-title">
        <SectionHeader id="projects-title">projects</SectionHeader>
        <div className="projects-row">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} npm={npm} />
          ))}
        </div>
        <div className="more-github panel">
          <a className="button-accent" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <span>more on github.com/frixaco</span>
            <span>↗</span>
          </a>
        </div>
      </section>

      <section id="work" className="section" aria-labelledby="work-title">
        <SectionHeader id="work-title" aside>
          <a className="link resume-link" href={RESUME_URL} target="_blank" rel="noopener">
            <span className="desktop-only">full resume (pdf) ↗</span>
            <span className="phone-only">resume.pdf ↗</span>
          </a>
        </SectionHeader>
        <Work />
      </section>

      <section id="blog" className="section card-panel" aria-labelledby="blog-title">
        <header className="raised-header">
          <h2 id="blog-title">blog</h2>
        </header>
        <ol className="posts">
          {posts.map((post) => (
            <li key={post.slug} data-window-source={`blog:${post.slug}`}>
              <Link to="/blog/$slug" params={{ slug: post.slug }} resetScroll={false} className="post-row">
                <time dateTime={post.date.slice(0, 10)}>{formatPostDate(post.date)}</time>
                <span className="post-body">
                  <span className="post-title">{post.title}</span>
                  <Tags tags={post.tags} />
                  <span className="post-desc">{post.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Collapsed: everything lives in the window it opens (/more). */}
      <section id="more" className="section card-panel" aria-labelledby="more-title" data-window-source="more">
        <Link to="/more" resetScroll={false} className="raised-header more-bar">
          <ExpandIcon />
          <h2 id="more-title">more</h2>
        </Link>
      </section>

      <footer className="footer">
        <span>last updated {__BUILD_DATE__}</span>
      </footer>
    </main>
  )
}

function SectionHeader({ id, children, aside }: { id: string; children: React.ReactNode; aside?: boolean }) {
  // "work" has the resume link centered in the header, between two equal halves.
  if (aside) {
    return (
      <header className="section-header panel split">
        <h2 id={id}>work</h2>
        {children}
        <span />
      </header>
    )
  }
  return (
    <header className="section-header panel">
      <h2 id={id}>{children}</h2>
    </header>
  )
}

function Portrait() {
  return (
    <div className="portrait panel">
      <img className="avatar" src="/pfp.jpg" alt="Black-and-white manga-style portrait" width={317} height={300} />
      <h1 className="headline">{headline}</h1>
      <a className="pill-accent" href={RESUME_URL} target="_blank" rel="noopener">
        resume ↗
      </a>
      <ul className="contacts">
        {contacts.map((c) => (
          <li key={c.label}>
            <a
              className="contact"
              href={c.href}
              {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer me' } : {})}
            >
              <span className="contact-label">{c.label}</span>
              <span className="contact-value">{c.text}</span>
              {c.label !== 'email' ? <span className="contact-arrow">↗</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Tags({ tags }: { tags: string[] }) {
  return (
    <span className="tags">
      {tags.map((tag) => (
        <span key={tag} className="tag" style={{ background: TAG_COLORS[tag] ?? 'var(--color-cat-stone)' }}>
          {tag}
        </span>
      ))}
    </span>
  )
}

function ProjectCard({ project, npm }: { project: Project; npm: Promise<NpmInfo | null> }) {
  return (
    <article className="project panel" data-window-source={`project:${project.id}`} style={{ '--project': project.color } as React.CSSProperties}>
      <Link
        to="/projects/$repo"
        params={{ repo: project.id }}
        resetScroll={false}
        className="project-bar"
        aria-label={`${project.repo}: open README`}
        onPointerEnter={() => warmReadme(project.id)}
        onFocus={() => warmReadme(project.id)}
      >
        <ExpandIcon />
        <span className="project-repo">{project.repo}</span>
      </Link>
      <div className="project-body">
        {project.id === 'senmei' ? <CompareMedia /> : <div className="media placeholder">gif / image</div>}
        <div className="project-name">
          <h3>{project.name}</h3>
          {project.wip ? (
            <span className="wip">
              <i />
              WIP
            </span>
          ) : null}
        </div>
        <p className="project-desc">{project.description}</p>
        <div className="project-actions">
          <a className="pill" href={`https://github.com/${project.repo}`} target="_blank" rel="noopener noreferrer">
            <span>GitHub</span>
            <Arrow />
          </a>
        </div>
        <div className="project-stats">
          {project.id === 'letui' ? <LetuiStats /> : project.id === 'senmei' ? <SenmeiStats /> : <XportStats npm={npm} />}
        </div>
        <div className="project-tags">
          <Tags tags={project.tags} />
        </div>
      </div>
    </article>
  )
}

/** Before/after split for Senmei: drag the handle (or use the arrow keys). */
function CompareMedia() {
  const [split, setSplit] = useState(50)
  const box = useRef<HTMLDivElement>(null)
  const setFrom = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect()
    setSplit(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setFrom(e.clientX)
  }
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2
    const next = { ArrowLeft: split - step, ArrowRight: split + step, Home: 0, End: 100 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    setSplit(Math.min(100, Math.max(0, next)))
  }
  return (
    <div
      ref={box}
      className="media compare"
      style={{ '--split': `${split}%` } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && setFrom(e.clientX)}
    >
      <div className="compare-side original">
        <img src="/senmei-original.webp" alt="Anime frame at its source 1080p" width={720} height={394} loading="lazy" decoding="async" draggable={false} />
        <span>original</span>
      </div>
      <div className="compare-side upscaled">
        <img src="/senmei-anime4k.webp" alt="Same frame upscaled to 4K by Senmei's Anime4K pipeline" width={1440} height={788} loading="lazy" decoding="async" draggable={false} />
        <span>anime4k</span>
      </div>
      <div
        className="compare-handle"
        role="slider"
        tabIndex={0}
        aria-label="Compare original and anime4k"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(split)}
        onKeyDown={onKey}
      >
        <i className="compare-line" />
        <i className="compare-knob" />
      </div>
    </div>
  )
}

const TIMELINE_START = 2020

function Work() {
  const years = Array.from({ length: BUILD_YM[0] - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i)
  const total = years.length * 12
  const at = (ym: readonly [number, number]) => ((ym[0] - TIMELINE_START) * 12 + (ym[1] - 1)) / total
  const now = at(BUILD_YM) + 1 / total
  return (
    <div className="work">
      <div className="timeline">
        <div className="timeline-label">{timelineLabel}</div>
        <div className="tracks" style={{ '--now': now } as React.CSSProperties}>
          <div className="gridlines" aria-hidden="true">
            {years.slice(1).map((year) => (
              <i key={year} style={{ left: `${at([year, 1]) * 100}%` }} />
            ))}
            <i className="now" style={{ left: `${now * 100}%` }} />
          </div>
          {roles.map((role) => {
            const end = role.end ?? BUILD_YM
            const months = monthsBetween(role.start, end)
            const left = at(role.start)
            const width = months / total
            return (
              <div key={role.dates} className="track">
                <span className="track-name">{role.names.map((n) => n.text).join(', ')}</span>
                <span className="track-lane">
                  <i className="track-bar" style={{ left: `${left * 100}%`, width: `${width * 100}%`, background: role.color }} />
                  <span className="track-duration" style={{ '--end': left + width } as React.CSSProperties}>
                    {formatDuration(months)}
                  </span>
                </span>
              </div>
            )
          })}
          <div className="axis">
            <span />
            <span className="axis-lane">
              {years.map((year) => (
                <span key={year} className={year === BUILD_YM[0] ? 'current' : undefined} style={{ left: `${at([year, 1]) * 100}%` }}>
                  <span className="desktop-only">{year}</span>
                  <span className="phone-only">'{String(year).slice(2)}</span>
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
      <ul className="roles">
        {roles.map((role) => (
          <li key={role.dates} className="role">
            <span className={role.linked ? 'role-name linked' : 'role-name'}>
              {role.names.map((n, i) => (
                <span key={n.text}>
                  {i ? ', ' : ''}
                  {n.href ? (
                    <a href={n.href} target="_blank" rel="noopener noreferrer">
                      {n.text}
                    </a>
                  ) : (
                    n.text
                  )}
                </span>
              ))}
            </span>
            <span className="role-dates">{role.dates}</span>
            <p className="role-text">{role.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
