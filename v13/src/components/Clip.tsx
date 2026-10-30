// A project's demo clip. In its card it plays muted while on screen (the still holds its
// place until then, and for reduced motion); tapping it opens a lightbox that grows out
// of the card and shrinks back into it.
//
// Motion: the lightbox video is laid out at its final size and only moved and scaled
// (transform) and cropped to the card's cover crop (clip-path), so the trip is one
// picture the whole way. It starts at once on a copy of the card's picture, which covers
// the lightbox video until that plays from the same frame. The card's video seeks to the lightbox's frame on close, so
// the two hand off on an identical frame.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Project } from '#/content/site'
import { EASE, EASE_OUT } from './Window'
import { ExpandIcon, PauseIcon, PlayIcon, ShrinkIcon } from './icons'

type ClipInfo = NonNullable<Project['clip']>

const OPEN_MS = 420
const CLOSE_MS = 320
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function Sources({ base }: { base: string }) {
  return (
    <>
      <source src={`/clips/${base}.webm`} type='video/webm; codecs="av01.0.08M.08"' />
      <source src={`/clips/${base}.mp4`} type="video/mp4" />
    </>
  )
}

export function Clip({ clip, name }: { clip: ClipInfo; name: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const [playing, setPlaying] = useState(false)
  // The video has a frame to show: it fades in over the still.
  const [shown, setShown] = useState(false)
  // Opened in the lightbox from this time (null: closed).
  const [openAt, setOpenAt] = useState<number | null>(null)
  // The lightbox's picture has left the card: the card's own stays hidden underneath.
  const [lifted, setLifted] = useState(false)
  // The visitor's own play/pause wins over autoplay (and over reduced motion's still).
  const choice = useRef<boolean | null>(null)
  const visible = useRef(false)

  const resume = () => {
    if (visible.current && (choice.current ?? !reduced())) video.current!.play().catch(() => {})
  }

  useEffect(() => {
    const v = video.current!
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting
        if (entry.isIntersecting) resume()
        else v.pause()
      },
      { threshold: 0.35 },
    )
    io.observe(v)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = () => {
    const v = video.current!
    choice.current = v.paused
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  const open = () => {
    const v = video.current!
    v.pause()
    setOpenAt(v.currentTime)
  }

  return (
    <div className="media clip" data-shown={shown} data-lifted={lifted}>
      <img src={`/${clip.base}.webp`} alt={clip.label} width={clip.width} height={clip.height} loading="lazy" decoding="async" />
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onPlaying={() => setShown(true)}
      >
        <Sources base={clip.base} />
      </video>
      <button ref={opener} type="button" className="clip-open" aria-label={`Open the ${name} demo`} onClick={open}>
        <span className="clip-chip">
          <ExpandIcon />
        </span>
      </button>
      <button type="button" className="clip-chip clip-toggle" aria-label={playing ? 'Pause demo' : 'Play demo'} onClick={toggle}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      {openAt !== null ? (
        <Lightbox
          clip={clip}
          name={name}
          startAt={openAt}
          source={video}
          onLifted={() => setLifted(true)}
          onClosing={(time) => {
            // Hand-off: the card shows the frame the lightbox lands with.
            video.current!.currentTime = time
          }}
          onLanded={() => {
            // Same paint as the dialog closing: the card is never empty for a frame.
            flushSync(() => setLifted(false))
          }}
          onExited={() => {
            setOpenAt(null)
            opener.current!.focus({ preventScroll: true })
            resume()
          }}
        />
      ) : null}
    </div>
  )
}

/** Keyframe that lays the lightbox video over the card's video, cropped like it (cover, top). */
function overCard(frame: HTMLElement, card: HTMLElement): Keyframe | null {
  const a = card.getBoundingClientRect()
  const b = frame.getBoundingClientRect()
  if (a.width === 0 || a.bottom < 0 || a.top > window.innerHeight) return null
  const s = Math.max(a.width / b.width, a.height / b.height)
  const cropX = (b.width * s - a.width) / 2
  const cropBottom = b.height * s - a.height
  const radius = parseFloat(getComputedStyle(card.parentElement!).borderTopLeftRadius) || 0
  return {
    transform: `translate(${a.left - b.left - cropX}px, ${a.top - b.top}px) scale(${s})`,
    clipPath: `inset(0px ${cropX / s}px ${cropBottom / s}px ${cropX / s}px round ${radius / s}px)`,
  }
}
const FULL: Keyframe = { transform: 'translate(0px, 0px) scale(1)', clipPath: 'inset(0px 0px 0px 0px round 3px)' }

/** Paints what the card shows now (its video's frame, else its still) onto `canvas`. */
function paintCard(canvas: HTMLCanvasElement, card: HTMLVideoElement) {
  const still = card.parentElement!.querySelector('img')!
  const live = card.parentElement!.dataset.shown === 'true' && card.readyState >= 2
  const width = live ? card.videoWidth : still.naturalWidth
  const height = live ? card.videoHeight : still.naturalHeight
  if (!width || !height) return
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(live ? card : still, 0, 0, width, height)
}

/** Calls `then` once the video has painted a frame of playback. */
function onPainted(v: HTMLVideoElement, then: () => void) {
  v.addEventListener('playing', () => ('requestVideoFrameCallback' in v ? v.requestVideoFrameCallback(() => then()) : then()), {
    once: true,
  })
}

/** Resolves once the video shows the frame at `time` (or soon, whatever happens). */
function frameAt(v: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 400)
    const done = () => {
      clearTimeout(timer)
      resolve()
    }
    const seek = () => {
      if (time === 0) {
        if (v.readyState >= 2) done()
        else v.addEventListener('loadeddata', done, { once: true })
        return
      }
      v.addEventListener('seeked', done, { once: true })
      v.currentTime = time
    }
    if (v.readyState >= 1) seek()
    else v.addEventListener('loadedmetadata', seek, { once: true })
  })
}

