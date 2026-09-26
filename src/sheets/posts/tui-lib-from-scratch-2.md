---
title: "Building a TUI Library from scratch: Part 2"
description: "Optimization journey - I want 120+fps and sub 8ms frame times"
date: "2026-01-08T10:00:00"
---

## [devlog] Building a TUI Library from Scratch: Part 3 - Optimization

#### Things I learned:

- Measure first, optimize second
- The less you do, the faster it runs

LeTUI was working. Signals drove reactivity, Rust handled layout via taffy, diff-based flush meant only changed cells got written to the terminal. Now I wanted maximum performance.

Time to actually measure things.

#### Building a metrics system

Before optimizing anything, I needed to know what was slow. I built a simple metrics tracker using `Bun.nanoseconds()`:

```typescript
export function startFrame(): number {
  return Bun.nanoseconds();
}

export function endFrame(startTime: number): void {
  const elapsed = (Bun.nanoseconds() - startTime) / 1_000_000; // ms
  frameCount++;
  frameTimes.push(elapsed);
  if (frameTimes.length > MAX_SAMPLES) {
    frameTimes.shift();
  }
}

export function formatMetrics(): string {
  const m = getMetrics();
  return `${m.fps}fps | ${m.avgFrameTime}ms avg (${m.minFrameTime}-${m.maxFrameTime}) | ${m.heapMB}MB heap | ${m.frameCount} frames`;
}
```

Now when I quit the app with `Ctrl+Q`, I get something like:

```
113fps | 8.85ms avg (3.47-32.43) | 31.7MB heap | 27 frames
```

8.85ms average with spikes up to 32ms? That's bad. My target is < 8ms.

#### The first culprit: debug file writes I forgot to remove

Removing it immediately improved things:

```
139fps | 7.2ms avg (3-33) | 22.2MB heap | 40 frames
```

Better, but those 33ms spikes were still there.

#### The big one: buffer cloning

Looking at my Rust code, I found this in the `flush()` function:

```rust
// Before - cloning the entire buffer every frame
if let Some(ref buf) = *cb {
    *lb = Some(buf.clone());
}
```

The buffers were `Box<[u64; 2_000_000]>` — 16MB copied every single frame. Even if only a few cells changed.

The fix was simple — only copy what's actually used, in place:

```rust
// After - copy only what we need
last_buf.copy_from_slice(buf);
```

And while I was at it, I changed the buffers from fixed-size arrays to vectors sized to the actual terminal:

```rust
pub extern "C" fn init_buffer() -> c_int {
    let (w, h) = size().unwrap();
    let buffer_size = (w as usize) * (h as usize) * 3;

    let mut cb = CURRENT_BUFFER.lock().unwrap();
    *cb = Some(vec![0u64; buffer_size]);
    let mut lb = LAST_BUFFER.lock().unwrap();
    *lb = Some(vec![0u64; buffer_size]);
    1
}
```

Result:

```
~150+ fps | ~5ms avg (1-13) | ~20MB heap | 39fps
```

Now we're talking.

#### Death by a thousand allocations

The remaining spikes came from allocations in the hot path. In `drawBackground()`, I was creating a new `BigUint64Array` for every single cell:

```typescript
// Before - allocating per cell
for (let j = node.frame.y; j < node.frame.y + node.frame.height; j++) {
  for (let i = node.frame.x; i < node.frame.x + node.frame.width; i++) {
    buffer.set(
      new BigUint64Array([
        BigInt(" ".codePointAt(0)!),
        BigInt(COLORS.default.bg),
        BigInt(bg),
      ]),
      (j * terminalWidth() + i) * 3
    );
  }
}
```

For a 200x50 terminal, that's potentially 10,000 array allocations per frame. The fix was to write directly to the buffer:

```typescript
function setCell(
  buffer: BigUint64Array<ArrayBuffer>,
  offset: number,
  char: string,
  fg: number,
  bg: number
) {
  buffer[offset] = BigInt(char.codePointAt(0)!);
  buffer[offset + 1] = BigInt(fg);
  buffer[offset + 2] = BigInt(bg);
}

// After - direct index writes
for (let j = node.frame.y; j < node.frame.y + node.frame.height; j++) {
  for (let i = node.frame.x; i < node.frame.x + node.frame.width; i++) {
    setCell(buffer, (j * tw + i) * 3, " ", COLORS.default.bg, bg);
  }
}
```

