import { createFileRoute } from '@tanstack/react-router'

// Scrolls Home to its section (see _home.tsx).
export const Route = createFileRoute('/_home/projects/')({
  head: () => ({ meta: [{ title: 'projects · frixaco' }] }),
})
