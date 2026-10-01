// Run against the dev server and an existing Chromium browser on port 9222.
// Creates and closes its own tab; leaves the user's tabs and viewport alone.
import assert from "node:assert/strict";

const debug = "http://127.0.0.1:9222";
const page = await fetch(`${debug}/json/new?about:blank`, {
  method: "PUT",
}).then((r) => r.json());
const socket = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map<
  number,
  { resolve: (value: any) => void; reject: (error: Error) => void }
>();
const errors: unknown[] = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(String(data));
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails);
  if (message.id) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request?.reject(new Error(message.error.message));
    else request?.resolve(message.result);
  }
};
await new Promise<void>((resolve, reject) => {
  socket.onopen = () => resolve();
  socket.onerror = () => reject(new Error("Could not connect to the test tab"));
});
async function cdp(method: string, params = {}): Promise<any> {
  const id = ++nextId;
  const response = new Promise((resolve, reject) =>
    pending.set(id, { resolve, reject }),
  );
  socket.send(JSON.stringify({ id, method, params }));
  let timeout: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      response,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${method} timed out`)),
          40_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout!);
    pending.delete(id);
  }
}
async function evaluate<T>(fn: () => T | Promise<T>): Promise<T> {
  const response = await cdp("Runtime.evaluate", {
    expression: `(${fn.toString()})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
try {
  await cdp("Runtime.enable");
  for (const [mobile, reduce] of [
    [false, false],
    [true, false],
    [false, true],
  ]) {
    await cdp("Emulation.setDeviceMetricsOverride", {
      width: mobile ? 390 : 1504,
      height: mobile ? 844 : 941,
      deviceScaleFactor: 2,
      mobile,
    });
    await cdp("Emulation.setEmulatedMedia", {
      features: [
        {
          name: "prefers-reduced-motion",
          value: reduce ? "reduce" : "no-preference",
        },
      ],
    });
    // A different document URL prevents fragment navigation from preserving the previous case's state.
    const navigationLoad = await cdp("Page.navigate", {
      url: `http://127.0.0.1:5173/?motion-test=${mobile}-${reduce}#map`,
    });
    assert(
      navigationLoad.loaderId,
      "each viewport starts with a fresh document",
    );
    await cdp("Page.bringToFront");
    await Bun.sleep(1200);
    if (process.argv.includes("--patterns-only")) {
      const pattern = await evaluate(async () => {
        const svg = document.querySelector<SVGElement>(".canvas-patterns")!;
        const groups = [...svg.querySelectorAll(":scope > g")];
        const before = groups.map((g) => getComputedStyle(g).transform);
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          decorative: svg.getAttribute("aria-hidden") === "true",
          passthrough: getComputedStyle(svg).pointerEvents === "none",
          moving: groups.every((g, i) => getComputedStyle(g).transform !== before[i]),
          stopped: groups.every((g) => getComputedStyle(g).animationName === "none"),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert(pattern.decorative && pattern.passthrough && !pattern.overflow);
      assert.equal(pattern.moving, !reduce);
      assert.equal(pattern.stopped, reduce);
      await evaluate(() => { location.hash = "index"; });
      await Bun.sleep(150);
      assert(await evaluate(() =>
        [...document.querySelectorAll(".canvas-patterns > g")].every(
          (g) => getComputedStyle(g).animationPlayState === "paused",
        ),
      ), "background pauses outside the map");
      continue;
    }
    if (mobile) {
      const density = await evaluate(() => ({
        tileHeight: document.querySelector<HTMLElement>('[data-card="letui"]')!.offsetHeight,
        textSize: parseFloat(getComputedStyle(document.querySelector('.project-summary')!).fontSize),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      assert(density.tileHeight <= 220 && density.textSize >= 16 && !density.overflow,
        `mobile cards fit their content while retaining readable text: ${JSON.stringify(density)}`);
    }
    if (process.argv.includes("--markers-only")) {
      const hoverTracksSection = await evaluate(async () => {
        const canvas = document.querySelector<HTMLElement>(".react-flow")!;
        const hash = location.hash;
        const viewport = document.querySelector<HTMLElement>(".react-flow__viewport")!.style.transform;
        for (const id of ["about", "projects", "work", "writing"]) {
          const zone = document.querySelector<HTMLElement>(`.zone-${id}`)!;
          const rect = zone.getBoundingClientRect();
          canvas.dispatchEvent(new PointerEvent("pointermove", {
            clientX: rect.left + 40, clientY: rect.top + 30,
            pointerType: "mouse", bubbles: true,
          }));
          await new Promise((resolve) => setTimeout(resolve, 500));
          const tab = document.querySelector('.region-navigation [aria-current="location"]');
          if (!zone.classList.contains("is-active") ||
            document.querySelectorAll(".zone.is-active").length !== 1 ||
            tab?.textContent?.trim().toLowerCase() !== id ||
            getComputedStyle(zone).borderTopColor !== "rgb(255, 99, 31)") return false;
        }
        return location.hash === hash &&
          document.querySelector<HTMLElement>(".react-flow__viewport")!.style.transform === viewport;
      });
      assert(hoverTracksSection, "hover highlights its section and tab without navigating or moving the map");
      const followsBorder = await evaluate(async () => {
        const canvas = document.querySelector<HTMLElement>(".react-flow")!;
        const zone = document.querySelector<HTMLElement>(".zone-projects")!;
        const marker = zone.querySelector<HTMLElement>(".zone-marker")!;
        const rect = zone.getBoundingClientRect();
        const points = [
          { x: rect.left + rect.width * 0.8, y: rect.top },
          { x: rect.right, y: rect.top + rect.height * 0.5 },
          { x: rect.left + rect.width * 0.5, y: rect.bottom },
          { x: rect.left, y: rect.top + rect.height * 0.5 },
          { x: rect.left + 5, y: rect.top },
        ];
        const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        const center = () => {
          const box = marker.getBoundingClientRect();
          return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        };
        for (const point of points) {
          canvas.dispatchEvent(new PointerEvent("pointermove", {
            clientX: point.x, clientY: point.y, pointerType: "mouse", bubbles: true,
          }));
          await wait(60);
          const moving = center();
          if (Math.min(Math.abs(moving.x - rect.left), Math.abs(moving.x - rect.right),
            Math.abs(moving.y - rect.top), Math.abs(moving.y - rect.bottom)) > 2) return false;
          await wait(300);
          const landed = center();
          if (Math.hypot(landed.x - point.x, landed.y - point.y) > 2) return false;
        }
        return true;
      });
      assert(followsBorder, "section markers follow the cursor without cutting across the section");
      console.log(`${mobile ? "mobile" : "desktop"}${reduce ? " / reduced motion" : ""}: markers passed`);
      continue;
    }
    if (process.argv.includes("--anchors-only") || process.argv.includes("--work-anchors-only")) {
      assert(await evaluate(() => CSS.supports("anchor-scope: --bento") && CSS.supports("inset: anchor(inside)")));
      if (mobile) {
        await cdp("Emulation.setTouchEmulationEnabled", { enabled: true });
        assert(await evaluate(() => getComputedStyle(document.querySelector(".react-flow__viewport")!, "::after").content === "none"),
          "touch screens do not get sticky hover outlines");
        await cdp("Emulation.setTouchEmulationEnabled", { enabled: false });
      } else {
        for (const [hash, parent, child] of [
          ["#map", ".react-flow__viewport", ".project-tile"],
          ["#map/writing", ".writing-card", ".article-link"],
          ["#map/work", ".react-flow__viewport .role-grid", ".role-card"],
          ["#index", "#index-projects", ".index-project"],
          ["#index/writing", "#index-writing", ".index-article"],
          ["#index/work", ".index-page .role-grid", ".role-card"],
          ["#read/tui-lib-from-scratch-2", ".reader-pager", ":scope > :is(a, button)"],
        ]) {
          if (process.argv.includes("--work-anchors-only") && !hash.endsWith("/work")) continue;
          await evaluate(new Function(`location.hash = ${JSON.stringify(hash)}`) as () => void);
          await Bun.sleep(750);
          const count = await evaluate(new Function(`return document.querySelector(${JSON.stringify(parent)}).querySelectorAll(${JSON.stringify(child)}).length`) as () => number);
          assert(count >= 2, `${parent}: multiple hover targets exist`);
          for (let index = 0; index < count; index++) {
            if (hash === "#map/work") {
              const deltaY = await evaluate(new Function(`return Math.max(0, document.querySelector(${JSON.stringify(parent)}).querySelectorAll(${JSON.stringify(child)})[${index}].getBoundingClientRect().top - 180)`) as () => number);
              if (deltaY) {
                await cdp("Input.dispatchMouseEvent", { type: "mouseWheel", x: 750, y: 450, deltaX: 0, deltaY });
                await Bun.sleep(150);
              }
            }
            const point = await evaluate(new Function(`
              const target = document.querySelector(${JSON.stringify(parent)}).querySelectorAll(${JSON.stringify(child)})[${index}];
              if (location.hash === "#map/writing") target.scrollIntoView({ block: "nearest", behavior: "instant" });
              if (!location.hash.startsWith("#map")) target.scrollIntoView({ block: "center", behavior: "instant" });
              const r = target.getBoundingClientRect();
              return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 80) };
            `) as () => { x: number; y: number });
            if (index > 0 && (parent === ".react-flow__viewport" || hash.endsWith("/work"))) {
              const gap = await evaluate(new Function(`
                const items = document.querySelector(${JSON.stringify(parent)}).querySelectorAll(${JSON.stringify(child)});
                const first = items[${index - 1}].getBoundingClientRect();
                const next = items[${index}].getBoundingClientRect();
                return next.top === first.top
                  ? { x: (first.right + next.left) / 2, y: first.top + 80 }
                  : { x: next.left + 80, y: (first.bottom + next.top) / 2 };
              `) as () => { x: number; y: number });
              await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...gap });
              await Bun.sleep(80);
            }
            await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
            if (index > 0 && !reduce) {
              const frames = await evaluate(new Function(`return new Promise(resolve => {
                const values = [], start = performance.now(), parent = document.querySelector(${JSON.stringify(parent)});
                const sample = () => {
                  values.push(getComputedStyle(parent, "::after").inset);
                  if (performance.now() - start < 180) requestAnimationFrame(sample);
                  else resolve(values);
                }; requestAnimationFrame(sample);
              })`) as () => Promise<string[]>);
              assert(new Set(frames).size > 2, `${parent}: outline slides through intermediate positions`);
            }
            await Bun.sleep(450);
            const aligned = await evaluate(new Function(`
              const parent = document.querySelector(${JSON.stringify(parent)});
              const target = parent.querySelectorAll(${JSON.stringify(child)})[${index}];
              const p = parent.getBoundingClientRect(), r = target.getBoundingClientRect();
              const s = getComputedStyle(parent, "::after");
              const scale = p.width / parent.offsetWidth;
              return { visibility: s.visibility, pointerEvents: s.pointerEvents, duration: s.transitionDuration,
                error: Math.max(Math.abs(p.left + (parent.clientLeft + parseFloat(s.left)) * scale - r.left),
                  Math.abs(p.top + (parent.clientTop + parseFloat(s.top) - parent.scrollTop) * scale - r.top),
                  Math.abs(parseFloat(s.width) * scale - r.width), Math.abs(parseFloat(s.height) * scale - r.height)) };
            `) as () => { visibility: string; pointerEvents: string; duration: string; error: number });
            assert(aligned.visibility === "visible" && aligned.pointerEvents === "none" && aligned.error < 1,
              `${parent} item ${index}: outline matches its hovered item: ${JSON.stringify(aligned)}`);
            assert.equal(aligned.duration, reduce ? "0s" : "0.35s");
          }
          await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 10, y: 10 });
          assert(await evaluate(new Function(`return getComputedStyle(document.querySelector(${JSON.stringify(parent)}), "::after").visibility === "hidden"`) as () => boolean),
            `${parent}: outline hides after leaving the group`);
        }
      }
      console.log(`${mobile ? "mobile" : "desktop"}${reduce ? " / reduced motion" : ""}: anchors passed`);
      continue;
    }
    if (process.argv.includes("--writing-only")) {
      const smallest = await evaluate(async () => {
        document.querySelector<HTMLButtonElement>(".fit-controls button:last-child")!.click();
        await new Promise((resolve) => setTimeout(resolve, 700));
        const zoom = new DOMMatrixReadOnly(
          document.querySelector<HTMLElement>(".react-flow__viewport")!.style.transform,
        ).a;
        const sizes = [...document.querySelectorAll<HTMLElement>(".react-flow__viewport *")]
          .filter((item) => item.getClientRects().length && [...item.childNodes]
            .some((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim()))
          .map((item) => parseFloat(getComputedStyle(item).fontSize) * zoom);
        return Math.min(...sizes);
      });
      assert(smallest >= 13.99, `map text stays readable at minimum zoom: ${smallest}px`);
      const writing = await evaluate(async () => {
        const wait = () => new Promise((resolve) => setTimeout(resolve, 700));
        const tile = [...document.querySelectorAll<HTMLElement>(".project-tile")]
          .find((item) => item.textContent!.includes("LeTUI"))!;
        tile.querySelector<HTMLButtonElement>(".card-toggle")!.click();
        await wait();
        const link = [...document.querySelectorAll<HTMLButtonElement>(".detail-writing button")]
          .find((button) => button.textContent!.includes("All "))!;
        const count = Number(link.textContent!.match(/\d+/)![0]);
        link.click();
        await wait();
        const card = document.querySelector<HTMLElement>(".writing-card")!;
        const group = card.querySelector<HTMLElement>(".post-group.is-linked")!;
        const atGroup = Math.abs(card.scrollTop - group.offsetTop) <= 2;
        card.scrollTop = card.scrollHeight;
        return {
          route: location.hash,
          count,
          posts: group.querySelectorAll(".article-link").length,
          height: card.offsetHeight,
          scrolled: card.scrollTop > 0,
          atGroup,
          descriptions: [...card.querySelectorAll(".article-text small")]
            .every((item) => getComputedStyle(item).display !== "none"),
        };
      });
      assert.equal(writing.route, "#map/writing");
      assert.equal(writing.posts, writing.count);
      assert(writing.height <= 800);
      assert(writing.scrolled && writing.atGroup && writing.descriptions);
      console.log(`${mobile ? "mobile" : "desktop"}${reduce ? " / reduced motion" : ""}: writing passed`);
      continue;
    }
    // Native trackpad wheel events must pan on the canvas and the overview.
    for (const selector of [".react-flow__pane", ".react-flow__minimap"]) {
      if (mobile && selector.includes("minimap")) continue;
      const point = await evaluate(new Function(`
        const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      `) as () => { x: number; y: number });
      for (const [deltaX, deltaY] of [[0, 40], [40, 0], [25, 40]]) {
        const before = await evaluate(() => {
          const m = new DOMMatrixReadOnly(document.querySelector<HTMLElement>(".react-flow__viewport")!.style.transform);
          return { x: m.e, y: m.f, zoom: m.a };
        });
        await cdp("Input.dispatchMouseEvent", { type: "mouseWheel", ...point, deltaX, deltaY });
        await Bun.sleep(250);
        const after = await evaluate(() => {
          const m = new DOMMatrixReadOnly(document.querySelector<HTMLElement>(".react-flow__viewport")!.style.transform);
          return { x: m.e, y: m.f, zoom: m.a };
        });
        assert.equal(after.zoom, before.zoom, `${selector}: two-finger swipe must not zoom`);
        assert(after.x !== before.x || after.y !== before.y, `${selector}: two-finger swipe pans`);
      }
      const beforePinch = await evaluate(() => new DOMMatrixReadOnly(
        document.querySelector<HTMLElement>(".react-flow__viewport")!.style.transform,
      ).a);
      await cdp("Input.dispatchMouseEvent", {
        type: "mouseWheel", ...point, deltaX: 0, deltaY: -1, modifiers: 2,
      });
      await Bun.sleep(250);
      const afterPinch = await evaluate(() => new DOMMatrixReadOnly(
        document.querySelector<HTMLElement>(".react-flow__viewport")!.style.transform,
      ).a);
      assert(afterPinch > beforePinch, `${selector}: pinch still zooms`);
    }
    await cdp("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Control",
      code: "ControlLeft",
      windowsVirtualKeyCode: 17,
      modifiers: 2,
    });
    const wheelZoom = await evaluate(async () => {
      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const flow = document.querySelector<HTMLElement>(".react-flow")!;
      const pane = flow.querySelector(".react-flow__pane")!;
      const rect = flow.getBoundingClientRect();
      const point = {
        x: Math.round(rect.left + rect.width * 0.65) - rect.left,
        y: Math.round(rect.top + rect.height * 0.55) - rect.top,
      };
      const viewport = () =>
        new DOMMatrixReadOnly(
          document.querySelector<HTMLElement>(".react-flow__viewport")!.style
            .transform,
        );
      const steps = [];
      const wheel = (deltaY: number, deltaMode = 0) =>
        pane.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            ctrlKey: true,
            deltaY,
            deltaMode,
            clientX: rect.left + point.x,
            clientY: rect.top + point.y,
          }),
        );
      for (const [deltaY, deltaMode, exponent] of [
        [-100, 0, 0.12],
        [100, 0, -0.12],
        [-3, 1, 0.1152],
        [1, 2, -0.12],
        [-1, 0, 0.0024],
        [-1000, 0, 0.12],
        [1000, 0, -0.12],
      ]) {
        const before = viewport();
        wheel(deltaY, deltaMode);
        await wait(35);
        const during = viewport().a;
        await wait(250);
        const after = viewport();
        steps.push({
          deltaY,
          before: before.a,
          during,
          after: after.a,
          ratio: after.a / before.a,
          expected: Math.max(innerWidth <= 700 ? 0.875 : 0.7, Math.min(1.6, before.a * 2 ** exponent)),
          anchorError: Math.hypot(
            (point.x - before.e) / before.a - (point.x - after.e) / after.a,
            (point.y - before.f) / before.a - (point.y - after.f) / after.a,
          ),
        });
      }
      const beforeBurst = viewport().a;
      for (let i = 0; i < 5; i++) wheel(-100);
      await wait(300);
      const burst = { before: beforeBurst, after: viewport().a };
      for (let i = 0; i < 5; i++) wheel(100);
      await wait(300);
      const reversed = viewport().a;
      for (let i = 0; i < 30; i++) wheel(-100);
      await wait(300);
      const maxZoom = viewport().a;
      for (let i = 0; i < 40; i++) wheel(100);
      await wait(300);
      const minZoom = viewport().a;
      const beforePan = viewport();
      pane.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 40,
        }),
      );
      await wait(250);
      const afterPan = viewport();
      document.querySelector<HTMLElement>(".region-navigation button")!.click();
      await wait(650);
      return {
        steps,
        burst,
        reversed,
        minZoom,
        maxZoom,
        panned: beforePan.f !== afterPan.f && beforePan.a === afterPan.a,
      };
    });
    for (const step of wheelZoom.steps) {
      assert(step.ratio >= 0.92 && step.ratio <= 1.09, JSON.stringify(step));
      assert(
        Math.abs(step.after - step.expected) < 0.00001,
        JSON.stringify(step),
      );
      assert(step.deltaY < 0 ? step.ratio > 1 : step.ratio < 1);
      assert(step.anchorError < 0.1, JSON.stringify(step));
      if (!reduce)
        assert(
          step.during > Math.min(step.before, step.after) &&
            step.during < Math.max(step.before, step.after),
          "wheel zoom eases between steps",
        );
    }
    assert(
      Math.abs(
        wheelZoom.burst.after -
          Math.min(1.6, wheelZoom.burst.before * 2 ** (5 * 0.12)),
      ) < 0.00001,
      "rapid mouse wheel steps accumulate without losing input",
    );
    assert(Math.abs(wheelZoom.reversed - wheelZoom.burst.before) < 0.00001);
    assert(Math.abs(wheelZoom.minZoom - (mobile ? 0.875 : 0.7)) < 0.00001);
    assert(Math.abs(wheelZoom.maxZoom - 1.6) < 0.00001);
    assert(wheelZoom.panned, "ordinary wheel scrolling still pans");
    await cdp("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Control",
      code: "ControlLeft",
      windowsVirtualKeyCode: 17,
      modifiers: 0,
    });
    const pinchZoom = await evaluate(async () => {
      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const flow = document.querySelector<HTMLElement>(".react-flow")!;
      const pane = flow.querySelector(".react-flow__pane")!;
      const rect = flow.getBoundingClientRect();
      const viewport = () =>
        new DOMMatrixReadOnly(
          document.querySelector<HTMLElement>(".react-flow__viewport")!.style
            .transform,
        );
      const wheel = (deltaY: number) =>
        pane.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            ctrlKey: true,
            deltaY,
            clientX: Math.round(rect.left + rect.width / 2),
            clientY: Math.round(rect.top + rect.height / 2),
          }),
        );
      await wait(100);
      const before = viewport().a;
      for (let i = 0; i < 16; i++) wheel(-0.5);
      await wait(50);
      const after = viewport().a;
      for (let i = 0; i < 16; i++) wheel(0.5);
      await wait(200);
      const reversed = viewport().a;
      document.querySelector<HTMLElement>(".region-navigation button")!.click();
      await wait(650);
      return {
        before,
        after,
        reversed,
        expected: Math.min(
          1.6,
          before *
            2 **
              (16 *
                0.5 *
                0.002 *
                (navigator.userAgent.includes("Mac") ? 10 : 1)),
        ),
      };
    });
    assert(
      Math.abs(pinchZoom.after - pinchZoom.expected) < 0.00001,
      "pinch preserves native sensitivity and every continuous input sample",
    );
    assert(Math.abs(pinchZoom.reversed - pinchZoom.before) < 0.00001);
    if (process.argv.includes("--gestures-only")) {
      console.log(`${mobile ? "mobile" : "desktop"}${reduce ? " / reduced motion" : ""}: gestures passed`);
      continue;
    }
    const results = await evaluate(async () => {
      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const click = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        element.click();
      };
      const toggle = (id: string) => click(`[data-card="${id}"] .card-toggle`);
      const viewport = () =>
        document.querySelector<HTMLElement>(".react-flow__viewport")!.style
          .transform;
      const node = (id: string) =>
        document.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
      const nodeY = (id: string) =>
        Number(node(id).style.transform.match(/, (-?[\d.]+)px/)![1]);
      const cardRects = () =>
        [...document.querySelectorAll("[data-card]")].map((card) =>
          card.getBoundingClientRect(),
        );
      const overlapping = () => {
        const rects = cardRects();
        return rects.some((a, i) =>
          rects.some(
            (b, j) =>
              i !== j &&
              a.left < b.right - 1 &&
              b.left < a.right - 1 &&
              a.top < b.bottom - 1 &&
              b.top < a.bottom - 1,
          ),
        );
      };
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      for (let i = 0; i < 50 && !document.querySelector(".is-ready"); i++)
        await wait(100);
      await wait(900);
      const initialOverlap = overlapping();
      click(".zoom-value");
      await wait(700);
      // Opening a first-row project unfolds a spread; the next row slides down.
      const below = innerWidth <= 700 ? "xport" : "harness-bench";
      const senmeiBefore = nodeY(below);
      toggle("letui");
      const movement: number[] = [];
      await new Promise<void>((resolve) => {
        const started = performance.now();
        const sample = () => {
          movement.push(nodeY(below));
          if (performance.now() - started < 680) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
      const settledCamera = viewport();
      await wait(650);
      const finalCamera = viewport();
      const finalMove = nodeY(below);
      const reflowed =
        finalMove === nodeY("detail-0") + node("detail-0").offsetHeight + 28;
      const expandedOverlap = overlapping();
      for (const id of ["xport", "letui", "senmei", "letui"]) {
        toggle(id);
        await wait(65);
      }
      await wait(1600);
      await wait(0);
      const selected = [
        ...document.querySelectorAll(".card-toggle[aria-expanded=true]"),
      ].map((e) => e.closest<HTMLElement>("[data-card]")!.dataset.card);
      const rapidOverlap = overlapping();
      const rust = [
        ...document.querySelectorAll<HTMLElement>("button.chip"),
      ].find((chip) => chip.textContent?.startsWith("Rust"))!;
      rust.click();
      await wait(700);
      const dimmed = document.querySelectorAll(
        ".project-tile.is-dimmed",
      ).length;
      const pinned = rust.getAttribute("aria-pressed") === "true";
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      rust.dispatchEvent(new PointerEvent("pointerleave"));
      await wait(400);
      const cleared =
        rust.getAttribute("aria-pressed") === "false" &&
        document.querySelectorAll(".project-tile.is-dimmed").length === 0;
      const beforeReader = viewport();
      click('.article-link[href="#read/tui-lib-from-scratch-1"]');
      await wait(650);
      const opened = document.querySelector<HTMLDialogElement>("dialog")?.open;
      const duplicateTitle = document
        .querySelector(".reader-content .prose")!
        .innerHTML.includes("[devlog]");
      const dialog = document.querySelector<HTMLDialogElement>("dialog")!;
      dialog.scrollTop = dialog.scrollHeight;
      await wait(100);
      const progress = new DOMMatrixReadOnly(
        getComputedStyle(document.querySelector(".reader-progress")!).transform,
      ).a;
      click(".reader-toolbar button");
      await wait(75);
      const duringExit = Boolean(document.querySelector("dialog"));
      await wait(650);
      const closed = !document.querySelector("dialog");
      const keptViewport = beforeReader === viewport();
      click(".view-switch button:nth-child(2)");
      await wait(650);
      const indexWorks =
        document.querySelectorAll(".index-project").length === 6 &&
        document.querySelector<HTMLElement>(".canvas-container")!.inert &&
        scrollY === 0;
      const details = document.querySelector<HTMLDetailsElement>(".index-project-content")!;
      const summary = details.querySelector<HTMLElement>("summary")!;
      const indexHash = location.hash;
      const startsCollapsed = !details.open;
      summary.click();
      const indexExpanded = startsCollapsed && details.open &&
        details.querySelector<HTMLElement>(".index-visual")!.getBoundingClientRect().height > 0 &&
        location.hash === indexHash;
      summary.click();
      const indexCollapsed = !details.open && location.hash === indexHash;
      const indexTitles = [
        ...document.querySelectorAll(".index-page > section > h2"),
      ].map((heading) => heading.textContent?.trim());
      const indexOrder = [
        ...document.querySelectorAll(".index-page > section"),
      ].map((section) => section.id);
      let indexTracksSections = true;
      const trackingStates: {
        expected: string;
        active: string | undefined;
        y: number;
      }[] = [];
      for (const id of ["work", "writing"]) {
        const section = document.getElementById(`index-${id}`)!;
        const line = parseFloat(getComputedStyle(section).scrollMarginTop);
        scrollTo({
          top: scrollY + section.getBoundingClientRect().top - line + 5,
          behavior: "instant",
        });
        await wait(150);
        trackingStates.push({
          expected: id,
          active: document
            .querySelector(".region-navigation [aria-current]")
            ?.textContent?.trim(),
          y: scrollY,
        });
        indexTracksSections &&=
          document
            .querySelector('.region-navigation [aria-current="location"]')
            ?.textContent?.trim()
            .toLowerCase() === id;
      }
      let indexTabsStayActive = true;
      for (const label of ["Work", "Writing", "About"]) {
        const states: string[] = [];
        const observer = new MutationObserver(() => {
          const active = document
            .querySelector('.region-navigation [aria-current="location"]')
            ?.textContent?.trim();
          if (active && active !== states.at(-1)) states.push(active);
        });
        observer.observe(document.querySelector(".region-navigation")!, {
          subtree: true,
          attributes: true,
          childList: true,
        });
        [
          ...document.querySelectorAll<HTMLButtonElement>(
            ".region-navigation button",
          ),
        ]
          .find((button) => button.textContent?.trim() === label)!
          .click();
        await wait(40);
        indexTabsStayActive &&=
          document
            .querySelector('.region-navigation [aria-current="location"]')
            ?.textContent?.trim() === label;
        await wait(1500);
        observer.disconnect();
        indexTabsStayActive &&= states.every((active) => active === label);
        indexTabsStayActive &&=
          document
            .querySelector('.region-navigation [aria-current="location"]')
            ?.textContent?.trim() === label;
      }
      scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      });
      await wait(150);
      indexTabsStayActive &&=
        document
          .querySelector('.region-navigation [aria-current="location"]')
          ?.textContent?.trim() === "About";
      // New clicks replace an in-flight destination; user scrolling releases it.
      const tab = (label: string) =>
        [
          ...document.querySelectorAll<HTMLButtonElement>(
            ".region-navigation button",
          ),
        ].find((button) => button.textContent?.trim() === label)!;
      tab("Projects").click();
      await wait(80);
      tab("Writing").click();
      await wait(80);
      tab("About").click();
      await wait(40);
      indexTabsStayActive &&=
        tab("About").getAttribute("aria-current") === "location";
      await wait(1500);
      tab("Projects").click();
      await wait(80);
      dispatchEvent(new WheelEvent("wheel"));
      scrollTo({ top: scrollY, behavior: "instant" });
      document
        .getElementById("index-work")!
        .scrollIntoView({ behavior: "instant" });
      // Scroll into the section, away from the subpixel alignment boundary.
      scrollBy({ top: 5, behavior: "instant" });
      await wait(150);
      trackingStates.push({
        expected: "Work after interruption",
        active: document
          .querySelector(".region-navigation [aria-current]")
          ?.textContent?.trim(),
        y: scrollY,
      });
      indexTracksSections &&=
        tab("Work").getAttribute("aria-current") === "location";
      let returnsToIndex = true;
      let keptIndexScroll = true;
      for (const hash of ["#index", "#index/writing"]) {
        location.hash = hash;
        await wait(650);
        for (const dismiss of ["button", "escape", "back"]) {
          const link = document.querySelector<HTMLElement>('.index-article[href="#read/tui-lib-from-scratch-1"]')!;
          link.scrollIntoView({ block: "center", behavior: "instant" });
          scrollBy({ top: 37, behavior: "instant" });
          link.focus({ preventScroll: true });
          await wait(100);
          const before = scrollY;
          link.click();
          await wait(600);
          keptIndexScroll &&=
            before > 0 &&
            scrollY === before &&
            Boolean(document.querySelector(".index-page"));
          document.querySelector<HTMLDialogElement>("dialog")!.scrollTop = 300;
          if (dismiss === "back") {
            click(".reader-pager .next");
            await wait(600);
            history.back();
          } else if (dismiss === "escape") {
            document
              .querySelector("dialog")!
              .dispatchEvent(new Event("cancel", { cancelable: true }));
          } else click(".reader-toolbar button");
          await wait(650);
          returnsToIndex &&=
            location.hash === hash &&
            Boolean(document.querySelector(".index-page")) &&
            !document.querySelector("dialog");
          keptIndexScroll &&= scrollY === before;
        }
      }
      click(".view-switch button:first-child");
      await wait(650);
      click(".help-button");
      await wait(600);
      const helpWorks = Boolean(document.querySelector(".keyboard-help"));
      click(".help-button");
      await wait(650);
      return {
        reduced,
        initialOverlap,
        senmeiBefore,
        movement,
        finalMove,
        reflowed,
        expandedOverlap,
        settledCamera,
        finalCamera,
        selected,
        rapidOverlap,
        dimmed,
        pinned,
        cleared,
        opened,
        duplicateTitle,
        progress,
        duringExit,
        closed,
        keptViewport,
        indexWorks,
        indexExpanded,
        indexCollapsed,
        indexOrder,
        indexTitles,
        indexTracksSections,
        trackingStates,
        indexTabsStayActive,
        returnsToIndex,
        keptIndexScroll,
        helpWorks,
        runningAnimations: document
          .getAnimations()
          .filter((a) => a.playState === "running").length,
      };
    });
    assert.equal(results.reduced, reduce);
    assert(
      !results.initialOverlap &&
        !results.expandedOverlap &&
        !results.rapidOverlap,
      "cards must never overlap",
    );
    assert(results.reflowed, "cards below an expanded card move down with it");
    assert(results.finalMove > results.senmeiBefore);
    if (reduce) assert(results.movement.every((y) => y === results.senmeiBefore || y === results.finalMove));
    else
      assert(
        results.movement.some((y) => y > results.senmeiBefore && y < results.finalMove),
        `neighbors move through intermediate positions: ${JSON.stringify(results.movement)}`,
      );
    assert.equal(
      results.settledCamera,
      results.finalCamera,
      "camera must not start a second movement after expansion",
    );
    assert.deepEqual(results.selected, ["letui"]);
    assert.equal(results.dimmed, 4, "Rust highlights LeTUI and this website");
    assert(results.pinned && results.cleared);
    assert(results.opened && results.closed && results.keptViewport);
    assert.equal(results.duplicateTitle, false);
    assert.equal(results.duringExit, !reduce);
    assert(Math.abs(results.progress - 1) < 0.001, "reader progress reaches the end within animation precision");
    assert(results.indexWorks && results.returnsToIndex && results.helpWorks,
      JSON.stringify({indexWorks:results.indexWorks,returnsToIndex:results.returnsToIndex,helpWorks:results.helpWorks}));
    assert(results.indexExpanded && results.indexCollapsed, "Index projects expand and collapse in place");
    assert.deepEqual(
      await evaluate(() =>
        [...document.querySelectorAll(".index-page > section > h2")].map(
          (heading) => heading.textContent?.trim(),
        ),
      ),
      [],
      "index is unmounted on return to map",
    );
    assert.deepEqual(
      await evaluate(() =>
        [...document.querySelectorAll(".zone-label")].map((heading) =>
          heading.textContent?.trim(),
        ),
      ),
      ["Projects", "Writing", "Work", "About"],
    );
    assert.equal(
      await evaluate(
        () =>
          document.querySelectorAll(
            ".project-tile .tile-index, .article-number",
          ).length,
      ),
      0,
    );
    assert.deepEqual(results.indexTitles, [
      "Projects",
      "Work",
      "Writing",
      "About",
    ]);
    assert.deepEqual(results.indexOrder, [
      "index-projects",
      "index-work",
      "index-writing",
      "index-about",
    ]);
    assert(
      results.indexTracksSections,
      `active tab follows index section order: ${JSON.stringify(results.trackingStates)}`,
    );
    assert(
      results.indexTabsStayActive,
      "clicked index tabs stay active after scrolling",
    );
    assert(
      results.keptIndexScroll,
      "opening and closing posts preserves index scroll",
    );
    assert.equal(results.runningAnimations, 0);
    // Trusted mouse input catches pointerdown/hover races that element.click() misses.
    const mouseClick = async (selector: string) => {
      const point = await evaluate(
        new Function(
          `const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };`,
        ) as () => { x: number; y: number },
      );
      await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
      await cdp("Input.dispatchMouseEvent", {
        type: "mousePressed",
        button: "left",
        clickCount: 1,
        ...point,
      });
      await cdp("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        button: "left",
        clickCount: 1,
        ...point,
      });
    };
    for (const view of ["index", "map"]) {
      await mouseClick(
        view === "index"
          ? ".view-switch button:nth-child(2)"
          : ".view-switch button:first-child",
      );
      await Bun.sleep(650);
      await evaluate(() => {
        const nav = document.querySelector(".region-navigation")!;
        const indicator = nav.querySelector(".section-indicator")!;
        const state = {
          latest: nav.querySelector("[aria-current]")!.textContent!.trim(),
          wrong: [] as string[],
          stable: true,
          maxJump: 0,
        };
        let beforeClick: number | undefined;
        const clicked = (event: Event) => {
          const button = (event.target as Element).closest("button");
          if (button) {
            state.latest = button.textContent!.trim();
            beforeClick = indicator.getBoundingClientRect().left;
          }
        };
        nav.addEventListener("click", clicked, true);
        const observer = new MutationObserver(() => {
          const active = nav
            .querySelector("[aria-current]")!
            .textContent!.trim();
          if (active !== state.latest) state.wrong.push(active);
          state.stable &&=
            indicator.isConnected &&
            nav.querySelector(".section-indicator") === indicator;
          if (beforeClick !== undefined) {
            state.maxJump = Math.max(
              state.maxJump,
              Math.abs(indicator.getBoundingClientRect().left - beforeClick),
            );
            beforeClick = undefined;
          }
        });
        observer.observe(nav, {
          subtree: true,
          attributes: true,
          childList: true,
        });
        (window as any).navCheck = {
          state,
          stop: () => {
            observer.disconnect();
            nav.removeEventListener("click", clicked, true);
          },
        };
      });
      for (const tab of [1, 4, 2, 1, 3, 4, 2, 4]) {
        await mouseClick(`.region-navigation button:nth-child(${tab})`);
        await Bun.sleep(50);
      }
      await Bun.sleep(1500);
      const rapidNavigation = await evaluate(() => {
        const check = (window as any).navCheck;
        check.stop();
        delete (window as any).navCheck;
        const active = document.querySelector(
          '.region-navigation [aria-current="location"]',
        )!;
        const target = active.getBoundingClientRect();
        const border = document
          .querySelector(".section-indicator")!
          .getBoundingClientRect();
        return {
          ...check.state,
          active: active.textContent!.trim(),
          error: Math.max(
            Math.abs(target.left - border.left),
            Math.abs(target.top - border.top),
            Math.abs(target.width - border.width),
            Math.abs(target.height - border.height),
          ),
        };
      });
      assert.deepEqual(
        rapidNavigation.wrong,
        [],
        "rapid clicks never select intermediate scroll sections",
      );
      assert(rapidNavigation.stable, "one border survives every navigation");
      assert.equal(rapidNavigation.active, "About");
      assert(rapidNavigation.error < 0.5, JSON.stringify(rapidNavigation));
      if (!reduce)
        assert(rapidNavigation.maxJump < 5, JSON.stringify(rapidNavigation));
    }
    await mouseClick(".view-switch button:first-child");
    await Bun.sleep(650);
    const navigation = await evaluate(async () => {
      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const click = (selector: string) =>
        document.querySelector<HTMLElement>(selector)!.click();
      click(".region-navigation button:nth-child(2)");
      await wait(650);
      const writing =
        location.hash === "#map/writing" &&
        document.querySelectorAll('[data-card="writing"] .article-link')
          .length > 0 &&
        !document.querySelector(".canvas-directory");
      const viewport = document.querySelector<HTMLElement>(
        ".react-flow__viewport",
      )!.style.transform;
      click('[data-card="writing"] .article-link');
      await wait(600);
      history.back();
      await wait(650);
      const returnedToWriting =
        location.hash === "#map/writing" &&
        !document.querySelector("dialog") &&
        viewport ===
          document.querySelector<HTMLElement>(".react-flow__viewport")!.style
            .transform;
      click(".region-navigation button:nth-child(3)");
      await wait(950);
      const work = location.hash;
      click(".region-navigation button:nth-child(4)");
      await wait(950);
      history.back();
      await wait(950);
      const backWorks =
        location.hash === work &&
        document
          .querySelector(".region-navigation [aria-current]")
          ?.textContent?.includes("Work");
      click(".view-switch button:first-child");
      await wait(650);
      const mapWorks = location.hash.startsWith("#map");
      click(".region-navigation button:first-child");
      await wait(650);
      click('[data-card="frixaco.com"] .card-toggle');
      await wait(650);
      const website =
        document
          .querySelector('[data-card="frixaco.com"] .card-toggle')
          ?.getAttribute("aria-expanded") === "true";
      click(".view-switch button:nth-child(2)");
      await wait(650);
      [...document.querySelectorAll(".index-project")]
        .find((item) =>
          item.querySelector("h3")?.textContent?.includes("Xport"),
        )!
        .querySelector<HTMLElement>(".index-actions button")!
        .click();
      await wait(700);
      const rect = document
        .querySelector('[data-card="xport"]')!
        .getBoundingClientRect();
      const indexToProject =
        location.hash === "#map" &&
        document
          .querySelector('[data-card="xport"] .card-toggle')
          ?.getAttribute("aria-expanded") === "true" &&
        rect.top >
          document.querySelector(".site-header")!.getBoundingClientRect()
            .bottom &&
        rect.left >= 15 &&
        rect.right < innerWidth;
      return {
        writing,
        returnedToWriting,
        work,
        backWorks,
        mapWorks,
        website,
        indexToProject,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert(
      navigation.writing &&
        navigation.returnedToWriting &&
        navigation.backWorks &&
        navigation.mapWorks &&
        navigation.website &&
        navigation.indexToProject,
      JSON.stringify(navigation),
    );
    assert.equal(navigation.work, "#map/work");
    assert.equal(navigation.overflow, false);
    console.log(
      `${mobile ? "mobile" : "desktop"}${reduce ? " / reduced motion" : ""}: passed`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await cdp("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Control",
    code: "ControlLeft",
    windowsVirtualKeyCode: 17,
    modifiers: 0,
  });
  await cdp("Emulation.clearDeviceMetricsOverride");
  socket.close();
  await fetch(`${debug}/json/close/${page.id}`);
}
