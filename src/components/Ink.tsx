// The pencil marks: drawings recorded in scripts/sketchbook (content/marks/<id>.json), replayed
// around the content as if someone were drawing on the page right now.
//
// An element with data-mark="<id> <id>…" is the anchor: the text the mark was drawn around in the
// sketchbook (its points are relative to the anchor's top left, at the sketchbook's 460px measure).
// A mark's strokes are of two kinds, so the marks work at any width:
//  - strokes on words (underlines, circles) follow those words, however the text wraps;
//  - margin notes (bubbles, drawings, corners) keep their side of the text and their offset from
//    it. Where the margin is too narrow they shrink, down to MIN_SCALE; below that they move into
//    the right of the group's title (h3, h2), small, and the title's row grows to fit them. A note
//    whose arrow pointed at the text from the other side is tilted (under 90°) so it still points at it. Corners that only just poke out shift in instead.
// A group's marks (data-ink-group) draw one after the other in document order when the group
// reaches the top half of the screen (the last ones, which can't, when they are all in view). Off
// screen they are erased, so each time the group comes back they are drawn again from empty.
// With reduced motion, they are just there.
import { useEffect, type RefObject } from 'react'
import { INK_REACH, compose, render, type Brush, type Mark, type Point, type Stroke } from '#/lib/ink'

/** Replay speed against the recording, and the longest pause kept between two strokes (ms). */
const SPEED = 1.5
/** Marks replayed slower than SPEED: the intro's corners, drawn last, at the speed they were drawn;
 *  circles take 75% longer and underlines twice as long, so a reader sees them being drawn. */
const CIRCLE = SPEED / 1.75
const UNDERLINE = SPEED / 2
const SPEEDS: Record<string, number> = {
  'intro-corners': 1,
  'intro-circle': CIRCLE,
  'letui-p0': CIRCLE,
  'senmei-underline': UNDERLINE,
  'xport-web-app': UNDERLINE,
  'xport-cli': UNDERLINE,
}
const MAX_GAP = 250
/** The pause (ms) between one mark finishing and the next one starting, across the whole page. */
const GAP = 220
/** Room in the canvas for a copy's tilt and shift. */
const SLACK = 14
/** This mark waves (from its lowest point, the wrist) once drawn. */
const WAVE = 'more-hand'
/** The text the marks were drawn against: the sketchbook's column (px) and font size (px). The
 *  page sets its text larger, with the column wider by the same ratio, so the text wraps as in
 *  the sketchbook and every mark just scales by that ratio (zoom). */
const MEASURE = 460
const FONT = 14
/** Margin notes are drawn at this share of their recorded size: smaller than the sketch, so they
 *  accompany the text instead of competing with it. Strokes on words keep the text's size. */
const NOTE = 0.7
/** A margin note shrinks to fit its margin down to this scale; any smaller and it moves under the text. */
const MIN_SCALE = 0.8
/** Ink that pokes out of the text by at most this much (corners) shifts in instead of shrinking. */
const HUG = 48
/** A margin note keeps this far (px) from ink on the words, moving out by at most WORD_PUSH. */
const WORD_GAP = 12
const WORD_PUSH = 20
/** Room (px) between a box and the circle stretched around it. */
const FIT_PAD_X = 10
const FIT_PAD_Y = 6
/** Space kept between ink and the screen edge, or the margin column. */
const EDGE = 8
/** Notes moved beside the title keep this far from the title's text and from each other. */
const SLOT_GAP = 16
/** The next mark in the group starts this share of the way into this one. */
const LEAD: Record<string, number> = { 'blog-squiggles': 0.5 }