Same pattern for the spatial lookup array - instead of creating a new array every frame:

```typescript
// Before
spatialLookup = new Array(terminalWidth() * terminalHeight());

// After - reuse and clear
spatialLookup.fill(undefined);
```

And in Rust, reusing the frames vector instead of allocating a new one:

```rust
// Before
let mut frames: Vec<f32> = Vec::new();
build_frames_array(&mut taffy, root, &mut frames, 0.0, 0.0);
*FRAMES.lock().unwrap() = Some(frames);

// After - reuse existing vec
let mut frame_lock = FRAMES.lock().unwrap();
let frames_vec = frame_lock.get_or_insert_with(Vec::new);
frames_vec.clear();
build_frames_array(&mut taffy, root, frames_vec, 0.0, 0.0);
```

#### Current state

After all these changes, it's even more optimized:

```
170fps | 5.89ms avg (2.85-9.81) | 10.7MB heap | 40 frames
```

Target was < 8ms and I'm now averaging under 5ms. Occasional spikes to 13ms are likely JSON serialization for layout and rebuilding the taffy tree every frame.

#### What's next

Any signal change still triggers a full rebuild: node tree → JSON → taffy layout → full repaint. Obvious next steps:

1. **Persist the node tree** — call `nodeFactory` once, not every frame
2. **Dirty tracking** — only repaint sub-trees that actually changed
3. **Binary layout protocol** — replace JSON with packed buffers

But for now, results are pretty good. I really wanna stress test it and make a nice demo while doing it.

## Part 4

### Binary protocol, batched flush, and facing reality

#### Title was: Building a TUI Library from scratch: Part 4

#### Description was: Binary protocols, batched flushing, component API redesign, and facing competition

#### Originally posted Jan 8, 2026

#### Things I learned:

- JSON serialization is secretly expensive — binary protocols are worth the effort
- Batching writes is always faster than individual operations
- Sometimes you need to step back and redesign the API before moving forward

After hitting ~5ms frame times in Part 3, I was feeling good. Then I looked at what was actually still slow.

#### Killing JSON serialization

Remember the "JSON serialization for layout" bottleneck from Part 3? Time to fix it. Every frame, I was doing this:

```typescript
// Before - JSON serialization every frame
const tree = JSON.stringify({
  node: serializeNode(root),
  width: terminalWidth,
  height: terminalHeight
});
api.calculate_layout(ptr(Buffer.from(tree)), tree.length);
```

The fix: a binary protocol. Instead of JSON, I pack node data into a `Float32Array` and text into a `Uint8Array`. Each node gets exactly 7 fields (later expanded to 13):

```typescript
const FIELDS_PER_NODE = 7; // nodeType, gap, paddingX, paddingY, border, childCount, textLength

function serialize(root: Node): { nodeData: Float32Array, textData: Uint8Array } {
  // Pack node properties as floats
  nodeData[offset++] = nodeType;
  nodeData[offset++] = gap;
  nodeData[offset++] = paddingX;
  nodeData[offset++] = paddingY;
  nodeData[offset++] = border;
  nodeData[offset++] = children.length;
  nodeData[offset++] = textContent.length;
  // Text goes into separate buffer
}
```

On the Rust side, I replaced `serde` deserialization with direct pointer reads:

```rust
fn parse_node(node_data: &[f32], node_offset: &mut usize, text_data: &[u8], text_offset: &mut usize) -> Node {
    let base = *node_offset;
    let node_type = NodeType::from_f32(node_data[base]);
    let gap = node_data[base + 1];
    // ... read remaining fields
    *node_offset += FIELDS_PER_NODE;
    // ...
}
```

This let me drop the `serde` dependency entirely. The real benefit was eliminating the allocation overhead of building and parsing JSON strings every frame.

#### Batched flush — the 3x speedup

The next big win came from terminal writes. My original `flush()` would set foreground color, set background color, then print a character — for every single cell that changed:

