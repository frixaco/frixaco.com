import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useIsPresent,
  useScroll,
} from "motion/react";
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useViewport,
  type Node,
  type NodeChange,
  type NodeProps,
  type Viewport,
} from "@xyflow/react";
import {
  articles,
  githubProfile,
  postGroups,
  postsFor,
  projectById,
  projects,
  sharedStack,
  sourceUrl,
  contactHtml,
  type Article,
  type Project,
} from "./content";
import {
  CARD_WIDTH,
  MAX_ROWS,
  MIN_ZOOM,
  MOBILE_MIN_ZOOM,
  SECTIONS,
  TILE_ORDER,
  frameViewport,
  layoutMap,
  projectRows,
  readHash,
  revealViewport,
  rowOf,
  unionBox,
  zoneAt,
  type Box,
  type LayoutMode,
  type Section,
} from "./graph";
import {
  AboutProfile,
  ProjectVisual,
  ResumeButton,
  WorkTimeline,
} from "./sections";
import {
  cameraEase,
  cx,
  ease,
  isNarrow,
  reducedMotion,
  useLayoutMode,
  useReducedMotion,
} from "./ui";

type NodeData = { order: number; section?: Section; box?: Box; row?: number };
type MapNode = Node<
  NodeData,
  "zone" | "project" | "detail" | "writing" | "document"
>;
const MAX_ZOOM = 1.6;
type Actions = {
  ready: boolean;
  mode: LayoutMode;
  selected: string | null;
  activeSection: Section;
  tech: string | null;
  pinnedTech: string | null;
  hoverProject: string | null;
  toggle: (id: string) => void;
  openProject: (id: string) => void;
  read: (id: string) => void;
  previewTech: (tech: string | null) => void;
  pinTech: (tech: string | null) => void;
  previewProject: (id: string | null) => void;
  goSection: (id: Section, view?: "map" | "index") => void;
};
const ActionsContext = createContext<Actions>(null!);
const duration = () => (reducedMotion() ? 0 : 560);
const cameraMotion = () => ({
  duration: duration(),
  ease: cameraEase,
  interpolate: "linear" as const,
});
const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

// The part of the screen not covered by the header and map controls.
function canvasScreen(): Box {
  const narrow = isNarrow();
  const margin = narrow ? 14 : 36;
  const top =
    (document.querySelector(".site-header")?.getBoundingClientRect().bottom ??
      100) + (narrow ? 14 : 28);
  const obstacles = [".react-flow__minimap", ".map-controls"]
    .map((selector) =>
      document.querySelector(selector)?.getBoundingClientRect(),
    )
    .filter((rect): rect is DOMRect => Boolean(rect?.height))
    .map((rect) => rect.top);
  const bottom = Math.min(innerHeight, ...obstacles) - (narrow ? 12 : 22);
  return {
    x: margin,
    y: top,
    width: innerWidth - margin * 2,
    height: Math.max(120, bottom - top),
  };
}
const techCount = (tech: string) =>
  projects.filter((project) => project.stack.includes(tech)).length;
function Latch({ open }: { open: boolean }) {
  return (
    <span className="latch" aria-hidden>
      <span className="latch-line" />
      <motion.span
        className="latch-line"
        initial={false}
        animate={{ rotate: open ? 0 : 90 }}
      />
    </span>
  );
}

function StackChips({ project }: { project: Project }) {
  const { tech, pinnedTech, previewTech, pinTech } = useContext(ActionsContext);
  return (
    <ul className="stack" aria-label="Built with">
      {project.stack.map((item) =>
        sharedStack.includes(item) ? (
          <li key={item}>
            <button
              className={cx("chip nodrag nopan", tech === item && "is-match")}
              aria-pressed={pinnedTech === item}
              aria-label={`${item}: highlight the ${techCount(item)} projects built with it`}
              title={`Highlight the ${techCount(item)} projects built with ${item}`}
              onPointerEnter={() => previewTech(item)}
              onPointerLeave={() => previewTech(null)}
              onFocus={() => previewTech(item)}
              onBlur={() => previewTech(null)}
              onClick={() => pinTech(pinnedTech === item ? null : item)}
            >
              {item}
              <span className="chip-count" aria-hidden>
                {techCount(item)}
              </span>
            </button>
          </li>
        ) : (
          <li key={item} className="chip is-static">
            {item}
          </li>
        ),
      )}
    </ul>
  );
}

function ProjectTile({ id, data }: NodeProps<MapNode>) {
  const { mode, selected, toggle, tech, hoverProject } =
    useContext(ActionsContext);
  const project = projectById(id)!;
  const open = selected === id;
  const posts = postsFor(id).length;
  return (
    <article
      className={cx(
        "project-tile",
        open && "is-open",
        tech && !project.stack.includes(tech) && "is-dimmed",
        hoverProject === id && "is-related",
      )}
      data-card={id}
      style={
        { width: CARD_WIDTH[mode].tile, "--i": data.order } as CSSProperties
      }
    >
      <button
        className="card-toggle nodrag nopan"
        onClick={() => toggle(id)}
        aria-expanded={open}
        aria-controls={open ? `details-${id}` : undefined}
      >
        <span className="tile-top">
          {project.wip && <span className="status">WIP</span>}
          {posts > 0 && (
            <span className="tile-posts">{plural(posts, "post")}</span>
          )}
          <Latch open={open} />
        </span>
        <span className="project-name">{project.name}</span>
        <span className="project-summary">{project.summary}</span>
      </button>
      <StackChips project={project} />
    </article>
  );
}

function PostLink({ post, compact }: { post: Article; compact?: boolean }) {
  const { read, previewProject } = useContext(ActionsContext);
  return (
    <a
      href={`#read/${post.id}`}
      className={cx(compact ? "detail-post" : "article-link", "nodrag nopan")}
      onClick={(event) => {
        event.preventDefault();
        read(post.id);
      }}
      onPointerEnter={() => previewProject(post.project ?? null)}
      onPointerLeave={() => previewProject(null)}
    >
      <span className="article-text">
        <strong>{post.label}</strong>
        {!compact && post.description && <small>{post.description}</small>}
      </span>
      <span className="article-meta">
        {post.date && <time dateTime={post.date}>{post.date}</time>}
        <span className="article-arrow" aria-hidden>
          →
        </span>
      </span>
    </a>
  );
}

