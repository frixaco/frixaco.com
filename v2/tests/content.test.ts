import { expect, test } from "bun:test";
import {
  formatDuration,
  monthsBetween,
  parseAbout,
  parseLinks,
  parseRoles,
  renderArticle,
  renderMarkdown,
  splitFrontmatter,
} from "../src/markdown";
import { organizePosts } from "../src/posts";
import {
  CARD_WIDTH,
  MAX_ROWS,
  TILE_ORDER,
  ZONE_PAD,
  frameViewport,
  projectRows,
  rowOf,
  layoutMap,
  readHash,
  revealViewport,
  zoneAt,
  type Box,
  type LayoutMode,
} from "../src/graph";
import { staticHandler } from "../server";

test("real posts retain code and metadata without rendering YAML", async () => {
  for await (const path of new Bun.Glob("src/sheets/posts/*.md").scan({
    cwd: "..",
  })) {
    const source = await Bun.file(`../${path}`).text();
    const { metadata, body } = splitFrontmatter(source);
    expect(metadata.title).toStartWith("Building a TUI");
    expect(metadata.date).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(body).not.toStartWith("---");
    expect(renderMarkdown(source)).toContain("<pre><code");
    expect(renderMarkdown(source)).not.toContain('date: "');
  }
  expect(
    splitFrontmatter('---\r\ntitle: "A: B"\r\n---\r\nText').metadata.title,
  ).toBe("A: B");
  expect(splitFrontmatter("No metadata").body).toBe("No metadata");
});

test("the reader drops a leading heading that would repeat the title", async () => {
  const source = await Bun.file(
    "../src/sheets/posts/tui-lib-from-scratch-2.md",
  ).text();
  expect(renderMarkdown(source)).toContain("[devlog]");
  expect(renderArticle(source)).not.toContain("[devlog]");
  expect(renderArticle("---\ntitle: x\n---\nPlain start")).toContain(
    "<p>Plain start</p>",
  );
});

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;
const widthOf = (id: string, mode: LayoutMode) =>
  CARD_WIDTH[mode][
    id.startsWith("detail-")
      ? "detail"
      : id === "writing" || id === "work" || id === "about"
        ? id
        : "tile"
  ];

test("layout never overlaps, whichever row unfolds", () => {
  for (const mode of ["wide", "narrow"] as const) {
    const rows = projectRows(mode);
    for (const open of [null, ...rows.keys()]) {
      const heights: Record<string, number> = {
        work: 1000,
        about: 1100,
        writing: 450,
      };
      for (const id of TILE_ORDER) heights[id] = 232;
      for (let r = 0; r < MAX_ROWS; r++) heights[`detail-${r}`] = 1;
      if (open !== null) heights[`detail-${open}`] = 520;
      const layout = layoutMap(heights, mode);
      const boxes = Object.entries(layout.positions)
        .filter(([id]) => (heights[id] ?? 0) > 1)
        .map(([id, p]) => ({
          id,
          ...p,
          width: widthOf(id, mode),
          height: heights[id],
        }));
      for (const a of boxes)
        for (const b of boxes) if (a !== b) expect(overlaps(a, b)).toBe(false);
      const zones = Object.values(layout.zones);
      for (const a of zones)
        for (const b of zones) if (a !== b) expect(overlaps(a, b)).toBe(false);
      for (const box of boxes) {
        const zone = zones.find((z) => overlaps(z, box))!;
        expect(box.x + box.width).toBeLessThanOrEqual(zone.x + zone.width);
        expect(box.y + box.height).toBeLessThanOrEqual(zone.y + zone.height);
      }
    }
  }
});

test("an open project unfolds a full-width spread that pushes only later rows", () => {
  const closed = layoutMap({ "detail-0": 1, "detail-1": 1 }, "wide");
  const open = layoutMap({ "detail-0": 500, "detail-1": 1 }, "wide");
  for (const id of projectRows("wide")[0])
    expect(open.positions[id]).toEqual(closed.positions[id]);
  for (const id of projectRows("wide")[1])
    expect(open.positions[id].y).toBe(closed.positions[id].y + 500 + 28);
  // The spread spans the whole grid, so no column is left ragged.
  expect(CARD_WIDTH.wide.detail + 2 * ZONE_PAD).toBe(open.zones.projects.width);
  expect(open.zones.projects.height).toBe(closed.zones.projects.height + 528);
  // Tiles in a row share one top edge.
  const tops = projectRows("wide").map(
    (row) => new Set(row.map((id) => closed.positions[id].y)),
  );
  for (const top of tops) expect(top.size).toBe(1);
});

