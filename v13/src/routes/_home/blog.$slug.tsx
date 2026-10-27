import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { getPost } from '#/server/functions'

// Opens a blog post over Home (rendered by _home.tsx's WindowHost).
export const Route = createFileRoute('/_home/blog/$slug')({
  loader: async ({ params }) => {
    // The previous site linked posts as /blog/<slug>.md.
    if (params.slug.endsWith('.md')) {
      throw redirect({ to: '/blog/$slug', params: { slug: params.slug.slice(0, -3) }, statusCode: 301 })
    }
    const post = await getPost({ data: params.slug })
    if (!post) throw notFound()
    return post
  },
  staleTime: Infinity,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.meta.title} · frixaco` },
          { name: 'description', content: loaderData.meta.description },
        ]
      : [],
  }),
})
