// Server functions: everything fetched or rendered on the server lives behind these.
import { createServerFn } from '@tanstack/react-start'
import { projectById } from '#/content/site'
import { cached } from './cache'
import { postBySlug, postList } from './content'
import { sizeImages } from './images'
import { renderMarkdown } from './markdown'

export const getPosts = createServerFn({ method: 'GET' }).handler(async () => postList())

export const getPost = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => postBySlug(slug))

const HOUR = 60 * 60 * 1000

/** A project's README from GitHub, rendered to HTML; cached for an hour. */
export const getReadme = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const project = projectById(id)
    if (!project) return null
    const { repo } = project
    return cached(`readme:${repo}`, HOUR, async () => {
      const res = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/README.md`, {
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`README ${repo}: ${res.status}`)
      const rendered = renderMarkdown(await res.text(), {
        resolve: (url, image) =>
          `https://${image ? 'raw.githubusercontent.com' : 'github.com'}/${repo}/${image ? '' : 'blob/'}HEAD/${url.replace(/^\.?\//, '')}`,
      })
      return { ...rendered, html: await sizeImages(rendered.html) }
    })
  })

export interface NpmInfo {
  version: string
  unpackedSize: number
  dependencies: number
}

/** Live npm registry data for @frixaco/xport; cached for an hour. */
export const getXportNpm = createServerFn({ method: 'GET' }).handler(async (): Promise<NpmInfo> =>
  cached('npm:@frixaco/xport', HOUR, async () => {
    const res = await fetch('https://registry.npmjs.org/@frixaco%2Fxport/latest', { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`npm: ${res.status}`)
    const pkg = (await res.json()) as { version: string; dist: { unpackedSize: number }; dependencies?: object }
    return {
      version: pkg.version,
      unpackedSize: pkg.dist.unpackedSize,
      dependencies: Object.keys(pkg.dependencies ?? {}).length,
    }
  }),
)
