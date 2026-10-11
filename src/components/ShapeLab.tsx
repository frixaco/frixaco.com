// Hero visualizer: the Shape Lab (experiments/shape-lab) — WebGPU stage + Readout rack.
// The markup is rendered on the server with the default values so the first paint
// is complete; the controls and the renderer attach on the client when the page is idle.
// Without WebGPU, or with reduced motion, the stage keeps the still render and the rack
// shows its values without taking input.
import { useEffect, useRef, useState } from 'react'
import { DEFAULTS, LIMITS, PALETTE, particleCount } from '#/shape-lab/params'

type Mode = 'loading' | 'live' | 'still'

const groupThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const ssrCount = {
  full: `${DEFAULTS.layers} layers · ${LIMITS.pointsPerRing} pts · ${groupThousands(DEFAULTS.layers * LIMITS.pointsPerRing)} vertices · ${particleCount(DEFAULTS)} particles`,
  short: `${DEFAULTS.layers} layers · ${particleCount(DEFAULTS)} particles`,
}

const idle = (fn: () => void) =>
  typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200)

export function ShapeLab() {
  const root = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('loading')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false
    const still = !('gpu' in navigator) || matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still) setMode('still')
    idle(() => {
      import('#/shape-lab/mount').then(({ mountShapeLab }) => {
        if (cancelled || !root.current) return
        cleanup = mountShapeLab(root.current, {
          still,
          onReady: (error) => !cancelled && setMode(error ? 'still' : 'live'),
        })
        setMounted(true)
      })
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return (
    <div className="lab" ref={root} data-mode={mode} data-mounted={mounted}>
      <section className="stage" aria-label="Shape">
        <img className="still" src="/shape-lab-still.webp" alt="" width={1219} height={974} decoding="async" />
        <canvas aria-hidden="true" />
        <div className="label formula">r(θ) = ( |cos mθ/4|^n2 + |sin mθ/4|^n3 )^(−1/n1)</div>
        <div className="label count">
          <span className="count-full">{ssrCount.full}</span>
          <span className="count-short">{ssrCount.short}</span>
        </div>
        <div className="label hint">drag ↔ twist · ↕ chaos</div>
        <div className="label flag" title="Drag to move through layers" hidden />
        <div className="gesture" hidden aria-hidden="true">
          <i className="cross-x" />
          <i className="cross-y" />
          <i className="ring" />
          <i className="dot" />
          <div className="chips">
            <span className="chip">
              <span className="chip-label">↔ twist</span>
              <span className="chip-twist" />
            </span>
            <span className="chip">
              <span className="chip-label">↕ chaos</span>
              <span className="chip-chaos" />
            </span>
          </div>
        </div>
      </section>

      <section className="rack" aria-label="Shape controls" inert={mode === 'still' || undefined}>
        <header>
          <button type="button" className="icon-button play-toggle" aria-label="Pause" aria-pressed="true">
            <svg className="glyph-pause" width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
              <rect x="1" y="1" width="2" height="6" fill="currentColor" />
              <rect x="5" y="1" width="2" height="6" fill="currentColor" />
            </svg>
            <svg className="glyph-play" width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
              <path d="M1 0.5L7.5 4L1 7.5Z" fill="currentColor" />
            </svg>
          </button>
          <h2>Shape</h2>
        </header>

        <div className="body">
          <div className="controls">
            <div className="group">
              <div className="group-label">i like knobs</div>
              <div className="row">
                <RowLabel name="Symmetry" sub="m · lobes" />
                <div data-control="segmented" data-param="sym" data-options="3,4,5,6,7,8,9,12" role="group" aria-label="Symmetry" />
              </div>
              <div className="row">
                <RowLabel name="Exponents" sub="n1 · n2 · n3" />
                <input data-control="number" data-param="n1" aria-label="Exponent n1" defaultValue="0.35" />
                <input data-control="number" data-param="n2" aria-label="Exponent n2" defaultValue="1.60" />
                <input data-control="number" data-param="n3" aria-label="Exponent n3" defaultValue="1.60" />
              </div>
              <div className="row">
                <RowLabel name="Morph" sub="star → round" />
                <div data-control="fader" data-param="morph" data-label="Morph" />
              </div>
            </div>

            <div className="group">
              <div className="group-label">STACK</div>
              <div className="stack">
                <div className="graph-host">
                  <div data-control="graph" data-graph="profile" data-label="Profile" />
                </div>
                <div className="knobs">
                  <div data-control="knob" data-param="layers" data-label="Layers" />
                  <div data-control="knob" data-param="height" data-label="Height" />
                  <div data-control="knob" data-param="twist" data-label="Twist" />
                  <div data-control="knob" data-param="tilt" data-label="Tilt" />
                  <div data-control="knob" data-param="spin" data-label="Spin" />
                </div>
              </div>
            </div>

            <div className="group">
              <div className="group-label">SURFACE</div>
              <div className="row">
                <RowLabel name="Noise" sub="amount · seed" />
                <div data-control="fader" data-param="noise" data-label="Noise" />
                <input data-control="number" data-param="seed" aria-label="Noise seed" defaultValue="0412" />
              </div>
              <div className="row">
                <RowLabel name="Palette" sub="stroke color" />
                <div data-control="toggles" data-param="palette" data-options="0,1,2" data-labels="SEQ,CAT,MONO" role="group" aria-label="Palette" />
                <div className="swatches" aria-hidden="true">
                  {PALETTE.seq.map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                </div>
              </div>
              <div className="row phone-only">
                <RowLabel name="Highlight" sub="ring in accent" />
                <div data-control="rail" data-orientation="horizontal" data-param="hilite" data-rail="layers" data-label="Layer" />
                <input className="accent" data-control="number" data-param="hilite" aria-label="Highlighted layer" defaultValue="20" />
              </div>
              <div className="row row-chaos">
                <RowLabel name="Chaos" sub="grows upward" />
                <div data-control="meter" data-param="chaos" data-label="Chaos" data-cells="20" data-hot="0.6" />
                <input className="warning" data-control="number" data-param="chaos" aria-label="Chaos value" defaultValue="0.78" />
              </div>
            </div>
          </div>

          <div className="rail-column desktop-only">
            <div className="group-label">LAYER</div>
            <div data-control="rail" data-param="hilite" data-rail="layers" data-label="Layer" />
            <input className="accent" data-control="number" data-param="hilite" aria-label="Highlighted layer" defaultValue="20" />
          </div>
        </div>
      </section>
    </div>
  )
}

function RowLabel({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="row-label">
      <span>{name}</span>
      <span>{sub}</span>
    </div>
  )
}
