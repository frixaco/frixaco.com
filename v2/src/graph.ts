export const SECTIONS = [
  { id: "projects", label: "Projects" },
  { id: "writing", label: "Writing" },
  { id: "work", label: "Work" },
  { id: "about", label: "About" },
] as const;
export type Section = (typeof SECTIONS)[number]["id"];
export type LayoutMode = "wide" | "narrow";
export type Box = { x: number; y: number; width: number; height: number };
export type Viewport = { x: number; y: number; zoom: number };
export const MIN_ZOOM = 0.7;
export const MOBILE_MIN_ZOOM = 0.875;

// Zone chrome, in canvas units.
export const ZONE_PAD = 14;
export const ZONE_HEADER = 62;
export const CARD_GAP = 28;
const ZONE_GAP: Record<LayoutMode, number> = { wide: 64, narrow: 48 };
const FALLBACK_HEIGHT = 230;

// Tiles fill the Projects grid in reading order.
export const TILE_ORDER = [
  "letui",
  "xport",
  "senmei",
  "inza",
  "harness-bench",
  "frixaco.com",
];
export const COLUMNS: Record<LayoutMode, number> = { wide: 3, narrow: 1 };
const TILE_WIDTH: Record<LayoutMode, number> = { wide: 380, narrow: 340 };
const gridWidth = (mode: LayoutMode) =>
  COLUMNS[mode] * TILE_WIDTH[mode] + (COLUMNS[mode] - 1) * CARD_GAP;
// About occupies the left column; Projects, Work, and Writing share the right.
const SIDE_WIDTH = 504;
export const CARD_WIDTH: Record<LayoutMode, Record<string, number>> = {
  wide: {
    tile: TILE_WIDTH.wide,
    detail: gridWidth("wide"),
    writing: gridWidth("wide"),
    work: gridWidth("wide"),
    about: SIDE_WIDTH,
  },
  narrow: {
    tile: TILE_WIDTH.narrow,
    detail: TILE_WIDTH.narrow,
    writing: TILE_WIDTH.narrow,
    work: TILE_WIDTH.narrow,
    about: TILE_WIDTH.narrow,
  },
};
// Enough detail slots for the narrowest layout (one tile per row).
export const MAX_ROWS = TILE_ORDER.length;

export function projectRows(mode: LayoutMode) {
  const rows: string[][] = [];
  for (let i = 0; i < TILE_ORDER.length; i += COLUMNS[mode])
    rows.push(TILE_ORDER.slice(i, i + COLUMNS[mode]));
  return rows;
}
export const rowOf = (id: string, mode: LayoutMode) =>
  projectRows(mode).findIndex((row) => row.includes(id));

/**
 * Positions every card from its measured height. Tiles form uniform rows;
 * an opened project unfolds a full-width detail slot (`detail-<row>`) under
 * its row and the rows below slide down with it. Zones grow to fit, so
 * nothing ever overlaps and no position is special-cased.
 */