test("About sits left of Projects, Work, and Writing on wide screens", () => {
  const { zones } = layoutMap({}, "wide");
  expect(zones.about.x).toBe(0);
  expect(zones.projects.x).toBeGreaterThan(zones.about.width);
  expect(zones.projects.y).toBe(zones.about.y);
  expect(zones.work.x).toBe(zones.projects.x);
  expect(zones.work.width).toBe(zones.projects.width);
  expect(zones.writing.x).toBe(zones.projects.x);
  expect(zones.writing.width).toBe(zones.projects.width);
  expect(zones.work.y).toBeGreaterThan(zones.projects.y + zones.projects.height);
  expect(zones.writing.y).toBeGreaterThan(zones.work.y + zones.work.height);
  expect(rowOf("letui", "wide")).toBe(0);
  expect(rowOf("frixaco.com", "narrow")).toBe(TILE_ORDER.length - 1);
  expect(TILE_ORDER).not.toContain("github");
  const narrow = layoutMap({}, "narrow").zones;
  expect([narrow.about.y, narrow.projects.y, narrow.work.y, narrow.writing.y])
    .toEqual([narrow.about.y, narrow.projects.y, narrow.work.y, narrow.writing.y].sort((a, b) => a - b));
});

test("posts group into series and standalone lists, tied to projects", () => {
  const post = (id: string, date: string, extra = {}) => ({
    id,
    title: id,
    date,
    html: "",
    ...extra,
  });
  const { groups, posts } = organizePosts([
    post("b", "2026-01-02", { series: "Build log", project: "letui" }),
    post("note", "2026-03-01"),
    post("a", "2025-12-01", {
      series: "Build log",
      project: "letui",
      subtitle: "First",
    }),
    post("gpu", "2026-02-01", { project: "senmei" }),
  ]);
  expect(groups.map((group) => group.id)).toEqual([
    "posts",
    "series-build-log",
  ]);
  const series = groups[1];
  expect(series.project).toBe("letui");
  expect(series.posts.map((p) => [p.id, p.part, p.parts, p.label])).toEqual([
    ["a", 1, 2, "First"],
    ["b", 2, 2, "b"],
  ]);
  // Standalone posts read newest first and keep their own project link.
  expect(groups[0].posts.map((p) => [p.id, p.project])).toEqual([
    ["note", undefined],
    ["gpu", "senmei"],
  ]);
  expect(posts).toHaveLength(4);
  expect(organizePosts([]).groups).toEqual([]);
});

test("real posts declare their project and series", async () => {
  for await (const path of new Bun.Glob("src/sheets/posts/*.md").scan({
    cwd: "..",
  })) {
    const { metadata } = splitFrontmatter(await Bun.file(`../${path}`).text());
    expect(metadata.project).toBe("letui");
    expect(metadata.series).toBeTruthy();
  }
});

test("work.md becomes a timeline of roles", async () => {
  const roles = parseRoles(await Bun.file("../src/sheets/work.md").text());
  expect(roles.map((role) => role.name)).toEqual([
    "VBRATO, Ekko",
    "GeoAlert",
    "Livereach",
    "Moishlem",
    "Hitide",
  ]);
  expect(roles[0].end).toBeNull();
  expect(roles[0].nameHtml).toContain('href="https://vbrato.com"');
  expect(roles[4].start).toEqual({ year: 2020, month: 11 });
  for (const role of roles) expect(role.summaryHtml.length).toBeGreaterThan(40);
  expect(
    formatDuration(
      monthsBetween({ year: 2020, month: 7 }, { year: 2021, month: 9 }),
    ),
  ).toBe("1 yr 3 mo");
  expect(parseRoles("no roles here")).toEqual([]);
});

test("the about sheets become themed groups without dropping lines", async () => {
  const source =
    (await Bun.file("../src/sheets/home.md").text()) +
    "\n" +
    (await Bun.file("../src/sheets/more.md").text());
  const about = parseAbout(source);
  expect(about.facts.length).toBeGreaterThan(0);
  expect(about.learning.map((item) => [item.subject, item.paused])).toEqual([
    ["Blender", false],
    ["Make music", false],
    ["Japanese", true],
  ]);
  expect(about.watching?.stat).toBe("272+");
  expect(about.playing).toContain("Sekiro");
  expect(about.setup).toContain("dotfiles");
  // Unknown bullets are kept as plain facts.
  expect(parseAbout("- something new").facts).toEqual(["something new"]);
  expect(parseLinks("[a](https://a.dev) · [b](mailto:b@c.d)")).toEqual([
    { label: "a", href: "https://a.dev" },
    { label: "b", href: "mailto:b@c.d" },
  ]);
});

