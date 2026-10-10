# Shape Lab

WebGPU version of the hero "Shape Lab" panel from the Readout Paper mock, built with [vgpu](https://vgpu.sh).
Not shipped: the Dockerfile only copies `public/`.

```sh
pnpm install
pnpm dev     # http://localhost:5173
pnpm check   # tsc + device-backed validation of every shader entry
pnpm build
```

## Layout

```
src/
  main.ts              page wiring: store, controls, labels, play/stop, picking, render loop
  params.ts            defaults, ranges, formats and palette colors
  models.ts            the Profile curve (three handles on the ring radius) and the layer rail
  renderer.ts          GPU setup, per-frame work, picking and readbacks (vgpu)
  readout/             reusable, framework-free Readout pieces
    store.ts           numeric parameter store: values, defaults, specs, listeners
    controls.ts        fader, number box, segmented, toggles, LED meter, knob, graph, rail
  shaders/
    shape.wgsl         the shape: superformula layers, chaos ramp, palettes (pure module)
    build.wgsl         compute: layers -> ring points -> flag anchor
    pick.wgsl          compute, on demand: layer under the pointer
    rings.wgsl         rings as screen-space quads (exact 1px lines at any DPR)
    particles.wgsl     spray off the upper layers
    spine.wgsl         dashed center axis
  styles/
    readout.css        Readout tokens + control styles
    shape-lab.css      this panel's layout (stage : rack = 3 : 2)
```

## How a frame works

1. `params` — one shared uniform buffer, written once per frame.
2. Compute: `cs_layers` builds 64 `Layer` records (scale, twist random walk, chaos, dashes);
   `cs_points` turns them into up to 64 × 150 ring points; `cs_flag` finds the highlighted
   ring's rightmost point in stage pixels.
3. One render pass: spine, rings (one instance per layer), particles. Draws only read buffers.
4. The flag position is read back asynchronously (one read in flight) and applied with a transform.
5. The layer records are read back only when Layers, Chaos or Seed change — the rail's dashes
   come from them.

## Profile curve

The ring radius along the stack is a monotone cubic through three handles (Steffen's method;
`profile()` in `params.ts` and `shape.wgsl`, kept in sync). It is smooth, passes through every
handle, never overshoots them, and the middle tangent depends on both neighbors, so moving a
handle bends the curve on both sides. Past the outer handles it holds their value. Handles keep
their order along the stack (`constrain()` stops a dragged handle 0.06 short of its neighbor).

## Picking layers

- Click a ring on the stage: `cs_pick` finds the nearest ring point (ignored beyond 12 px).
- Drag the "layer N" flag up or down: `cs_pick` finds the ring whose center is nearest in height.
- Drag or click the layer rail, or type into its number box.

The loop renders only while playing or after a change, skips work while the stage is offscreen,
and starts stopped under `prefers-reduced-motion`.

## Reusing the controls

```html
<div data-control="fader" data-param="layers" data-name="Layers" data-label="Layers"></div>
<input data-control="number" data-param="seed" aria-label="Seed" />
<div data-control="segmented" data-param="sym" data-options="3,4,5"></div>
<div data-control="toggles" data-param="palette" data-options="0,1,2" data-labels="SEQ,CAT,MONO"></div>
<div data-control="meter" data-param="chaos" data-label="Chaos" data-cells="20" data-hot="0.6"></div>
<div data-control="knob" data-param="twist" data-label="Twist"></div>
<div data-control="graph" data-graph="profile" data-label="Profile" data-readouts="profile-values"></div>
<div data-control="rail" data-param="hilite" data-rail="layers" data-label="Layer"></div>
```

Graphs and rails take a model (drawing + value mapping) from the page:

```ts
mountControls(root, store, { graphs: { profile: profileGraph }, rails: { layers: layerRail } });
```

```ts
const store = createStore(defaults, specs, constrain);
mountControls(root, store);
store.subscribe(() => { /* redraw */ });
```

Faders and meters: drag, click, arrows, Page Up/Down, Home/End. Number boxes: drag vertically
(Alt = fine), arrows (Shift = ×10), double-click or Enter to type, Escape to cancel. Knobs: drag
vertically (Alt = fine), double-click resets, arrows; amber with corner brackets while held.
Graphs: drag a handle (Shift locks an axis), double-click resets the selected handle, number keys
pick a handle, arrows move it; while dragging, guides drop to both axes. Several handles are
numbered, and the selected one and its readouts are amber. `data-readouts` optionally names an
element to show the selected handle's values in (the Shape Lab shows none). Rails: drag or click,
arrows, Page Up/Down, Home/End.

## Notes

- The visual reference is 508 × 486 px with a 160 px form radius (`REF`, `CENTER`, `RADIUS` in
  `shape.wgsl`); the shape is fit into whatever stage size it gets.
- `Params` in `shape.wgsl` and `frameParams()` in `renderer.ts` must keep the same member order.
- vgpu 0.5.0: surfaces only exist inside `frame(gpu)`, so pipelines are pre-compiled by format
  signature, not by passing the surface (the docs' example throws `VGPU-SURFACE-NOT-IN-FRAME`).
- WebGPU-less browsers get a text fallback in the stage; on the site this should be a still image.
