// Dashed center axis through the stack, drawn before the rings.
import { CENTER, Params, RADIUS, toClip, toScreen } from "./shape.wgsl";

@group(0) @binding(0) var<uniform> params: Params;

struct Out {
  @builtin(position) position: vec4f,
  @location(0) along: f32,
}

@vertex fn vs_main(@builtin(vertex_index) v: u32) -> Out {
  // Spans the stack plus 50px of overshoot at each end, like the mock.
  let reach = params.height * sin(radians(params.tilt)) * RADIUS + 50.0;
  let top = toScreen(params, CENTER - vec2f(0.0, reach));
  let bottom = toScreen(params, CENTER + vec2f(0.0, reach));

  let us = array<f32, 6>(-0.5, 0.5, -0.5, -0.5, 0.5, 0.5);
  let vs = array<f32, 6>(0.0, 0.0, 1.0, 1.0, 0.0, 1.0);

  var out: Out;
  out.position = toClip(params, mix(top, bottom, vs[v]) + vec2f(us[v], 0.0));
  out.along = vs[v] * (bottom.y - top.y);
  return out;
}

@fragment fn fs_main(in: Out) -> @location(0) vec4f {
  // 2px dash, 4px gap; --color-line-strong.
  if (in.along % 6.0 > 2.0) {
    discard;
  }
  return vec4f(vec3f(0.333), 1.0);
}
