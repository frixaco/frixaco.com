// Spray thrown off the upper layers: mostly 1-2px dots, some short shards.
import { ACCENT, Layer, Params, TAU, layerRgb, outward, rand, toClip, toScreen } from "./shape.wgsl";

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> layers: array<Layer>;
@group(0) @binding(2) var<storage, read> points: array<vec2f>;

struct Out {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> Out {
  var out: Out;
  if (f32(i) >= params.particles || params.layers < 2.0) {
    out.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return out;
  }
  let seed = params.seed;
  let n = u32(params.pts);

  // Density follows t^2.2 up the stack: sample by inverting its CDF.
  let k = u32(round(pow(rand(i, 20u, seed), 1.0 / 3.2) * (params.layers - 1.0)));
  let sample = min(u32(rand(i, 21u, seed) * f32(n)), n - 1u);
  let l = layers[k];
  let base = points[k * n + sample];
  let dir = outward(params, l, f32(sample) / f32(n) * TAU);

  // Each particle drifts outward over its life, then respawns.
  let life = fract(rand(i, 22u, seed) + params.time * (0.04 + 0.08 * rand(i, 23u, seed)));
  let reach = -log(1.0 - rand(i, 24u, seed)) * (14.0 + 40.0 * params.chaos * l.t);
  let fling = reach * (0.35 + 0.65 * life);
  let jitter = (vec2f(rand(i, 25u, seed), rand(i, 26u, seed)) - 0.5) * 6.0;
  let center = toScreen(params, base + dir * fling - vec2f(0.0, fling * 0.55) + jitter);

  // Quad corners in [-0.5, 0.5]^2.
  let us = array<f32, 6>(0.0, 1.0, 0.0, 0.0, 1.0, 1.0);
  let vs = array<f32, 6>(0.0, 0.0, 1.0, 1.0, 0.0, 1.0);
  let corner = vec2f(us[v], vs[v]) - 0.5;

  var q: vec2f;
  if (rand(i, 28u, seed) < 0.12) {
    // Shard: a short stroke along the tangent.
    let along = normalize(vec2f(-dir.y, dir.x * 0.6) + vec2f(1e-5, 0.0));
    let len = mix(4.0, 11.0, rand(i, 29u, seed));
    q = center + along * corner.x * len + vec2f(-along.y, along.x) * corner.y;
  } else {
    let pick = rand(i, 27u, seed);
    q = center + corner * select(select(1.0, 1.5, pick > 0.6), 2.0, pick > 0.8);
  }

  // Full strength for most of the life; fade only on spawn and despawn.
  let fade = max(0.15, 0.9 - fling / 90.0) * smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.8, 1.0, life));
  let accent = rand(i, 30u, seed) < 0.05;
  out.position = toClip(params, q);
  out.color = vec4f(select(layerRgb(params, k, l.t), ACCENT, accent), fade);
  return out;
}

@fragment fn fs_main(in: Out) -> @location(0) vec4f {
  return vec4f(in.color.rgb * in.color.a, in.color.a);
}
