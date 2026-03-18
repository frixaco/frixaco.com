---
title: "Building a TUI Library from scratch: Part 1"
description: "Initial implementation of my terminal user interface library using Bun, Rust and classes"
date: "2025-12-12T10:00:00"
---

## [devlog] Building a TUI Library from Scratch: From Classes to Signals

#### Things I learned:

- I learned **tons** of things but had to write **tons** of garbage for it and (of course) ended up using **none** of it
- Separation of concerns is **extremely** important, never stop following this principle
- Bun, FFI, some Rust, ANSI escape sequences, memory management

#### Tools used:

- ampcode.com, aistudio.google.com, t3.chat, deepwiki.com

I've been using Neovim for years and love living in my terminal. CLIs and TUIs always interested me, and that interest grew when I started hearing more about Claude Code, Codex, Aider and similar terminal-based AI agents. I did some research and found [`react-ink`](https://github.com/vadimdemedes/ink), then [`opencode`](https://github.com/sst/opencode). Soon after I saw this post:

> yeah unfortunately the best tooling for TUIs is in go
>
> we'll build OpenTUI one day for js but till then this hack works
>
> — dax (@thdxr), [May 31, 2025](https://twitter.com/thdxr/status/1928902930419048585?ref_src=twsrc%5Etfw)

and right then I decided to build my own TUI library someday.

When I started building `LeTUI` around September, I decided not to follow any tutorial, guide, or existing repo. I wanted to build from scratch, on my own. I used AI for a general roadmap and learning, but wrote every line of code myself.

I reached for the most "simple to reason about" pattern — classes — and just went with the flow. I'd never written a library or worked with terminals before, so instead of making a detailed plan, I just started playing around with code.

The initial implementation had `View`, `Row`, `Column`, `Text`, `Button`, and `Input` classes. Complete mess, but I learned a lot and it gave me enough of a base to build on.

Here's an example snippet. Enjoy!

```typescript
class Button {
  id: number;
  px = 4;
  py = 1;
  text: string;
  fg: number;
  active_fg: number;
  bg: number;
  active_bg: number;
  border: Border;
  prebuilt: BigUint64Array = new BigUint64Array();
  width: number;
  height: number;
  onClick: (() => Promise<void>) | (() => void) | null = null;

  // ... constructor and other methods ...

  render(xo: number, yo: number, { w, h }: { w: number; h: number }) {
    this.xo = xo;
    this.yo = yo;

    this.prerender(); // layout? painting? who knows!

    // top part - manual pixel pushing
    for (let cy = yo; cy < this.py + yo; cy++) {
      for (let cx = xo; cx < xo + this.size().w; cx++) {
        buffer.set(
          new BigUint64Array([
            BigInt(" ".codePointAt(0)!),
            BigInt(this.fg),
            BigInt(this.bg),
          ]),
          (terminalWidth * cy + cx) * 3
        );
      }
    }

    // bottom part - more manual pixel pushing
    for (let cy = yo + this.size().h - this.py; cy < yo + this.size().h; cy++) {
      for (let cx = xo; cx < xo + this.size().w; cx++) {
        buffer.set(
          new BigUint64Array([
            BigInt(" ".codePointAt(0)!),
            BigInt(this.fg),
            BigInt(this.bg),
          ]),
          (terminalWidth * cy + cx) * 3
        );
      }
    }

    // middle part - even more manual pixel pushing
    for (
      let cy = yo + this.size().h - 2 * this.py;
      cy < yo + this.size().h - 2 * this.py + this.height;
      cy++
    ) {
      for (let cx = xo; cx < xo + this.size().w; cx++) {
        if (cx < xo + this.px || cx > xo + this.px + this.width - 1) {
          buffer.set(
            new BigUint64Array([
              BigInt(" ".codePointAt(0)!),
              BigInt(this.active_fg),
              BigInt(this.active_bg),
            ]),
            (terminalWidth * cy + cx) * 3
          );
        }
      }
    }

    // actual text
    buffer.set(
      this.prebuilt.subarray(0),
      (terminalWidth * (yo + this.py) + xo + this.px) * 3
    );

    this.updateHitMap(xo, yo); // hit-testing mixed in here too!
  }

  updateHitMap(xo: number, yo: number) {
    for (let cy = yo; cy < yo + this.size().h; cy++) {
      for (let cx = xo; cx < xo + this.size().w; cx++) {
        hitMap.set(cy * terminalWidth + cx, this.id);
      }
    }
  }

  // ...
}
```

Layout and painting were hopelessly tangled — `render()` calculates positions _and_ writes to the buffer _and_ updates the hit-map for click detection. Every component duplicates border-drawing logic. Want to change how buttons look when pressed? Good luck finding the right place. Want to add a new component type? Copy-paste 100 lines and pray you got the coordinate math right.

The real problem hit when I needed state management and dynamic updates. User types in an `Input`, clicks a `Button`, and the UI needs to update. My class-based approach required manual `setText()` calls that triggered `prerender()` and `render()`. Every component held mutable state, and coordinating updates became a mess of method calls.

This first attempt kinda worked. I could render containers and primitives, nest them, show some colors. More importantly, I started understanding the problem space — what a render loop actually needs, which parts should be separate, how hit-testing works, why layout and painting need to be separate, and how I want to handle dynamic updates.

Time to stop playing around and start from scratch again, but now with a better understanding.