const files = import.meta.glob<Mark>('../../content/marks/*.json', { import: 'default' })
const loaders = new Map(Object.entries(files).map(([path, load]) => [path.slice(path.lastIndexOf('/') + 1, -5), load]))

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}
interface Rect {
  x: number
  y: number
  w: number
  h: number
}
/** Margin strokes close together (a bubble, the words in it, its arrow): placed as one. */
interface Note {
  strokes: Stroke[]
  /** Where its arrow points (degrees, clockwise from right), if it has one. */
  arrow: number | null
  box: Box
  left: boolean
  top: boolean
}
/** A stroke on words: chars are indexes into the anchor's text. */
interface OnText {
  stroke: Stroke
  chars: number[]
}
/** Part of a stroke as placed on the page: m maps its recorded points to the host's coordinates. */
interface Piece {
  brush: Brush
  points: Point[]
  m: DOMMatrix
}
interface Copy {
  a: number
  dx: number
  dy: number
}
interface Placed {
  id: string
  anchor: HTMLElement
  slot: HTMLElement | null
  size: { w: number; h: number }
  /** Each char of the anchor's text at the sketchbook measure, relative to the anchor. */
  ref: Rect[]
  onText: OnText[]
  notes: Note[]
  /** Per note: its scale in the margin, or 0 for under the text. */
  fit: number[]
  pieces: Piece[]
  at: Rect
  canvas: HTMLCanvasElement
  copies: Copy[]
  /** Bumped by every layout, so a drawing in progress knows its geometry is gone. */
  version: number
  /** An anchor with data-ink-fit: the whole mark fitted into its box, not placed against text.
   *  contain: as big as fits, centered (the hand, a bullet). stretch: around the box (a circle). */
  fill?: { mode: string; strokes: Stroke[] }
}

const bounds = (pts: Point[]): Box =>
  pts.reduce((b, [x, y]) => ({ x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) }), {
    x0: Infinity,
    y0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
  })
const union = (a: Box, b: Box): Box => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) })
const near = (a: Box, b: Box, d: number) => a.x0 - d <= b.x1 && b.x0 - d <= a.x1 && a.y0 - d <= b.y1 && b.y0 - d <= a.y1

/** Every char of el's text, in order. */
function textChars(el: Element): Array<[Text, number]> {
  const out: Array<[Text, number]> = []
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) for (let i = 0; i < n.length; i++) out.push([n, i])
  return out
}
function charRects(el: Element, only?: Set<number>): Map<number, DOMRect> {
  const range = document.createRange()
  const out = new Map<number, DOMRect>()
  textChars(el).forEach(([node, i], k) => {
    if (only && !only.has(k)) return
    range.setStart(node, i)
    range.setEnd(node, i + 1)
    out.set(k, range.getBoundingClientRect())
  })
  return out
}

/** The chars a stroke marks: under it (an underline) or inside it (a circle), on one line. */
function charsAt(b: Box, ref: Rect[]): number[] {
  const set = ref.filter((r) => r.w > 0)
  if (!set.length) return []
  const lineH = set[0].h
  const tops = [...new Set(set.map((r) => Math.round(r.y)))]
  const cy = (b.y0 + b.y1) / 2
  const top =
    b.y1 - b.y0 < 14
      ? tops.filter((t) => t + lineH <= cy + 4 && t + lineH >= cy - 14).sort((a, c) => c - a)[0]
      : tops.find((t) => t - 3 <= cy && cy <= t + lineH + 3)
  if (top === undefined) return []
  return ref.flatMap((r, i) => (r.w > 0 && Math.round(r.y) === top && r.x + r.w / 2 >= b.x0 - 2 && r.x + r.w / 2 <= b.x1 + 2 ? [i] : []))
}

function classify(strokes: Stroke[], size: { w: number; h: number }, ref: Rect[]) {
  const onText: OnText[] = []
  let groups: Array<{ strokes: Stroke[]; box: Box }> = []
  for (const stroke of strokes) {
    const b = bounds(stroke.points)
    const cx = (b.x0 + b.x1) / 2
    const cy = (b.y0 + b.y1) / 2
    const inside = b.x0 > -16 && b.x1 < size.w + 16 && b.y0 > -16 && b.y1 < size.h + 16 && cx > 0 && cy > -6
    const chars = inside ? charsAt(b, ref) : []
    if (chars.length) onText.push({ stroke, chars })
    else groups.push({ strokes: [stroke], box: b })
  }
  // Merge margin strokes that touch (within 24px) until nothing changes.
  for (let merged = true; merged; ) {
    merged = false
    for (let i = 0; i < groups.length && !merged; i++)
      for (let j = i + 1; j < groups.length && !merged; j++)
        if (near(groups[i].box, groups[j].box, 24)) {
          groups[i] = { strokes: [...groups[i].strokes, ...groups[j].strokes], box: union(groups[i].box, groups[j].box) }
          groups = groups.filter((_, k) => k !== j)
          merged = true
        }
  }
  const notes: Note[] = groups.map((g) => {
    const left = (g.box.x0 + g.box.x1) / 2 < size.w / 2
    return { ...g, left, top: (g.box.y0 + g.box.y1) / 2 < size.h / 2, arrow: arrowOf(g.strokes, g.box, left) }
  })
  return { onText, notes }
}

