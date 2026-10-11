// App bar music player: previous / play-pause / next over a curated playlist.
// It lives in the root layout, so playback continues across client-side navigation.
// The meter is a real spectrum (Web Audio analyser) while playing and rests flat otherwise.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { playlist } from '#/content/playlist'

const BARS = 16

export function Player() {
  const audio = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const track = playlist[index]
  const empty = playlist.length === 0

  const play = useCallback(() => {
    const el = audio.current
    if (!el || empty) return
    connectAnalyser(el)
    void el.play().catch(() => setPlaying(false))
  }, [empty])

  const go = useCallback(
    (step: number) => {
      if (empty) return
      setIndex((i) => (i + step + playlist.length) % playlist.length)
    },
    [empty],
  )

  // A new track keeps playing if the previous one was.
  const wasPlaying = useRef(false)
  useEffect(() => {
    if (wasPlaying.current) play()
  }, [index, play])
  useEffect(() => {
    wasPlaying.current = playing
  }, [playing])

  // Lock screen / headphone controls.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: [{ src: new URL(track.cover, location.href).href, sizes: '512x512', type: 'image/jpeg' }],
    })
    navigator.mediaSession.setActionHandler('play', play)
    navigator.mediaSession.setActionHandler('pause', () => audio.current?.pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => go(-1))
    navigator.mediaSession.setActionHandler('nexttrack', () => go(1))
  }, [track, play, go])

  return (
    <div className="player" data-playing={playing} data-empty={empty}>
      <div className="transport">
        <button type="button" className="transport-button" aria-label="Previous track" disabled={empty} onClick={() => go(-1)}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect x="1" y="1.5" width="1.5" height="7" fill="currentColor" />
            <path d="M9 1.5 L3.5 5 L9 8.5 Z" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className="transport-button primary"
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={empty}
          onClick={() => (playing ? audio.current?.pause() : play())}
        >
          {playing ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect x="1.5" y="1" width="2.5" height="8" fill="currentColor" />
              <rect x="6" y="1" width="2.5" height="8" fill="currentColor" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 1 L9 5 L2 9 Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <button type="button" className="transport-button" aria-label="Next track" disabled={empty} onClick={() => go(1)}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 1.5 L6.5 5 L1 8.5 Z" fill="currentColor" />
            <rect x="7.5" y="1.5" width="1.5" height="7" fill="currentColor" />
          </svg>
        </button>
      </div>
      <div className="track-area">
        <Title text={track ? `${track.title} — ${track.artist}` : ''} playing={playing} />
        <Progress audio={audio} playing={playing} />
      </div>
      <Meter audio={audio} playing={playing} />
      {track ? (
        <audio
          ref={audio}
          src={track.src}
          preload="none"
          crossOrigin="anonymous"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            wasPlaying.current = true
            go(1)
          }}
        />
      ) : null}
    </div>
  )
}

/** The title clip: a long title scrolls back and forth while playing. */
function Title({ text, playing }: { text: string; playing: boolean }) {
  const clip = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(0)

  useLayoutEffect(() => {
    const measure = () => setOverflow(Math.max(0, (inner.current?.scrollWidth ?? 0) - (clip.current?.clientWidth ?? 0)))
    measure()
    const ro = new ResizeObserver(measure)
    if (clip.current) ro.observe(clip.current)
    return () => ro.disconnect()
  }, [text])

  return (
    <div
      ref={clip}
      className="title-clip"
      data-scrolling={playing && overflow > 0}
      data-overflow={overflow > 0}
      style={{ '--overflow': `${overflow}px`, '--marquee': `${Math.max(6, overflow / 24 + 4)}s` } as React.CSSProperties}
    >
      <span ref={inner} className="title-text">
        {text}
      </span>
    </div>
  )
}

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

/**
 * Progress under the title: hidden (0 high) until the track area is hovered or focused, then a
 * 3px bar. Click or drag to seek, arrows step 5s. The fill is driven per frame while playing,
 * straight on the element, so React doesn't re-render 60 times a second.
 */