test("the section under the screen center is detected", () => {
  const { zones } = layoutMap({}, "wide");
  for (const [id, zone] of Object.entries(zones))
    expect(zoneAt(zones, { x: zone.x + 10, y: zone.y + 50 })).toBe(id as keyof typeof zones);
  expect(
    zoneAt(zones, { x: zones.about.x - 5000, y: zones.about.y + 50 }),
  ).toBe("about");
});

test("framing centers content and top-aligns content taller than the screen", () => {
  const screen = { x: 30, y: 160, width: 1400, height: 600 };
  const fit = frameViewport({ x: 0, y: 0, width: 700, height: 300 }, screen);
  expect(fit.zoom).toBe(1);
  expect(fit.x + 350).toBe(screen.x + screen.width / 2);
  expect(fit.y + 150).toBe(screen.y + screen.height / 2);
  const all = frameViewport({ x: 0, y: 0, width: 2800, height: 2400 }, screen);
  expect(all.zoom).toBe(0.7);
  const tall = frameViewport(
    { x: 100, y: 1000, width: 700, height: 1400 },
    screen,
    { tall: "top" },
  );
  expect(tall.zoom).toBe(1);
  expect(tall.y + 1000 * tall.zoom).toBe(screen.y);
});

test("reader links handle direct navigation and malformed URLs", () => {
  expect(readHash("#index")).toEqual({ view: "index", article: null });
  expect(readHash("#read/tui-lib-from-scratch-3").article).toBe(
    "tui-lib-from-scratch-3",
  );
  expect(readHash("#read/%E0%A4%A").article).toBe("__invalid__");
  expect(readHash("#unknown")).toEqual({ view: "map", article: null });
  expect(readHash("#map/writing")).toEqual({
    view: "map",
    article: null,
    section: "writing",
  });
  expect(readHash("#index/work")).toEqual({
    view: "index",
    article: null,
    section: "work",
  });
  expect(readHash("#map/unknown")).toEqual({ view: "map", article: null });
});

test("project framing preserves the view unless the expanded bounds need room", () => {
  const screen = { x: 20, y: 120, width: 960, height: 600 };
  const view = { x: 0, y: 0, zoom: 1 };
  expect(
    revealViewport({ x: 100, y: 200, width: 500, height: 400 }, view, screen),
  ).toEqual(view);
  expect(
    revealViewport({ x: 600, y: 200, width: 500, height: 400 }, view, screen),
  ).toEqual({ x: -120, y: 0, zoom: 1 });
  const large = { x: 100, y: 200, width: 1200, height: 800 };
  const fitted = revealViewport(large, view, screen);
  expect(fitted.zoom).toBe(0.75);
  expect(large.x * fitted.zoom + fitted.x).toBeGreaterThanOrEqual(screen.x);
  expect((large.x + large.width) * fitted.zoom + fitted.x).toBeLessThanOrEqual(
    screen.x + screen.width,
  );
  expect(large.y * fitted.zoom + fitted.y).toBe(screen.y);
  expect((large.y + large.height) * fitted.zoom + fitted.y).toBe(
    screen.y + screen.height,
  );
});

test("production server only serves its allowlisted assets with appropriate caching", async () => {
  const file = Bun.file("index.html");
  const serve = staticHandler(
    new Map([
      ["/index.html", file],
      ["/assets/test.html", file],
    ]),
  );
  expect(await serve(new Request("http://local/")).text()).toContain(
    "<!doctype html>",
  );
  expect(serve(new Request("http://local/")).headers.get("cache-control")).toBe(
    "no-cache",
  );
  expect(
    serve(new Request("http://local/assets/test.html")).headers.get(
      "cache-control",
    ),
  ).toContain("immutable");
  const head = serve(new Request("http://local/", { method: "HEAD" }));
  expect(await head.text()).toBe("");
  expect(head.headers.get("content-length")).toBe(String(file.size));
  expect(serve(new Request("http://local/%2e%2e%2fpackage.json")).status).toBe(
    404,
  );
  expect(serve(new Request("http://local/%E0%A4%A")).status).toBe(400);
  expect(serve(new Request("http://local/missing.js")).status).toBe(404);
  expect(serve(new Request("http://local/", { method: "POST" })).status).toBe(
    405,
  );
});