function ProjectDetail({ id }: { id: string }) {
  const { toggle, goSection } = useContext(ActionsContext);
  const project = projectById(id)!;
  const posts = postsFor(id);
  const present = useIsPresent();
  return (
    <article
      className="project-detail"
      id={`details-${id}`}
      aria-label={`${project.name} details`}
      inert={!present}
    >
      <ProjectVisual project={project} />
      <div className="detail-info">
        <header className="detail-head">
          <p className="kicker">
            Project
            {project.wip && " · work in progress"}
          </p>
          <button
            className="detail-close nodrag nopan"
            aria-label={`Close ${project.name}`}
            onClick={() => toggle(id)}
          >
            ×
          </button>
        </header>
        <p className="detail-description">{project.description}</p>
        <dl className="detail-facts">
          <div>
            <dt>Stack</dt>
            <dd>{project.stack.join(" · ")}</dd>
          </div>
          {project.media?.length ? (
            <div>
              <dt>Flow</dt>
              <dd>{project.flow.join(" → ")}</dd>
            </div>
          ) : null}
        </dl>
        <div className="card-links">
          <a
            className="text-link nodrag nopan"
            href={sourceUrl(project.id)}
            target="_blank"
            rel="noreferrer"
          >
            Source <span aria-hidden>↗</span>
          </a>
          {project.url && (
            <a
              className="text-link nodrag nopan"
              href={project.url}
              target="_blank"
              rel="noreferrer"
            >
              Live <span aria-hidden>↗</span>
            </a>
          )}
        </div>
        {posts.length > 0 && (
          <section className="detail-writing">
            <p className="kicker">
              Writing about {project.name} · {posts.length}
            </p>
            <ol>
              {posts.slice(0, 4).map((post) => (
                <li key={post.id}>
                  <PostLink post={post} compact />
                </li>
              ))}
            </ol>
            {posts.length > 4 && (
              <button
                className="text-link nodrag nopan"
                onClick={() => {
                  goSection("writing", "map");
                  const card = document.querySelector<HTMLElement>(".writing-card");
                  const group = card?.querySelector<HTMLElement>(".post-group.is-linked");
                  if (card && group) card.scrollTop = group.offsetTop;
                }}
              >
                All {posts.length} posts <span aria-hidden>→</span>
              </button>
            )}
          </section>
        )}
      </div>
    </article>
  );
}

// One slot per tile row; it unfolds under the row holding the open project.
function DetailSlot({ data }: NodeProps<MapNode>) {
  const { mode, selected } = useContext(ActionsContext);
  const row = projectRows(mode)[data.row!] ?? [];
  const open = selected && row.includes(selected) ? selected : null;
  const reduce = useReducedMotion();
  return (
    <div
      className={cx("detail-slot", open && "is-open")}
      data-card={`detail-${data.row}`}
      style={{ width: CARD_WIDTH[mode].detail }}
    >
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="reveal"
            className="detail-reveal"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={open}
                initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  transition: { duration: reduce ? 0 : 0.14 },
                }}
                transition={{ duration: reduce ? 0 : 0.26 }}
              >
                <ProjectDetail id={open} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectBadge({ id }: { id: string }) {
  const { openProject, previewProject } = useContext(ActionsContext);
  const project = projectById(id);
  if (!project) return null;
  return (
    <button
      className="project-badge nodrag nopan"
      onClick={() => openProject(id)}
      onPointerEnter={() => previewProject(id)}
      onPointerLeave={() => previewProject(null)}
      title={`Open ${project.name} on the map`}
    >
      <span aria-hidden>◆</span> {project.name}
    </button>
  );
}

