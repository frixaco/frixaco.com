import type { Spec } from "./readout/store";

// Defaults match the Paper mock ("Hero Fill G — Shape Lab").
export const DEFAULTS = {
  sym: 7,
  n1: 0.35,
  n2: 1.6,
  n3: 1.6,
  morph: 0.72,
  layers: 40,
  twist: 5,
  height: 0.7,
  // Profile: the ring radius is a smooth curve through three handles (see profile()).
  pos1: 0.08,
  gain1: 0,
  pos2: 0.5,
  gain2: -0.58,
  pos3: 0.92,
  gain3: 0.05,
  tilt: 62,
  spin: 12,
  noise: 0.22,
  seed: 412,
  palette: 0,
  hilite: 20,
  chaos: 0.78,
};

export type ShapeValues = typeof DEFAULTS;

export const LIMITS = {
  layers: 64,
  pointsPerRing: 150,
  particles: 900,
};

const fixed = (digits: number, unit = "") => (v: number) => v.toFixed(digits) + unit;
const percent = (v: number) => `${Math.round(v * 100)} %`;
const signed = (v: number) => (v < 0 ? "−" : "+") + Math.abs(v).toFixed(2);

export const SPECS: Record<keyof ShapeValues, Spec> = {
  sym: { min: 3, max: 12, step: 1, format: String },
  n1: { min: 0.1, max: 4, step: 0.05, format: fixed(2) },
  n2: { min: 0.1, max: 4, step: 0.05, format: fixed(2) },
  n3: { min: 0.1, max: 4, step: 0.05, format: fixed(2) },
  morph: { min: 0, max: 1, step: 0.01, format: percent },
  layers: { min: 4, max: LIMITS.layers, step: 1, format: String },
  twist: { min: 0, max: 15, step: 0.5, format: fixed(1, "°") },
  height: { min: 0, max: 1, step: 0.01, format: fixed(2) },
  pos1: { min: 0, max: 1, step: 0.01, format: fixed(2) },
  gain1: { min: -0.9, max: 0.6, step: 0.01, format: signed },
  pos2: { min: 0, max: 1, step: 0.01, format: fixed(2) },
  gain2: { min: -0.9, max: 0.6, step: 0.01, format: signed },
  pos3: { min: 0, max: 1, step: 0.01, format: fixed(2) },
  gain3: { min: -0.9, max: 0.6, step: 0.01, format: signed },
  tilt: { min: 0, max: 90, step: 1, format: (v) => `${v}°` },
  spin: { min: 0, max: 30, step: 1, format: (v) => `${v} °/s` },
  noise: { min: 0, max: 1, step: 0.01, format: percent },
  seed: { min: 0, max: 9999, step: 1, format: (v) => String(v).padStart(4, "0") },
  palette: { min: 0, max: 2, step: 1, format: String },
  hilite: { min: 0, max: LIMITS.layers - 1, step: 1, format: String },
  chaos: { min: 0, max: 1, step: 0.01, format: fixed(2) },
};

export const HANDLES = 3;
/** Smallest distance between neighboring profile handles, as a fraction of the stack. */
const HANDLE_GAP = 0.06;

/** The highlighted ring must exist; profile handles keep their order along the stack. */
export function constrain(values: ShapeValues, changed: keyof ShapeValues) {
  values.hilite = Math.min(values.hilite, values.layers - 1);
  const match = /^pos(\d)$/.exec(changed);
  if (!match) return;
  // The moved handle stops at its neighbors instead of passing them.
  const i = Number(match[1]);
  const pos = (n: number) => values[`pos${n}` as keyof ShapeValues];
  const lo = i > 1 ? pos(i - 1) + HANDLE_GAP : 0;
  const hi = i < HANDLES ? pos(i + 1) - HANDLE_GAP : 1;
  values[changed] = Number(Math.min(Math.max(values[changed], lo), hi).toFixed(6));
}

export const particleCount = (values: ShapeValues) => Math.round(LIMITS.particles * values.chaos);

// Stroke colors per palette (mirrors ramp() / category() in shape.wgsl).
export const PALETTE = {
  seq: ["#38406b", "#5560a6", "#7f8de6", "#99a7ff", "#bac3ff"],
  cat: ["#99a7ff", "#dba941", "#d673e4", "#bbdc9e", "#a2d3f8", "#e8a8a5", "#8f72f0", "#f3eb7e"],
  mono: "#d9d9d9",
};

const mixHex = (a: string, b: string, t: number) => {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t).toString(16).padStart(2, "0")).join("")}`;
};

/** Stroke color of layer `k` at height `t` (0..1) for the current palette. */
export function layerColor(k: number, t: number, palette: number): string {
  if (palette >= 2) return PALETTE.mono;
  if (palette >= 1) return PALETTE.cat[k % PALETTE.cat.length];
  const x = Math.min(Math.max(t, 0), 1) * (PALETTE.seq.length - 1);
  const i = Math.min(Math.floor(x), PALETTE.seq.length - 2);
  return mixHex(PALETTE.seq[i], PALETTE.seq[i + 1], x - i);
}

/**
 * Ring radius at height `t` (0 = base, 1 = top), before chaos: a monotone cubic through
 * the three handles (pos, 1 + gain), Steffen's method. It is smooth (C1), never
 * overshoots the handles, and the middle tangent comes from both neighbors, so moving
 * one handle bends the curve on both sides of it. The curve settles flat into the
 * outer handles and holds their value out to the base and the top.
 * Mirrors profile() in shape.wgsl.
 */
export function profile(values: ShapeValues, t: number): number {
  const x = [values.pos1, values.pos2, values.pos3];
  const y = [1 + values.gain1, 1 + values.gain2, 1 + values.gain3];
  if (t <= x[0]) return y[0];
  if (t >= x[2]) return y[2];
  const h0 = x[1] - x[0];
  const h1 = x[2] - x[1];
  const s0 = (y[1] - y[0]) / h0;
  const s1 = (y[2] - y[1]) / h1;
  // Steffen: limited so each segment stays between its two handles.
  const p = (s0 * h1 + s1 * h0) / (h0 + h1);
  const slope = (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p));
  return t <= x[1]
    ? hermite(t, x[0], x[1], y[0], y[1], 0, slope)
    : hermite(t, x[1], x[2], y[1], y[2], slope, 0);
}

/** Cubic Hermite segment from (x0, y0) to (x1, y1) with end slopes d0, d1. */
function hermite(t: number, x0: number, x1: number, y0: number, y1: number, d0: number, d1: number): number {
  const h = x1 - x0;
  const u = (t - x0) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * d0 + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * d1;
}
