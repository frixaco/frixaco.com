import { createFileRoute } from '@tanstack/react-router'
import { contacts } from '#/content/site'
import { SITE, pageHead } from '#/lib/head'

// Who the site is about, for search engines.
const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Rustam Ashurmatov',
  alternateName: 'frixaco',
  url: SITE,
  image: `${SITE}/pfp.jpg`,
  sameAs: contacts.flatMap((c) => (c.href.startsWith('http') ? [c.href] : [])),
}

export const Route = createFileRoute('/_home/')({
  head: () => pageHead({ title: 'frixaco', path: '/', meta: [{ 'script:ld+json': person }] }),
})