function WritingCard({ data }: NodeProps<MapNode>) {
  const { mode, selected } = useContext(ActionsContext);
  return (
    <article
      className="writing-card nodrag nopan nowheel"
      tabIndex={0}
      aria-label="Writing — scroll to browse all posts"
      data-card="writing"
      style={
        { width: CARD_WIDTH[mode].writing, "--i": data.order } as CSSProperties
      }
    >
      {postGroups.length === 0 && (
        <p className="writing-empty">Nothing published yet.</p>
      )}
      {postGroups.map((group) => (
        <section
          key={group.id}
          className={cx(
            "post-group",
            selected &&
              group.posts.some((post) => post.project === selected) &&
              "is-linked",
          )}
        >
          <header className="post-group-head">
            <div className="post-group-meta">
              <p className="kicker">
                {group.series
                  ? `Series · ${group.posts.length} parts`
                  : plural(group.posts.length, "post")}
              </p>
              {group.project && <ProjectBadge id={group.project} />}
            </div>
            {group.series && <h3>{group.series}</h3>}
          </header>
          <ol className="article-list">
            {group.posts.map((post) => (
              <li
                key={post.id}
                className={cx(
                  selected && post.project === selected && "is-linked",
                )}
              >
                <PostLink post={post} />
                {!group.project && post.project && (
                  <ProjectBadge id={post.project} />
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </article>
  );
}

function DocumentCard({ id, data }: NodeProps<MapNode>) {
  const { mode } = useContext(ActionsContext);
  const about = id === "about";
  return (
    <article
      className={`document-card document-${id}`}
      data-card={id}
      style={
        {
          width: CARD_WIDTH[mode][about ? "about" : "work"],
          "--i": data.order,
        } as CSSProperties
      }
    >
      {about ? <AboutProfile /> : <WorkTimeline />}
    </article>
  );
}

function ZoneNode({ data }: NodeProps<MapNode>) {
  const { activeSection } = useContext(ActionsContext);
  const section = SECTIONS.find((item) => item.id === data.section)!;
  return (
    <section
      className={cx(
        "zone",
        `zone-${section.id}`,
        activeSection === section.id && "is-active",
      )}
      aria-label={section.label}
      data-section={section.id}
      style={
        {
          width: data.box?.width,
          height: data.box?.height,
          "--i": data.order,
        } as CSSProperties
      }
    >
      <span className="zone-marker" aria-hidden />
      <header className="zone-label">
        <span className="zone-title">{section.label}</span>
      </header>
    </section>
  );
}

const nodeTypes = {
  zone: ZoneNode,
  project: ProjectTile,
  detail: DetailSlot,
  writing: WritingCard,
  document: DocumentCard,
};

const zoneId = (section: Section) => `zone-${section}`;
function createNodes(mode: LayoutMode): MapNode[] {
  const { positions, zones } = layoutMap({}, mode);
  return relayout(
    [
      ...SECTIONS.map((section, index) => ({
        id: zoneId(section.id),
        type: "zone" as const,
        position: { x: zones[section.id].x, y: zones[section.id].y },
        zIndex: 0,
        data: { order: index, section: section.id, box: zones[section.id] },
      })),
      ...TILE_ORDER.map((id, index) => ({
        id,
        type: "project" as const,
        position: positions[id],
        zIndex: 1,
        data: { order: index },
      })),
      ...Array.from({ length: MAX_ROWS }, (_, row) => ({
        id: `detail-${row}`,
        type: "detail" as const,
        position: { x: 0, y: 0 },
        zIndex: 1,
        data: { order: 0, row },
      })),
      ...(["writing", "work", "about"] as const).map((id, index) => ({
        id,
        type: id === "writing" ? ("writing" as const) : ("document" as const),
        position: positions[id],
        zIndex: 1,
        data: { order: TILE_ORDER.length + index },
      })),
    ],
    mode,
  );
}

// Derive every position from measured card heights; reuse unchanged nodes.
function relayout(nodes: MapNode[], mode: LayoutMode) {
  const heights = Object.fromEntries(
    nodes
      .filter((node) => node.type !== "zone" && node.measured?.height != null)
      .map((node) => [node.id, node.measured!.height]),
  );
  const { positions, zones } = layoutMap(heights, mode);
  return nodes.map((node) => {
    if (node.type === "zone") {
      const box = zones[node.data.section!];
      const old = node.data.box;
      return old &&
        old.x === box.x &&
        old.y === box.y &&
        old.width === box.width &&
        old.height === box.height
        ? node
        : {
            ...node,
            position: { x: box.x, y: box.y },
            data: { ...node.data, box },
          };
    }
    const next = positions[node.id];
    // Detail slots beyond the current number of rows are unused.
    const hidden = !next;
    if (!next) return node.hidden ? node : { ...node, hidden };
    return next.x === node.position.x &&
      next.y === node.position.y &&
      !node.hidden
      ? node
      : { ...node, position: next, hidden: false };
  });
}

// Measure every card at its destination state before paint.
function measureDestination(mode: LayoutMode) {
  const root = document.querySelector(".react-flow");
  const heights: Record<string, number> = {};
  root?.classList.add("measure-destination");
  try {
    for (const card of document.querySelectorAll<HTMLElement>("[data-card]"))
      heights[card.dataset.card!] = card.offsetHeight;
  } finally {
    root?.classList.remove("measure-destination");
  }
  return { ...layoutMap(heights, mode), heights };
}

function CanvasPatterns() {
  return (
    <svg
      className="canvas-patterns"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="canvas-hatch" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M-3 3 3-3 M0 14 14 0 M11 17 17 11" />
        </pattern>
        <path id="canvas-contour" d="M-160 220 C100-60 330 380 560 160 S960 20 1120 300 1460 500 1760 180" />
      </defs>
      <g className="pattern-contours">
        {Array.from({ length: 9 }, (_, i) => (
          <use key={i} href="#canvas-contour" y={i * 24} />
        ))}
        <path d="M-120 940 C180 580 360 1080 650 750 S1130 590 1700 880 M-120 964 C180 604 360 1104 650 774 S1130 614 1700 904 M-120 988 C180 628 360 1128 650 798 S1130 638 1700 928" />
      </g>
      <g className="pattern-orbits">
        <circle cx="1320" cy="250" r="150" />
        <circle cx="1320" cy="250" r="180" strokeDasharray="240 80 12 40" />
        <ellipse cx="1320" cy="250" rx="230" ry="90" transform="rotate(-35 1320 250)" />
        <path d="M1070 250 H1570 M1320 0 V500" strokeDasharray="4 12" />
      </g>
      <g className="pattern-traces">
        <path d="M-80 500 H190 L350 660 H590 L790 460 H1120 L1300 640 H1680 M-80 522 H180 L340 682 H600 L800 482 H1110 L1290 662 H1680 M940 1060 V820 L1120 640 V420 L980 280 V-80" />
        <circle cx="350" cy="660" r="9" />
        <circle cx="1120" cy="640" r="14" />
        <rect x="70" y="680" width="230" height="230" rx="115" fill="url(#canvas-hatch)" />
        <rect x="680" y="50" width="240" height="120" fill="url(#canvas-hatch)" transform="rotate(-20 800 110)" />
        <path d="m80 120 80 80-80 80-80-80Z m20 0 80 80-80 80-80-80Z M650 860 l60-35 60 35 v70 l-60 35-60-35Z" />
      </g>
    </svg>
  );
}

function Canvas({
  onReady,
  onSection,
}: {
  onReady: () => void;
  onSection: (section: Section) => void;
}) {
  const { selected, mode, pinTech } = useContext(ActionsContext);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { getViewport, setViewport } = useReactFlow<MapNode>();
  const minZoom = mode === "narrow" ? MOBILE_MIN_ZOOM : MIN_ZOOM;
  const initialized = useNodesInitialized();
  const [nodes, setNodes] = useState(() => createNodes(mode));
  const wasReady = useRef(false);
  useEffect(() => {
    if (initialized && !wasReady.current) {
      wasReady.current = true;
      onReady();
    }
  }, [initialized, onReady]);
  useEffect(() => setNodes((current) => relayout(current, mode)), [mode]);
  useEffect(() => {
    const element = ref.current!;
    let frame = 0;
    const follow = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const zone of element.querySelectorAll<HTMLElement>(".zone")) {
          const box = zone.getBoundingClientRect();
          if (!box.width || !box.height) continue;
          if (
            event.clientX >= box.left && event.clientX <= box.right &&
            event.clientY >= box.top && event.clientY <= box.bottom
          ) onSection(zone.dataset.section as Section);
          const x = Math.max(0, Math.min(box.width, event.clientX - box.left));
          const y = Math.max(0, Math.min(box.height, event.clientY - box.top));
          const edges = [
            { x, y: 0, distance: x },
            { x: box.width, y, distance: box.width + y },
            { x, y: box.height, distance: box.width * 2 + box.height - x },
            { x: 0, y, distance: (box.width + box.height) * 2 - y },
          ];
          const nearest = edges.reduce((best, edge) =>
            Math.hypot(box.left + edge.x - event.clientX, box.top + edge.y - event.clientY) <
            Math.hypot(box.left + best.x - event.clientX, box.top + best.y - event.clientY)
              ? edge : best,
          );
          const target = nearest.distance / ((box.width + box.height) * 2) * 100;
          const previous = parseFloat(zone.style.getPropertyValue("--marker-distance")) || 0;
          const delta = target - previous;
          zone.style.setProperty("--marker-distance", `${previous + delta - Math.round(delta / 100) * 100}%`);
        }
      });
    };
    element.addEventListener("pointermove", follow);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", follow);
    };
  }, [onSection]);
  useEffect(() => {
    const element = ref.current!;
    let controlPressed = false;
    let pending: Viewport | null = null;
    let reset = 0;
    const clear = () => {
      pending = null;
      clearTimeout(reset);
    };
    const key = (event: KeyboardEvent) => {
      controlPressed = event.ctrlKey;
    };
    const blur = () => {
      controlPressed = false;
      clear();
    };
    const wheel = (event: WheelEvent) => {
      const target = event.target as Element;
      const minimap = target.closest(".react-flow__minimap");
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      // The overview has its own wheel-to-zoom handler; swipes should pan here too.
      if (minimap && !event.ctrlKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        clear();
        const viewport = getViewport();
        void setViewport({
          ...viewport,
          x: viewport.x - event.deltaX * unit * 0.5,
          y: viewport.y - event.deltaY * unit * 0.5,
        });
        return;
      }
      // Pinch emits ctrlKey without a keypress. Keep its native, continuous zoom.
      // ponytail: no wheel device ID; coarse fallback for missed keydown until browsers expose one.
      const mouseWheel =
        controlPressed || event.deltaMode !== 0 || Math.abs(event.deltaY) >= 40;
      if (!event.ctrlKey || !mouseWheel || target.closest(".nowheel")) {
        if (pending) {
          void setViewport(getViewport());
          clear();
        }
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      // Bound mouse notches without React Flow's macOS pinch multiplier.
      const delta = event.deltaY * unit;
      const viewport = pending ?? getViewport();
      const zoom = Math.max(
        minZoom,
        Math.min(
          MAX_ZOOM,
          viewport.zoom * 2 ** (-Math.max(-50, Math.min(50, delta)) * 0.0024),
        ),
      );
      const rect = element.getBoundingClientRect();
      const x = minimap ? rect.width / 2 : event.clientX - rect.left;
      const y = minimap ? rect.height / 2 : event.clientY - rect.top;
      const ratio = zoom / viewport.zoom;
      pending = {
        x: x - (x - viewport.x) * ratio,
        y: y - (y - viewport.y) * ratio,
        zoom,
      };
      clearTimeout(reset);
      reset = window.setTimeout(clear, 160);
      void setViewport(pending, {
        duration: reduce ? 0 : 120,
        interpolate: "linear",
      });
    };
    element.addEventListener("wheel", wheel, { capture: true, passive: false });
    element.addEventListener("pointerdown", clear, true);
    addEventListener("keydown", key, true);
    addEventListener("keyup", key, true);
    addEventListener("blur", blur);
    return () => {
      clear();
      element.removeEventListener("wheel", wheel, true);
      element.removeEventListener("pointerdown", clear, true);
      removeEventListener("keydown", key, true);
      removeEventListener("keyup", key, true);
      removeEventListener("blur", blur);
    };
  }, [getViewport, setViewport, reduce, minZoom]);
  const onNodesChange = useCallback(
    (changes: NodeChange<MapNode>[]) =>
      setNodes((current) => relayout(applyNodeChanges(changes, current), mode)),
    [mode],
  );

  return (
    <ReactFlow<MapNode>
      ref={ref}
      nodes={nodes}
      onNodesChange={onNodesChange}
      edges={[]}
      nodeTypes={nodeTypes}
      onMoveEnd={(event, viewport) => {
        if (!event) return;
        const screen = canvasScreen();
        const zones = Object.fromEntries(
          nodes
            .filter((node) => node.type === "zone")
            .map((node) => [node.data.section, node.data.box]),
        );
        if ("clientX" in event) {
          const x = (event.clientX - viewport.x) / viewport.zoom;
          const y = (event.clientY - viewport.y) / viewport.zoom;
          const hovered = SECTIONS.find(({ id }) => {
            const box = zones[id]!;
            return x >= box.x && x <= box.x + box.width &&
              y >= box.y && y <= box.y + box.height;
          });
          if (hovered) onSection(hovered.id);
        } else {
          onSection(zoneAt(zones, {
            x: (screen.x + screen.width / 2 - viewport.x) / viewport.zoom,
            y: (screen.y + screen.height / 3 - viewport.y) / viewport.zoom,
          }));
        }
      }}
      onPaneClick={() => pinTech(null)}
      onNodeClick={(_, node) => {
        if (node.type === "zone") pinTech(null);
      }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      minZoom={minZoom}
      maxZoom={MAX_ZOOM}
      zoomOnDoubleClick={false}
      zoomOnScroll={false}
      zoomActivationKeyCode={null}
      panOnScroll
      zoomOnPinch
      preventScrolling
      colorMode="dark"
      attributionPosition="bottom-left"
      aria-label="Interactive map of Rustam's projects, writing, work, and bio"
      defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
    >
      <CanvasPatterns />
      <Background
        id="grid"
        variant={BackgroundVariant.Lines}
        gap={48}
        color="#15171a0d"
        lineWidth={0.7}
      />
      <Background
        id="crosses"
        variant={BackgroundVariant.Cross}
        gap={240}
        size={5}
        color="#15171a26"
      />
      <MiniMap
        nodeColor={(node) =>
          node.id === selected ||
          (node.type === "detail" &&
            selected &&
            rowOf(selected, mode) === node.data.row)
            ? "var(--accent-ink)"
            : node.type === "zone"
              ? "var(--ink-2)"
              : node.type === "project"
                ? "var(--paper)"
                : "#79838f"
        }
        nodeStrokeColor={(node) => (node.type === "zone" ? "var(--line)" : "none")}
        nodeStrokeWidth={4}
        nodeBorderRadius={0}
        maskColor="#15171a1a"
        maskStrokeColor="var(--accent-ink)"
        maskStrokeWidth={3}
        bgColor="var(--canvas)"
        pannable
        zoomable
        ariaLabel="Map overview. Drag to navigate."
      />
    </ReactFlow>
  );
}

function MapControls({
  home,
  fitAll,
  help,
  toggleHelp,
}: {
  home: () => void;
  fitAll: () => void;
  help: boolean;
  toggleHelp: () => void;
}) {
  const { zoom } = useViewport();
  const { mode } = useContext(ActionsContext);
  const minZoom = mode === "narrow" ? MOBILE_MIN_ZOOM : MIN_ZOOM;
  const { zoomIn, zoomOut, zoomTo } = useReactFlow();
  return (
    <>
      <div className="canvas-hint">
        <span>
          Drag or scroll to move, pinch to zoom
        </span>
        <button
          className="help-button"
          aria-label="Canvas controls and keyboard shortcuts"
          aria-expanded={help}
          onClick={toggleHelp}
        >
          ?
        </button>
      </div>
      <AnimatePresence>
        {help && (
          <motion.aside
            className="keyboard-help"
            aria-label="Canvas controls"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <strong>Find your way</strong>
            <p>
              Click a project to unfold it. Click a shared technology to see
              every project built with it. Posts link back to their project.
            </p>
            <dl>
              <dt>Drag / scroll</dt>
              <dd>Move around</dd>
              <dt>Pinch / Ctrl + scroll</dt>
              <dd>Zoom</dd>
              <dt>Arrow keys</dt>
              <dd>Pan</dd>
              <dt>+ / −</dt>
              <dd>Zoom</dd>
              <dt>0 / Home</dt>
              <dd>Back to projects</dd>
              <dt>F</dt>
              <dd>Fit the whole map</dd>
              <dt>I</dt>
              <dd>Switch to the index</dd>
              <dt>Escape</dt>
              <dd>Close / clear</dd>
            </dl>
          </motion.aside>
        )}
      </AnimatePresence>
      <div className="map-controls">
        <div className="zoom-controls">
          <button
            aria-label="Zoom out"
            disabled={zoom <= minZoom + 0.001}
            onClick={() => zoomOut(cameraMotion())}
          >
            −
          </button>
          <button
            className="zoom-value"
            aria-label={`Zoom ${Math.round(zoom * 100)} percent. Reset to 100 percent`}
            title="Reset to 100%"
            onClick={() => zoomTo(1, cameraMotion())}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            aria-label="Zoom in"
            disabled={zoom >= 1.599}
            onClick={() => zoomIn(cameraMotion())}
          >
            +
          </button>
        </div>
        <div className="fit-controls">
          <button onClick={home} title="Back to projects (0)">
            Home
          </button>
          <button onClick={fitAll} title="Fit the whole map (F)">
            Fit all
          </button>
        </div>
      </div>
    </>
  );
}

function SectionNavigation({
  active,
  navigate,
}: {
  active: Section;
  navigate: (section: Section) => void;
}) {
  const nav = useRef<HTMLElement>(null);
  const border = useRef<HTMLSpanElement>(null);
  const position = useCallback((animate: boolean) => {
    const button =
      nav.current?.querySelector<HTMLButtonElement>("[aria-current]");
    const indicator = border.current;
    if (!button || !indicator) return;
    const transform = `translate(${button.offsetLeft}px, ${button.offsetTop}px)`;
    const width = `${button.offsetWidth}px`;
    const height = `${button.offsetHeight}px`;
    if (
      indicator.style.transform === transform &&
      indicator.style.width === width &&
      indicator.style.height === height
    )
      return;
    indicator.style.transition =
      animate && indicator.dataset.ready ? "" : "none";
    Object.assign(indicator.style, { transform, width, height });
    indicator.dataset.ready = "true";
  }, []);
  useLayoutEffect(() => position(true), [active, position]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => position(false));
    observer.observe(nav.current!);
    nav
      .current!.querySelectorAll("button")
      .forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [position]);
  return (
    <nav
      ref={nav}
      className="region-navigation"
      aria-label="Portfolio sections"
    >
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          aria-current={active === section.id ? "location" : undefined}
          onClick={() => navigate(section.id)}
        >
          {section.label}
        </button>
      ))}
      <span ref={border} className="section-indicator" aria-hidden="true" />
    </nav>
  );
}

function indexScrollTop(id: Section) {
  const section = document.getElementById(`index-${id}`);
  const top =
    id === "projects" || !section
      ? 0
      : section.offsetTop +
        ((section.offsetParent as HTMLElement | null)?.offsetTop ?? 0) -
        parseFloat(getComputedStyle(section).scrollMarginTop);
  return Math.max(
    0,
    Math.min(top, document.documentElement.scrollHeight - innerHeight),
  );
}

const reveal = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const inView = {
  variants: reveal,
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, amount: 0.1 },
} as const;
function IndexView({
  onSection,
  navigationTarget,
}: {
  onSection: (section: Section) => void;
  navigationTarget: RefObject<Section | null>;
}) {
  const { read, goSection, openProject } = useContext(ActionsContext);
  const present = useIsPresent();
  useEffect(() => {
    if (!present) return;
    let frame = 0;
    const track = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const atBottom =
          scrollY + innerHeight >= document.documentElement.scrollHeight - 1;
        const section = [...document.querySelectorAll(".index-page > section")]
          .reverse()
          .find(
            (element) =>
              atBottom ||
              indexScrollTop(element.id.slice(6) as Section) <= scrollY + 1,
          );
        const current = section ? (section.id.slice(6) as Section) : "projects";
        if (
          navigationTarget.current &&
          Math.abs(scrollY - indexScrollTop(navigationTarget.current)) > 1
        )
          return;
        navigationTarget.current = null;
        onSection(current);
      });
    };
    const resumeTracking = (event: Event) => {
      if (event instanceof WheelEvent && event.ctrlKey) return;
      if (
        event instanceof PointerEvent &&
        event.target !== document.documentElement
      )
        return;
      if (
        event instanceof KeyboardEvent &&
        (![
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ].includes(event.key) ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          (event.target instanceof Element &&
            event.target.closest(
              "input, textarea, select, [contenteditable]",
            )) ||
          (event.key === " " &&
            event.target instanceof Element &&
            event.target.closest("button, a[href]")))
      )
        return;
      if (navigationTarget.current)
        scrollTo({ top: scrollY, behavior: "instant" });
      navigationTarget.current = null;
      track();
    };
    const resumeEvents = ["wheel", "touchmove", "pointerdown", "keydown"];
    addEventListener("scroll", track, { passive: true });
    for (const event of resumeEvents)
      addEventListener(event, resumeTracking, { passive: true });
    track();
    return () => {
      removeEventListener("scroll", track);
      for (const event of resumeEvents)
        removeEventListener(event, resumeTracking);
      cancelAnimationFrame(frame);
    };
  }, [onSection, present, navigationTarget]);
  return (
    <motion.main
      className="index-page"
      id="index-content"
      inert={!present}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="index-intro">
        <p className="eyebrow">THE INDEX</p>
        <h1>Projects, writing, work.</h1>
        <p>
          A software engineer who likes exploring and building cool stuff. This
          page lists everything on the map, top to bottom.
        </p>
        <div className="index-cta">
          <ResumeButton />
          <button
            className="index-map-link"
            onClick={() => goSection("projects", "map")}
          >
            Prefer to wander? Open the map <span aria-hidden>→</span>
          </button>
        </div>
      </div>
      <section id="index-projects" aria-labelledby="projects-heading">
        <h2 id="projects-heading">Projects</h2>
        {projects.map((project) => {
          const posts = postsFor(project.id);
          return (
            <motion.article
              className="index-project"
              key={project.id}
              {...inView}
            >
              <details className="index-project-content">
                <summary>
                  <h3>
                    {project.name}{" "}
                    {project.wip && <span className="status">WIP</span>}
                  </h3>
                  <p className="index-summary">{project.summary}</p>
                </summary>
                <p>{project.description}</p>
                <ul className="stack" aria-label="Built with">
                  {project.stack.map((item) => (
                    <li key={item} className="chip is-static">
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="index-visual">
                  <ProjectVisual project={project} />
                </div>
              </details>
              <div className="index-actions">
                <button onClick={() => openProject(project.id)}>
                  Show on map <span aria-hidden>→</span>
                </button>
                <a
                  href={sourceUrl(project.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source <span aria-hidden>↗</span>
                </a>
                {posts.length > 0 && (
                  <a href="#index/writing">
                    {plural(posts.length, "post")} <span aria-hidden>↓</span>
                  </a>
                )}
              </div>
            </motion.article>
          );
        })}
      </section>
      <motion.section
        id="index-work"
        aria-labelledby="work-heading"
        {...inView}
      >
        <h2 id="work-heading">Work</h2>
        <div className="paper-panel">
          <WorkTimeline />
        </div>
      </motion.section>
      <section id="index-writing" aria-labelledby="writing-heading">
        <h2 id="writing-heading">Writing</h2>
        {postGroups.map((group) => (
          <div key={group.id} className="index-post-group">
            <h3 className="index-group-title">
              {group.series ?? "Posts"}
              {group.project && (
                <button onClick={() => openProject(group.project!)}>
                  {projectById(group.project)?.name} <span aria-hidden>→</span>
                </button>
              )}
            </h3>
            {group.posts.map((article) => (
              <motion.a
                {...inView}
                className="index-article"
                key={article.id}
                href={`#read/${article.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  read(article.id);
                }}
              >
                <div>
                  <h4>{article.title}</h4>
                  <p>{article.description}</p>
                </div>
                <time dateTime={article.date}>{article.date}</time>
                <span aria-hidden>→</span>
              </motion.a>
            ))}
          </div>
        ))}
      </section>
      <motion.section
        id="index-about"
        aria-labelledby="about-heading"
        {...inView}
      >
        <h2 id="about-heading">About</h2>
        <div className="paper-panel">
          <AboutProfile />
        </div>
      </motion.section>
      <footer className="index-footer">
        <div dangerouslySetInnerHTML={{ __html: contactHtml }} />
      </footer>
    </motion.main>
  );
}

function Reader({ id, close }: { id: string; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const present = useIsPresent();
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ container: ref });
  const article = articles.find((item) => item.id === id);
  const group = postGroups.find((item) => item.id === article?.group);
  const siblings = group?.posts ?? [];
  const index = siblings.findIndex((item) => item.id === id);
  const previous = siblings[index - 1];
  const next = siblings[index + 1];
  const project = projectById(article?.project);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  useEffect(() => {
    ref.current!.scrollTop = 0;
  }, [id]);
  // Moving between posts replaces the entry, so Back still leaves the reader.
  const go = (target: string) =>
    location.replace(`#read/${encodeURIComponent(target)}`);
  const step = (post: Article) =>
    post.part ? `Part ${post.part}` : (post.date ?? "");
  return (
    <motion.dialog
      ref={ref}
      className="reader"
      initial={{ opacity: 0, y: reduce ? 0 : 36, scale: reduce ? 1 : 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        y: reduce ? 0 : 18,
        transition: { duration: reduce ? 0 : 0.2 },
      }}
      data-closing={!present}
      aria-labelledby="reader-title"
      onCancel={(event) => {
        event.preventDefault();
        if (present) close();
      }}
      onClick={(event) => {
        if (present && event.target === event.currentTarget) close();
      }}
    >
      <div className="reader-sheet" inert={!present}>
        <header className="reader-toolbar">
          <motion.div
            className="reader-progress"
            style={{ scaleX: scrollYProgress }}
            aria-hidden
          />
          <span>
            {article?.part
              ? `SERIES / PART ${article.part} OF ${article.parts}`
              : "WRITING"}
          </span>
          <button onClick={close} autoFocus>
            Close <span aria-hidden>×</span>
          </button>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={id}
            initial={{ opacity: 0, y: reduce ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.12 } }}
          >
            {article ? (
              <article className="reader-content">
                <p className="eyebrow">
                  <time dateTime={article.date}>{article.date}</time>
                  {project &&
                    ` / ${[project.name, ...project.stack].join(" · ").toUpperCase()}`}
                </p>
                <h1 id="reader-title">{article.title}</h1>
                {article.description && (
                  <p className="reader-description">{article.description}</p>
                )}
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: article.html }}
                />
                <footer>
                  <nav className="reader-pager" aria-label="More posts">
                    {previous ? (
                      <button onClick={() => go(previous.id)}>
                        <small>← {step(previous)}</small>
                        {previous.label}
                      </button>
                    ) : (
                      <span />
                    )}
                    {next ? (
                      <button className="next" onClick={() => go(next.id)}>
                        <small>{step(next)} →</small>
                        {next.label}
                      </button>
                    ) : project ? (
                      <a
                        className="next"
                        href={sourceUrl(project.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <small>That's all so far</small>
                        {project.name} source ↗
                      </a>
                    ) : (
                      <button className="next" onClick={close}>
                        <small>That's all so far</small>
                        Back to the map
                      </button>
                    )}
                  </nav>
                </footer>
              </article>
            ) : (
              <div className="reader-content">
                <h1 id="reader-title">Post not found.</h1>
                <p>This page isn't in the writing list.</p>
                <button className="text-link" onClick={close}>
                  Back to the portfolio
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.dialog>
  );
}

function Portfolio() {
  const mode = useLayoutMode();
  const [route, setRoute] = useState(() => readHash(location.hash));
  const [selected, setSelected] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [hoverTech, setHoverTech] = useState<string | null>(null);
  const [pinnedTech, setPinnedTech] = useState<string | null>(null);
  const [hoverProject, setHoverProject] = useState<string | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>(
    () => readHash(location.hash).section ?? "projects",
  );
  const lastRoute = useRef(route);
  const routeRef = useRef(route);
  routeRef.current = route;
  const cameFromSite = useRef(false);
  const previousHash = useRef("#map");
  const pendingFocus = useRef<{ id: string; center: boolean } | null>(null);
  const exploringFromIndex = useRef(false);
  const indexNavigationTarget = useRef<Section | null>(null);
  const { getNodes, getViewport, setViewport, zoomIn, zoomOut } =
    useReactFlow<MapNode>();

  useEffect(() => {
    const groups =
      ".react-flow__viewport, .writing-card, .detail-writing ol, .role-grid, #index-projects, #index-writing, .reader-pager";
    const items =
      ".project-tile, .article-link, .detail-post, .role-card, .index-project, .index-article, .reader-pager > a, .reader-pager > button";
    const anchors = new WeakMap<Element, Element>();
    const follow = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const item = (event.target as Element).closest(items);
      const group = item?.closest(groups);
      if (!item || !group || anchors.get(group) === item) return;
      // Keep the last anchor while crossing gaps; CSS still positions the outline.
      anchors.get(group)?.removeAttribute("data-hover-anchor");
      item.setAttribute("data-hover-anchor", "");
      anchors.set(group, item);
    };
    document.addEventListener("pointerover", follow);
    return () => {
      document.removeEventListener("pointerover", follow);
      document.querySelectorAll("[data-hover-anchor]").forEach((item) => {
        item.removeAttribute("data-hover-anchor");
      });
    };
  }, []);

  const zoneBox = useCallback(
    (section: Section) =>
      getNodes().find((node) => node.id === zoneId(section))!.data.box!,
    [getNodes],
  );
  const frame = useCallback(
    (bounds: Box, animated = true, tall: "fit" | "top" = "fit") => {
      const pad = isNarrow() ? 0 : 8;
      void setViewport(
        frameViewport(
          {
            x: bounds.x - pad,
            y: bounds.y - pad,
            width: bounds.width + pad * 2,
            height: bounds.height + pad * 2,
          },
          canvasScreen(),
          { tall, minZoom: isNarrow() ? MOBILE_MIN_ZOOM : MIN_ZOOM },
        ),
        animated ? cameraMotion() : { duration: 0 },
      );
    },
    [setViewport],
  );
  const home = useCallback(
    (animated = true) =>
      mode === "wide"
        ? frame(
            unionBox([zoneBox("about"), zoneBox("projects")]),
            animated,
            "top",
          )
        : frame(zoneBox("projects"), animated, "top"),
    [frame, zoneBox, mode],
  );
  const fitAll = useCallback(
    () => frame(unionBox(SECTIONS.map((section) => zoneBox(section.id)))),
    [frame, zoneBox],
  );
  const positionSection = useCallback(
    (id: Section, view: "map" | "index", animated = true) => {
      indexNavigationTarget.current = view === "index" ? id : null;
      setActiveSection(id);
      if (view === "index") {
        const behavior = animated && duration() ? "smooth" : "instant";
        const top = indexScrollTop(id);
        if (Math.abs(scrollY - top) <= 1) indexNavigationTarget.current = null;
        scrollTo({ top, behavior });
      } else if (id === "projects") home(animated);
      else frame(zoneBox(id), animated, "top");
    },
    [home, frame, zoneBox],
  );

  const ready = useCallback(() => {
    void document.fonts.ready.then(() => {
      // Two frames: let the font-driven resize settle into the layout first.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const current = routeRef.current;
          positionSection(
            current.view === "map"
              ? (current.section ?? "projects")
              : "projects",
            "map",
            false,
          );
          setCanvasReady(true);
        }),
      );
    });
  }, [positionSection]);

  useEffect(() => {
    const change = () => {
      const next = readHash(location.hash);
      setRoute((previous) =>
        next.article ? { ...previous, article: next.article } : next,
      );
    };
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const title = articles.find(
      (article) => article.id === route.article,
    )?.title;
    document.title = title ? `${title} — Rustam` : "Rustam — a map of the work";
  }, [route.article]);

  // Frame the tile together with the spread that unfolds beneath it.
  const focusProject = useCallback(
    (id: string, center: boolean) => {
      const { positions, heights } = measureDestination(mode);
      const tile = positions[id];
      const slot = `detail-${rowOf(id, mode)}`;
      if (!tile || !positions[slot]) return;
      const bottom = positions[slot].y + (heights[slot] ?? 0);
      const bounds = {
        x: positions[slot].x - 20,
        y: tile.y - 20,
        width: CARD_WIDTH[mode].detail + 40,
        height: bottom - tile.y + 40,
      };
      const viewport = getViewport();
      const target =
        center || mode === "narrow"
          ? frameViewport(bounds, canvasScreen(), {
              tall: "top", minZoom: mode === "narrow" ? MOBILE_MIN_ZOOM : MIN_ZOOM,
            })
          : revealViewport(bounds, viewport, canvasScreen());
      if (
        Math.abs(target.x - viewport.x) > 1 ||
        Math.abs(target.y - viewport.y) > 1 ||
        Math.abs(target.zoom - viewport.zoom) > 0.001
      )
        void setViewport(target, cameraMotion());
    },
    [getViewport, setViewport, mode],
  );
  useLayoutEffect(() => {
    const requested = pendingFocus.current;
    if (requested?.id !== selected) return;
    pendingFocus.current = null;
    focusProject(requested.id, requested.center);
  }, [selected, focusProject]);
  const toggle = useCallback(
    (id: string) => {
      setActiveSection("projects");
      pendingFocus.current = selected === id ? null : { id, center: false };
      // Interrupt an earlier camera destination, including when collapsing mid-flight.
      void setViewport(getViewport());
      setSelected(selected === id ? null : id);
    },
    [selected, getViewport, setViewport],
  );
  const pinTech = useCallback(
    (tech: string | null) => {
      setPinnedTech(tech);
      if (!tech) return;
      setActiveSection("projects");
      const { positions, heights } = measureDestination(mode);
      frame(
        unionBox(
          projects
            .filter((project) => project.stack.includes(tech))
            .map((project) => ({
              ...positions[project.id],
              width: CARD_WIDTH[mode].tile,
              height: heights[project.id],
            })),
        ),
        true,
        "top",
      );
    },
    [frame, mode],
  );
  const read = useCallback((id: string) => {
    previousHash.current = location.hash || "#map";
    cameFromSite.current = true;
    location.hash = `read/${encodeURIComponent(id)}`;
  }, []);
  const closeReader = useCallback(() => {
    if (cameFromSite.current) {
      cameFromSite.current = false;
      history.back();
    } else location.hash = previousHash.current;
  }, []);
  const changeView = (view: "map" | "index") => {
    setHelp(false);
    location.hash = activeSection === "projects" ? view : `${view}/${activeSection}`;
  };
  const openProject = useCallback(
    (id: string) => {
      setActiveSection("projects");
      setPinnedTech(null);
      setHoverProject(null);
      if (routeRef.current.view !== "map" || location.hash.includes("/")) {
        exploringFromIndex.current = true;
        location.hash = "map";
      }
      if (id === selected) focusProject(id, true);
      else pendingFocus.current = { id, center: true };
      setSelected(id);
    },
    [selected, focusProject],
  );
  const goSection = useCallback(
    (id: Section, view = routeRef.current.view) => {
      indexNavigationTarget.current = view === "index" ? id : null;
      setActiveSection(id);
      const hash = `#${view}${id === "projects" ? "" : `/${id}`}`;
      setHelp(false);
      if (location.hash === hash) positionSection(id, view);
      else location.hash = hash;
    },
    [positionSection],
  );
  useEffect(() => {
    const previous = lastRoute.current;
    lastRoute.current = route;
    if (!canvasReady || route.article) return;
    if (
      previous.article &&
      route.view === previous.view &&
      route.section === previous.section
    )
      return;
    const section = route.section ?? "projects";
    setActiveSection(section);
    if (exploringFromIndex.current) {
      exploringFromIndex.current = false;
      return;
    }
    positionSection(section, route.view);
  }, [route, canvasReady, positionSection]);
  // Re-frame the current section when the layout switches between wide and narrow.
  const lastMode = useRef(mode);
  useEffect(() => {
    if (lastMode.current === mode || !canvasReady) return;
    lastMode.current = mode;
    const timer = setTimeout(() => {
      if (routeRef.current.view === "map")
        positionSection(routeRef.current.section ?? "projects", "map");
    }, 80);
    return () => clearTimeout(timer);
  }, [mode, canvasReady, positionSection]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (event.target instanceof Element &&
          event.target.closest(
            "input, textarea, select, video, [contenteditable]",
          )) ||
        route.article ||
        document.querySelector("dialog[open]")
      )
        return;
      if (event.key === "Escape") {
        if (help) setHelp(false);
        else if (pinnedTech) setPinnedTech(null);
        else setSelected(null);
        return;
      }
      if (event.key.toLowerCase() === "i") {
        const view = route.view === "map" ? "index" : "map";
        location.hash =
          activeSection === "projects" ? view : `${view}/${activeSection}`;
        return;
      }
      if (route.view !== "map") return;
      if (event.key === "?" && !event.repeat) setHelp((value) => !value);
      else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        void zoomIn(cameraMotion());
      } else if (event.key === "-") {
        event.preventDefault();
        void zoomOut(cameraMotion());
      } else if (event.key === "0" || event.key === "Home") {
        event.preventDefault();
        if (location.hash === "#map") {
          setActiveSection("projects");
          home();
        } else location.hash = "map";
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        fitAll();
      } else if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const viewport = getViewport();
        const step = event.shiftKey ? 150 : 65;
        void setViewport(
          {
            ...viewport,
            x:
              viewport.x +
              (event.key === "ArrowLeft"
                ? step
                : event.key === "ArrowRight"
                  ? -step
                  : 0),
            y:
              viewport.y +
              (event.key === "ArrowUp"
                ? step
                : event.key === "ArrowDown"
                  ? -step
                  : 0),
          },
          { ...cameraMotion(), duration: duration() ? 180 : 0 },
        );
      }
    };
    addEventListener("keydown", handleKey);
    return () => removeEventListener("keydown", handleKey);
  }, [
    route,
    activeSection,
    help,
    pinnedTech,
    home,
    fitAll,
    getViewport,
    setViewport,
    zoomIn,
    zoomOut,
  ]);

  const actions: Actions = {
    ready: canvasReady,
    mode,
    selected,
    activeSection,
    tech: hoverTech ?? pinnedTech,
    pinnedTech,
    hoverProject,
    toggle,
    openProject,
    read,
    previewTech: setHoverTech,
    pinTech,
    previewProject: setHoverProject,
    goSection,
  };
  return (
    <ActionsContext.Provider value={actions}>
      <a className="skip-link" href="#index">
        Skip to the accessible index
      </a>
      <motion.header
        className="site-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          className="identity"
          onClick={() => goSection("projects", "map")}
          aria-label="frixaco.com — back to the map"
        >
          <strong>frixaco.com</strong>
        </button>
        <nav className="view-switch" aria-label="Portfolio view">
          {(["map", "index"] as const).map((view) => (
            <button
              key={view}
              className={route.view === view ? "active" : ""}
              aria-pressed={route.view === view}
              onClick={() => changeView(view)}
              title={view === "map" ? "Explore the canvas" : "Read as a page"}
            >
              {route.view === view && (
                <motion.span
                  layoutId="view-indicator"
                  className="view-indicator"
                />
              )}
              <span className="view-label">
                {view === "map" ? "Map" : "Index"}
              </span>
            </button>
          ))}
        </nav>
        <SectionNavigation active={activeSection} navigate={goSection} />
        <nav className="external-navigation" aria-label="Contact">
          <ResumeButton className="is-header" />
          <a href={githubProfile} target="_blank" rel="noreferrer">
            GitHub <span aria-hidden>↗</span>
          </a>
          <a href="mailto:rr.ashurmatov.21@gmail.com">
            Email <span aria-hidden>↗</span>
          </a>
        </nav>
      </motion.header>
      <motion.div
        className={cx("canvas-container", canvasReady && "is-ready")}
        initial={{ opacity: 0 }}
        animate={{ opacity: canvasReady && route.view === "map" ? 1 : 0 }}
        role="main"
        aria-label="Project map"
        aria-hidden={route.view !== "map"}
        inert={route.view !== "map"}
        onFocusCapture={(event) => {
          if (
            event.relatedTarget instanceof HTMLElement &&
            event.relatedTarget.closest("dialog")
          )
            return;
          const target = event.target as HTMLElement;
          const card = target.closest<HTMLElement>("[data-card]");
          if (!card || !target.matches(":focus-visible")) return;
          const screen = canvasScreen();
          const bounds = target.getBoundingClientRect();
          if (
            bounds.left < screen.x ||
            bounds.right > screen.x + screen.width ||
            bounds.top < screen.y ||
            bounds.bottom > screen.y + screen.height
          ) {
            const node = getNodes().find(
              (item) => item.id === card.dataset.card,
            );
            if (node)
              frame(
                {
                  ...node.position,
                  width: node.measured?.width ?? 400,
                  height: Math.min(node.measured?.height ?? 300, 500),
                },
                true,
                "top",
              );
          }
        }}
      >
        <h1 className="sr-only">
          Rustam — software engineer. Projects, writing, work, and about.
        </h1>
        <Canvas onReady={ready} onSection={setActiveSection} />
        <MapControls
          home={() => goSection("projects", "map")}
          fitAll={fitAll}
          help={help}
          toggleHelp={() => setHelp((value) => !value)}
        />
      </motion.div>
      <AnimatePresence>
        {route.view === "index" && (
          <IndexView
            key="index"
            onSection={setActiveSection}
            navigationTarget={indexNavigationTarget}
          />
        )}
      </AnimatePresence>
      <div className="sr-only" role="status" aria-live="polite">
        {pinnedTech
          ? `Highlighting projects built with ${pinnedTech}`
          : selected
            ? `${projectById(selected)?.name} details open`
            : "All projects closed"}
      </div>
      <AnimatePresence>
        {route.article && (
          <Reader key="reader" id={route.article} close={closeReader} />
        )}
      </AnimatePresence>
    </ActionsContext.Provider>
  );
}

export function App() {
  const reduce = useReducedMotion();
  return (
    <MotionConfig transition={{ duration: reduce ? 0 : 0.52, ease }}>
      <ReactFlowProvider>
        <Portfolio />
      </ReactFlowProvider>
    </MotionConfig>
  );
}
