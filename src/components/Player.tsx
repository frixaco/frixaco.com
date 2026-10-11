// App bar music player: previous / play-pause / next over a curated playlist.
// It lives in the root layout, so playback continues across client-side navigation.
// The meter is a real spectrum (Web Audio analyser) while playing and rests flat otherwise.
// The playlist popup (a seek fader, then the albums and their tracks) opens on hover with a mouse,
// and from the title with a tap or the keyboard.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { albums, playlist } from '#/content/playlist'

const BARS = 16

export function Player() {
  const audio = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const popupId = useId()
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

  // Picking a track from the playlist always plays it.
  const pick = useCallback(
    (i: number) => {
      wasPlaying.current = true
      if (i === index) play()
      else setIndex(i)
    },
    [index, play],
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

  // Mouse: hovering the player opens the popup after a short pause (so passing over it doesn't
  // flash it), and leaving the player and the popup closes it a moment later (so the gap between
  // them can be crossed). A popup opened by tap or keyboard stays until dismissed.
  const hoverTimer = useRef<number | undefined>(undefined)
  const byHover = useRef(false)
  const lastPointer = useRef('')
  const hoverTo = (next: boolean, delay: number) => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => {
      byHover.current = next
      setOpen(next)
    }, delay)
  }
  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])

  // The popup closes on a press outside the player, or Escape (focus goes back to the title).
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => {
      if (root.current?.contains(e.target as Node)) return
      byHover.current = false
      setOpen(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      window.clearTimeout(hoverTimer.current)
      byHover.current = false
      setOpen(false)
      if (root.current?.contains(document.activeElement)) toggle.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div
      ref={root}
      className="player"
      data-playing={playing}
      data-empty={empty}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse' && !empty) hoverTo(true, open ? 0 : 120)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return
        window.clearTimeout(hoverTimer.current)
        if (!open || byHover.current) hoverTo(false, 250)
      }}
    >
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
      <button
        ref={toggle}
        type="button"
        className="track-area"
        aria-label={track ? `${track.title} — ${track.artist}. Playlist` : 'Playlist'}
        aria-expanded={open}
        aria-controls={popupId}
        disabled={empty}
        onPointerDown={(e) => void (lastPointer.current = e.pointerType)}
        onClick={(e) => {
          window.clearTimeout(hoverTimer.current)
          // A mouse click just keeps the hover popup open; a tap or Enter/Space toggles it.
          if (e.detail > 0 && lastPointer.current === 'mouse') {
            setOpen(true)
            return
          }
          byHover.current = false
          setOpen((o) => !o)
        }}
      >
        <Title text={track ? `${track.title} — ${track.artist}` : ''} playing={playing} />
      </button>
      <Meter audio={audio} playing={playing} />
      {track ? (
        <div id={popupId} className="playlist" data-open={open} inert={!open} role="dialog" aria-label="Playlist">
          <Seek audio={audio} playing={playing} fallback={track.duration} />
          <div className="playlist-divider" />
          <TrackList current={index} open={open} onPick={pick} />
        </div>
      ) : null}
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

// The time beside the seek bar gets a fixed width (the longest clock in the playlist, in a
// monospace font), so the bar never resizes as the time ticks or the track changes.
const CLOCK_WIDTH = Math.max(4, ...playlist.map((t) => clock(t.duration).length))

/**
 * The popup's seek fader: a Readout value bar (cyan edge on a dark fill) and the time.
 * Click or drag to seek, arrows step 5s. The fill moves per frame while playing, straight on
 * the element, so React doesn't re-render 60 times a second; the clock ticks on timeupdate.
 * Before the audio has loaded (preload="none") the length comes from the playlist.
 */
