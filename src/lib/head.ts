// A page's <head> for search engines and link previews: title, description and canonical URL.
// The root route sets the defaults; a page's own tags replace them (meta by name or property).

export const SITE = 'https://frixaco.com'

interface Page {
  title: string
  /** The page's own URL path. */
  path: string
  description?: string
  type?: 'website' | 'article'
  meta?: Array<Record<string, unknown>>
}

export function pageHead({ title, path, description, type = 'website', meta = [] }: Page) {
  const url = SITE + path
  return {
    meta: [
      { title },
      { property: 'og:title', content: title },
      { property: 'og:url', content: url },
      { property: 'og:type', content: type },
      ...(description
        ? [
            { name: 'description', content: description },
            { property: 'og:description', content: description },
          ]
        : []),
      ...meta,
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}
