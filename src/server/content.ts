// Blog posts from content/posts/*.md, bundled into the server at build time.
import { projectById } from '#/content/site'
import { renderMarkdown } from './markdown'

const files = import.meta.glob<string>('../../content/posts/*.md', { query: '?raw', import: 'default', eager: true })

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string
  /** The project the post is about (its color marks measured values). */
  project?: string
  tags: string[]
}

function parse(path: string, raw: string) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw)
  const data: Record<string, string> = {}
  for (const line of (match?.[1] ?? '').split('\n')) {
    const kv = /^(\w+):\s*"?(.*?)"?\s*$/.exec(line)
    if (kv) data[kv[1]] = kv[2]
  }
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const meta: PostMeta = {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    date: data.date ?? '',
    project: data.project,
    // A post's tags are its project's stack.
    tags: projectById(data.project ?? '')?.tags ?? [],
  }
  return { meta, body: raw.slice(match?.[0].length ?? 0) }
}

const posts = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .sort((a, b) => b.meta.date.localeCompare(a.meta.date))

export const postList = (): PostMeta[] => posts.map((p) => p.meta)

const renderedCache = new Map<string, ReturnType<typeof renderMarkdown>>()

export function postBySlug(slug: string) {
  const post = posts.find((p) => p.meta.slug === slug)
  if (!post) return null
  let rendered = renderedCache.get(slug)
  if (!rendered) {
    rendered = renderMarkdown(post.body)
    renderedCache.set(slug, rendered)
  }
  return { meta: post.meta, ...rendered }
}
