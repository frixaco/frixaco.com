// Site copy, verbatim from the Paper mock ("frixaco.com" page of the Readout file).
// Links come from the previous site. Don't add or rephrase copy here.

export const RESUME_URL = '/SWE_RESUME_RUSTAM_ASHURMATOV.pdf'

export const headline = 'i like engineering software: interfaces, backend and tools.'

export const contacts = [
  { label: 'github', text: 'github.com/frixaco', href: 'https://github.com/frixaco' },
  { label: 'linkedin', text: 'linkedin.com/in/frixaco', href: 'https://linkedin.com/in/frixaco' },
  { label: 'x', text: 'x.com/frixaco', href: 'https://x.com/frixaco' },
  { label: 'telegram', text: 't.me/frixaco', href: 'https://t.me/frixaco' },
  { label: 'email', text: 'rr.ashurmatov.21@gmail.com', href: 'mailto:rr.ashurmatov.21@gmail.com' },
] as const

/** Category colors (Readout tokens) for tech tags. */
export const TAG_COLORS: Record<string, string> = {
  rust: 'var(--color-cat-blush)',
  typescript: 'var(--color-cat-sky)',
  bun: 'var(--color-cat-ice)',
  webgpu: 'var(--color-cat-sage)',
  wgsl: 'var(--color-cat-sage)',
  'tanstack start': 'var(--color-cat-lemon)',
  postgresql: 'var(--color-cat-periwinkle)',
}

export type ProjectId = 'letui' | 'senmei' | 'xport'

export interface Project {
  id: ProjectId
  repo: string
  name: string
  color: string
  wip?: boolean
  description: string
  tags: string[]
  /**
   * Card demo clip: `/clips/<base>.webm` (AV1) and `.mp4` (H.264), served from the bucket (see
   * clipFiles), and `/<base>.webp`, its first frame. Without one the card shows Senmei's
   * before/after compare.
   */
  clip?: { base: string; label: string; width: number; height: number }
  /** Where it runs publicly (a host, served over https). */
  site?: string
}

export const projects: Project[] = [
  {
    id: 'letui',
    repo: 'frixaco/letui',
    name: 'LeTUI',
    color: 'var(--color-cat-periwinkle)',
    description:
      'TUI library built from scratch with TypeScript and a Rust core, featuring a component-based API, signal-based state management, CSS-like styling API, a Rust-powered layout and rendering engine, and cell-based diffing.',
    tags: ['rust', 'typescript', 'bun'],
    clip: {
      base: 'letui-letty',
      label: 'Letty, the LeTUI AI agent example, answering a question about the renderer with Codex',
      width: 1478,
      height: 858,
    },
  },
  {
    id: 'senmei',
    repo: 'frixaco/senmei',
    name: 'Senmei',
    color: 'var(--color-cat-orchid)',
    description:
      'In-browser MKV video streamer and player built from scratch, featuring real-time 4K anime upscaling powered by WGSL (WebGPU) shaders ported from Anime4K.',
    tags: ['typescript', 'webgpu', 'wgsl'],
    site: 'senmei.frixaco.com',
  },
  {
    id: 'xport',
    repo: 'frixaco/xport',
    name: 'Xport',
    color: 'var(--color-cat-mustard)',
    description:
      'Web app and CLI for exporting X threads, articles, posts, and replies as Markdown or JSON, built around resumable jobs.',
    tags: ['tanstack start', 'postgresql'],
    clip: {
      base: 'xport-export',
      label: 'Xport exporting @NASA posts, stopped early and downloaded as Markdown',
      width: 1600,
      height: 900,
    },
    site: 'xport.frixaco.com',
  },
]

/** Every clip video file: what /clips serves and scripts/upload-clips.ts puts in the bucket. */
export const clipFiles = projects.flatMap((p) => (p.clip ? [`${p.clip.base}.webm`, `${p.clip.base}.mp4`] : []))

export const projectById = (id: string) => projects.find((p) => p.id === id)

/** A year-month, 1-based month. */
export type YM = readonly [year: number, month: number]

export interface Role {
  /** Each name links to its own site when it has one. */
  names: Array<{ text: string; href?: string }>
  start: YM
  /** Omitted while it's the current job. */
  end?: YM
  dates: string
  color: string
  /** The mock colors linked names as values (cyan); hitide has no link. */
  linked: boolean
  text: string
}

