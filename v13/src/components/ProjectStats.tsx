// The measured stats on each project card. Numbers come from content/stats/*.json
// (how they were measured: content/stats/method/README.md); npm data is live.
import { Suspense } from 'react'
import { Await } from '@tanstack/react-router'
import letui from '../../content/stats/letui.json'
import senmei from '../../content/stats/senmei.json'
import xport from '../../content/stats/xport.json'
import { formatKB } from '#/lib/format'
import type { NpmInfo } from '#/server/functions'

const one = (n: number) => n.toFixed(1)

function Swatch({ color }: { color: string }) {
  return <i className="swatch" style={{ background: color }} />
}

export function LetuiStats() {
  const t = letui.frameTimeMs
  const fps = `${letui.fps.worst}–${letui.fps.avg}`
  const marks = [
    { label: 'p0', value: t.p0, color: 'var(--color-seq-4)', align: 'start' },
    { label: 'p50', value: t.p50, color: 'var(--color-cat-periwinkle)', align: 'center' },
    { label: 'p95', value: t.p95, color: 'var(--color-seq-5)', align: 'center' },
    { label: 'p99', value: t.p99, color: 'var(--color-cat-ice)', align: 'center' },
    { label: 'max', value: t.max, color: 'var(--color-text)', align: 'end' },
  ] as const
  const phases = [
    { label: 'ts', value: letui.phasesAvgMs.ts, color: 'var(--color-cat-sky)', after: '→ ffi →' },
    { label: 'rust', value: letui.phasesAvgMs.rust, color: 'var(--color-cat-periwinkle)', after: '→' },
    { label: 'sync', value: letui.phasesAvgMs.sync, color: 'var(--color-cat-sage)', after: '→' },
    { label: 'flush', value: letui.phasesAvgMs.flush, color: 'var(--color-cat-mustard)', unit: ' ms' },
  ]
  return (
    <div className="stats stats-letui">
      <div className="stats-head">
        <span className="faint">frame time · ms</span>
        <span className="wide-only">full-screen animation · m4 pro</span>
        <span className="narrow-only">{fps} fps · worst → avg</span>
      </div>
      <div className="letui-main">
        <div className="percentiles">
          {marks.map((m) => (
            <div
              key={m.label}
              className={`mark mark-${m.align}`}
              style={m.align === 'center' ? { left: `${(m.value / t.max) * 100}%` } : undefined}
            >
              <span className="mark-label">{m.label}</span>
              <span className="mark-value" style={{ color: m.color }}>
                {one(m.value)}
              </span>
            </div>
          ))}
          <div className="bar bar-1">
            {marks.map((m, i) => (
              <i key={m.label} style={{ background: m.color, flexGrow: m.value - (i ? marks[i - 1].value : 0) }} />
            ))}
          </div>
        </div>
        <div className="fps wide-only">
          <span className="big">{fps}</span>
          <span className="muted">fps · worst → avg</span>
        </div>
      </div>
      <div className="phases">
        <div className="bar bar-2">
          {phases.map((p) => (
            <i key={p.label} style={{ background: p.color, flexGrow: p.value }} />
          ))}
        </div>
        <div className="legend">
          {phases.map((p) => (
            <span key={p.label} className="legend-item">
              <Swatch color={p.color} />
              <span className="muted">
                {p.label} {one(p.value)}
                {p.unit}
              </span>
              {p.after ? <span className="faint wide-only">{p.after}</span> : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SenmeiStats() {
  const b = senmei.breakdownMs
  const parts = [
    { label: 'cpu', value: b.cpu, color: 'var(--color-cat-sky)' },
    { label: 'upload', value: b.upload, color: 'var(--color-cat-mustard)' },
    { label: 'passes', value: b.passes, color: 'var(--color-cat-orchid)', unit: ' ms' },
  ]
  return (
    <div className="stats stats-senmei">
      <div className="stats-head">
        <span className="faint">frame time</span>
        <span>1080p → 4k · m4 pro</span>
      </div>
      <div className="metrics">
        <div className="metric">
          <span className="big" style={{ color: 'var(--color-cat-orchid)' }}>
            {senmei.frameMs} ms
          </span>
          <span className="muted">per 4k frame</span>
        </div>
        <div className="metric">
          <span className="big">{senmei.fps} fps</span>
          <span className="muted">max · film is 24</span>
        </div>
        <div className="metric">
          <span className="big">{senmei.passes.count} passes</span>
          <span className="muted">{senmei.passes.shaders} shaders, sequential</span>
        </div>
      </div>
      <div className="phases">
        <div className="bar bar-2">
          {parts.map((p) => (
            <i key={p.label} style={{ background: p.color, flexGrow: p.value, minWidth: 3 }} />
          ))}
          <i style={{ background: 'var(--color-bg-raised)', flexGrow: b.spare }} />
        </div>
        <div className="legend">
          {parts.map((p, i) => (
            <span key={p.label} className="legend-item">
              <Swatch color={p.color} />
              <span className="muted">
                {p.label} {one(p.value)}
                <span className="wide-only">{p.unit}</span>
              </span>
              {i < parts.length - 1 ? <span className="faint wide-only">→</span> : null}
            </span>
          ))}
          <span className="legend-spare faint">{one(b.spare)} spare</span>
        </div>
      </div>
    </div>
  )
}

const SCORES = [
  { label: 'perf', key: 'performance' },
  { label: 'a11y', key: 'accessibility' },
  { label: 'best pr.', key: 'bestPractices' },
  { label: 'seo', key: 'seo' },
] as const

const RING = 2 * Math.PI * 15.5

export function XportStats({ npm }: { npm: Promise<NpmInfo | null> }) {
  return (
    <div className="stats stats-xport">
      <Suspense fallback={<NpmRow info={undefined} />}>
        <Await promise={npm}>{(info) => <NpmRow info={info} />}</Await>
      </Suspense>
      <div className="rule" />
      <div className="stats-head">
        <span className="faint">lighthouse</span>
        <span>mobile</span>
      </div>
      <div className="scores">
        {SCORES.map(({ label, key }) => {
          const score = xport.lighthouse.scores[key]
          return (
            <div key={key} className="score">
              <div className="ring">
                <svg width="32" height="32" viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="15.5" className="ring-track" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    className="ring-value"
                    transform="rotate(-90 18 18)"
                    strokeDasharray={score >= 100 ? undefined : `${((score / 100) * RING).toFixed(1)} ${RING.toFixed(1)}`}
                  />
                </svg>
                <span className={score >= 100 ? 'ring-text small' : 'ring-text'}>{score}</span>
              </div>
              <span className="muted">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** `info` undefined = loading (keeps the row's height), null = the registry didn't answer. */
function NpmRow({ info }: { info: NpmInfo | null | undefined }) {
  const pending = info === undefined
  return (
    <>
      <div className="npm-row">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"
            fill="#CB3837"
          />
        </svg>
        <a className="link" href="https://www.npmjs.com/package/@frixaco/xport" target="_blank" rel="noopener noreferrer">
          @frixaco/xport ↗
        </a>
        <span className={pending ? 'pending' : ''} aria-hidden={pending || undefined}>
          {info ? `v${info.version}` : pending ? 'v0.0.0' : ''}
        </span>
      </div>
      <div className="npm-meta">
        <span className={pending ? 'muted pending' : 'muted'} aria-hidden={pending || undefined}>
          {info
            ? `${info.dependencies} dependencies · ${formatKB(info.unpackedSize)}`
            : pending
              ? '0 dependencies · 00.0 kB'
              : ''}
        </span>
      </div>
    </>
  )
}
