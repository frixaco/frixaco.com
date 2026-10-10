import { clock, frameLoop } from "vgpu";
import { layerRail, profileGraph, setLayerDashes } from "./models";
import { DEFAULTS, LIMITS, PALETTE, SPECS, constrain, particleCount } from "./params";
import { mountControls } from "./readout/controls";
import { createStore } from "./readout/store";
import { LAYER_FLOATS, createShapeRenderer, type ShapeRenderer } from "./renderer";
import "./styles/readout.css";
import "./styles/shape-lab.css";

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

const canvas = $<HTMLCanvasElement>("#stage");
const stage = canvas.parentElement!;
const count = $("#count");
const flag = $("#flag");
const play = $<HTMLButtonElement>("#play");
const stop = $<HTMLButtonElement>("#stop");
const swatches = $("#swatches");

const store = createStore(DEFAULTS, SPECS, constrain);
const controls = mountControls($(".rack"), store, {
  graphs: { profile: profileGraph },
  rails: { layers: layerRail },
});

const SWATCHES = [PALETTE.seq, PALETTE.cat.slice(0, 5), [PALETTE.mono]];
const groupThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

let flagWidth = 0;
let stageWidth = 0;

function updateLabels() {
  const { layers, hilite, palette } = store.values;
  const vertices = groupThousands(layers * LIMITS.pointsPerRing);
  count.textContent = `${layers} layers · ${LIMITS.pointsPerRing} pts · ${vertices} vertices · ${particleCount(store.values)} particles`;
  const label = `layer ${hilite}`;
  if (flag.textContent !== label) {
    flag.textContent = label;
    flagWidth = flag.offsetWidth; // only when the label changes, never per frame
  }
  swatches.replaceChildren(
    ...SWATCHES[palette].map((color) => {
      const swatch = document.createElement("span");
      swatch.style.background = color;
      return swatch;
    }),
  );
}
updateLabels();

let time = 0;
let dirty = true;
let visible = true;
// The rail's dashes come from the GPU's layer records and depend only on these.
const dashKey = () => `${store.values.layers}|${store.values.chaos}|${store.values.seed}`;
let lastDashKey = "";
let layersStale = true;
// Respect reduced motion: start on the still, composed frame.
let playing = !matchMedia("(prefers-reduced-motion: reduce)").matches;

store.subscribe(() => {
  updateLabels();
  dirty = true;
  if (dashKey() !== lastDashKey) layersStale = true;
});

function setPlaying(next: boolean) {
  playing = next; // stop pauses in place; play resumes from there
  play.setAttribute("aria-pressed", String(next));
  stop.setAttribute("aria-pressed", String(!next));
  dirty = true;
}
setPlaying(playing);
play.addEventListener("click", () => setPlaying(true));
stop.addEventListener("click", () => setPlaying(false));

// Skip all GPU work while the stage is scrolled out of view.
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  dirty ||= visible;
}).observe(stage);
let resize = (_width: number, _height: number) => {};
new ResizeObserver(([entry]) => {
  stageWidth = entry.contentRect.width;
  resize(entry.contentRect.width, entry.contentRect.height);
  dirty = true;
}).observe(canvas);

// Picking: click a ring to highlight it; drag the flag to scrub through layers.
// One pick in flight at a time; the latest pointer position wins.
function enablePicking(renderer: ShapeRenderer) {
  let pending: { x: number; y: number; mode: 0 | 1 } | null = null;
  let busy = false;
  const run = () => {
    if (busy || !pending) return;
    const { x, y, mode } = pending;
    pending = null;
    busy = true;
    renderer
      .pick(x, y, mode)
      .then(([layer, distance]) => {
        // A click only counts when it lands on (or right next to) a ring.
        if (mode === 1 || distance <= 12) store.set("hilite", layer);
      })
      .finally(() => {
        busy = false;
        run();
      });
  };
  const request = (e: PointerEvent, mode: 0 | 1) => {
    const box = canvas.getBoundingClientRect();
    pending = { x: e.clientX - box.left, y: e.clientY - box.top, mode };
    run();
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 0) request(e, 0);
  });
  flag.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    flag.classList.add("dragging");
    const move = (ev: PointerEvent) => request(ev, 1);
    const end = () => {
      flag.classList.remove("dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });
}

async function start() {
  const renderer = await createShapeRenderer(canvas, store.values);
  resize = renderer.resize;
  enablePicking(renderer);
  const frameClock = clock(renderer.gpu);
  let flagPending = false;
  let layersPending = false;

  frameLoop(renderer.gpu, (frame) => {
    if (!visible) return;
    // Clamp the step so a backgrounded tab doesn't jump on return.
    if (playing) time += Math.min(frameClock.deltaTime, 0.1);
    else if (!dirty) return;
    dirty = false;

    renderer.render(frame, store.values, time);

    // At most one readback in flight; the flag trails the ring by a frame or two.
    if (!flagPending) {
      flagPending = true;
      renderer
        .readFlag()
        .then(([x, y]) => {
          // transform, not left/top: no layout, no layout shift.
          // Beside the ring, but never past the stage's right inset.
          const left = Math.min(x + 8, stageWidth - flagWidth - 16);
          flag.style.transform = `translate(${Math.round(left)}px, ${Math.round(y)}px) translateY(-50%)`;
          flag.hidden = false;
        })
        .finally(() => {
          flagPending = false;
        });
    }

    // Dashes don't depend on time, so they're read back only after a change.
    if (layersStale && !layersPending) {
      layersStale = false;
      lastDashKey = dashKey();
      layersPending = true;
      renderer
        .readLayers()
        .then((records) => {
          setLayerDashes(
            Array.from({ length: store.values.layers }, (_, k) => records[k * LAYER_FLOATS + 10] > 0),
          );
          controls.render();
        })
        .finally(() => {
          layersPending = false;
        });
    }
  });
}

flag.hidden = true;
start().catch((error: unknown) => {
  console.error(error);
  const message = document.createElement("div");
  message.className = "fallback";
  message.textContent = error instanceof Error ? error.message : "WebGPU failed to start";
  stage.append(message);
});
