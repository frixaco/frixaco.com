// Readout controls, wired to a Store by markup:
//
//   <div data-control="fader" data-param="layers" data-label="Layers"></div>
//   <input data-control="number" data-param="seed" aria-label="Seed">
//   <div data-control="segmented" data-param="sym" data-options="3,4,5"></div>
//   <div data-control="toggles" data-param="palette" data-options="0,1,2" data-labels="SEQ,CAT,MONO"></div>
//   <div data-control="meter" data-param="chaos" data-label="Chaos" data-cells="20" data-hot="0.6"></div>
//   <div data-control="knob" data-param="twist" data-label="Twist"></div>
//   <div data-control="graph" data-graph="profile" data-label="Profile" data-readouts="profile-values"></div>
//   <div data-control="rail" data-param="hilite" data-rail="layers" data-label="Layer"></div>
//
// Faders and meters: drag or click horizontally; arrows, Page Up/Down, Home/End.
// Number boxes: drag vertically (Alt for fine steps), arrows to nudge,
// double-click or Enter to type, Escape to cancel.
// Knobs: drag vertically (Alt for fine), double-click to reset, arrow keys.
// Graphs: drag a handle (Shift locks an axis), double-click resets the selected one,
// number keys pick a handle, arrows move it; while dragging, guides drop to both axes.
// Rails: drag or click vertically to pick an item, arrow keys.
import type { Store, Values } from "./store";

/** One draggable point on a graph: the keys it moves and their direction on screen. */
export interface GraphHandle {
  readonly x: string;
  readonly y: string;
  readonly xDir: 1 | -1;
  readonly yDir: 1 | -1;
}

/** A 2-D control with one or more handles: the page supplies the drawing and the value mapping. */
export interface GraphModel {
  readonly width: number;
  readonly height: number;
  readonly handles: readonly GraphHandle[];
  /** SVG content for the display, in display pixels; `selected` is the selected handle. */
  draw(values: Values, selected: number): string;
  /** Position of handle `index` in display pixels. */
  point(values: Values, index: number): [number, number];
  /** Writes the values handle `index` at (x, y) stands for. */
  apply(index: number, x: number, y: number, store: Store<Values>): void;
  readouts(values: Values, index: number): Array<[label: string, value: string]>;
}

/** A vertical picker over `count` items; item 0 sits at the bottom. */
export interface RailModel {
  count(values: Values): number;
  line(index: number, values: Values): { color: string; dashed: boolean };
}

export interface ControlModels {
  graphs?: Record<string, GraphModel>;
  rails?: Record<string, RailModel>;
}

type Render = () => void;
type Bind = (el: HTMLElement, store: Store<Values>, key: string, models: ControlModels) => Render;

function sliderKeys(el: HTMLElement, store: Store<Values>, key: string) {
  el.tabIndex = 0;
  el.addEventListener("keydown", (e) => {
    const { min, max, step } = store.specs[key];
    const value = store.values[key];
    const next = {
      ArrowLeft: value - step,
      ArrowDown: value - step,
      ArrowRight: value + step,
      ArrowUp: value + step,
      PageDown: value - step * 10,
      PageUp: value + step * 10,
      Home: min,
      End: max,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    store.set(key, next);
  });
}

function describeSlider(el: HTMLElement, store: Store<Values>, key: string) {
  const { min, max } = store.specs[key];
  el.setAttribute("role", "slider");
  el.setAttribute("aria-valuemin", String(min));
  el.setAttribute("aria-valuemax", String(max));
  el.setAttribute("aria-valuenow", String(store.values[key]));
  el.setAttribute("aria-valuetext", store.format(key));
}

// Pointer capture doesn't hold on every element (text inputs in Chromium), so
// drags are tracked on the window for as long as the button is down.
function trackDrag(
  start: PointerEvent,
  move: (e: PointerEvent) => void,
  end: () => void = () => {},
) {
  const onMove = (e: PointerEvent) => {
    if (e.pointerId === start.pointerId) move(e);
  };
  const onEnd = (e: PointerEvent) => {
    if (e.pointerId !== start.pointerId) return;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onEnd);
    end();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onEnd);
  window.addEventListener("pointercancel", onEnd);
}

