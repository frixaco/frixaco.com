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

export type ProjectId = 'letui' | 'senmei' | 'xport'

interface Picture {
  src: string
  width: number
  height: number
  alt: string
}

/** Under a project's title: a clip (/clips/<name>.webm and .mp4 from the bucket, see clipFiles;
 *  poster public/<name>.webp),
 *  or two frames to compare with a slider. Copy from the previous site. */
export type Demo =
  | { kind: 'clip'; name: string; width: number; height: number; label: string }
  | { kind: 'compare'; label: string; before: Picture & { tag: string }; after: Picture & { tag: string } }

export interface Project {
  id: ProjectId
  repo: string
  name: string
  description: string
  tags: string[]
  /** Where it runs publicly (a host, served over https). */
  site?: string
  demo: Demo
}

export const projects: Project[] = [
  {
    id: 'letui',
    repo: 'frixaco/letui',
    name: 'LeTUI',
    description:
      'TUI library built from scratch with TypeScript and a Rust core, featuring a component-based API, signal-based state management, CSS-like styling API, a Rust-powered layout and rendering engine, and cell-based diffing.',
    tags: ['rust', 'typescript', 'bun'],
    demo: {
      kind: 'clip',
      name: 'letui-letty',
      width: 1478,
      height: 858,
      label: 'Letty, the LeTUI AI agent example, answering a question about the renderer with Codex',
    },
  },
  {
    id: 'senmei',
    repo: 'frixaco/senmei',
    name: 'Senmei',
    description:
      'In-browser MKV video streamer and player built from scratch, featuring real-time 4K anime upscaling powered by WGSL (WebGPU) shaders ported from Anime4K.',
    tags: ['typescript', 'webgpu', 'wgsl'],
    site: 'senmei.frixaco.com',
    demo: {
      kind: 'compare',
      label: 'Compare original and anime4k',
      before: { tag: 'original', src: '/senmei-original.webp', width: 720, height: 394, alt: 'Anime frame at its source 1080p' },
      after: {
        tag: 'anime4k',
        src: '/senmei-anime4k.webp',
        width: 1440,
        height: 788,
        alt: "Same frame upscaled to 4K by Senmei's Anime4K pipeline",
      },
    },
  },
  {
    id: 'xport',
    repo: 'frixaco/xport',
    name: 'Xport',
    description:
      'Web app and CLI for exporting X threads, articles, posts, and replies as Markdown or JSON, built around resumable jobs.',
    tags: ['tanstack start', 'postgresql'],
    site: 'xport.frixaco.com',
    demo: {
      kind: 'clip',
      name: 'xport-export',
      width: 1600,
      height: 900,
      label: 'Xport exporting @NASA posts, stopped early and downloaded as Markdown',
    },
  },
]

export const projectById = (id: string) => projects.find((p) => p.id === id)

/** Every demo clip file: what /clips serves and scripts/upload-clips.ts puts in the bucket. */
export const clipFiles = projects.flatMap(({ demo }) => (demo.kind === 'clip' ? [`${demo.name}.webm`, `${demo.name}.mp4`] : []))

export interface Role {
  /** Each name links to its own site when it has one. */
  names: Array<{ text: string; href?: string }>
  dates: string
  text: string
}

export const roles: Role[] = [
  {
    names: [
      { text: 'vbrato', href: 'https://vbrato.com' },
      { text: 'ekko', href: 'https://ekkohq.com' },
    ],
    dates: 'may 2023 - present',
    text: 'Paid music collaborations and song-cover campaigns for artists worldwide. Led frontend and backend development across both products, built the Next.js frontend from scratch, and owned payments, payouts, and mobile audio features. Cut data processing for 1M+ artists from nine days to seven hours and roughly halved Soundcharts costs.',
  },
  {
    names: [{ text: 'geoalert', href: 'https://geoalert.io' }],
    dates: 'dec 2022 - jun 2023',
    text: 'AI mapping platform for satellite and aerial imagery. Built high-performance React interfaces for large imagery datasets, simplified component state and data flow, and helped move users to centralized sign-in with zero downtime.',
  },
  {
    names: [{ text: 'livereach', href: 'https://livereach.com' }],
    dates: 'nov 2021 - jan 2023',
    text: 'Social content and analytics platform with shoppable feeds for brands. Led React adoption within an Angular application and improved embedded app performance for e-commerce sites across Europe. Built a custom state manager that cut the JavaScript bundle by 20% and automated package publishing.',
  },
  {
    names: [{ text: 'hitide' }],
    dates: 'dec 2020 - feb 2021',
    text: "Online clothing brand. Fully automated stock updates with a tested pipeline that transformed Airtable inventory data and stored it in the website's database.",
  },
  {
    names: [{ text: 'moishlem', href: 'https://www.instagram.com/moishlem' }],
    dates: 'aug 2020 - oct 2021',
    text: 'Online sports insurance company for individuals, tournaments, etc. Built payment and subscription workflows and internal support tools, redesigned the PostgreSQL schema, and consolidated two backends into one codebase.',
  },
]

// The "more" window (opened from the bar under the blog). Your copy, split into sections.
export const more = {
  /** Follows "more" in the links that open it, for screen readers and search engines only:
   *  "more" alone doesn't say where it leads. */
  linkSuffix: 'about me',
  lede: "self-taught. embracing ai and having fun with it. lived inside my terminal (neovim btw), but nowadays i'm all over the place. i love fast, efficient things, and i like to draw.",
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
    titles: [
      'sekiro',
      'osu!',
      'monster hunter world',
      'elden ring',
      'lies of p',
      'detroit: become human',
      'metro series',
      'sifu',
      'valheim',
      'wuthering waves',
    ],
    more: 'and more',
  },
  anime: {
    title: 'anime & manga',
    count: '272+',
    unit: 'anime',
    note: '& reading manga - very picky nowadays.',
    favorites: [
      {
        kind: 'shows',
        titles: [
          're:zero',
          'oregairu',
          'frieren',
          '86 (eighty six)',
          'vinland saga',
          'mushoku tensei',
          'monogatari series',
          'violet evergarden',
          'made in abyss',
          'your lie in april',
          'tokyo ghoul',
        ],
        more: 'and more',
      },
      { kind: 'movies', titles: ['a silent voice'] },
    ],
  },
  learning: {
    title: 'learning',
    items: [
      { name: 'blender', text: 'animation project is coming along well, learning a lot about topology and shaders.' },
      { name: 'music', text: 'garbage-oriented noise-driven development.' },
      { name: 'japanese', paused: '(on pause)', text: 'kana, ~100 vocab and base grammar are done.' },
    ],
  },
}

export const SECTIONS = ['about', 'projects', 'work', 'blog', 'more'] as const
export type Section = (typeof SECTIONS)[number]
