// Page wiring for the hero Shape Lab: store, controls, labels, play/stop, picking,
// the phone drag gesture and the render loop. Ported from experiments/shape-lab/src/main.ts.
// Loaded on the client only, after the page is up (see ShapeLab.tsx).
import { clock, frameLoop } from "vgpu";
import { layerRail, profileGraph, setLayerDashes, setProfileWidth } from "./models";
import { DEFAULTS, LIMITS, PALETTE, SPECS, constrain, particleCount, type ShapeValues } from "./params";
import { mountControls } from "./readout/controls";
import { createStore } from "./readout/store";
import { LAYER_FLOATS, createShapeRenderer, type ShapeRenderer } from "./renderer";

export const SWATCHES = [PALETTE.seq, PALETTE.cat.slice(0, 5), [PALETTE.mono]];
const groupThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Stage labels for a set of values; also rendered on the server for the first paint. */
export function countLabels(values: ShapeValues) {
  const particles = particleCount(values);
  const vertices = groupThousands(values.layers * LIMITS.pointsPerRing);
  return {
    full: `${values.layers} layers · ${LIMITS.pointsPerRing} pts · ${vertices} vertices · ${particles} particles`,
    short: `${values.layers} layers · ${particles} particles`,
  };
}

/** Phones get a drag gesture on the stage: ↔ twist, ↕ chaos (see the mock's "dragging" state). */
const PHONE = "(max-width: 767px)";

interface Options {
  /** Mount the controls only, showing the defaults (no WebGPU, or reduced motion). */
  still?: boolean;
  /** Called once the first WebGPU frame is on screen, or with the error when it can't start. */
  onReady(error?: unknown): void;
}

