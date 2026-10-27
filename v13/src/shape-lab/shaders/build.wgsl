// Per-frame geometry build. Three kernels share these bindings and run in
// order: layers -> ring points -> flag anchor. The draws only read the results.
import { Layer, Params, TAU, buildLayer, point, toScreen } from "./shape.wgsl";

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> layers: array<Layer>;
@group(0) @binding(2) var<storage, read_write> points: array<vec2f>;
// xy: rightmost point of the highlighted ring, in stage CSS pixels.
@group(0) @binding(3) var<storage, read_write> flag: vec4f;

@compute @workgroup_size(64)
fn cs_layers(@builtin(global_invocation_id) id: vec3u) {
  let k = id.x;
  if (f32(k) >= params.layers) {
    return;
  }
  layers[k] = buildLayer(params, k);
}

@compute @workgroup_size(64)
fn cs_points(@builtin(global_invocation_id) id: vec3u) {
  let n = u32(params.pts);
  let k = id.x / n;
  if (f32(k) >= params.layers) {
    return;
  }
  let i = id.x % n;
  points[id.x] = point(params, layers[k], k, f32(i) / f32(n) * TAU);
}

@compute @workgroup_size(1)
fn cs_flag() {
  let n = u32(params.pts);
  let base = u32(params.hilite) * n;
  var best = points[base];
  for (var i = 1u; i < n; i++) {
    let q = points[base + i];
    if (q.x > best.x) {
      best = q;
    }
  }
  flag = vec4f(toScreen(params, best), 0.0, 0.0);
}