export function layoutMap(
  heights: Record<string, number | undefined>,
  mode: LayoutMode,
) {
  const width = CARD_WIDTH[mode];
  const gap = ZONE_GAP[mode];
  const height = (id: string) => heights[id] ?? FALLBACK_HEIGHT;
  const positions: Record<string, { x: number; y: number }> = {};
  const zones = {} as Record<Section, Box>;

  let y = ZONE_HEADER;
  projectRows(mode).forEach((row, r) => {
    if (r) y += CARD_GAP;
    row.forEach((id, c) => {
      positions[id] = { x: ZONE_PAD + c * (width.tile + CARD_GAP), y };
    });
    y += Math.max(...row.map(height));
    // A closed slot keeps a 1px floor (so the canvas can measure it) and
    // counts as empty; its gap grows in with it so rows glide.
    const measured = heights[`detail-${r}`] ?? 0;
    const detail = measured > 1 ? measured : 0;
    y += Math.min(detail, CARD_GAP);
    positions[`detail-${r}`] = { x: ZONE_PAD, y };
    y += detail;
  });
  zones.projects = {
    x: 0,
    y: 0,
    width: ZONE_PAD * 2 + width.detail,
    height: y + ZONE_PAD,
  };

  const single = (id: Section, x: number, top: number) => {
    positions[id] = { x: x + ZONE_PAD, y: top + ZONE_HEADER };
    zones[id] = {
      x,
      y: top,
      width: width[id] + ZONE_PAD * 2,
      height: ZONE_HEADER + height(id) + ZONE_PAD,
    };
    return zones[id];
  };
  const bottom = (box: Box) => box.y + box.height;

  const about = single("about", 0, 0);
  const projectX = mode === "wide" ? about.width + gap : 0;
  const projectY = mode === "wide" ? 0 : bottom(about) + gap;
  for (const [id, position] of Object.entries(positions)) {
    if (id === "about") continue;
    position.x += projectX;
    position.y += projectY;
  }
  zones.projects.x = projectX;
  zones.projects.y = projectY;
  const work = single("work", projectX, bottom(zones.projects) + gap);
  single("writing", projectX, bottom(work) + gap);
  return { positions, zones };
}

export function unionBox(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
  };
}

/**
 * Centers bounds in the unobstructed screen area. Content taller than the
 * screen is fitted to width and aligned to its top so it reads from the start.
 */
export function frameViewport(
  bounds: Box,
  screen: Box,
  { maxZoom = 1, minZoom = MIN_ZOOM, tall = "fit" as "fit" | "top" } = {},
): Viewport {
  const byWidth = screen.width / bounds.width;
  const byHeight = screen.height / bounds.height;
  const top = tall === "top" && byHeight < Math.min(maxZoom, byWidth);
  const zoom = Math.max(
    minZoom,
    Math.min(maxZoom, byWidth, top ? Infinity : byHeight),
  );
  return {
    zoom,
    x: screen.x + (screen.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: top
      ? screen.y - bounds.y * zoom
      : screen.y + (screen.height - bounds.height * zoom) / 2 - bounds.y * zoom,
  };
}

// Keep the expanded project inside the unobstructed screen area with minimal travel.
export function revealViewport(
  bounds: Box,
  viewport: Viewport,
  screen: Box,
): Viewport {
  const zoom = Math.max(
    MIN_ZOOM,
    Math.min(viewport.zoom, screen.width / bounds.width, screen.height / bounds.height),
  );
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));
  return {
    zoom,
    x: clamp(
      viewport.x + bounds.x * (viewport.zoom - zoom),
      screen.x - bounds.x * zoom,
      screen.x + screen.width - (bounds.x + bounds.width) * zoom,
    ),
    y: clamp(
      viewport.y + bounds.y * (viewport.zoom - zoom),
      screen.y - bounds.y * zoom,
      screen.y + screen.height - (bounds.y + bounds.height) * zoom,
    ),
  };
}

// The zone whose area contains a canvas point, else the nearest one.
export function zoneAt(
  zones: Partial<Record<Section, Box>>,
  point: { x: number; y: number },
): Section {
  let best: Section = "projects";
  let bestDistance = Infinity;
  for (const [id, box] of Object.entries(zones) as [Section, Box][]) {
    const distance = Math.hypot(
      Math.max(box.x - point.x, 0, point.x - box.x - box.width),
      Math.max(box.y - point.y, 0, point.y - box.y - box.height),
    );
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
}

export function readHash(hash: string): {
  view: "map" | "index";
  article: string | null;
  section?: Section;
} {
  const raw = hash.replace(/^#/, "");
  if (raw.startsWith("read/")) {
    try {
      return { view: "map", article: decodeURIComponent(raw.slice(5)) };
    } catch {
      return { view: "map", article: "__invalid__" };
    }
  }
  const [view, section] = raw.split("/");
  const destination = SECTIONS.find((item) => item.id === section);
  return {
    view: view === "index" ? "index" : "map",
    article: null,
    ...(destination && (view === "map" || view === "index")
      ? { section: destination.id }
      : {}),
  };
}
