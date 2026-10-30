import { createFileRoute } from '@tanstack/react-router'
import { more } from '#/content/site'
import { pageHead } from '#/lib/head'

// Opens "more" over Home (rendered by _home.tsx's WindowHost).
export const Route = createFileRoute('/_home/more')({
  head: () => pageHead({ title: 'more · frixaco', path: '/more', description: more.lede }),
})
