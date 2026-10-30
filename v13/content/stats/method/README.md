# How the project stats were measured

The Home cards show these numbers. Re-run a section when the project changes, then update its JSON.

## LeTUI

- Machine: Apple M4 Pro. Measured 2026-10-11.
- LeTUI's own metrics keep only avg / p95 / max over the last 200 frames, so a copy of the repo was patched
  (`letui-metrics.patch`: keep every frame, also write percentiles and raw samples). The real repo was not changed.
- Workload: `bun run examples/visualizer.ts` in a detached tmux window (176×52), left on the default speed,
  quit with `q` after 30 s and again after 60 s. The two runs are pooled: 2,606 frames in `letui-frames.json`
  (columns: total, js, render, sync, flush; ms).
- Percentiles use linear interpolation between ranks (same as LeTUI's `percentile()`).
- fps: worst = 1000 / max frame, avg = 1000 / mean frame.
- `max` is the noisiest number (6.4–8.7 ms across runs); p50 and p95 held within a few tenths.

## Senmei

- Machine: Apple M4 Pro, Helium, WebGPU (metal-3). Measured 2026-10-11.
- Instrumented copy of the repo (`senmei-bench.patch`): WebGPU timestamp queries around the Anime4K passes,
  `queue.onSubmittedWorkDone()` for total GPU time per frame, `performance.now()` around demux, `drawImage`
  conversion and command encoding. The real repo was not changed.
- Input: `data/fate08.mkv` (1.44 GB) served by a small Bun server that honors HTTP Range (Vite dev ignores it),
  played ~25 s, 819 frames, 1080p upscaled to 4K.
- Results (avg): demux 0.18 + convert 0.14 + encode 0.14 = 0.46 ms CPU; passes 27.3 ms (p95 28.3);
  GPU total incl. upload 31.8 ms (p95 36.1) → upload ≈ 4.5 ms. Frame ≈ 32.3 ms → 31 fps max.
  Budget at 23.976 fps = 41.7 ms → 9.4 ms spare.
- 49 passes are defined; at 1080p → 4K, 38 run: Clamp Highlights 3, Restore CNN VL 17, Upscale CNN x2 VL 18.
  All are fragment-shader render passes recorded in one command encoder, one submit per frame, plus 1 present pass.
- Found while measuring: the video decoder input queue is unbounded (only decoded frames are counted),
  ~3,557 chunks fed in 25 s, ~5 s decode latency.

## Xport

- npm: read live from the registry (`npm view @frixaco/xport version dist.unpackedSize dependencies`).
  v0.1.4: 58,567 bytes unpacked, no runtime dependencies.
- Lighthouse 13.5 CLI against https://xport.frixaco.com on 2026-10-09, default mobile emulation:
  performance 99, accessibility 100, best practices 100, SEO 100.
