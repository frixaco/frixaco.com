// The home page: one column of the site's copy on paper, with pencil marks
// drawn around it (Ink). The column is the sketchbook's measure scaled with the text (--measure,
// 460px at 14px), so the text wraps as it did when the marks were drawn and they land on the same words.
import { Suspense, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { RESUME_URL, SECTIONS, contacts, headline, more, projects, roles, type ProjectId, type Section } from '#/content/site'
import { formatKB, formatPostDate } from '#/lib/format'
import { compose, render, type Mark, type Point } from '#/lib/ink'
import { sectionAtScroll } from '#/lib/sections'
import type { PostMeta } from '#/server/content'
import type { NpmInfo } from '#/server/functions'
import letui from '../../content/stats/letui.json'
import senmei from '../../content/stats/senmei.json'
import xport from '../../content/stats/xport.json'
import underline from '../../content/marks/senmei-underline.json'
import { Await, Link } from '@tanstack/react-router'
import { Ink } from './Ink'
import { Player } from './Player'

/** Marks anchored to words of a description. */
const WORD_MARKS: Partial<Record<ProjectId, Array<[word: string, mark: string]>>> = {
  xport: [
    ['Web app', 'xport-web-app'],
    ['CLI', 'xport-cli'],
  ],
}

const external = { target: '_blank', rel: 'noopener noreferrer' }

export function Paper({
  posts,
  xportNpm,
  children,
}: {
  posts: PostMeta[]
  xportNpm: Promise<NpmInfo | null>
  children?: ReactNode
}) {
  const main = useRef<HTMLElement>(null)
  return (
    <div className="paper">
      {/* The first Tab: past the player and the links, straight to the text. */}
      <a className="skip-link" href="#about">
        skip to content
      </a>
      {/* The margin (after meodai's sticky intro column), right next to the text and aligned to
          it: the player, the resume over the section index, links. Phones and tablets: player,
          then links, on top; the resume under the intro; the index in a dock at the bottom (see paper.css). */}
      <aside className="paper-aside" aria-label="frixaco">
        <div className="paper-aside-top">
          <Player />
        </div>
        {/* The resume sits on top of the index, in easy reach; it is a link out, never a section. */}
        <div className="paper-nav">
          <a className="link paper-resume" href={RESUME_URL} target="_blank" rel="noopener">
            resume ↗
          </a>
          <Index />
        </div>
        <ul className="paper-elsewhere">
          {contacts.map((c) => (
            <li key={c.label}>
              <a className="link" href={c.href} title={c.text} {...(c.href.startsWith('http') ? external : {})}>
                {c.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <main ref={main} className="paper-main">
        <section id="about" className="paper-intro" data-ink-group aria-label="about">
          <h1>
            <span data-mark="intro-circle intro-corners">{headline}</span>
          </h1>
          {/* Phones and tablets: the resume under the intro, where the player's long titles can't move it. */}
          <a className="link paper-resume paper-resume-intro" href={RESUME_URL} target="_blank" rel="noopener">
            resume ↗
          </a>
        </section>

        <section id="projects" className="paper-section" aria-labelledby="projects-title">
          <h2 id="projects-title" className="paper-label">
            projects
          </h2>
          <div className="paper-list">
          {projects.map((p) => (
            <article key={p.id} className="paper-item" data-ink-group>
              <div>
                <h3>{p.name}</h3>
                <p>{withMarks(p.description, WORD_MARKS[p.id] ?? [])}</p>
              </div>
              {p.id === 'letui' ? <LetuiLine /> : p.id === 'senmei' ? <SenmeiLine /> : <XportLine npm={xportNpm} />}
              <p className="paper-links">
                <a className="link" href={`https://github.com/${p.repo}`} {...external}>
                  github ↗
                </a>
                {p.site ? (
                  <a className="link" href={`https://${p.site}`} {...external}>
                    {p.site} ↗
                  </a>
                ) : null}
              </p>
            </article>
          ))}
          </div>
        </section>

        <section id="work" className="paper-section" aria-labelledby="work-title">
          <h2 id="work-title" className="paper-label">
            work
          </h2>
          <div className="paper-list">
          {roles.map((role) => (
            <article key={role.dates} className="paper-item" data-ink-group>
              <div>
                <h3>
                  {role.names.map((n, i) => (
                    <span key={n.text}>
                      {i ? ' · ' : ''}
                      {n.href ? (
                        <a className="link" href={n.href} {...external}>
                          {n.text}
                        </a>
                      ) : (
                        n.text
                      )}
                    </span>
                  ))}
                </h3>
                <p className="paper-caption">{role.dates}</p>
                <p>{role.text}</p>
              </div>
            </article>
          ))}
          </div>
        </section>

        <section id="blog" className="paper-section" data-ink-group aria-labelledby="blog-title">
          {/* The squiggles were drawn around the label and the list together, so both are their
              anchor; the anchor spaces them as the other sections do. */}
          <div className="paper-section" data-mark="blog-squiggles">
            <h2 id="blog-title" className="paper-label">
              blog
            </h2>
            <ol className="paper-posts">
              {posts.map((post) => (
                <li key={post.slug}>
                  {/* A bullet drawn in pencil, one post after the other (Ink). */}
                  <span className="paper-bullet" data-mark="blog-bullet" data-ink-fit="contain" aria-hidden="true" />
                  <Link className="link" to="/blog/$slug" params={{ slug: post.slug }} resetScroll={false}>
                    {post.title}
                  </Link>
                  <time className="paper-caption" dateTime={post.date.slice(0, 10)}>
                    {formatPostDate(post.date)}
                  </time>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="more" className="paper-section" data-ink-group aria-label="more">
          <h2 className="paper-label">more</h2>
          {/* The hand is the way in: it waves under the label, and a press on it opens "more". */}
          <Link
            className="paper-hand"
            to="/more"
            resetScroll={false}
            aria-label={`more ${more.linkSuffix}`}
            data-mark="more-hand"
            data-ink-fit="contain"
          />
        </section>

        <footer className="paper-footer">last updated {__BUILD_DATE__}</footer>
        <Ink root={main} />
      </main>
      {children}
    </div>
  )
}

/** text, with each listed word wrapped as the anchor of its mark. */
function withMarks(text: string, words: Array<[string, string]>): ReactNode[] {
  let parts: ReactNode[] = [text]
  for (const [word, mark] of words) {
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string' || !part.includes(word)) return [part]
      const [before, ...rest] = part.split(word)
      return [before, <span key={mark} data-mark={mark}>{word}</span>, rest.join(word)]
    })
  }
  return parts
}

/** 1.94 -> "1.9 ms", kept on one line. */
const ms = (n: number) => `${n.toFixed(1)}\u00a0ms`

/** A project's measured stats: a label, then what was measured, row by row (the live site's copy). */
function Facts({ rows }: { rows: Array<[label: string, value: ReactNode]> }) {
  return (
    <dl className="paper-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The circle is fitted around the typical frame. */
function LetuiLine() {
  const t = letui.frameTimeMs
  const ph = letui.phasesAvgMs
  return (
    <Facts
      rows={[
        ['measured on', 'full-screen animation, 176×52 terminal, m4 pro'],
        [
          'typical frame',
          <>
            <span data-mark="letui-p0" data-ink-fit="stretch">
              {ms(t.p50)}
            </span>{' '}
            (median)
          </>,
        ],
        ['slow frames', `${ms(t.p95)} at p95, ${ms(t.p99)} at p99, ${ms(t.max)} max`],
        ['frame rate', `${letui.fps.avg} fps average, ${letui.fps.worst} fps worst`],
        ['avg frame', `typescript ${ms(ph.ts)} → rust ${ms(ph.rust)} → sync ${ms(ph.sync)} → flush ${ms(ph.flush)}`],
      ]}
    />
  )
}

function SenmeiLine() {
  const b = senmei.breakdownMs
  return (
    <Facts
      rows={[
        ['measured on', '1080p → 4k upscaling, m4 pro'],
        ['per 4k frame', <span data-mark="senmei-underline">{ms(senmei.frameMs)}</span>],
        ['frame rate', `${senmei.fps} fps max (film is 24)`],
        ['gpu work', `${senmei.passes.count} passes from ${senmei.passes.shaders} shaders, run in sequence`],
        [
          'frame budget',
          `${ms(senmei.budgetMs)} at 24 fps: cpu ${ms(b.cpu)} → upload ${ms(b.upload)} → shader passes ${ms(b.passes)}, ${ms(b.spare)} spare`,
        ],
      ]}
    />
  )
}

/** npm (live from the registry), then Lighthouse (measured). */
function XportLine({ npm }: { npm: Promise<NpmInfo | null> }) {
  const sc = xport.lighthouse.scores
  return (
    <Facts
      rows={[
        [
          'npm',
          <>
            <a className="link" href={`https://www.npmjs.com/package/${xport.npm.package}`} {...external}>
              {xport.npm.package}
            </a>
            <Suspense fallback={null}>
              <Await promise={npm}>
                {(info) =>
                  info ? ` v${info.version}, ${info.dependencies} dependencies, ${formatKB(info.unpackedSize).replace(' ', '\u00a0')}` : null
                }
              </Await>
            </Suspense>
          </>,
        ],
        [
          'lighthouse',
          `performance ${sc.performance}, accessibility ${sc.accessibility}, best practices ${sc.bestPractices}, seo ${sc.seo} (mobile)`,
        ],
      ]}
    />
  )
}

/** The underline under the current section: your Senmei underline stroke, stretched to the word. */
const UNDERLINE = (underline as unknown as Mark).strokes[0]

/**
 * The section index. Inactive sections are faint (after daoho's nav); the current one is ink, and
 * the pencil underlines it again each time it changes, so the marks follow you down the page.
 */
function Index() {
  const [current, setCurrent] = useState<Section>('about')
  // While a click scrolls the page, the sections passed on the way don't take the underline.
  const jumping = useRef(false)
  useEffect(() => {
    let frame = 0
    let timer = 0
    const sync = () => {
      frame = 0
      // "more" is short and last: it never reaches the line, so the bottom of the page counts.
      if (!jumping.current) setCurrent(sectionAtScroll(0.4, SECTIONS))
    }
    const onScroll = () => {
      frame ||= requestAnimationFrame(sync)
      // scrollend isn't everywhere yet: a pause in scrolling ends a jump too.
      clearTimeout(timer)
      timer = window.setTimeout(end, 150)
    }
    const end = () => {
      jumping.current = false
      sync()
    }
    sync()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('scrollend', end)
    addEventListener('resize', onScroll)
    return () => {
      removeEventListener('scroll', onScroll)
      removeEventListener('scrollend', end)
      removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [])
  const jump = (s: Section) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    jumping.current = true
    setCurrent(s)
  }
  return (
    <nav className="paper-index" aria-label="Sections">
      {SECTIONS.map((s) => (
        <a key={s} href={`#${s}`} aria-current={s === current ? 'location' : undefined} onClick={jump(s)}>
          {s}
          <Underline on={s === current} />
        </a>
      ))}
    </nav>
  )
}

/** Drawn at the speed it was recorded when it turns on; fades out (CSS) when it turns off. */
export function Underline({ on }: { on: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!on) return
    const c = ref.current!
    const word = c.parentElement!.getBoundingClientRect().width
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const pad = 6
    const h = 16
    const w = word + pad * 2
    // Resizing clears the old stroke: each time is a new one.
    c.width = Math.ceil(w * dpr)
    c.height = Math.ceil(h * dpr)
    c.style.width = `${w}px`
    c.style.height = `${h}px`
    const xs = UNDERLINE.points.map((p) => p[0])
    const ys = UNDERLINE.points.map((p) => p[1])
    const x0 = Math.min(...xs)
    const sx = (word + 4) / (Math.max(...xs) - x0)
    const y0 = (Math.min(...ys) + Math.max(...ys)) / 2
    const t0 = UNDERLINE.points[0][3]
    const pts = UNDERLINE.points.map(([x, y, p, t]): Point => [pad - 2 + (x - x0) * sx, h / 2 + y - y0, p, t - t0])
    const layer = document.createElement('canvas')
    layer.width = c.width
    layer.height = c.height
    const g = layer.getContext('2d')!
    const out = c.getContext('2d')!
    const paint = (n: number) => {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, layer.width, layer.height)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      render(g, { brush: UNDERLINE.brush, points: pts.slice(0, n) }, 1, n === pts.length)
      out.clearRect(0, 0, c.width, c.height)
      compose(out, layer, UNDERLINE.brush, dpr)
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return paint(pts.length)
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const t = performance.now() - start
      let n = 0
      while (n < pts.length && pts[n][3] <= t) n++
      if (n) paint(n)
      if (n < pts.length) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return <canvas ref={ref} aria-hidden="true" data-off={on ? undefined : ''} />
}
