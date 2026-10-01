// Pure post organization, kept free of Vite imports so it is unit-testable.
// Frontmatter fields (all optional except title/date):
//   project:  id of the project the post is about (links it both ways)
//   series:   posts sharing a series name are grouped and numbered by date
//   subtitle: short label used in lists; falls back to the title

export type PostMeta = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  project?: string;
  series?: string;
  subtitle?: string;
  html: string;
};
export type Post = PostMeta & {
  label: string;
  group: string;
  part?: number;
  parts?: number;
};
export type PostGroup = {
  id: string;
  series?: string;
  project?: string;
  posts: Post[];
};

const byDate = (a: PostMeta, b: PostMeta) =>
  (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id);

export function organizePosts(input: PostMeta[]) {
  const sorted = [...input].sort(byDate);
  const series = new Map<string, PostMeta[]>();
  const loose: PostMeta[] = [];
  for (const post of sorted) {
    if (post.series) {
      if (!series.has(post.series)) series.set(post.series, []);
      series.get(post.series)!.push(post);
    } else loose.push(post);
  }
  const groups: PostGroup[] = [];
  for (const [name, members] of series) {
    const projects = new Set(members.map((post) => post.project));
    const id = `series-${slug(name)}`;
    groups.push({
      id,
      series: name,
      project: projects.size === 1 ? members[0].project : undefined,
      // Series read in order, oldest first.
      posts: members.map((post, index) => ({
        ...post,
        label: post.subtitle || post.title,
        group: id,
        part: index + 1,
        parts: members.length,
      })),
    });
  }
  if (loose.length)
    groups.push({
      id: "posts",
      // Standalone posts read newest first.
      posts: [...loose].reverse().map((post) => ({
        ...post,
        label: post.subtitle || post.title,
        group: "posts",
      })),
    });
  const latest = (group: PostGroup) =>
    group.posts
      .map((post) => post.date ?? "")
      .sort()
      .at(-1) ?? "";
  groups.sort((a, b) => latest(b).localeCompare(latest(a)));
  const posts = groups.flatMap((group) => group.posts);
  return { groups, posts };
}

export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
