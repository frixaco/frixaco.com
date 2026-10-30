import { createFileRoute, notFound } from '@tanstack/react-router'
import { projectById } from '#/content/site'
import { pageHead } from '#/lib/head'
import { loadReadme } from '#/lib/readme'

// Opens a project's README over Home (rendered by _home.tsx's WindowHost).
export const Route = createFileRoute('/_home/projects/$repo')({
  loader: ({ params }) => {
    if (!projectById(params.repo)) throw notFound()
    // Fetched from GitHub on the server (cached); streams into the window.
    return { readme: loadReadme(params.repo) }
  },
  head: ({ params }) => {
    const project = projectById(params.repo)
    return pageHead({
      title: `${project?.repo ?? params.repo} · frixaco`,
      path: `/projects/${params.repo}`,
      description: project?.description,
    })
  },
})
