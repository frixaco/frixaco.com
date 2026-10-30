// One instance per layer; each ring is drawn as screen-space quads so line
// width stays exact (1px, 1.5px for the highlight) at any device-pixel ratio.
import { ACCENT, Layer, Params, RADIUS, TAU, layerRgb, toClip, toScreen } from "./shape.wgsl";

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> layers: array<Layer>;
@group(0) @binding(2) var<storage, read> points: array<vec2f>;

struct Out {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) across: f32,
  @location(2) halfWidth: f32,
  @location(3) arc: f32,
  @location(4) @interpolate(flat) dash: vec2f,
}

@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) k: u32) -> Out {
  var out: Out;
  if (f32(k) >= params.layers) {
    out.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return out;
  }

  // Two triangles per segment: (end, side) for each corner.
  let ends = array<u32, 6>(0u, 0u, 1u, 1u, 0u, 1u);
  let sides = array<f32, 6>(-1.0, 1.0, -1.0, -1.0, 1.0, 1.0);
  let n = u32(params.pts);
  let seg = v / 6u;
  let corner = v % 6u;
  let end = ends[corner];

  let l = layers[k];
  let hilite = k == u32(params.hilite);
  let q0 = toScreen(params, points[k * n + seg]);
  let q1 = toScreen(params, points[k * n + (seg + 1u) % n]);
  let dir = normalize(q1 - q0 + vec2f(1e-5, 0.0));
  let normal = vec2f(-dir.y, dir.x);

  let width = select(l.width, 1.5, hilite);
  let extent = width * 0.5 + 1.0 / params.dpr; // room for the antialiased edge
  let q = select(q0, q1, end == 1u) + normal * sides[corner] * extent;

  out.position = toClip(params, q);
  out.across = sides[corner] * extent;
  out.halfWidth = width * 0.5;
  // Approximate arc length in reference pixels, for dashes.
  out.arc = f32(seg + end) / f32(n) * TAU * RADIUS * l.scale;
  out.dash = select(l.dash, vec2f(0.0), hilite);
  let alpha = select(0.45 + 0.55 * l.t, 1.0, hilite);
  out.color = vec4f(select(layerRgb(params, k, l.t), ACCENT, hilite), alpha);
  return out;
}

@fragment fn fs_main(in: Out) -> @location(0) vec4f {
  if (in.dash.x > 0.0 && in.arc % (in.dash.x + in.dash.y) > in.dash.x) {
    discard;
  }
  let coverage = clamp((in.halfWidth - abs(in.across)) * params.dpr + 0.5, 0.0, 1.0);
  let a = in.color.a * coverage;
  if (a <= 0.002) {
    discard;
  }
  return vec4f(in.color.rgb * a, a);
}
