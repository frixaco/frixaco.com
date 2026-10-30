// Shape Lab: a twisted superformula stack whose upper layers break into chaos.
// Pure module: entry shaders own every binding and pass `Params` in.
import { pcg3d, unitFloat } from "@vgpu/wgsl-std/hash";

// Mirrors `FrameParams` in renderer.ts; keep member order in sync.
export struct Params {
  res: vec2f,
  dpr: f32,
  time: f32,
  sym: f32,
  n1: f32,
  n2: f32,
  n3: f32,
  morph: f32,
  layers: f32,
  twist: f32,
  tilt: f32,
  height: f32,
  pos1: f32,
  gain1: f32,
  pos2: f32,
  gain2: f32,
  pos3: f32,
  gain3: f32,
  noise: f32,
  chaos: f32,
  seed: f32,
  hilite: f32,
  spin: f32,
  palette: f32,
  pts: f32,
  particles: f32,
}

// Per-layer values, computed once per frame by build.wgsl.
export struct Layer {
  t: f32,
  ct: f32,
  n1: f32,
  rmax: f32,
  scale: f32,
  rot: f32,
  z: f32,
  dx: f32,
  amp: f32,
  width: f32,
  dash: vec2f,
}

export const TAU = 6.283185307;
export const ACCENT = vec3f(1.0, 0.651, 0.161);

// Reference frame of the Paper mock: 508 x 486 stage, form radius 160.
const REF = vec2f(508.0, 486.0);
export const CENTER = vec2f(254.0, 265.0);
export const RADIUS = 160.0;
const RMAX_SAMPLES = 64u;

export fn rand(a: u32, b: u32, seed: f32) -> f32 {
  return unitFloat(pcg3d(vec3u(a, b, u32(seed))).x);
}

// Sum of three uniforms rescaled to roughly unit variance.
fn gauss(a: u32, b: u32, seed: f32) -> f32 {
  return (rand(a, b, seed) + rand(a, b + 101u, seed) + rand(a, b + 202u, seed) - 1.5) * 2.0;
}

fn superformula(th: f32, m: f32, n1: f32, n2: f32, n3: f32) -> f32 {
  let a = pow(max(abs(cos(m * th * 0.25)), 1e-4), n2);
  let b = pow(max(abs(sin(m * th * 0.25)), 1e-4), n3);
  return pow(a + b, -1.0 / n1);
}

fn layerT(p: Params, k: u32) -> f32 {
  return f32(k) / max(p.layers - 1.0, 1.0);
}

// Chaos ramps up the stack: the base stays ordered, the top comes apart.
fn layerChaos(p: Params, k: u32) -> f32 {
  return p.chaos * pow(layerT(p, k), 1.8);
}

// Profile: a monotone cubic through the three handles (pos, 1 + gain), Steffen's method:
// smooth (C1), no overshoot, the middle tangent shaped by both neighbors; flat into and
// past the outer handles. Mirrors profile() in params.ts.
fn hermite(t: f32, x0: f32, x1: f32, y0: f32, y1: f32, d0: f32, d1: f32) -> f32 {
  let h = x1 - x0;
  let u = (t - x0) / h;
  let u2 = u * u;
  let u3 = u2 * u;
  return (2.0 * u3 - 3.0 * u2 + 1.0) * y0 + (u3 - 2.0 * u2 + u) * h * d0
       + (-2.0 * u3 + 3.0 * u2) * y1 + (u3 - u2) * h * d1;
}

fn profile(p: Params, t: f32) -> f32 {
  let x = vec3f(p.pos1, p.pos2, p.pos3);
  let y = 1.0 + vec3f(p.gain1, p.gain2, p.gain3);
  if (t <= x.x) {
    return y.x;
  }
  if (t >= x.z) {
    return y.z;
  }
  let h0 = x.y - x.x;
  let h1 = x.z - x.y;
  let s0 = (y.y - y.x) / h0;
  let s1 = (y.z - y.y) / h1;
  // Steffen: limited so each segment stays between its two handles.
  let q = (s0 * h1 + s1 * h0) / (h0 + h1);
  let slope = (sign(s0) + sign(s1)) * min(min(abs(s0), abs(s1)), 0.5 * abs(q));
  if (t <= x.y) {
    return hermite(t, x.x, x.y, y.x, y.y, 0.0, slope);
  }
  return hermite(t, x.y, x.z, y.y, y.z, slope, 0.0);
}