export function Ink({ root }: { root: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const host: HTMLElement = el
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const byAnchor = new Map<Element, Placed[]>()
    const all: Placed[] = []
    let gone = false
    let zoom = 1
    // The hand waves only on screen.
    const seen = new IntersectionObserver((entries) => entries.forEach((e) => e.target.toggleAttribute('data-off', !e.isIntersecting)))

    // The anchor's text laid out at the sketchbook's measure (zoomed), in sketchbook px: a hidden
    // copy, measured once.
    const refLayout = (anchor: HTMLElement): Rect[] => {
      const box = document.createElement('div')
      box.setAttribute('aria-hidden', 'true')
      box.style.cssText = `position:absolute;left:0;top:0;width:${MEASURE * zoom}px;visibility:hidden;pointer-events:none`
      const copy = anchor.cloneNode(true) as HTMLElement
      copy.removeAttribute('data-mark')
      copy.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'))
      box.append(copy)
      host.append(box)
      const o = copy.getBoundingClientRect()
      const rects = [...charRects(copy).values()].map((r) => ({
        x: (r.left - o.left) / zoom,
        y: (r.top - o.top) / zoom,
        w: r.width / zoom,
        h: r.height / zoom,
      }))
      box.remove()
      return rects
    }

    // fonts.ready can resolve before Paper Mono is even requested: load it by name, so the text is
    // measured in the font it will show in.
    const ready = Promise.all([document.fonts.load(`${FONT}px "Paper Mono"`), document.fonts.ready]).then(async () => {
      zoom = parseFloat(getComputedStyle(host).fontSize) / FONT
      for (const anchor of host.querySelectorAll<HTMLElement>('[data-mark]')) {
        let ref: Rect[] | undefined
        for (const id of anchor.dataset.mark!.split(' ')) {
          const mark = await loaders.get(id)?.()
          if (!mark?.strokes.length || gone) continue
          const strokes = timeline(mark.strokes, SPEEDS[id] ?? SPEED)
          const mode = anchor.dataset.inkFit
          if (!mode) ref ??= refLayout(anchor)
          const { onText, notes } = mode ? { onText: [], notes: [] } : classify(strokes, mark.anchor, ref!)
          const canvas = document.createElement('canvas')
          canvas.className = 'ink'
          canvas.setAttribute('aria-hidden', 'true')
          host.append(canvas)
          const p: Placed = {
            id,
            anchor,
            slot: anchor.closest('[data-ink-group]')?.querySelector<HTMLElement>('h3, h2') ?? null,
            size: mark.anchor,
            ref: ref ?? [],
            onText,
            notes,
            fit: [],
            pieces: [],
            at: { x: 0, y: 0, w: 0, h: 0 },
            canvas,
            copies: [],
            version: 0,
            fill: mode ? { mode, strokes } : undefined,
          }
          all.push(p)
          byAnchor.set(anchor, [...(byAnchor.get(anchor) ?? []), p])
        }
      }
      layout()
    })

    // Places every mark for the current layout, then redraws the copies already drawn.
    function layout() {
      if (gone || !all.length) return
      const vw = document.documentElement.clientWidth
      const aside = document.querySelector('.paper-aside')
      // The sticky margin column ends where its content does (its right padding is the gap).
      const asideCss = aside && getComputedStyle(aside)
      const asideEdge = asideCss?.position === 'sticky' ? aside!.getBoundingClientRect().right - parseFloat(asideCss.paddingRight) : 0
      const leftLimit = asideEdge + EDGE
      const rightLimit = vw - EDGE

      // 1. Where each note goes. Only widths matter here, so the slots can be sized first.
      const slotHeight = new Map<HTMLElement, number>()
      for (const p of all) {
        const L = p.anchor.getBoundingClientRect()
        p.fit = p.notes.map((n) => {
          const extent = n.left ? -n.box.x0 : n.box.x1 - p.size.w
          // Room for the soft edge of the ink, past the stroke's points.
          const avail = (n.left ? L.left - leftLimit : rightLimit - L.right) - reach(n.strokes)
          if (extent * zoom * NOTE <= Math.max(avail, HUG)) return 1
          const k = avail / (extent * zoom * NOTE)
          return k >= MIN_SCALE || !p.slot ? Math.max(k, 0.3) : 0
        })
        p.notes.forEach((n, i) => {
          if (p.fit[i] || !p.slot) return
          const b = slotBox(n)
          slotHeight.set(p.slot, Math.max(slotHeight.get(p.slot) ?? 0, (b.y1 - b.y0) * slotScale(n, p.slot, zoom)))
        })
      }
      // Every title with notes grows to the tallest note beside any title, the title in the middle
      // of its row: the space under a title is the same everywhere, whether its own notes moved or not.
      const tallest = Math.max(0, ...slotHeight.values())
      for (const p of all) {
        if (!p.slot || !p.notes.length) continue
        const line = parseFloat(getComputedStyle(p.slot).lineHeight)
        const pad = tallest ? `${Math.max(0, Math.ceil((tallest - line) / 2))}px` : ''
        if (p.slot.style.paddingBlock !== pad) p.slot.style.paddingBlock = pad
      }

      // 2. The pieces, from fresh rects (the slots may have moved things).
      const H = host.getBoundingClientRect()
      const slotUsed = new Map<HTMLElement, number>()
      // Ink on the words of each anchor, as placed: margin notes keep clear of it.
      const wordInk = new Map<HTMLElement, Point[]>()
      for (const p of all) {
        const L = p.anchor.getBoundingClientRect()
        const units: Piece[][] = []

        if (p.fill) {
          // stretch: the drawing around the box, FIT_PAD clear of it (a circle); contain: as big as
          // fits, centered. The points move, not the brush, so the line keeps its width.
          const stretch = p.fill.mode === 'stretch'
          const b = bounds(p.fill.strokes.flatMap((s) => s.points))
          const bw = b.x1 - b.x0 || 1
          const bh = b.y1 - b.y0 || 1
          const [sx, sy, ox, oy] = stretch
              ? [(L.width + 2 * FIT_PAD_X) / bw, (L.height + 2 * FIT_PAD_Y) / bh, -FIT_PAD_X, -FIT_PAD_Y]
              : (() => {
                  const k = Math.min(L.width / bw, L.height / bh)
                  return [k, k, (L.width - bw * k) / 2, (L.height - bh * k) / 2]
                })()
          const m = new DOMMatrix().translate(L.left - H.left, L.top - H.top)
          units.push(
            p.fill.strokes.map((s) => ({
              brush: s.brush,
              m,
              points: s.points.map(([x, y, pr, t]): Point => [ox + (x - b.x0) * sx, oy + (y - b.y0) * sy, pr, t]),
            })),
          )
        }

        // Strokes on words: each point goes with its nearest char; a stroke whose words now wrap
        // onto two lines splits in two.
        const need = new Set(p.onText.flatMap((o) => o.chars))
        const live = charRects(p.anchor, need)
        for (const { stroke, chars } of p.onText) {
          const usable = chars.filter((c) => (live.get(c)?.width ?? 0) > 0)
          if (!usable.length) continue
          let unit: Piece | null = null
          let lastX = NaN
          let lastY = NaN
          for (const pt of stroke.points) {
            const c = usable.reduce((best, k) =>
              Math.abs(p.ref[k].x + p.ref[k].w / 2 - pt[0]) < Math.abs(p.ref[best].x + p.ref[best].w / 2 - pt[0]) ? k : best,
            )
            const r = live.get(c)!
            const x = r.left - p.ref[c].x * zoom
            const y = r.top - p.ref[c].y * zoom
            // A new piece only where the words really moved (a wrap): Safari's char boxes drift by
            // sub-pixels from char to char, and splitting on those cut the stroke into dashes.
            if (!(Math.abs(x - lastX) < 4 && Math.abs(y - lastY) < 4)) {
              lastX = x
              lastY = y
              const m = new DOMMatrix().translate(x - H.left, y - H.top).scale(zoom)
              unit = { brush: stroke.brush, points: [], m }
              units.push([unit])
            }
            unit!.points.push(pt)
          }
        }

        const words = wordInk.get(p.anchor) ?? []
        for (const u of units) for (const pc of u) for (const pt of pc.points) words.push(mapped(pc.m, pt))
        wordInk.set(p.anchor, words)

        // Notes: in the margin (maybe smaller), or beside the title.
        p.notes.forEach((n, i) => {
          const k = p.fit[i]
          let m: DOMMatrix
          if (k) {
            const X = n.left ? L.left : L.right
            const Y = n.top ? L.top : L.bottom
            const rx = n.left ? 0 : p.size.w
            const ry = n.top ? 0 : p.size.h
            // Scaled toward the anchor's corner, so it keeps its place against the text.
            m = new DOMMatrix()
              .translate(X - H.left, Y - H.top)
              .scale(k * zoom * NOTE)
              .translate(-rx, -ry)
          } else {
            // Right of the title, right-aligned to the column (more than one goes leftward), tilted
            // so its arrow points at the content.
            const S = p.slot!.getBoundingClientRect()
            const s = slotScale(n, p.slot!, zoom)
            const b = slotBox(n)
            const used = slotUsed.get(p.slot!) ?? 0
            const w = (b.x1 - b.x0) * s
            slotUsed.set(p.slot!, used + w + SLOT_GAP)
            const cx = (n.box.x0 + n.box.x1) / 2
            const cy = (n.box.y0 + n.box.y1) / 2
            m = new DOMMatrix()
              .translate(S.right - used - w - H.left, S.top - H.top)
              .scale(s)
              .translate(-b.x0, -b.y0)
              .translate(cx, cy)
              .rotate(slotTilt(n))
              .translate(-cx, -cy)
          }
          // Clear of the ink on the words: a note under the text (a corner) moves down off an
          // underline, one over it moves up.
          if (k && words.length) {
            const pts = n.strokes.flatMap((s) => s.points.map((pt) => mapped(m, pt)))
            let dy = 0
            for (const q of pts)
              for (const o of words)
                if (Math.abs(q[0] - o[0]) < WORD_GAP * 2 && Math.abs(q[1] - o[1]) < WORD_GAP)
                  dy = n.top ? Math.min(dy, o[1] - WORD_GAP - q[1]) : Math.max(dy, o[1] + WORD_GAP - q[1])
            dy = Math.max(-WORD_PUSH, Math.min(WORD_PUSH, dy))
            if (dy) m = new DOMMatrix().translate(0, dy).multiply(m)
          }
          units.push(n.strokes.map((s) => ({ brush: s.brush, points: s.points, m })))
        })

        // Ink that pokes past the screen edge (or into the margin column) by a little shifts in.
        for (const unit of units) {
          const b = unit.reduce((u, pc) => union(u, bounds(pc.points.map((pt) => mapped(pc.m, pt)))), bounds([]))
          const edge = reach(unit)
          const l = b.x0 - edge + H.left - leftLimit
          const r = b.x1 + edge + H.left - rightLimit
          const shift = l < 0 ? Math.min(-l, HUG) : r > 0 ? -Math.min(r, HUG) : 0
          if (shift) unit.forEach((pc) => (pc.m = new DOMMatrix().translate(shift, 0).multiply(pc.m)))
        }

        if (!units.length) continue
        p.pieces = units.flat().filter((pc) => pc.points.length).sort((a, b) => a.points[0][3] - b.points[0][3])
        const box = p.pieces.reduce((u, pc) => union(u, bounds(pc.points.map((pt) => mapped(pc.m, pt)))), bounds([]))
        const pad = INK_REACH + SLACK
        const at = { x: Math.floor(box.x0 - pad), y: Math.floor(box.y0 - pad), w: Math.ceil(box.x1 - box.x0 + pad * 2), h: Math.ceil(box.y1 - box.y0 + pad * 2) }
        if (at.w !== p.at.w || at.h !== p.at.h) {
          p.canvas.width = Math.ceil(at.w * dpr)
          p.canvas.height = Math.ceil(at.h * dpr)
          p.canvas.style.width = `${at.w}px`
          p.canvas.style.height = `${at.h}px`
        }
        p.canvas.style.translate = `${at.x}px ${at.y}px`
        p.at = at
        p.version++
        if (p.id === WAVE) {
          const wrist = p.pieces.flatMap((pc) => pc.points.map((pt) => mapped(pc.m, pt))).reduce((low, q) => (q[1] > low[1] ? q : low))
          p.canvas.style.transformOrigin = `${wrist[0] - at.x}px ${wrist[1] - at.y}px`
        }
        paintAll(p)
      }
    }

    /** The transform from a piece's recorded points to the canvas, for one copy. */
    const matrix = (p: Placed, c: Copy, pc: Piece) => {
      const cx = p.at.x + p.at.w / 2
      const cy = p.at.y + p.at.h / 2
      return new DOMMatrix()
        .scale(dpr)
        .translate(-p.at.x, -p.at.y)
        .translate(cx + c.dx, cy + c.dy)
        .rotate(c.a)
        .translate(-cx, -cy)
        .multiply(pc.m)
    }

    // A stroke is drawn solid into a layer of its canvas's size, then composed onto the canvas.
    // Each drawing in progress owns its layer: several groups can draw at the same time.
    const newLayer = (p: Placed) => {
      const layer = document.createElement('canvas')
      layer.width = p.canvas.width
      layer.height = p.canvas.height
      return { layer, g: layer.getContext('2d')! }
    }
    const clearLayer = (l: { layer: HTMLCanvasElement; g: CanvasRenderingContext2D }) => {
      l.g.setTransform(1, 0, 0, 1, 0, 0)
      l.g.clearRect(0, 0, l.layer.width, l.layer.height)
    }
    const put = (p: Placed, l: HTMLCanvasElement, brush: Brush) => compose(p.canvas.getContext('2d')!, l, brush, dpr)

    /** Every copy drawn so far, at once: after a layout change. */
    function paintAll(p: Placed) {
      p.canvas.getContext('2d')!.clearRect(0, 0, p.canvas.width, p.canvas.height)
      if (!p.copies.length) return
      const l = newLayer(p)
      for (const c of p.copies)
        for (const pc of p.pieces) {
          clearLayer(l)
          const { layer, g } = l
          g.setTransform(matrix(p, c, pc))
          render(g, pc, 1, true)
          put(p, layer, pc.brush)
        }
    }

    // p's mark, drawn over time. A layout change on the way (on phones, the browser bars showing or
    // hiding as you scroll) doesn't end it: the strokes already done are painted again in the new
    // place, and the drawing goes on from where it was.
    const draw = (p: Placed) =>
      new Promise<void>((done) => {
        const copy: Copy = { a: 0, dx: 0, dy: 0 }
        const finish = () => {
          p.copies.push(copy)
          if (p.id === WAVE && !reduced && !p.canvas.classList.contains('waving')) {
            p.canvas.classList.add('waving')
            seen.observe(p.canvas)
          }
          done()
        }
        if (reduced) {
          p.copies.push(copy)
          paintAll(p)
          p.copies.pop()
          return finish()
        }
        const out = p.canvas.getContext('2d')!
        const base = document.createElement('canvas')
        let cur = newLayer(p)
        let v = -1
        let i = 0
        let from = 1
        // From empty for the current layout: every piece finished by t, then the ink so far as the base.
        const setup = (t: number) => {
          v = p.version
          cur = newLayer(p)
          out.clearRect(0, 0, p.canvas.width, p.canvas.height)
          i = 0
          from = 1
          while (i < p.pieces.length && p.pieces[i].points.at(-1)![3] <= t) {
            const pc = p.pieces[i++]
            clearLayer(cur)
            cur.g.setTransform(matrix(p, copy, pc))
            render(cur.g, pc, 1, true)
            put(p, cur.layer, pc.brush)
          }
          clearLayer(cur)
          base.width = p.canvas.width
          base.height = p.canvas.height
          base.getContext('2d')!.drawImage(p.canvas, 0, 0)
        }
        const start = performance.now()
        const tick = () => {
          if (gone) return
          const t = performance.now() - start
          if (p.version !== v) setup(t)
          while (i < p.pieces.length) {
            const pc = p.pieces[i]
            let n = from - 1
            while (n < pc.points.length && pc.points[n][3] <= t) n++
            const end = n === pc.points.length
            cur.g.setTransform(matrix(p, copy, pc))
            if (n) from = render(cur.g, end ? pc : { brush: pc.brush, points: pc.points.slice(0, n) }, from, end)
            out.clearRect(0, 0, p.canvas.width, p.canvas.height)
            out.drawImage(base, 0, 0)
            put(p, cur.layer, pc.brush)
            if (!end) break
            // The base is the canvas as it is now; drawn over the old base, the ink under this
            // stroke would be laid twice (the airbrush darkened with every stroke after it).
            const bg = base.getContext('2d')!
            bg.clearRect(0, 0, base.width, base.height)
            bg.drawImage(p.canvas, 0, 0)
            clearLayer(cur)
            i++
            from = 1
          }
          if (i < p.pieces.length) requestAnimationFrame(tick)
          else finish()
        }
        requestAnimationFrame(tick)
      })

    // One queue for the whole page: the groups on screen draw one after the other, top to bottom,
    // each mark GAP after the last, so two never draw at once (the intro and a stat below it).
    const played = new WeakSet<Element>()
    const drawing = new WeakSet<Element>()
    const queue: Element[] = []
    let running = false
    const offScreen = (g: Element) => {
      const r = g.getBoundingClientRect()
      return r.bottom < 0 || r.top > innerHeight
    }
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const marksOf = (group: Element) => [...group.querySelectorAll('[data-mark]')].flatMap((a) => byAnchor.get(a) ?? [])
    const run = async () => {
      running = true
      await ready
      while (queue.length && !gone) {
        const group = queue.shift()!
        drawing.add(group)
        const drawn: Promise<void>[] = []
        for (const p of marksOf(group)) {
          // Scrolled past before its turn: the rest of it waits for the next time it shows.
          if (gone || (!reduced && offScreen(group))) break
          const d = draw(p)
          drawn.push(d)
          const lead = reduced ? 0 : (LEAD[p.id] ?? 0)
          const end = Math.max(0, ...p.pieces.map((pc) => pc.points.at(-1)![3]))
          if (lead) await wait(end * lead)
          else {
            await d
            if (!reduced) await wait(GAP)
          }
        }
        await Promise.all(drawn)
        drawing.delete(group)
        check()
      }
      running = false
    }
    const play = (group: Element) => {
      if (played.has(group)) return
      played.add(group)
      queue.push(group)
      queue.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      if (!running) void run()
    }
    // Off screen: the ink goes, so the next time the group shows it is drawn from empty.
    const erase = (group: Element) => {
      played.delete(group)
      const q = queue.indexOf(group)
      if (q >= 0) queue.splice(q, 1)
      for (const p of marksOf(group)) {
        p.copies = []
        p.canvas.getContext('2d')!.clearRect(0, 0, p.canvas.width, p.canvas.height)
        p.canvas.classList.remove('waving')
        seen.unobserve(p.canvas)
      }
    }

    // A group draws when its top reaches the top half of the screen; one too near the end of the
    // page to ever get there ("more") draws once it is all on screen. It is erased once it has
    // left the screen (and isn't still drawing).
    const groups = [...host.querySelectorAll('[data-ink-group]')]
    const check = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      for (const g of groups) {
        const r = g.getBoundingClientRect()
        if (played.has(g)) {
          if (!drawing.has(g) && offScreen(g)) erase(g)
          continue
        }
        const unreachable = r.top + scrollY - max > innerHeight * 0.5
        if (r.bottom < 0) continue // above the screen
        if (r.top < innerHeight * 0.5 || (unreachable && r.bottom <= innerHeight)) play(g)
      }
    }
    let tick = 0
    const onScroll = () => {
      tick ||= requestAnimationFrame(() => {
        tick = 0
        check()
      })
    }
    if (reduced) groups.forEach(play)
    else {
      void ready.then(() => !gone && check())
      addEventListener('scroll', onScroll, { passive: true })
      addEventListener('resize', onScroll)
    }
    const cleanup = [
      () => {
        cancelAnimationFrame(tick)
        removeEventListener('scroll', onScroll)
        removeEventListener('resize', onScroll)
      },
    ]

    // Any change of layout moves the anchors and the margins: place everything again.
    let frame = 0
    const relayout = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0
        layout()
      })
    }
    const ro = new ResizeObserver(relayout)
    ro.observe(host)
    // Only a new width moves the text: a height change (phone browser bars) needs no new layout.
    let width = document.documentElement.clientWidth
    const onResize = () => {
      const w = document.documentElement.clientWidth
      if (w === width) return
      width = w
      relayout()
    }
    addEventListener('resize', onResize)

    return () => {
      gone = true
      cleanup.forEach((f) => f())
      cancelAnimationFrame(frame)
      seen.disconnect()
      ro.disconnect()
      removeEventListener('resize', onResize)
      host.querySelectorAll('canvas.ink').forEach((c) => c.remove())
      all.forEach((p) => p.slot?.style.removeProperty('padding-block'))
    }
  }, [root])
  return null
}

