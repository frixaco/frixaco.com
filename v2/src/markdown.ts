import { marked } from "marked";

export function splitFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const metadata: Record<string, string> = {};
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const field = line.match(/^([\w-]+):\s*(.*?)\s*$/);
      if (field) metadata[field[1]] = field[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
  return { metadata, body: match ? source.slice(match[0].length) : source };
}

// These are checked-in, author-controlled Markdown files, never visitor input.
export function renderMarkdown(source: string) {
  return marked.parse(splitFrontmatter(source).body, { async: false });
}

const inline = (source: string) =>
  marked.parseInline(source, { async: false }) as string;
const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

export type YearMonth = { year: number; month: number };
const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
function yearMonth(text: string): YearMonth | null {
  const match = text.trim().match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/i);
  const month = match ? MONTHS.indexOf(match[1].toLowerCase()) : -1;
  return match && month >= 0 ? { year: Number(match[2]), month } : null;
}
export type Role = {
  name: string;
  nameHtml: string;
  start: YearMonth;
  end: YearMonth | null;
  period: string;
  summaryHtml: string;
};

/** Reads `- **Company - Mon YYYY - Present**` entries and their paragraph. */
export function parseRoles(source: string): Role[] {
  const roles: Role[] = [];
  const entry =
    /^- \*\*(.+) - ([A-Za-z]{3,9}\.? \d{4}) - (Present|Now|[A-Za-z]{3,9}\.? \d{4})\*\*[ \t]*\r?\n(?:[ \t]*\r?\n)*((?:[ \t]+\S.*(?:\r?\n|$))*)/gm;
  for (const match of source.matchAll(entry)) {
    const start = yearMonth(match[2]);
    const end = /present|now/i.test(match[3]) ? null : yearMonth(match[3]);
    if (!start || (end === null && !/present|now/i.test(match[3]))) continue;
    const nameHtml = inline(match[1]);
    roles.push({
      name: plain(nameHtml),
      nameHtml,
      start,
      end,
      period: `${match[2]} – ${match[3]}`,
      summaryHtml: inline(match[4].replace(/\s+/g, " ").trim()),
    });
  }
  return roles;
}

export function monthsBetween(start: YearMonth, end: YearMonth) {
  return (end.year - start.year) * 12 + end.month - start.month + 1;
}
export function formatDuration(months: number) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years && `${years} yr`, rest && `${rest} mo`]
    .filter(Boolean)
    .join(" ");
}

export type About = {
  facts: string[];
  learning: { subject: string; html: string; paused: boolean }[];
  playing?: string;
  watching?: { html: string; stat?: string };
  setup?: string;
};

/**
 * Sorts the bullet list in home.md into themed groups by their wording.
 * Anything unrecognised stays in `facts`, so no line is ever dropped
 * except the résumé link, which the profile shows as a button.
 */
export function parseAbout(source: string): About {
  const about: About = { facts: [], learning: [] };
  const bullets = splitFrontmatter(source)
    .body.split(/\r?\n/)
    .filter((line) => /^[-*] /.test(line))
    .map((line) => line.slice(2).trim());
  for (const bullet of bullets) {
    const html = inline(bullet);
    const text = plain(html).toLowerCase();
    if (/^\[?resume\]?(\(.*\))?$/i.test(bullet) || text === "resume") continue;
    if (text.startsWith("learning")) {
      const paused = /<s>|~~|\(on pause\)|paused/i.test(bullet);
      const [head, ...rest] = plain(html).split(" - ");
      const subject = head
        .replace(/^learning\s+(to\s+)?/i, "")
        .replace(/\(on pause\)/i, "")
        .trim();
      about.learning.push({
        subject: subject.charAt(0).toUpperCase() + subject.slice(1),
        html: inline(rest.join(" - ")) || html,
        paused,
      });
    } else if (text.startsWith("favorite games") && !about.playing)
      about.playing = inline(bullet.replace(/^favorite games:?\s*/i, ""));
    else if (text.startsWith("watch") && !about.watching)
      about.watching = { html, stat: bullet.match(/\((\d+\+?)\)/)?.[1] };
    else if (text.includes("dotfiles") && !about.setup) about.setup = html;
    else about.facts.push(html);
  }
  return about;
}

export function parseLinks(source: string) {
  return [...source.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map((match) => ({
    label: match[1],
    href: match[2],
  }));
}

// The reader shows the frontmatter title, so drop a heading that repeats it.
export function renderArticle(source: string) {
  const { body } = splitFrontmatter(source);
  return marked.parse(body.replace(/^\s*#{1,6} [^\n]*\n/, ""), {
    async: false,
  });
}