export const timelineLabel = '2021-present'

export const roles: Role[] = [
  {
    names: [
      { text: 'vbrato', href: 'https://vbrato.com' },
      { text: 'ekko', href: 'https://ekkohq.com' },
    ],
    start: [2023, 5],
    dates: 'may 2023 - present',
    color: 'var(--color-cat-violet)',
    linked: true,
    text: 'Paid music collaborations and song-cover campaigns for artists worldwide. Led frontend and backend development across both products, built the Next.js frontend from scratch, and owned payments, payouts, and mobile audio features. Cut data processing for 1M+ artists from nine days to seven hours and roughly halved Soundcharts costs.',
  },
  {
    names: [{ text: 'geoalert', href: 'https://geoalert.io' }],
    start: [2022, 12],
    end: [2023, 6],
    dates: 'dec 2022 - jun 2023',
    color: 'var(--color-cat-sage)',
    linked: true,
    text: 'AI mapping platform for satellite and aerial imagery. Built high-performance React interfaces for large imagery datasets, simplified component state and data flow, and helped move users to centralized sign-in with zero downtime.',
  },
  {
    names: [{ text: 'livereach', href: 'https://livereach.com' }],
    start: [2021, 11],
    end: [2023, 1],
    dates: 'nov 2021 - jan 2023',
    color: 'var(--color-cat-sky)',
    linked: true,
    text: 'Social content and analytics platform with shoppable feeds for brands. Led React adoption within an Angular application and improved embedded app performance for e-commerce sites across Europe. Built a custom state manager that cut the JavaScript bundle by 20% and automated package publishing.',
  },
  {
    names: [{ text: 'hitide' }],
    start: [2020, 12],
    end: [2021, 2],
    dates: 'dec 2020 - feb 2021',
    color: 'var(--color-cat-lemon)',
    linked: false,
    text: "Online clothing brand. Fully automated stock updates with a tested pipeline that transformed Airtable inventory data and stored it in the website's database.",
  },
  {
    names: [{ text: 'moishlem', href: 'https://www.instagram.com/moishlem' }],
    start: [2020, 8],
    end: [2021, 10],
    dates: 'aug 2020 - oct 2021',
    color: 'var(--color-cat-blush)',
    linked: true,
    text: 'Online sports insurance company for individuals, tournaments, etc. Built payment and subscription workflows and internal support tools, redesigned the PostgreSQL schema, and consolidated two backends into one codebase.',
  },
]

// The "more" window (opened from the bar under the blog). Your copy, split into sections.
export const more = {
  /** Follows "more" in the links that open it, for screen readers and search engines only:
   *  "more" alone doesn't say where it leads. */
  linkSuffix: 'about me',
  lede: 'embracing ai (before it "embraces" me), self-taught, live inside my terminal, neovim btw.',
  pc: {
    title: 'pc (my baby)',
    specs: [
      { part: 'cpu', model: 'AMD Ryzen 7 5800X' },
      { part: 'gpu', model: 'AMD Radeon RX 9070 XT' },
      { part: 'ram', model: '32GB DDR4' },
      { part: 'monitor', model: 'ASUS TUF 27" 1440P' },
      { part: 'mouse', model: 'Logitech G502 X' },
      { part: 'drawing tablet', model: 'XPPen Deco 01 V3' },
    ],
  },
  games: {
    title: 'favorite games',
    titles: ['sekiro', 'osu!', 'monster hunter world', 'elden ring', 'lies of p'],
    more: 'and more',
  },
  anime: { title: 'anime & manga', count: '272+', unit: 'anime', note: '& reading manga - very picky nowadays.' },
  learning: {
    title: 'learning',
    items: [
      { name: 'blender', text: 'animation project is coming along well, learning a lot about topology and shaders.' },
      { name: 'to make music', text: 'garbage-oriented noise-driven development.' },
      { name: 'japanese', paused: '(on pause)', text: 'kana, ~100 vocab and base grammar are done.' },
    ],
  },
}

export const SECTIONS = ['about', 'projects', 'work', 'blog', 'more'] as const
export type Section = (typeof SECTIONS)[number]