function Progress({ audio, playing }: { audio: React.RefObject<HTMLAudioElement | null>; playing: boolean }) {
  const bar = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLDivElement>(null)
  const [scrubbing, setScrubbing] = useState(false)

  const paint = useCallback(() => {
    const el = audio.current
    const f = el && el.duration > 0 ? el.currentTime / el.duration : 0
    if (fill.current) fill.current.style.transform = `scaleX(${f})`
    return el
  }, [audio])

  // Screen readers get the time a few times a second, not every frame.
  const describe = useCallback(() => {
    const el = audio.current
    const b = bar.current
    if (!el || !b) return
    const duration = el.duration > 0 ? el.duration : 0
    b.setAttribute('aria-valuemax', String(Math.round(duration)))
    b.setAttribute('aria-valuenow', String(Math.round(el.currentTime)))
    b.setAttribute('aria-valuetext', duration ? `${clock(el.currentTime)} of ${clock(duration)}` : 'Not started')
  }, [audio])

  useEffect(() => {
    const el = audio.current
    if (!el) return
    const update = () => {
      paint()
      describe()
    }
    const events = ['timeupdate', 'seeked', 'loadedmetadata', 'durationchange', 'emptied'] as const
    for (const e of events) el.addEventListener(e, update)
    update()
    return () => {
      for (const e of events) el.removeEventListener(e, update)
    }
  }, [audio, paint, describe])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = () => {
      paint()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, paint])

  const seekTo = (seconds: number) => {
    const el = audio.current
    if (!el || !(el.duration > 0)) return
    el.currentTime = Math.min(el.duration, Math.max(0, seconds))
    paint()
  }
  const seekAt = (e: React.PointerEvent) => {
    const el = audio.current
    const box = bar.current?.getBoundingClientRect()
    if (!el || !box || !(el.duration > 0)) return
    seekTo(((e.clientX - box.left) / box.width) * el.duration)
  }

  return (
    <div
      ref={bar}
      className="progress"
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      data-scrubbing={scrubbing}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        setScrubbing(true)
        seekAt(e)
      }}
      onPointerMove={(e) => {
        if (scrubbing) seekAt(e)
      }}
      onPointerUp={() => setScrubbing(false)}
      onPointerCancel={() => setScrubbing(false)}
      onKeyDown={(e) => {
        const el = audio.current
        if (!el) return
        const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key]
        const to = step !== undefined ? el.currentTime + step : e.key === 'Home' ? 0 : e.key === 'End' ? el.duration : undefined
        if (to === undefined) return
        e.preventDefault()
        seekTo(to)
      }}
    >
      <div ref={fill} className="progress-fill" />
    </div>
  )
}

// One analyser per page; an <audio> element can only be wired to Web Audio once.
let analyser: AnalyserNode | null = null
const wired = new WeakSet<HTMLMediaElement>()

function connectAnalyser(el: HTMLAudioElement) {
  if (wired.has(el)) {
    void (analyser?.context as AudioContext | undefined)?.resume()
    return
  }
  try {
    const ctx = analyser?.context instanceof AudioContext ? analyser.context : new AudioContext()
    analyser ??= Object.assign(ctx.createAnalyser(), { fftSize: 256, smoothingTimeConstant: 0.78 })
    ctx.createMediaElementSource(el).connect(analyser)
    analyser.connect(ctx.destination)
    wired.add(el)
    void ctx.resume()
  } catch {
    // No Web Audio: the meter just rests; playback is unaffected.
  }
}

function Meter({ audio, playing }: { audio: React.RefObject<HTMLAudioElement | null>; playing: boolean }) {
  const bars = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    if (!playing || !analyser || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    let frame = 0
    const tick = () => {
      analyser!.getByteFrequencyData(data)
      for (let i = 0; i < BARS; i++) {
        // Log-spaced bins: low end on the left, like a hardware meter.
        const from = Math.floor(Math.pow(data.length * 0.75, i / BARS))
        const to = Math.max(from + 1, Math.floor(Math.pow(data.length * 0.75, (i + 1) / BARS)))
        let peak = 0
        for (let k = from; k < to; k++) peak = Math.max(peak, data[k])
        const el = bars.current[i]
        if (el) el.style.transform = `scaleY(${Math.max(2 / 14, peak / 255)})`
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      for (const el of bars.current) if (el) el.style.transform = ''
    }
  }, [playing, audio])

  return (
    <div className="meter" aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <i key={i} ref={(el) => void (bars.current[i] = el)} />
      ))}
    </div>
  )
}
