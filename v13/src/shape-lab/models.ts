// Models for the Shape Lab's graph and rail controls.
import type { GraphModel, RailModel } from "./readout/controls";
import { HANDLES, SPECS, layerColor, profile, type ShapeValues } from "./params";

// Profile: ring radius along the stack, base on the left, top on the right. The curve
// is profile() (params.ts), a smooth spline through the three numbered handles:
// x = where the handle sits on the stack (pos), y = the ring radius there (1 + gain).
// The width follows the rack (310px in the desktop rack, the full row on phones); see setProfileWidth.
const P = { width: 310, height: 56, pad: 8, top: 4, bottom: 52 };
const S_MAX = 1.7; // radius at the top edge; the bottom edge is 0
const span = () => P.width - 2 * P.pad;
const toX = (t: number) => P.pad + t * span();
const toY = (scale: number) => P.bottom - (scale / S_MAX) * (P.bottom - P.top);
const fromY = (y: number) => ((P.bottom - y) / (P.bottom - P.top)) * S_MAX;
const key = (name: "pos" | "gain", i: number) => `${name}${i + 1}` as keyof ShapeValues;
const SAMPLES = 120;

/** Resizes the profile graph; re-render the controls afterwards. */
export function setProfileWidth(width: number) {
  P.width = Math.max(120, Math.round(width));
}

export const profileGraph: GraphModel = {
  get width() {
    return P.width;
  },
  height: P.height,
  handles: Array.from({ length: HANDLES }, (_, i) => ({ x: key("pos", i), y: key("gain", i), xDir: 1, yDir: -1 })),
  point: (v, i) => [toX(v[key("pos", i)]), toY(1 + v[key("gain", i)])],
  apply(i, x, y, store) {
    store.set(key("pos", i), (x - P.pad) / span());
    store.set(key("gain", i), fromY(y) - 1);
  },
  readouts: (v, i) => [
    ["pos", v[key("pos", i)].toFixed(2)],
    ["gain", SPECS[key("gain", i)].format(v[key("gain", i)])],
  ],
  draw(v) {
    const values = v as ShapeValues;
    const zero = toY(1);
    const curve = Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const t = i / SAMPLES;
      return `${toX(t).toFixed(1)} ${toY(profile(values, t)).toFixed(1)}`;
    });
    let svg = "";
    for (const q of [0.25, 0.5, 0.75]) svg += `<path class="grid" d="M${Math.floor(toX(q))}.5 0 V${P.height}"/>`;
    svg += `<path class="grid zero" d="M0 ${Math.floor(zero)}.5 H${P.width}"/>`;
    svg += `<path class="curve" d="M0 ${toY(profile(values, 0)).toFixed(1)} L${curve.join(" ")} H${P.width}"/>`;
    return svg;
  },
};

// Layer rail: one equal-width line per layer, colored like the stage; dashes come
// from the GPU's layer records (see setLayerDashes).
let dashed: boolean[] = [];

export function setLayerDashes(flags: boolean[]) {
  dashed = flags;
}

export const layerRail: RailModel = {
  count: (v) => v.layers,
  line: (k, v) => ({
    color: layerColor(k, k / Math.max(v.layers - 1, 1), v.palette),
    dashed: dashed[k] ?? false,
  }),
};
