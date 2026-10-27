import { createFileRoute, notFound } from '@tanstack/react-router'
import { projectById } from '#/content/site'
import { loadReadme } from '#/lib/readme'

// Opens a project's README over Home (rendered by _home.tsx's WindowHost).
export const Route = createFileRoute('/_home/projects/$repo')({
  loader: ({ params }) => {
    if (!projectById(params.repo)) throw notFound()
    // Fetched from GitHub on the server (cached); streams into the window. Usually
    // already loaded in the browser (see Projects), so this resolves at once.
    return { readme: loadReadme(params.repo) }
  },
  head: ({ params }) => ({ meta: [{ title: `${projectById(params.repo)?.repo ?? params.repo} · frixaco` }] }),
})