// Drag along the element's width to set a value; a click jumps straight to it.
function dragAcross(el: HTMLElement, store: Store<Values>, key: string) {
  const update = (e: PointerEvent) => {
    const box = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    const { min, max } = store.specs[key];
    store.set(key, min + f * (max - min));
  };
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.focus();
    update(e);
    trackDrag(e, update);
  });
}

const fader: Bind = (el, store, key) => {
  el.setAttribute("aria-label", el.dataset.label ?? key);
  el.replaceChildren();
  const fill = el.appendChild(document.createElement("div"));
  fill.className = "fill";
  if (el.dataset.name) {
    const name = el.appendChild(document.createElement("span"));
    name.className = "name";
    name.textContent = el.dataset.name;
  }
  const value = el.appendChild(document.createElement("span"));
  value.className = "value";
  dragAcross(el, store, key);
  sliderKeys(el, store, key);
  return () => {
    fill.style.width = `${store.fraction(key) * 100}%`;
    value.textContent = store.format(key);
    describeSlider(el, store, key);
  };
};

const meter: Bind = (el, store, key) => {
  el.setAttribute("aria-label", el.dataset.label ?? key);
  const count = Number(el.dataset.cells ?? 20);
  const hotFrom = Math.round(Number(el.dataset.hot ?? 1) * count);
  const cells = Array.from({ length: count }, () => el.appendChild(document.createElement("span")));
  dragAcross(el, store, key);
  sliderKeys(el, store, key);
  return () => {
    const lit = Math.round(store.fraction(key) * count);
    cells.forEach((cell, i) => {
      cell.className = i >= lit ? "" : i >= hotFrom ? "hot" : "on";
    });
    describeSlider(el, store, key);
  };
};

const number: Bind = (el, store, key) => {
  const input = el as HTMLInputElement;
  const step = () => store.specs[key].step;
  input.readOnly = true;

  const edit = () => {
    input.readOnly = false;
    input.value = String(store.values[key]);
    input.focus();
    input.select();
  };
  const finish = (apply: boolean) => {
    if (input.readOnly) return;
    input.readOnly = true;
    if (apply) store.set(key, Number(input.value));
    input.value = store.format(key);
  };

  input.addEventListener("pointerdown", (e) => {
    if (!input.readOnly || e.button !== 0) return;
    e.preventDefault();
    input.focus();
    input.classList.add("active");
    const start = { y: e.clientY, value: store.values[key] };
    // One step per 4px; hold Alt for fine steps.
    trackDrag(
      e,
      (ev) => store.set(key, start.value + ((start.y - ev.clientY) / 4) * step() * (ev.altKey ? 0.1 : 1)),
      () => input.classList.remove("active"),
    );
  });
  // A text drag-and-drop would cancel the pointer stream mid-drag.
  input.addEventListener("dragstart", (e) => e.preventDefault());
  input.addEventListener("dblclick", edit);
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("keydown", (e) => {
    if (!input.readOnly) {
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
      return;
    }
    if (e.key === "Enter") edit();
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      store.set(key, store.values[key] + (e.key === "ArrowUp" ? 1 : -1) * step() * (e.shiftKey ? 10 : 1));
    }
  });

  return () => {
    if (input.readOnly) input.value = store.format(key);
  };
};

// One pressed button among `data-options`; used by segmented and toggles.
const choice: Bind = (el, store, key) => {
  const options = (el.dataset.options ?? "").split(",").map(Number);
  const labels = el.dataset.labels?.split(",") ?? options.map(String);
  const buttons = options.map((option, i) => {
    const button = el.appendChild(document.createElement("button"));
    button.type = "button";
    button.textContent = labels[i];
    button.addEventListener("click", () => store.set(key, option));
    return button;
  });
  return () => {
    buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(store.values[key] === options[i])));
  };
};