export fn buildLayer(p: Params, k: u32) -> Layer {
  var l: Layer;
  l.t = layerT(p, k);
  l.ct = layerChaos(p, k);
  // Morph rounds the whole body, slightly more toward the top.
  l.n1 = mix(p.n1, 4.0, clamp(p.morph * (0.75 + 0.5 * l.t), 0.0, 1.0));

  var rmax = 0.0;
  for (var i = 0u; i < RMAX_SAMPLES; i++) {
    let th = f32(i) / f32(RMAX_SAMPLES) * TAU;
    rmax = max(rmax, superformula(th, p.sym, l.n1, p.n2, p.n3));
  }
  l.rmax = rmax;

  l.scale = profile(p, l.t) * (1.0 + l.ct * 0.10 * gauss(k, 1u, p.seed));

  // Twist accumulates as a random walk whose steps grow with chaos.
  var rot = 0.0;
  for (var j = 0u; j <= k; j++) {
    rot += p.twist + layerChaos(p, j) * gauss(j, 2u, p.seed) * 14.0;
  }
  l.rot = radians(rot + p.spin * p.time);
  l.z = (2.0 * l.t - 1.0) * p.height;

  let glitch = rand(k, 3u, p.seed) < 0.55 * l.ct;
  let side = select(-1.0, 1.0, rand(k, 4u, p.seed) < 0.5);
  l.dx = select(0.0, side * mix(10.0, 30.0, rand(k, 5u, p.seed)), glitch);
  l.width = select(1.0, 1.25, glitch);
  // Noise ripples every layer; chaos adds more on top.
  l.amp = p.noise * (1.0 + 1.6 * l.ct);

  let dashed = rand(k, 6u, p.seed) < 0.6 * l.ct;
  l.dash = select(vec2f(0.0), vec2f(2.0 + 16.0 * rand(k, 7u, p.seed), 3.0 + 11.0 * rand(k, 8u, p.seed)), dashed);
  return l;
}

// Point on layer `k` at angle `th`, in reference-frame pixels.
export fn point(p: Params, l: Layer, k: u32, th: f32) -> vec2f {
  let ph0 = rand(0u, 10u, p.seed) * TAU;
  let ph1 = rand(0u, 11u, p.seed) * TAU;
  let ph3 = rand(0u, 13u, p.seed) * TAU;
  let kf = f32(k);
  // Upper layers churn while time runs; the base drifts slowly.
  let drift = p.time * 0.6 * l.ct;
  let calm = p.time * 0.25;

  let ripple = sin(3.0 * th + ph0 + kf * 0.31 + drift + calm) * 0.45
             + sin(5.0 * th + ph1 - kf * 0.23 - drift - calm) * 0.3
             + sin(9.0 * th + ph1 + kf * 0.57 + calm * 1.7) * 0.2
             + l.ct * sin(13.0 * th + ph3 + kf * 0.9 + drift * 2.0) * 0.35;
  // Soft-saturate so heavy noise dents and bulges rings without flipping them
  // inside out or flinging them off the stage; small values stay ~linear.
  let bump = l.amp * ripple;
  let r = superformula(th, p.sym, l.n1, p.n2, p.n3) / l.rmax * max(1.0 + bump / (1.0 + 0.8 * abs(bump)), 0.12);

  let x = r * l.scale * cos(th + l.rot);
  let y = r * l.scale * sin(th + l.rot);
  let tilt = radians(p.tilt);
  return CENTER + vec2f(x * RADIUS + l.dx, (y * cos(tilt) - l.z * sin(tilt)) * RADIUS);
}

// Outward direction of the form at `th`, projected like `point`.
export fn outward(p: Params, l: Layer, th: f32) -> vec2f {
  return normalize(vec2f(cos(th + l.rot), sin(th + l.rot) * cos(radians(p.tilt))) + vec2f(1e-5, 0.0));
}

// Reference-frame pixels -> stage CSS pixels, fitting the frame into the stage.
export fn toScreen(p: Params, pos: vec2f) -> vec2f {
  let s = min(p.res.x / REF.x, p.res.y / REF.y);
  return (p.res - REF * s) * 0.5 + pos * s;
}

export fn toClip(p: Params, screen: vec2f) -> vec4f {
  let ndc = screen / p.res * 2.0 - 1.0;
  return vec4f(ndc.x, -ndc.y, 0.0, 1.0);
}

// Readout sequential ramp: seq-2 .. seq-5.
fn ramp(t: f32) -> vec3f {
  let stops = array<vec3f, 5>(
    vec3f(0.220, 0.251, 0.420),
    vec3f(0.333, 0.376, 0.651),
    vec3f(0.498, 0.553, 0.902),
    vec3f(0.600, 0.655, 1.000),
    vec3f(0.729, 0.765, 1.000),
  );
  let x = clamp(t, 0.0, 1.0) * 4.0;
  let i = min(u32(x), 3u);
  return mix(stops[i], stops[i + 1u], x - f32(i));
}

// Readout categorical series-1 .. series-8.
fn category(k: u32) -> vec3f {
  let series = array<vec3f, 8>(
    vec3f(0.600, 0.655, 1.000),
    vec3f(0.859, 0.663, 0.255),
    vec3f(0.839, 0.451, 0.894),
    vec3f(0.733, 0.863, 0.620),
    vec3f(0.635, 0.827, 0.973),
    vec3f(0.910, 0.659, 0.647),
    vec3f(0.561, 0.447, 0.941),
    vec3f(0.953, 0.922, 0.494),
  );
  return series[k % 8u];
}

// palette: 0 = sequential, 1 = categorical, 2 = mono.
export fn layerRgb(p: Params, k: u32, t: f32) -> vec3f {
  if (p.palette > 1.5) {
    return vec3f(0.851);
  }
  if (p.palette > 0.5) {
    return category(k);
  }
  return ramp(t);
}
