import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '#/lib/head'

// Scrolls Home to its section (see _home.tsx).
export const Route = createFileRoute('/_home/projects/')({
  head: () => pageHead({ title: 'projects · frixaco', path: '/projects' }),
})
