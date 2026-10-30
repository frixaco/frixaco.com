import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '#/lib/head'

// Scrolls Home to its section (see _home.tsx): the same page as /, so that is its canonical URL.
export const Route = createFileRoute('/_home/work')({
  head: () => pageHead({ title: 'work · frixaco', path: '/' }),
})