// Knob: a 300° arc from 7 o'clock; the value arc fills clockwise.
const KNOB = { size: 42, c: 21, r: 12.5, start: 120, sweep: 300 };

function arcPath(from: number, to: number) {
  const { c, r } = KNOB;
  const at = (a: number) => [c + r * Math.cos((a * Math.PI) / 180), c + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = at(from);
  const [x1, y1] = at(to);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const knob: Bind = (el, store, key) => {
  const { size, c, start, sweep } = KNOB;
  el.setAttribute("aria-label", el.dataset.label ?? key);
  el.innerHTML =
    `<span class="label">${el.dataset.label ?? key}</span>` +
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">` +
    `<path class="track" d="${arcPath(start, start + sweep)}"/><path class="arc"/><path class="pointer"/></svg>` +
    `<span class="value"></span>` +
    `<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>`;
  const arc = el.querySelector<SVGPathElement>(".arc")!;
  const pointer = el.querySelector<SVGPathElement>(".pointer")!;
  const value = el.querySelector<HTMLElement>(".value")!;

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.focus();
    el.classList.add("active");
    const { min, max } = store.specs[key];
    const begin = { y: e.clientY, value: store.values[key] };
    // 160px of travel covers the full range; Alt for fine control.
    trackDrag(
      e,
      (ev) => store.set(key, begin.value + ((begin.y - ev.clientY) / 160) * (max - min) * (ev.altKey ? 0.1 : 1)),
      () => el.classList.remove("active"),
    );
  });
  el.addEventListener("dblclick", () => store.reset(key));
  sliderKeys(el, store, key);

  return () => {
    const angle = start + sweep * store.fraction(key);
    arc.setAttribute("d", store.fraction(key) > 0.001 ? arcPath(start, angle) : "");
    const rad = (angle * Math.PI) / 180;
    pointer.setAttribute(
      "d",
      `M${(c + 3 * Math.cos(rad)).toFixed(2)} ${(c + 3 * Math.sin(rad)).toFixed(2)} L${(c + 11.5 * Math.cos(rad)).toFixed(2)} ${(c + 11.5 * Math.sin(rad)).toFixed(2)}`,
    );
    value.textContent = store.format(key);
    describeSlider(el, store, key);
  };
};

