// The pencil marks' brushes: how a recorded stroke turns into ink. Shared by the site (the marks
// around the content) and scripts/sketchbook (where the marks are drawn), so a mark looks the same
// on the page as when it was drawn. Browser only. Plain erasable TypeScript: the sketchbook
// serves this file with its types stripped.

export type Brush = 'pencil' | 'pen' | 'airbrush'
/** x, y (CSS px, relative to the mark's anchor), pen pressure 0..1, time (ms from the mark's start). */
export type Point = [x: number, y: number, p: number, t: number]
export interface Stroke {
  brush: Brush
  points: Point[]
}
/** One saved drawing: content/marks/<id>.json. */
export interface Mark {
  id: string
  /** The anchor's size when it was drawn. */
  anchor: { w: number; h: number }
  strokes: Stroke[]
}

interface BrushStyle {
  color: string
  alpha: number
  grain?: boolean
  smooth?: boolean
  dabs?: boolean
  width?: (p: number) => number
}

// pencil: strong pressure curve, smoothed through midpoints, grainy.
// pen: near-constant width, raw input (no smoothing), solid ink.
// airbrush: soft dabs every couple of pixels; pressure sets size and flow.
export const BRUSHES: Record<Brush, BrushStyle> = {
  pencil: { color: '#34312b', alpha: 0.9, grain: true, smooth: true, width: (p) => 0.5 + 3.4 * p ** 1.6 },
  pen: { color: '#14130f', alpha: 1, width: (p) => 1.7 + 0.5 * p },
  airbrush: { color: '#14130f', alpha: 1, dabs: true },
}

/** How far ink reaches past a stroke's points (the widest airbrush dab's radius). */
export const INK_REACH = 22

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

let made: { grain: HTMLCanvasElement; dab: HTMLCanvasElement; tmp: HTMLCanvasElement } | undefined
/** Made on first use, so importing this file needs no document. */
const parts = () => {
  if (made) return made
  // Graphite grain: random coverage that eats into pencil strokes.
  const grain = canvas(96, 96)
  const gg = grain.getContext('2d')!
  const img = gg.createImageData(96, 96)
  for (let i = 0; i < img.data.length; i += 4) img.data[i + 3] = 255 * (0.35 + 0.65 * Math.random() ** 0.6)
  gg.putImageData(img, 0, 0)
  // Airbrush dab: ink in the middle, nothing at the edge.
  const dab = canvas(64, 64)
  const dg = dab.getContext('2d')!
  const r = dg.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(20,19,15,1)')
  r.addColorStop(0.35, 'rgba(20,19,15,0.55)')
  r.addColorStop(0.7, 'rgba(20,19,15,0.15)')
  r.addColorStop(1, 'rgba(20,19,15,0)')
  dg.fillStyle = r
  dg.fillRect(0, 0, 64, 64)
  made = { grain, dab, tmp: canvas(1, 1) }
  return made
}

type XY = [number, number]
const mid = (a: Point, b: Point): XY => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
const stamp = (g: CanvasRenderingContext2D, [x, y, p]: Point) => {
  const r = 7 + 15 * p
  g.globalAlpha = 0.035 + 0.06 * p
  g.drawImage(parts().dab, x - r, y - r, r * 2, r * 2)
}

/**
 * Draws stroke s into g (in the coordinates of g's transform) from point index `from` on, and
 * returns the index to continue from: each sample is drawn once, so a long stroke costs the same
 * per frame as a short one. `done` draws the end too (the pencil's last half segment, or a dot).
 * Draw into an empty layer, then put it on the page with compose().
 */
export function render(g: CanvasRenderingContext2D, s: Stroke, from: number, done: boolean): number {
  const b = BRUSHES[s.brush]
  const pts = s.points
  const n = pts.length
  g.strokeStyle = g.fillStyle = b.color
  g.lineCap = g.lineJoin = 'round'
  if (b.dabs) {
    for (; from < n; from++) {
      const [a, c] = [pts[from - 1], pts[from]]
      const steps = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 2)
      for (let i = from === 1 ? 0 : 1; i <= steps; i++) {
        const f = steps ? i / steps : 0
        stamp(g, [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, a[2] + (c[2] - a[2]) * f, 0])
      }
    }
    if (done && n === 1) stamp(g, pts[0])
    g.globalAlpha = 1
    return from
  }
  const width = b.width!
  const seg = (p: XY | Point, q: XY | Point, w: number) => {
    g.lineWidth = w
    g.beginPath()
    g.moveTo(p[0], p[1])
    g.lineTo(q[0], q[1])
    g.stroke()
  }
  if (b.smooth) {
    const start = (k: number): XY | Point => (k === 1 ? pts[0] : mid(pts[k - 1], pts[k]))
    for (; from < n - 1; from++) {
      const p = start(from)
      const q = mid(pts[from], pts[from + 1])
      g.lineWidth = width(pts[from][2])
      g.beginPath()
      g.moveTo(p[0], p[1])
      g.quadraticCurveTo(pts[from][0], pts[from][1], q[0], q[1])
      g.stroke()
    }
    if (done && n > 1) seg(start(n - 1), pts[n - 1], width(pts[n - 1][2]))
  } else {
    for (; from < n; from++) seg(pts[from - 1], pts[from], width((pts[from - 1][2] + pts[from][2]) / 2))
  }
  if (done && n === 1) {
    g.beginPath()
    g.arc(pts[0][0], pts[0][1], width(pts[0][2]) / 2, 0, Math.PI * 2)
    g.fill()
  }
  return from
}

/**
 * Puts layer (one stroke of brush `brush`, drawn solid by render()) onto target, both in device
 * pixels: the grain first, then the brush's opacity. `scale` is device pixels per CSS pixel, so the
 * grain is the same size on every screen.
 */
export function compose(target: CanvasRenderingContext2D, layer: HTMLCanvasElement, brush: Brush, scale: number) {
  const b = BRUSHES[brush]
  let src = layer
  if (b.grain) {
    const { tmp, grain } = parts()
    if (tmp.width < layer.width || tmp.height < layer.height) {
      tmp.width = Math.max(tmp.width, layer.width)
      tmp.height = Math.max(tmp.height, layer.height)
    }
    const t = tmp.getContext('2d')!
    t.clearRect(0, 0, layer.width, layer.height)
    t.drawImage(layer, 0, 0)
    t.globalCompositeOperation = 'destination-in'
    const fill = t.createPattern(grain, 'repeat')!
    fill.setTransform(new DOMMatrix([scale, 0, 0, scale, 0, 0]))
    t.fillStyle = fill
    t.fillRect(0, 0, layer.width, layer.height)
    t.globalCompositeOperation = 'source-over'
    src = tmp
  }
  target.globalAlpha = b.alpha
  target.drawImage(src, 0, 0, layer.width, layer.height, 0, 0, layer.width, layer.height)
  target.globalAlpha = 1
}
