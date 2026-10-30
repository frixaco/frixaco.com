import { createFileRoute } from '@tanstack/react-router'

// Scrolls Home to its section (see _home.tsx).
export const Route = createFileRoute('/_home/work')({
  head: () => ({ meta: [{ title: 'work · frixaco' }] }),
})
