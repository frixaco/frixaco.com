// A project's demo, under its title: a clip that plays when the visitor starts it, or Senmei's
// before/after frames with a slider between them.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Demo as DemoData } from '#/content/site'

/** `eager`: on the first screen, so its picture comes with the page; the others load as they near
 *  the screen (native lazy loading starts far too early to keep them off the first load). */
export function Demo({ demo, eager }: { demo: DemoData; eager: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const [near, setNear] = useState(eager)
  useEffect(() => {
    if (near) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '400px 0px' })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [near])
  return (
    <figure ref={ref} className="paper-demo">
      {demo.kind === 'clip' ? <Clip clip={demo} near={near} /> : <Compare demo={demo} near={near} />}
    </figure>
  )
}

function Clip({ clip, near }: { clip: Extract<DemoData, { kind: 'clip' }>; near: boolean }) {
  return (
    <video
      poster={near ? `/${clip.name}.webp` : undefined}
      width={clip.width}
      height={clip.height}
      muted
      loop
      playsInline
      controls
      preload="none"
      aria-label={clip.label}
    >
      <source src={`/clips/${clip.name}.webm`} type='video/webm; codecs="av01.0.08M.08"' />
      <source src={`/clips/${clip.name}.mp4`} type="video/mp4" />
    </video>
  )
}

/** Drag anywhere on the frame (or arrow keys on the slider) to move the split. */
function Compare({ demo, near }: { demo: Extract<DemoData, { kind: 'compare' }>; near: boolean }) {
  const [split, setSplit] = useState(50)
  const set = (value: number) => setSplit(Math.min(100, Math.max(0, value)))
  const follow = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    set(((e.clientX - r.left) / r.width) * 100)
  }
  const { before, after } = demo
  return (
    <div
      className="paper-compare"
      style={{ '--split': `${split}%` } as CSSProperties}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        follow(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) follow(e)
      }}
    >
      {near ? (
        <>
          <img src={before.src} alt={before.alt} width={before.width} height={before.height} decoding="async" draggable={false} />
          <img src={after.src} alt={after.alt} width={after.width} height={after.height} decoding="async" draggable={false} />
        </>
      ) : null}
      <span>{before.tag}</span>
      <span>{after.tag}</span>
      <div
        role="slider"
        tabIndex={0}
        aria-label={demo.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(split)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2
          const next = { ArrowLeft: split - step, ArrowRight: split + step, Home: 0, End: 100 }[e.key]
          if (next === undefined) return
          e.preventDefault()
          set(next)
        }}
      />
    </div>
  )
}