```rust
// Before - command per cell
for each changed cell {
    queue!(stdout, MoveTo(x, y)).unwrap();
    queue!(stdout, SetForegroundColor(fg)).unwrap();
    queue!(stdout, SetBackgroundColor(bg)).unwrap();
    queue!(stdout, Print(char)).unwrap();
}
```

Fix: batch consecutive cells with the same colors into a single print:

```rust
fn next_flush(w: u16, h: u16, stdout: &mut Stdout, buf: &[u64], last_buf: &[u64]) {
    let mut char_seq = String::with_capacity(w as usize);
    let mut batch_start_x = 0;

    for y in 0..h {
        for x in 0..w {
            // Skip unchanged cells
            if buf[idx] == last_buf[idx] { continue; }

            // Same colors? Keep batching
            if curr_fg == prev_fg && curr_bg == prev_bg {
                char_seq.push(curr_char);
                continue;
            }

            // Colors changed - flush the batch and start new one
            queue!(stdout, MoveTo(batch_start_x, y), Print(&char_seq)).unwrap();
            // ... update colors, reset batch
        }
    }
}
```

I also separated first-frame flush (writes everything) from subsequent flushes (only diffs). First frame streams left-to-right without cursor moves. Subsequent frames need MoveTo for each batch, but skip most cells entirely.

Result: 8-10ms flush → 3-5ms.

#### Adding phase timing

To see where time was actually going, I split metrics into phases:

```typescript
export function startPhase() {
  return Bun.nanoseconds();
}

export function endLayout(startTime: number) {
  const elapsed = (Bun.nanoseconds() - startTime) / 1_000_000;
  metrics.layoutTimes.push(elapsed);
}

export function endPaint(startTime: number) {
  // ...
}
```

Now I could see exactly where milliseconds went:

```
674fps | 2.1ms avg | 6MB heap | 70 frames
  layout: 0.1ms
  paint:  1.7ms
  flush:  0.2ms
```

Paint was 81% of frame time. Good to know for later.

#### Component API overhaul

The library worked but the API was getting messy. Components had grown organically and the line between "what a component is" and "how it renders" was blurring. I split things into `components.ts` (pure definitions), `runtime.ts` (render loop, painting, events), and `types.ts` (interfaces).

Components became cleaner:

```typescript
export function Button(props: ButtonProps): Node {
  return {
    id: generateId(),
    type: "button",
    props: normalizeProps(props),
    frame: getInitialFrame(),
    children: () => [],
  };
}
```

The runtime handles serialization, layout, painting, and hit testing. Components just describe what they want to be.

#### Pseudo-scrolling

Real scrolling (viewport, scroll position, clipping) is complex. But I needed something for lists longer than the terminal height.

My solution: "pseudo-scrolling" — the parent component receives frame dimensions after layout and slices the visible portion:

```typescript
const visibleItems = items.slice(scrollOffset, scrollOffset + containerHeight);
```

Not real scrolling, but good enough for most cases. The `frameWidth` and `frameHeight` signals let components react to their actual rendered size.

#### Facing the competition

I finally benchmarked LeTUI against two other libraries: [OpenTUI](https://github.com/example/opentui) (Zig-based, used by OpenCode) and pi-mono (pure TypeScript, string-based rendering).

Equivalent demos, all three:

| Library | Avg Frame Time |
|---------|----------------|
| LeTUI   | 2.1ms          |
| OpenTUI | 0.4ms          |
| pi-mono | 0.2ms          |

Ouch.

pi-mono being faster was especially humbling — pure TypeScript with string concatenation, no fancy FFI or Rust. Turns out string building is really fast when you're not doing all the bookkeeping I was doing.

OpenTUI being 5x faster made sense — Zig, basically as close to the metal as you can get.

#### The path forward

At 2.1ms I'm well under 16.6ms (60fps) and even under 8.3ms (120fps). But clearly room to improve. Phase breakdown:

- serialize: 0.1ms (5%)
- layout: 0.1ms (5%)
- **paint: 1.7ms (81%)**
- flush: 0.2ms (9%)

Paint is the bottleneck. All those `setCell()` calls in JavaScript, writing to typed arrays — that's what's eating time. The obvious next step: move paint to Rust, same as I did with layout.

But for now, I have a working TUI library that can do 500+ fps on a good day. Time to actually build something with it.
