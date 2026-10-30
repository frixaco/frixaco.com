// Layer picking from the last built geometry, run on demand (one thread).
//   mode 0: the layer with the ring point nearest to `pos` (click on the shape)
//   mode 1: the layer whose ring center is nearest to `pos.y` (dragging the flag)
import { CENTER, Layer, Params, RADIUS, toScreen } from "./shape.wgsl";

struct Pick {
  pos: vec2f,
  mode: f32,
  pad: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> layers: array<Layer>;
@group(0) @binding(2) var<storage, read> points: array<vec2f>;
@group(0) @binding(3) var<uniform> pick: Pick;
// x: picked layer, y: distance in stage pixels.
@group(0) @binding(4) var<storage, read_write> result: vec4f;

@compute @workgroup_size(1)
fn cs_pick() {
  let count = u32(params.layers);
  let n = u32(params.pts);
  var best = 0u;
  var bestDistance = 1e9;

  if (pick.mode < 0.5) {
    for (var k = 0u; k < count; k++) {
      for (var i = 0u; i < n; i++) {
        let d = distance(toScreen(params, points[k * n + i]), pick.pos);
        if (d < bestDistance) {
          bestDistance = d;
          best = k;
        }
      }
    }
  } else {
    let lift = sin(radians(params.tilt)) * RADIUS;
    for (var k = 0u; k < count; k++) {
      let center = toScreen(params, CENTER + vec2f(0.0, -layers[k].z * lift));
      let d = abs(center.y - pick.pos.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = k;
      }
    }
  }
  result = vec4f(f32(best), bestDistance, 0.0, 0.0);
}
