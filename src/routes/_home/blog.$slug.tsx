import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { SITE, pageHead } from '#/lib/head'
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
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { title, description, date, slug } = loaderData.meta
    const path = `/blog/${slug}`
    return pageHead({
      title: `${title} · frixaco`,
      path,
      description,
      type: 'article',
      meta: [
        { property: 'article:published_time', content: date },
        {
          'script:ld+json': {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: title,
            description,
            datePublished: date,
            url: SITE + path,
            author: { '@type': 'Person', name: 'Rustam Ashurmatov', url: SITE },
          },
        },
      ],
    })
  },
})