const graph: Bind = (el, store, _key, models) => {
  const model = models.graphs?.[el.dataset.graph ?? ""];
  if (!model) throw new Error(`No graph model "${el.dataset.graph}"`);
  const { handles } = model;
  const numbered = handles.length > 1;
  let selected = 0;
  el.tabIndex = 0;
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", el.dataset.label ?? "Graph");
  el.innerHTML =
    `<div class="display" style="width:${model.width}px;height:${model.height}px">` +
    `<svg width="${model.width}" height="${model.height}" viewBox="0 0 ${model.width} ${model.height}" aria-hidden="true"></svg>` +
    handles.map((_, i) => `<span class="handle">${numbered ? i + 1 : ""}</span>`).join("") +
    `</div>`;
  const display = el.querySelector<HTMLElement>(".display")!;
  const svg = display.querySelector("svg")!;
  const dots = [...display.querySelectorAll<HTMLElement>(".handle")];
  // Visible readouts are opt-in: data-readouts names the element to render them into.
  const readouts = el.dataset.readouts ? document.getElementById(el.dataset.readouts) : null;
  readouts?.classList.add("graph-readouts");
  const setDragging = (on: boolean) => {
    el.classList.toggle("dragging", on);
    readouts?.classList.toggle("dragging", on);
  };
  let render = () => {};
  const select = (index: number) => {
    selected = index;
    render();
  };

  display.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.focus();
    const box = display.getBoundingClientRect();
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    // Grab the nearest handle under the pointer; the topmost (last) wins a tie.
    let index = -1;
    let best = 10;
    handles.forEach((_, i) => {
      const [hx, hy] = model.point(store.values, i);
      const d = Math.hypot(hx - px, hy - py);
      if (d <= best) [index, best] = [i, d];
    });
    if (index < 0) return;
    select(index);
    setDragging(true);
    const origin = model.point(store.values, index);
    // Keep the grab offset so the handle doesn't jump to the pointer.
    const offset = [origin[0] - px, origin[1] - py];
    const at = (ev: PointerEvent): [number, number] => {
      let x = ev.clientX - box.left + offset[0];
      let y = ev.clientY - box.top + offset[1];
      // Shift locks to the axis with the larger movement.
      if (ev.shiftKey) {
        if (Math.abs(x - origin[0]) > Math.abs(y - origin[1])) y = origin[1];
        else x = origin[0];
      }
      return [x, y];
    };
    trackDrag(e, (ev) => model.apply(index, ...at(ev), store), () => setDragging(false));
  });
  el.addEventListener("dblclick", () => {
    store.reset(handles[selected].x);
    store.reset(handles[selected].y);
  });
  el.addEventListener("keydown", (e) => {
    // 1..n pick a handle; arrows move the selected one (Shift = ×10).
    const digit = Number(e.key);
    if (numbered && Number.isInteger(digit) && digit >= 1 && digit <= handles.length) {
      e.preventDefault();
      select(digit - 1);
      return;
    }
    const axis = { ArrowLeft: ["x", -1], ArrowRight: ["x", 1], ArrowUp: ["y", -1], ArrowDown: ["y", 1] }[e.key] as
      | ["x" | "y", number]
      | undefined;
    if (!axis) return;
    e.preventDefault();
    const [name, screenDir] = axis;
    const handle = handles[selected];
    const target = handle[name];
    const dir = screenDir * (name === "x" ? handle.xDir : handle.yDir);
    store.set(target, store.values[target] + dir * store.specs[target].step * (e.shiftKey ? 10 : 1));
  });

  render = () => {
    const [x, y] = model.point(store.values, selected);
    // Guides drop from the selected handle's edge (6px radius) to both axes; CSS shows them while dragging.
    svg.innerHTML =
      model.draw(store.values, selected) +
      `<path class="guide" d="M${x.toFixed(1)} ${(y + 7).toFixed(1)} V${model.height} M0 ${y.toFixed(1)} H${(x - 7).toFixed(1)}"/>`;
    dots.forEach((dot, i) => {
      const [hx, hy] = model.point(store.values, i);
      dot.style.transform = `translate(${hx}px, ${hy}px)`;
      dot.classList.toggle("selected", i === selected);
    });
    // The selected handle draws on top.
    display.append(dots[selected]);
    const pairs = model.readouts(store.values, selected);
    if (readouts) {
      readouts.innerHTML =
        (numbered ? `<span class="badge">${selected + 1}</span>` : "") +
        pairs.map(([label, value]) => `<span><span class="label">${label}</span> <span class="value">${value}</span></span>`).join("");
    }
    el.setAttribute(
      "aria-description",
      `Handle ${selected + 1} of ${handles.length}: ${pairs.map((pair) => pair.join(" ")).join(", ")}. ` +
        "Number keys pick a handle, arrows move it.",
    );
  };
  return () => render();
};

