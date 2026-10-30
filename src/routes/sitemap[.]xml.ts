// Every page with its own URL, for search engines (robots.txt points here).
import { createFileRoute } from '@tanstack/react-router'
import { projects } from '#/content/site'
import { SITE } from '#/lib/head'
import { postList } from '#/server/content'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const pages = [
          { path: '/', lastmod: __BUILD_DATE__ },
          { path: '/projects' },
          { path: '/work' },
          { path: '/blog' },
          { path: '/more' },
          ...postList().map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.date.slice(0, 10) })),
          ...projects.map((p) => ({ path: `/projects/${p.id}` })),
        ]
        const urls = pages
          .map(({ path, lastmod }) => `<url><loc>${SITE}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
          .join('')
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
          { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } },
        )
      },
    },
  },
})
