// GPU side of Shape Lab. Each frame: three compute kernels build the layers,
// ring points and flag anchor; then one pass draws spine, rings and particles.
// Picking and the layer readback run on demand against the last build.
import { compute, draw, init, storage, surface, uniforms, type Frame } from "vgpu";
import { LIMITS, particleCount, type ShapeValues } from "./params";
import buildShader from "./shaders/build.wgsl";
import particlesShader from "./shaders/particles.wgsl";
import pickShader from "./shaders/pick.wgsl";
import ringsShader from "./shaders/rings.wgsl";
import spineShader from "./shaders/spine.wgsl";

/** Floats per `Layer` record in shape.wgsl (dash is at 10..11). */
export const LAYER_FLOATS = 12;
const LAYER_BYTES = LAYER_FLOATS * 4;
const BACKGROUND = [21 / 255, 21 / 255, 21 / 255, 1] as const; // --color-bg-display

export interface ShapeRenderer {
  readonly gpu: Awaited<ReturnType<typeof init>>;
  /** Stage size in CSS pixels; call from a ResizeObserver, never per frame. */
  resize(width: number, height: number): void;
  /** Encodes one frame into `frame` for the given values and time (seconds). */
  render(frame: Frame, values: ShapeValues, time: number): void;
  /** Stage-pixel position of the highlighted ring's rightmost point, from the last build. */
  readFlag(): Promise<[number, number]>;
  /** Per-layer records from the last build (12 floats each, see `Layer` in shape.wgsl). */
  readLayers(): Promise<Float32Array>;
  /**
   * Layer under a stage-pixel position, from the last build: `mode` 0 matches the nearest
   * ring point, 1 the nearest ring center by height. Resolves to [layer, distance].
   */
  pick(x: number, y: number, mode: 0 | 1): Promise<[number, number]>;
}

export async function createShapeRenderer(canvas: HTMLCanvasElement, initial: ShapeValues): Promise<ShapeRenderer> {
  if (!("gpu" in navigator)) throw new Error("WebGPU is not available in this browser");
  const gpu = await init();
  const target = surface(gpu, canvas, { dpr: [1, 2] });

  const { layers: maxLayers, pointsPerRing, particles: maxParticles } = LIMITS;
  let size: [number, number] = [Math.max(canvas.clientWidth, 1), Math.max(canvas.clientHeight, 1)];
  // One uniform buffer shared by every kernel and draw; written once per frame.
  const params = uniforms(gpu, frameParams(size, 1, initial, 0));
  const layers = storage(gpu, LAYER_BYTES * maxLayers);
  const points = storage(gpu, 8 * maxLayers * pointsPerRing);
  const flag = storage(gpu, 16);

  const built = { params, layers, points, flag };
  const buildLayers = compute(gpu, buildShader, { entry: "cs_layers", label: "build-layers", set: built });
  const buildPoints = compute(gpu, buildShader, { entry: "cs_points", label: "build-points", set: built });
  const buildFlag = compute(gpu, buildShader, { entry: "cs_flag", label: "build-flag", set: built });

  const pickParams = uniforms(gpu, { pos: [0, 0], mode: 0, pad: 0 });
  const picked = storage(gpu, 16);
  const pickLayer = compute(gpu, pickShader, {
    label: "pick",
    set: { params, layers, points, pick: pickParams, result: picked },
  });

  const geometry = { params, layers, points };
  const spine = draw(gpu, { shader: spineShader, vertices: 6, label: "spine", set: { params } });
  const rings = draw(gpu, {
    shader: ringsShader,
    vertices: pointsPerRing * 6,
    instances: maxLayers,
    blend: "premultiplied",
    label: "rings",
    set: geometry,
  });
  const particles = draw(gpu, {
    shader: particlesShader,
    vertices: 6,
    instances: maxParticles,
    blend: "premultiplied",
    label: "particles",
    set: geometry,
  });

  // Surfaces only exist inside frame(gpu), so warm the pipelines by signature.
  const signature = { colors: [navigator.gpu.getPreferredCanvasFormat()] };
  await Promise.all([spine, rings, particles].map((d) => d.compile(signature)));

  return {
    gpu,
    resize(width, height) {
      size = [Math.max(width, 1), Math.max(height, 1)];
    },
    render(frame, values, time) {
      params.set(frameParams(size, target.size[0] / size[0], values, time));

      // Dispatches submit immediately, so they land before the frame's pass.
      buildLayers.dispatch(Math.ceil(values.layers / 64));
      buildPoints.dispatch(Math.ceil((values.layers * pointsPerRing) / 64));
      buildFlag.dispatch(1);

      frame.pass({ target, clear: [...BACKGROUND] }, (pass) => {
        pass.draw(spine);
        pass.draw(rings);
        pass.draw(particles);
      });
    },
    async readFlag() {
      const [x, y] = new Float32Array(await flag.read());
      return [x, y];
    },
    async readLayers() {
      return new Float32Array(await layers.read());
    },
    async pick(x, y, mode) {
      pickParams.set({ pos: [x, y], mode });
      pickLayer.dispatch(1);
      const [layer, distance] = new Float32Array(await picked.read());
      return [layer, distance];
    },
  };
}

// Shape of `Params` in shape.wgsl; member order must match.
function frameParams(res: [number, number], dpr: number, values: ShapeValues, time: number) {
  return {
    res,
    dpr,
    time,
    sym: values.sym,
    n1: values.n1,
    n2: values.n2,
    n3: values.n3,
    morph: values.morph,
    layers: values.layers,
    twist: values.twist,
    tilt: values.tilt,
    height: values.height,
    pos1: values.pos1,
    gain1: values.gain1,
    pos2: values.pos2,
    gain2: values.gain2,
    pos3: values.pos3,
    gain3: values.gain3,
    noise: values.noise,
    chaos: values.chaos,
    seed: values.seed,
    hilite: values.hilite,
    spin: values.spin,
    palette: values.palette,
    pts: LIMITS.pointsPerRing,
    particles: particleCount(values),
  };
}
