---
title: "Building a TUI Library from scratch: Part 6"
description: "Stabilizing Rust paint, fixing lifecycle issues, and shipping through v0.0.10/v0.0.11 pain"
date: "2026-02-14T10:00:00"
---

## [devlog] Building a TUI Library from Scratch: Part 6 - Stabilization and Release Pain

#### Things I learned:

- Fast code can still feel bad if lifecycle state is wrong
- Benchmark setup matters as much as optimizations
- Releases expose bugs local dev hides

Part 5 ended with paint/layout in Rust. Performance looked great. Then I hit the less fun part: stability and release workflow.

#### Responsiveness regression

Responsiveness degraded after resize/reinit. Root cause: freed buffers but forgot to reset first-diff state.

```rust
pub extern "C" fn free_buffer() -> c_int {
    *CURRENT_BUFFER.lock().unwrap() = None;
    *LAST_BUFFER.lock().unwrap() = None;
    *FIRST_DIFF.lock().unwrap() = true;
    // ...
}
```

One boolean, noticeable UX impact.

#### Locking cleanup in paint

Removed unnecessary buffer locks in Rust paint. Before, each helper locked the buffer internally. After, `paint()` takes one lock and passes `&mut [u64]` down.

```rust
// before: each draw_* locked CURRENT_BUFFER internally
fn draw_text_at(x: f32, y: f32, text: &str, ...)

// after: paint() takes one lock, helpers just write
fn draw_text_at(buf: &mut [u64], x: f32, y: f32, text: &str, ...)
```

Less lock churn in hot path.

#### Benchmark measurement fixes

Fixed benchmark wrappers for OpenTUI and pi-mono — I was measuring at the wrong point for their render scheduling. Switched to measuring after scheduled completion (`setTimeout(0)` in adapters).

After this pass, sample metrics: `0.5ms` avg, ~`1900fps` in that scene.

#### Research before next optimization

Once paint was stable, text path became the obvious target. Wrote `TEXT_SERIALIZATION_OPTIMIZATIONS.md` to map waste before coding changes.

Main findings:

- TS encoded text twice in serialize flow
- Rust allocated/cloned strings per text node each frame
- Work scaled with total text, not changed text

Also added a small stress script for raw terminal writes as calibration.

#### Repo refactor + release cycle

Big structure cleanup before release:

- runtime code → `src/`
- examples → `examples/`
- cleaned up exports in `index.ts`
- older implementation → `legacy/`

Shipped `v0.0.10`, immediately hit publish/package issues. Fixed those, then hit another: logger could crash in some environments. Safe fallback:

```typescript
function createLogWriter() {
  try {
    return Bun.file("dump/logs.txt").writer();
  } catch {
    return { write() {}, flush() {} };
  }
}
```

That became `v0.0.11`.

#### End of part 6

Part 5 was raw speed. Part 6 was making it usable and shippable:

- cleaner locking model in Rust paint
- corrected benchmark methodology
- cleaned project structure
- painful but useful release fixes
- concrete plan for text diff sync

Part 7 is where text/style sync architecture changes for real.
