---
title: "Building a TUI Library from scratch: Part 3"
description: "Paint in Rust, rethinking interaction state, stabilization, release pain, and text/style diff sync"
date: "2026-02-21T16:00:00"
---

## [devlog] Building a TUI Library from Scratch: Part 5 - Paint in Rust, State in Rust

#### Things I learned:

- Interaction state belongs with the renderer, not the component layer
- Hit-testing and focus management should live where the layout lives
- FFI round-trips kill your frame budget — batch events, don't callback

Part 4 ended with paint taking 81% of frame time. Obvious fix: move paint to Rust.

#### The paint migration

In TypeScript, I was calling `setCell()` for every character — updating a typed array through Bun's FFI. Each call had overhead:

```typescript
// Before - setCell per character
for (let x = frame.x; x < frame.x + frame.width; x++) {
  for (let y = frame.y; y < frame.y + frame.height; y++) {
    setCell(x, y, char, fg, bg);
  }
}
```

In Rust, direct buffer writes. No FFI boundary per cell:

```rust
let idx = (w * y + x) as usize * 3;
buf[idx] = char as u64;
buf[idx + 1] = fg;  // raw hex, no conversion
buf[idx + 2] = bg;
```

`hex_to_color()` conversion only happens at flush time when crossterm needs it. During paint, just integer writes.

#### The interaction state problem

Here's where it got interesting. My components had `isFocused` and `isPressed` props for styling:

```typescript
const bg = isFocused ? COLORS.default.bg_highlight : COLORS.default.bg;
```

If paint moves to Rust, who owns these flags?

Option 1: Keep state in TS, pass as node props every frame. But then TS needs layout rects for hit-testing, or Rust sends them back. FFI round-trip. Latency. Duplication.

Option 2: Move interaction state to Rust. I went with option 2.

#### Rust owns interaction state

The insight: `isFocused` and `isPressed` are view state, not app state. They belong with the renderer.

Rust now maintains:

```rust
struct InteractionState {
    focused: Option<NodeId>,
    pressed: Option<NodeId>,
}
```

When a click comes in:
1. Rust receives the event (crossterm)
2. Rust hit-tests using layout rects it already computed
3. Rust updates `InteractionState`
4. Rust paints with the right style variant — immediately, no FFI

TypeScript doesn't need to know a button "looks pressed". It only cares when the click completes and `onClick` fires.

#### Events go to TS, state stays in Rust

The split:

- **Rust owns**: layout, paint, input routing, focus/press state, hit-testing
- **TS owns**: app state, component tree, event handlers

Rust batches events and returns them to TS:

```rust
// Rust queues these during input handling
events.push(Event::Focus(node_id));
events.push(Event::Click(node_id));
// TS receives batch after frame
```

No synchronous callbacks across FFI. TS updates app state, rebuilds tree, sends to Rust. Rust renders at 120fps without waiting.

#### Style variants

Components declare style variants in the node data:

```typescript
{
  id: buttonId,
  focusable: true,
  styles: {
    base: { bg: 0x16181a, fg: 0xffffff },
    focused: { bg: 0x3c4048, fg: 0xffffff },
    pressed: { bg: 0x5ea1ff, fg: 0x16181a },
  }
}
```

Rust picks the right variant based on `InteractionState`.

#### Merging layout and paint

Originally two FFI calls: `calculate_layout()` then `paint()`. Both built the same Taffy tree. Wasteful.

Now there's just `paint()`. It parses node data, builds the Taffy tree once, computes layout, stores frames for TS to read, then paints. One tree, one pass.

TS just calls `api.paint()` then reads frames back:

```typescript
api.paint(ptr(nodeData), nodeData.length, ptr(textData), textData.length);
updateNodeFrames(root);  // reads FRAMES array from Rust
```

#### NodeContext as single source of truth

Taffy tree stores everything needed for both layout and paint via `NodeContext`:

```rust
enum NodeContext {
    Text { content: String, fg: u32, bg: u32 },
    Button { label: String, fg: u32, bg: u32, border_color: u32, border_style: BorderStyle },
    Input { content: String, fg: u32, bg: u32, border_color: u32, border_style: BorderStyle },
    Row { fg: u32, bg: u32, border_color: u32, border_style: BorderStyle },
    Column { fg: u32, bg: u32, border_color: u32, border_style: BorderStyle },
}
```

`paint_taffy_node()` walks the tree recursively, calling `taffy.layout(node_id)` for position and `taffy.get_node_context(node_id)` for paint data.

#### The text positioning bug

Text was rendering wrong: `[ ld hello wor ]` instead of `[ hello world ]`. Two issues:

**Issue 1**: Using `layout.location` instead of content box. Location is the outer box — includes border and padding. Fix:

```rust
let content_x = abs_x + layout.content_box_x();
let content_y = abs_y + layout.content_box_y();
draw_text_at(content_x, content_y, content, fg, bg, tw, th);
```

