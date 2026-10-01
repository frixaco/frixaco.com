import work from "../../src/sheets/work.md?raw";
import more from "../../src/sheets/more.md?raw";
import intro from "../../src/sheets/home.md?raw";
import contact from "../../src/sheets/contact.md?raw";
import resume from "../../src/SWE_RESUME_RUSTAM_ASHURMATOV.pdf?url";
import avatar from "./thorfinn.jpg?url";
import {
  parseAbout,
  parseLinks,
  parseRoles,
  renderArticle,
  renderMarkdown,
  splitFrontmatter,
} from "./markdown";
import { organizePosts } from "./posts";

export { avatar, resume };

export type Media = {
  type: "image" | "video";
  /** Put files in v2/public/projects/ and reference them as "/projects/name.png". */
  src: string;
  alt: string;
  poster?: string;
};
export type Project = {
  id: string;
  name: string;
  summary: string;
  description: string;
  stack: string[];
  flow: string[];
  wip?: boolean;
  url?: string;
  media?: Media[];
};

// Mirrors ../src/sheets/projects.md; stacks are the real technologies used.
// Add screenshots or recordings with `media: [{ type, src, alt }]`.
export const projects: Project[] = [
  {
    id: "letui",
    name: "LeTUI",
    summary: "Terminal UI library, built from scratch",
    description:
      "A high-performance terminal UI library with under 1 ms latency. Components and signals for state on the TypeScript side; layout and painting in a Rust core.",
    stack: ["Rust", "TypeScript", "Bun"],
    flow: ["TypeScript API", "Rust core", "Terminal"],
  },
  {
    id: "xport",
    name: "Xport",
    summary: "Export X threads, posts and articles",
    description:
      "Save threads, user posts, and articles from X as Markdown, JSON, text, or CSV. Exports run as background jobs and resume when the tab is reopened.",
    stack: ["TanStack Start", "PostgreSQL"],
    flow: ["X URL", "Background job", "MD / JSON / CSV"],
  },
  {
    id: "senmei",
    name: "Senmei",
    summary: "Anime player with in-browser 4K upscaling",
    wip: true,
    description:
      "A real-time anime player that upscales video to 4K in the browser with a WebGPU render pipeline, with MKV streaming and subtitle playback.",
    stack: ["TypeScript", "WebGPU", "WGSL"],
    flow: ["MKV stream", "WebGPU upscale", "4K frame"],
  },
  {
    id: "inza",
    name: "Inza",
    summary: "Local-first flashcards with an open deck format",
    wip: true,
    description:
      "A local-first Anki alternative with an open YAML deck format. Import notes and media, review flashcards with FSRS scheduling, and keep decks and study progress in the browser using IndexedDB.",
    stack: ["TypeScript", "React", "Dexie", "FSRS"],
    flow: ["YAML decks", "IndexedDB", "FSRS reviews"],
  },
  {
    id: "harness-bench",
    name: "Harness Bench",
    summary: "Benchmark AI coding agents side by side",
    description:
      "A browser dashboard that runs several AI coding agents in parallel, with live terminal streaming, isolated Git worktrees, and diff review.",
    stack: ["Bun", "React", "WebSockets"],
    flow: ["Agents", "Worktrees", "Diff review"],
  },
  {
    id: "frixaco.com",
    name: "This website",
    summary: "Markdown in, styled pages out",
    description:
      "Markdown sheets served as pages by a small Rust server, with minimal JS and CSS. This map is a second way to browse the same content.",
    stack: ["Rust", "Markdown", "React"],
    flow: ["Markdown", "Rust server", "Pages"],
  },
];
export const projectById = (id?: string) =>
  projects.find((project) => project.id === id);
export const sourceUrl = (id: string) => `https://github.com/frixaco/${id}`;
export const githubProfile = "https://github.com/frixaco";

// Every technology used by more than one project, in first-seen order.
export const sharedStack = [
  ...new Set(projects.flatMap((project) => project.stack)),
].filter(
  (tech) =>
    projects.filter((project) => project.stack.includes(tech)).length > 1,
);

const publishedPosts = import.meta.glob("../../src/sheets/posts/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;
const demoPosts = import.meta.env.DEV
  ? (import.meta.glob("./demo-posts/*.md", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>)
  : {};
const postSources = { ...publishedPosts, ...demoPosts };
const organized = organizePosts(
  Object.entries(postSources).map(([path, source]) => {
    const { metadata } = splitFrontmatter(source);
    return {
      id: path.split("/").pop()!.replace(/\.md$/, ""),
      title: metadata.title ?? "Untitled",
      description: metadata.description,
      date: metadata.date?.split("T")[0],
      project: projectById(metadata.project) ? metadata.project : undefined,
      series: metadata.series,
      subtitle: metadata.subtitle,
      html: renderArticle(source),
    };
  }),
);
export const articles = organized.posts;
export const postGroups = organized.groups;
export type Article = (typeof articles)[number];
export const postsFor = (projectId: string) =>
  articles.filter((article) => article.project === projectId);

function pageHtml(source: string) {
  return renderMarkdown(source)
    .replaceAll('href="/pdf"', `href="${resume}"`)
    .replaceAll('src="/pfp.jpg"', `src="${avatar}"`);
}

export const roles = parseRoles(work);
export const workHtml = pageHtml(work);
export const roleCount = roles.length || (work.match(/^- \*\*/gm)?.length ?? 0);
export const firstYear = Math.min(...roles.map((role) => role.start.year));
const aboutSource = intro.replace(/^!\[.*?\]\(.*?\)\s*/, "") + "\n" + more;
export const about = parseAbout(aboutSource);
export const favoriteArtists = [
  "WLOP",
  "offscript",
  "LAM",
  "Pluvium Grandis",
  "TZ BARD",
  "kieed",
  "Rinotuna",
  "Mika Pikazo",
  "Mogoon",
];
export const favoriteMusic = [
  "Sheeno Mirin",
  "Adomiori",
  "higma",
  "ariiol",
  "PSYQUI",
  "Aiobahn",
  "USAO",
  "Virtual Riot",
  "TeddyLoid",
  "OTIKA",
  "LanPage",
  "AIKA",
  "Hiroyuki Sawano",
  "Kevin Penkin",
  "MYTH & ROID",
];
export const favoriteAnime = [
  "Re:Zero",
  "Oregairu",
  "Koe no Katachi (movie)",
  "Frieren",
  "86",
  "Vinland Saga",
  "Vivy",
  "Violet Evergarden",
  "Made in Abyss",
  "Your Lie in April",
  "Kagejitsu",
  "Mushoku Tensei",
  "Monogatari series",
];
export const aboutHtml = pageHtml(aboutSource);
export const contacts = parseLinks(contact);
export const contactHtml = pageHtml(contact);
