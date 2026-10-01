# Portfolio canvas

React + TypeScript, Vite, Bun, and plain CSS. React Flow handles the canvas; Motion handles expanding previews, coordinated node movement, connector reveals, navigation, and reader transitions. The original Rust application remains independently runnable.

## Run

```sh
cd v2
bun install --frozen-lockfile
bun run dev
```

Open http://127.0.0.1:5173. For production:

```sh
bun run build
bun start
```

The production server serves `dist/` on `0.0.0.0:8080`. Override with `PORT` and `HOST`, for example `PORT=8081 HOST=127.0.0.1 bun start`. It caches fingerprinted assets for a year and revalidates HTML. The build is also deployable to a static host; article and view navigation use URL fragments and need no rewrite rules.

## Railway

Deployed separately as `frixaco-v2` / `portfolio-v2` at https://v2.frixaco.com. Railway uses `v2/Dockerfile` with the repository root as its build context, so the shared Markdown and résumé are available. The service healthcheck is `/`.

Deploy the current checkout from the repository root:

```sh
railway up --detach --project 6db9bf14-7391-44c2-8b22-63fad9f8bf30 --service 3c221b70-94ff-4e06-b7a2-442a85a8a540 --environment production
railway status --project 6db9bf14-7391-44c2-8b22-63fad9f8bf30 --environment production
```

## Interactions

- The map places About on the left, with Projects, Work, and Writing stacked on the right. On phones they form one column in that order.
- Drag or scroll to move; pinch (or Ctrl + scroll) to zoom. The minimap also supports navigation.
- Small text is at least 16px in the UI. Map text is 20px on desktop and 16px on phones; zoom stops at 70% and 87.5% respectively to keep text at least 14px on screen.
- Projects are uniform tiles. Opening one unfolds a full-width spread beneath its row — media (or an animated "how it works" diagram when there is none), description, stack, links, and every post about that project. Later rows slide down; nothing overlaps.
- Technologies used by more than one project are buttons with a count. Hover to highlight every project built with it; click to pin the highlight (Escape or × clears it).
- Writing lists every series and standalone post in a scrollable map card. “All posts” in an expanded project moves to its writing on the map. Project badges link to projects; hovering a post outlines its project tile.
- Work is a timeline of roles with durations; hovering a bar or role highlights its pair. About is a profile built from the bio bullets.
- Numbered destinations have direct links (`#map/writing`, `#index/work`) and Back support. Section navigation stays in the selected view on every screen size.
- The reader moves between parts of a series (or between standalone posts) without adding history; Back closes it and keeps the camera.
- Index is a conventional, keyboard-accessible page with the same content, including expandable projects, the timeline, and profile.
- Arrow keys pan; `+` / `-` zoom; `0` / Home returns to projects; `F` fits everything; `I` switches Map/Index; Escape closes; `?` shows help. Reduced motion is respected.

## Edit

- `src/content.ts`: project summaries, stacks, flow steps, and optional `media: [{ type: "image" | "video", src, alt, poster? }]`. Put files in `public/projects/` and reference them as `/projects/<file>`.
- Posts in `../src/sheets/posts/` take optional frontmatter: `project` (a project id — links the post both ways), `series` (posts sharing it are grouped and numbered by date), and `subtitle` (short label for lists). Posts without them appear as standalone writing.
- `../src/sheets/work.md` entries (`- **Company - Mon YYYY - Present**` + paragraph) become the Work timeline. Bullets in `home.md`/`more.md` are sorted into the About profile by wording ("learning …", "favorite games …", "watch …", "dotfiles …"); anything else stays as a plain fact.
- `src/graph.ts`: the layout (tile order, columns, widths, spacing) and camera math. Positions are computed from measured sizes; there are no hand-placed coordinates.
- `src/styles.css`: colors, typography, layout, and responsive rules. Fonts are bundled locally.

Markdown is trusted, repository-authored content and supports embedded HTML. Do not feed untrusted user input into the renderer.

## Verify

```sh
bun run check
bun test
bun run build
```

Tests cover real article metadata/code rendering, the layout (no overlaps whichever row unfolds, aligned grid), post grouping, Work/About parsing, camera framing, URL parsing, and production file serving, including traversal, malformed paths, HEAD requests, caching, and unsupported methods.

With the dev server running and Chromium debugging available at `127.0.0.1:9222`, run `bun tests/motion.browser.ts` to check desktop/mobile transitions, reflow without overlap, technology highlighting, rapid interruptions, reader dismissal, section navigation and browser Back, project shortcuts, and reduced motion. It opens and closes its own test tab.