/** How far a set of strokes' ink reaches past their points: the airbrush's soft dabs, or a line's half width. */
const reach = (strokes: Array<{ brush: Brush }>) => (strokes.some((s) => s.brush === 'airbrush') ? INK_REACH : 3)

const mapped = (m: DOMMatrix, [x, y, p, t]: Point): Point => {
  const q = m.transformPoint({ x, y })
  return [q.x, q.y, p, t]
}

/** A note moved beside the title: the size of every other note, unless that is wider than the room
 *  right of the title's text. */
function slotScale(n: Note, title: HTMLElement, zoom: number) {
  const range = document.createRange()
  range.selectNodeContents(title)
  const room = title.clientWidth - range.getBoundingClientRect().width - SLOT_GAP
  const b = slotBox(n)
  return Math.min(zoom * NOTE, Math.max(room, 0) / (b.x1 - b.x0))
}

/** Beside a title, a note's arrow should point at the content: down, down-left or left, between these
 *  directions (degrees, clockwise from right). The tilt to get there stays under MAX_TILT. */
const AIM = [90, 200]
const MAX_TILT = 75

/** The tilt (degrees, clockwise) that turns a note's arrow toward the content. */
function slotTilt(n: Note) {
  if (n.arrow === null) return 0
  const a = ((n.arrow - AIM[0] + 360) % 360) + AIM[0] // in [90, 450)
  if (a <= AIM[1]) return 0
  // Pointing right or down-right: clockwise; pointing up: counterclockwise. Whichever is shorter.
  const cw = AIM[0] + 360 - a
  const ccw = a - AIM[1]
  return cw <= ccw ? Math.min(cw, MAX_TILT) : -Math.min(ccw, MAX_TILT)
}