export function mountShapeLab(root: HTMLElement, { still = false, onReady }: Options): () => void {
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const canvas = $<HTMLCanvasElement>("canvas");
  const stage = $(".stage");
  const countFull = $(".count-full");
  const countShort = $(".count-short");
  const flag = $(".flag");
  const toggle = $<HTMLButtonElement>(".play-toggle");
  const swatches = $(".swatches");
  const graphHost = $(".graph-host");
  const gesture = $(".gesture");
  const chipTwist = $(".chip-twist");
  const chipChaos = $(".chip-chaos");

  const cleanups: Array<() => void> = [];
  const listen = <K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, fn as EventListener, options);
    cleanups.push(() => target.removeEventListener(type, fn as EventListener, options));
  };

  const store = createStore(DEFAULTS, SPECS, constrain);
  setProfileWidth(graphHost.clientWidth);
  const controls = mountControls(root.querySelector(".rack")!, store, {
    graphs: { profile: profileGraph },
    rails: { layers: layerRail },
  });
  cleanups.push(controls.unmount);

  let flagWidth = 0;
  let stageWidth = 0;
  let lastPalette = -1;

  function updateLabels() {
    const { hilite, palette } = store.values;
    const labels = countLabels(store.values);
    countFull.textContent = labels.full;
    countShort.textContent = labels.short;
    const label = `layer ${hilite}`;
    if (flag.textContent !== label) {
      flag.textContent = label;
      flagWidth = flag.offsetWidth; // only when the label changes, never per frame
    }
    if (palette !== lastPalette) {
      lastPalette = palette;
      swatches.replaceChildren(
        ...SWATCHES[palette].map((color) => {
          const swatch = document.createElement("span");
          swatch.style.background = color;
          return swatch;
        }),
      );
    }
  }
  updateLabels();

  let time = 0;
  let dirty = true;
  let visible = true;
  let disposed = false;
  // The rail's dashes come from the GPU's layer records and depend only on these.
  const dashKey = () => `${store.values.layers}|${store.values.chaos}|${store.values.seed}`;
  let lastDashKey = "";
  let layersStale = true;
  let playing = true;

  cleanups.push(
    store.subscribe(() => {
      updateLabels();
      dirty = true;
      if (dashKey() !== lastDashKey) layersStale = true;
    }),
  );

  // One toggle: pressed (green, pause glyph) while playing; stop pauses in place, play resumes.
  function setPlaying(next: boolean) {
    playing = next;
    toggle.setAttribute("aria-pressed", String(next));
    toggle.setAttribute("aria-label", next ? "Pause" : "Play");
    dirty = true;
  }
  setPlaying(playing);
  listen(toggle, "click", () => setPlaying(!playing));

  // Skip all GPU work while the stage is scrolled out of view or the tab is hidden.
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    dirty ||= visible;
  });
  io.observe(stage);
  cleanups.push(() => io.disconnect());

  let resize = (_width: number, _height: number) => {};
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === canvas) {
        stageWidth = entry.contentRect.width;
        resize(entry.contentRect.width, entry.contentRect.height);
        dirty = true;
      } else if (entry.target === graphHost) {
        setProfileWidth(entry.contentRect.width);
        controls.render();
      }
    }
  });
  ro.observe(canvas);
  ro.observe(graphHost);
  cleanups.push(() => ro.disconnect());

  // Picking: click a ring to highlight it; drag the flag to scrub through layers.
  // One pick in flight at a time; the latest pointer position wins.
  function enablePicking(renderer: ShapeRenderer) {
    let pending: { x: number; y: number; mode: 0 | 1 } | null = null;
    let busy = false;
    const run = () => {
      if (busy || !pending || disposed) return;
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
    const request = (x: number, y: number, mode: 0 | 1) => {
      const box = canvas.getBoundingClientRect();
      pending = { x: x - box.left, y: y - box.top, mode };
      run();
    };

    const phone = matchMedia(PHONE);
    listen(canvas, "pointerdown", (e) => {
      if (e.button !== 0) return;
      if (!phone.matches) {
        request(e.clientX, e.clientY, 0);
        return;
      }
      startGesture(e, (x, y) => request(x, y, 0));
    });

    listen(flag, "pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      flag.classList.add("dragging");
      const move = (ev: PointerEvent) => request(ev.clientX, ev.clientY, 1);
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

  // Phone gesture: a drag that starts sideways owns the pointer (the stage is
  // `touch-action: pan-y`, so a vertical start still scrolls the page). Then
  // ↔ adds twist and ↕ (up) adds chaos, 1:1 from where the finger landed.
  // A tap without movement picks a ring, like a click on desktop.
  function startGesture(e: PointerEvent, tap: (x: number, y: number) => void) {
    const start = { x: e.clientX, y: e.clientY, twist: store.values.twist, chaos: store.values.chaos };
    const box = stage.getBoundingClientRect();
    const twistSpan = SPECS.twist.max - SPECS.twist.min;
    const chaosSpan = SPECS.chaos.max - SPECS.chaos.min;
    let moved = false;
    const chaosBox = root.querySelector<HTMLElement>('.row-chaos [data-control="number"]');

    const place = (x: number, y: number) => {
      gesture.style.setProperty("--x", `${Math.round(x - box.left)}px`);
      gesture.style.setProperty("--y", `${Math.round(y - box.top)}px`);
      chipTwist.textContent = store.format("twist");
      chipChaos.textContent = store.format("chaos");
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved) {
        moved = true;
        gesture.hidden = false;
        chaosBox?.classList.add("active");
        try {
          canvas.setPointerCapture(ev.pointerId);
        } catch {
          // The pointer may already be gone (e.g. released between events).
        }
      }
      // The stage's width covers the full twist range; its height covers chaos.
      store.set("twist", start.twist + (dx / box.width) * twistSpan);
      store.set("chaos", start.chaos - (dy / box.height) * chaosSpan);
      place(ev.clientX, ev.clientY);
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
      gesture.hidden = true;
      chaosBox?.classList.remove("active");
      if (!moved && ev.type === "pointerup") tap(ev.clientX, ev.clientY);
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  async function start() {
    const renderer = await createShapeRenderer(canvas, store.values);
    // Disposing the gpu stops the frame loop and frees every buffer and pipeline.
    if (disposed) return renderer.gpu.dispose();
    cleanups.push(() => renderer.gpu.dispose());
    resize = renderer.resize;
    resize(canvas.clientWidth, canvas.clientHeight);
    enablePicking(renderer);
    const frameClock = clock(renderer.gpu);
    let flagPending = false;
    let layersPending = false;
    let first = true;

    frameLoop(renderer.gpu, (frame) => {
      if (!visible || disposed) return;
      // Clamp the step so a backgrounded tab doesn't jump on return.
      if (playing) time += Math.min(frameClock.deltaTime, 0.1);
      else if (!dirty) return;
      dirty = false;

      renderer.render(frame, store.values, time);
      if (first) {
        first = false;
        // Reveal once the frame is presented, so the still never flashes to black.
        requestAnimationFrame(() => onReady());
      }

      // At most one readback in flight; the flag trails the ring by a frame or two.
      if (!flagPending) {
        flagPending = true;
        renderer
          .readFlag()
          .then(([x, y]) => {
            // transform, not left/top: no layout, no layout shift.
            // Beside the ring, but never past the stage's right inset.
            const inset = matchMedia(PHONE).matches ? 20 : 16;
            const left = Math.min(x + 8, stageWidth - flagWidth - inset);
            flag.style.transform = `translate(${Math.round(left)}px, ${Math.round(y)}px) translateY(-50%)`;
            flag.hidden = false;
          })
          .catch(() => {})
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
          .catch(() => {})
          .finally(() => {
            layersPending = false;
          });
      }
    });
  }

  flag.hidden = true;
  if (still) setPlaying(false);
  else start().catch((error: unknown) => {
    console.warn("Shape Lab:", error);
    onReady(error ?? new Error("WebGPU failed to start"));
  });

  return () => {
    disposed = true;
    for (const fn of cleanups.splice(0)) fn();
  };
}