interface LightboxProps {
  clip: ClipInfo
  name: string
  startAt: number
  source: React.RefObject<HTMLVideoElement | null>
  onLifted(): void
  onClosing(time: number): void
  onLanded(): void
  onExited(): void
}

function Lightbox({ clip, name, startAt, source, onLifted, onClosing, onLanded, onExited }: LightboxProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const progress = useRef<HTMLElement>(null)
  const cover = useRef<HTMLCanvasElement>(null)
  // The lightbox video plays at the card's frame: it can show instead of the cover.
  const ready = useRef(false)
  const trip = useRef<Animation | null>(null)
  const closing = useRef(false)
  const [playing, setPlaying] = useState(true)

  // Open: show the dialog and grow out of the card at once, on a copy of its picture; the
  // lightbox video takes over from the cover once it plays from the same frame.
  useLayoutEffect(() => {
    const d = dialog.current!
    const f = frame.current!
    const v = video.current!
    paintCard(cover.current!, source.current!)
    d.showModal()
    onLifted()
    let live = true
    onPainted(v, () => {
      if (!live) return
      ready.current = true
      cover.current!.hidden = true
    })
    frameAt(v, startAt).then(() => {
      if (live && !closing.current) v.play().catch(() => {})
    })
    const from = reduced() ? null : overCard(f, source.current!)
    if (from) {
      trip.current = f.animate([from, FULL], { duration: OPEN_MS, easing: EASE })
    } else {
      trip.current = f.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' })
    }
    scrim.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: EASE_OUT })
    bar.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: OPEN_MS * 0.5, easing: EASE_OUT, fill: 'backwards' })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The progress line follows playback every frame while open.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = video.current
      if (v && v.duration) progress.current!.style.transform = `scaleX(${v.currentTime / v.duration})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Close: shrink back into the card, from wherever the open is.
  const close = () => {
    if (closing.current) return
    closing.current = true
    const f = frame.current!
    const v = video.current!
    v.pause()
    // Still under the cover, the video may not have reached the card's frame yet.
    onClosing(ready.current ? v.currentTime : startAt)
    const current = trip.current
    const to = reduced() ? null : overCard(f, source.current!)
    let geometry: Animation
    if (current && current.playState === 'running' && to) {
      // Interrupted open: the same path back from the live position.
      current.effect?.updateTiming({ fill: 'both' })
      current.reverse()
      geometry = current
    } else if (to) {
      current?.cancel()
      geometry = f.animate([FULL, to], { duration: CLOSE_MS, easing: EASE, fill: 'forwards' })
    } else {
      current?.cancel()
      geometry = f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear', fill: 'forwards' })
    }
    const fadeOut = (el: HTMLElement, duration: number) => {
      const opacity = Number(getComputedStyle(el).opacity)
      el.getAnimations().forEach((a) => a.cancel())
      el.animate([{ opacity }, { opacity: 0 }], { duration, easing: 'linear', fill: 'forwards' })
    }
    fadeOut(scrim.current!, CLOSE_MS)
    fadeOut(bar.current!, 100)
    const finish = () => {
      onLanded()
      dialog.current?.close()
      onExited()
    }
    geometry.finished.then(finish, finish)
  }

  const toggle = () => {
    const v = video.current!
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  return (
    <dialog
      ref={dialog}
      className="clip-lightbox"
      aria-label={`${name} demo`}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      <div ref={scrim} className="clip-scrim" onClick={close} />
      <div className="clip-stage" style={{ '--ratio': clip.width / clip.height } as React.CSSProperties}>
        <div ref={frame} className="clip-frame">
          <video
            ref={video}
            muted
            loop
            playsInline
            preload="auto"
            aria-label={clip.label}
            onClick={toggle}
            onPlay={() => setPlaying(true)}
            onPause={() => !closing.current && setPlaying(false)}
          >
            <Sources base={clip.base} />
          </video>
          <canvas ref={cover} className="clip-cover" aria-hidden="true" />
        </div>
        <div ref={bar} className="clip-bar">
          <button type="button" className="clip-chip" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <span className="clip-track" aria-hidden="true">
            <i ref={progress} />
          </span>
          <button type="button" className="clip-chip" aria-label="Close" onClick={close}>
            <ShrinkIcon />
          </button>
        </div>
      </div>
    </dialog>
  )
}