/** A note's box once tilted for its place beside the title. */
function slotBox(n: Note): Box {
  const cx = (n.box.x0 + n.box.x1) / 2
  const cy = (n.box.y0 + n.box.y1) / 2
  const m = new DOMMatrix().translate(cx, cy).rotate(slotTilt(n)).translate(-cx, -cy)
  return bounds(n.strokes.flatMap((s) => s.points.map((pt) => mapped(m, pt))))
}

/**
 * Where a note's arrow points, if it has one. A margin note's arrow reaches toward the text, so its
 * tip is the thin outer sliver of the note on the text's side (few points, unlike a drawing's
 * body). The direction runs from the note's middle to that sliver.
 */
function arrowOf(strokes: Stroke[], box: Box, left: boolean): number | null {
  const pts = strokes.flatMap((s) => s.points)
  const w = box.x1 - box.x0
  const tip = pts.filter(([x]) => (left ? x > box.x1 - 0.2 * w : x < box.x0 + 0.2 * w))
  if (!tip.length || tip.length / pts.length > 0.16) return null
  const b = bounds(tip)
  const dx = (b.x0 + b.x1) / 2 - (box.x0 + box.x1) / 2
  const dy = (b.y0 + b.y1) / 2 - (box.y0 + box.y1) / 2
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

/** The strokes on the replay clock: pauses between strokes capped at MAX_GAP, then sped up. */
function timeline(strokes: Stroke[], speed: number): Stroke[] {
  let cut = 0
  let last = 0
  return strokes.map((s, k) => {
    const gap = s.points[0][3] - last
    if (k && gap > MAX_GAP) cut += gap - MAX_GAP
    last = s.points.at(-1)![3]
    return { brush: s.brush, points: s.points.map(([x, y, p, t]): Point => [x, y, p, (t - cut) / speed]) }
  })
}