function Seek({
  audio,
  playing,
  fallback,
}: {
  audio: React.RefObject<HTMLAudioElement | null>
  playing: boolean
  fallback: number
}) {
  const bar = useRef<HTMLDivElement>(null)
  const fill = useRef<HTMLDivElement>(null)
  const now = useRef<HTMLSpanElement>(null)
  const total = useRef<HTMLSpanElement>(null)
  const [scrubbing, setScrubbing] = useState(false)

  const length = useCallback(() => {
    const d = audio.current?.duration
    return d && Number.isFinite(d) ? d : fallback
  }, [audio, fallback])

  const paint = useCallback(() => {
    const f = Math.min(1, (audio.current?.currentTime ?? 0) / length())
    if (fill.current) fill.current.style.transform = `translateX(calc(${f - 1} * (100% - 2px)))`
  }, [audio, length])

  const describe = useCallback(() => {
    const t = audio.current?.currentTime ?? 0
    const d = length()
    if (now.current) now.current.textContent = clock(t)
    if (total.current) total.current.textContent = `/ ${clock(d)}`
    const b = bar.current
    if (!b) return
    b.setAttribute('aria-valuemax', String(Math.round(d)))
    b.setAttribute('aria-valuenow', String(Math.round(t)))
    b.setAttribute('aria-valuetext', `${clock(t)} of ${clock(d)}`)
  }, [audio, length])

  useEffect(() => {
    const el = audio.current
    const update = () => {
      paint()
      describe()
    }
    update()
    if (!el) return
    const events = ['timeupdate', 'seeked', 'loadedmetadata', 'durationchange', 'emptied'] as const
    for (const e of events) el.addEventListener(e, update)
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

  // Setting currentTime before the metadata has loaded is fine: it becomes the start position.
  const seekTo = (seconds: number) => {
    const el = audio.current
    if (!el) return
    el.currentTime = Math.min(length(), Math.max(0, seconds))
    paint()
    describe()
  }
  const seekAt = (e: React.PointerEvent) => {
    const box = bar.current?.getBoundingClientRect()
    if (!box) return
    seekTo(((e.clientX - box.left) / box.width) * length())
  }

  return (
    <div className="seek" style={{ '--clock': `${CLOCK_WIDTH}ch` } as React.CSSProperties}>
      <div
        ref={bar}
        className="seek-bar"
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
          const t = audio.current?.currentTime ?? 0
          const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key]
          const to = step !== undefined ? t + step : e.key === 'Home' ? 0 : e.key === 'End' ? length() : undefined
          if (to === undefined) return
          e.preventDefault()
          seekTo(to)
        }}
      >
        <div ref={fill} className="seek-fill" />
      </div>
      <span className="seek-time">
        <span ref={now} className="seek-now" />
        <span ref={total} className="seek-total" />
      </span>
    </div>
  )
}

/**
 * The playlist: each album (cover, title, artist, track count · length), then its tracks.
 * The playing track is orange. On open, the list scrolls so the playing track is in view; the
 * fade at the bottom goes away once there's nothing more below.
 */
function TrackList({ current, open, onPick }: { current: number; open: boolean; onPick: (i: number) => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(false)

  const measure = useCallback(() => {
    const el = scroller.current
    if (el) setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
  }, [])

  useLayoutEffect(() => {
    const el = scroller.current
    const row = el?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!open || !el || !row) return
    // Only the list scrolls (scrollIntoView would move the page too). Leave a row of context above.
    const top = row.offsetTop - 22
    if (top < el.scrollTop || row.offsetTop + row.offsetHeight > el.scrollTop + el.clientHeight) el.scrollTop = top
    measure()
  }, [open, current, measure])

  return (
    <div className="playlist-tracks" data-end={atEnd}>
      <div ref={scroller} className="playlist-scroll" onScroll={measure}>
        {albums.map((album) => (
          <section key={album.title} aria-label={`${album.title} by ${album.artist}`}>
            <div className="album">
              <img className="album-cover" src={album.cover} alt="" width={28} height={28} loading="lazy" decoding="async" />
              <div className="album-name">
                <span className="album-title">{album.title}</span>
                <span className="album-artist">{album.artist}</span>
              </div>
              <span className="album-meta">
                {album.tracks.length} · {clock(album.duration)}
              </span>
            </div>
            <ol className="album-tracks">
              {album.tracks.map((i) => {
                const t = playlist[i]
                return (
                  <li key={i}>
                    <button
                      type="button"
                      className="playlist-row"
                      aria-current={i === current ? 'true' : undefined}
                      onClick={() => onPick(i)}
                    >
                      <span className="row-number">{t.number}</span>
                      <span className="row-title">{t.title}</span>
                      <span className="row-duration">{clock(t.duration)}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
      <div className="playlist-fade" aria-hidden="true" />
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