const rail: Bind = (el, store, key, models) => {
  const model = models.rails?.[el.dataset.rail ?? ""];
  if (!model) throw new Error(`No rail model "${el.dataset.rail}"`);
  el.setAttribute("aria-label", el.dataset.label ?? key);
  el.setAttribute("aria-orientation", "vertical");
  el.innerHTML = `<div class="ruler"></div><svg preserveAspectRatio="none" aria-hidden="true"></svg>`;
  const ruler = el.querySelector<HTMLElement>(".ruler")!;
  const svg = el.querySelector("svg")!;
  let hover = -1;

  const indexAt = (e: PointerEvent) => {
    const box = svg.getBoundingClientRect();
    const count = model.count(store.values);
    const f = 1 - (e.clientY - box.top) / box.height;
    return Math.min(count - 1, Math.max(0, Math.floor(f * count)));
  };
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.focus();
    el.classList.add("active");
    store.set(key, indexAt(e));
    trackDrag(e, (ev) => store.set(key, indexAt(ev)), () => el.classList.remove("active"));
  });
  el.addEventListener("pointermove", (e) => {
    const next = e.buttons ? -1 : indexAt(e);
    if (next !== hover) {
      hover = next;
      render();
    }
  });
  el.addEventListener("pointerleave", () => {
    hover = -1;
    render();
  });
  sliderKeys(el, store, key);

  const ROW = 9;
  const render = () => {
    const count = model.count(store.values);
    const selected = store.values[key];
    const height = count * ROW;
    const y = (k: number) => (count - 1 - k) * ROW + ROW / 2;
    svg.setAttribute("viewBox", `0 0 40 ${height}`);
    const band = (k: number, cls: string) => `<rect class="${cls}" x="0" y="${y(k) - ROW / 2}" width="40" height="${ROW}"/>`;
    let content = band(selected, "selected") + (hover >= 0 && hover !== selected ? band(hover, "hover") : "");
    for (let k = 0; k < count; k++) {
      const { color, dashed } = model.line(k, store.values);
      const cls = k === selected ? "line selected" : k === hover ? "line hover" : "line";
      const stroke = k === selected || k === hover ? "" : ` stroke="${color}" stroke-opacity="${0.45 + (0.55 * k) / Math.max(count - 1, 1)}"`;
      content += `<path class="${cls}" d="M4 ${y(k)} H32"${stroke}${dashed && k !== selected ? ' stroke-dasharray="3 2"' : ""} vector-effect="non-scaling-stroke"/>`;
    }
    content += `<path class="caret" d="M40 ${y(selected) - 4} L35 ${y(selected)} L40 ${y(selected) + 4} Z"/>`;
    svg.innerHTML = content;

    // Ruler: ends, the selected item, the hovered item, and every 10th that doesn't collide.
    const marks = new Map<number, string>([[0, ""], [count - 1, ""]]);
    for (let k = 10; k < count - 1; k += 10) marks.set(k, "");
    for (const k of [...marks.keys()]) if (Math.abs(k - selected) < 2 || (hover >= 0 && Math.abs(k - hover) < 2)) marks.delete(k);
    marks.set(selected, "selected");
    if (hover >= 0) marks.set(hover, "hover");
    ruler.replaceChildren(
      ...[...marks].map(([k, cls]) => {
        const label = document.createElement("span");
        label.className = cls;
        label.textContent = String(k);
        label.style.top = `${((count - 1 - k + 0.5) / count) * 100}%`;
        return label;
      }),
    );
    describeSlider(el, store, key);
    el.setAttribute("aria-valuemax", String(count - 1));
  };
  return render;
};

const binders: Record<string, Bind> = {
  fader,
  meter,
  number,
  knob,
  graph,
  rail,
  segmented: choice,
  toggles: choice,
};

export interface MountedControls {
  /** Re-render every control; call when data a model reads changes outside the store. */
  render(): void;
  unmount(): void;
}

/** Wires every `[data-control]` under `root` to `store`. */
export function mountControls<T extends Values>(root: ParentNode, store: Store<T>, models: ControlModels = {}): MountedControls {
  const renders = [...root.querySelectorAll<HTMLElement>("[data-control]")].map((el) => {
    const bind = binders[el.dataset.control ?? ""];
    const key = el.dataset.param ?? "";
    if (!bind || (el.dataset.control !== "graph" && !(key in store.values))) {
      throw new Error(`Unknown control: ${el.outerHTML}`);
    }
    return bind(el, store as unknown as Store<Values>, key, models);
  });
  const render = () => renders.forEach((fn) => fn());
  render();
  return { render, unmount: store.subscribe(render) };
}