**Issue 2**: Character count vs byte count. TypeScript sent `[...text].length` (character count), Rust used it to slice UTF-8 bytes. For ASCII they match, but offset accumulation was wrong. Fix:

```typescript
const textLength = new TextEncoder().encode(textContent).length;
```

#### What's next

Still measuring, but early results look promising. Paint in Rust eliminates thousands of FFI calls per frame. Next up: proper text input handling and controlled vs uncontrolled inputs.

## Part 6

### Stabilization and release pain

#### Title was: Building a TUI Library from scratch: Part 6

#### Description was: Stabilizing Rust paint, fixing lifecycle issues, and shipping through v0.0.10/v0.0.11 pain

#### Originally posted Feb 14, 2026

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

## Part 7

### Text diffs, style registry, and real demos

#### Title was: Building a TUI Library from scratch: Part 7

#### Description was: Text/style diff sync architecture, wrapping fixes, and docs+demos built on top

#### Originally posted Feb 21, 2026

#### Things I learned:

- Sending less over FFI usually beats micro-optimizing local code
- Smaller protocols need stricter validation or they fail in weird ways
- If demos are painful to build, the architecture still has problems

After `v0.0.11`, one focus: stop sending all text every frame. This part is mostly that migration plus style sync changes.

#### Cleanup before migration

Quick cleanup first:

- proper terminal deinit (`disable_raw_mode` + leave alt screen)
- quit-path cleanup
- safer flush paths for zero-size terminals

Also fixed p99 calculation in metrics — interpolation instead of rough indexing:

```typescript
function percentile(sorted: number[], p: number): number {
  const rank = p * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (rank - lower);
}
```

Made comparison across runs more trustworthy.

#### Text registry migration

Old flow: TS serialized full `textData`, `paint()` received full text payload every frame.

New flow:

- Rust keeps `TEXT_REGISTRY: HashMap<u32, String>` keyed by node id
- TS computes text diffs (upsert/delete) per frame
- text diffs sync separately
- `paint()` reads text from registry

First implementation used per-node FFI calls (`upsert_text`/`delete_text`). Worked, but too many calls. Switched to batched ops — one `sync_text_ops` call per frame:

- `op (u8)`, `node_id (u32 LE)`, `text_len (u32 LE)`, `text bytes` for upserts

Rust applies all ops under one registry lock.

```rust
match op {
    TEXT_OP_UPSERT => registry.insert(node_id, text),
    TEXT_OP_DELETE => registry.remove(&node_id),
    _ => return 0,
}
```

Main result: text transfer scales with changed nodes, not total text.

#### Metrics during transition

Some snapshots got worse before better (`~0.9ms` avg vs older `~0.5ms`). Expected — extra JS work to build ops payload plus several architectural changes landing in the same window. Later snapshots: `~0.7ms` avg. Not a straight line, but direction was correct.

#### Short test-driver experiment

Added a Unix socket test driver (`ping`, `sleep`, `key`, `mouse`, `focused`, `snapshot`, `quit`) to script interactions. Useful for quick black-box checks, but later removed during cleanup.

#### Style sync architecture rewrite

Next bottleneck: style payload duplication. Before, each node carried full style payload inline in serialized node data. After:

- node payload shrank to 4 fields (`nodeType`, `childCount`, `nodeId`, `styleId`)
- style moved to Rust-side `STYLE_REGISTRY`
- TS computes style snapshots and sends diffs via `sync_style_ops`

This introduced explicit schema files (`style_schema.rs`, `src/style-schema.ts`) and unlocked broader style support:

- `margin`, `rowGap`, `columnGap`
- `flexShrink`, `flexBasis`
- `justifyContent`, `alignItems`, `alignSelf`
- `min/max width/height`
- `overflow`, `overflowX`, `overflowY`

#### Wrapping and clipping fixes

Fixed text wrapping and clipping in Rust. Problems: naive text measurement for wrapping/newlines, draw path not clipping correctly in nested overflow scenarios.

Key changes:

- wrapped text measurement in Rust (`measure_wrapped_text`)
- draw/cursor functions aware of content box width/height
- clip-rect propagation down the tree with overflow-aware intersection

Improved: long text behavior, input cursor placement in wrapped content, nested container clipping correctness.

#### Demos and docs

Built more demos and proper docs:

- demos: `ai-agent`, `mission-control`, `visualizer`
- docs: getting started, components/styling, state/events/lifecycle, troubleshooting

Good validation pass — these examples touched many edge cases at once.

#### End of part 7

By end of this phase:
- Rust owns terminal-critical rendering paths
- TS sends text/style diffs instead of full payloads
- text and style have separate sync paths
- wrapping/clipping behavior is much more predictable

Next: scroll containers, richer text primitives, and tail-latency cleanup on heavier scenes.
