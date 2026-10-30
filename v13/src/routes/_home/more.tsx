import { createFileRoute } from '@tanstack/react-router'

// Opens "more" over Home (rendered by _home.tsx's WindowHost).
export const Route = createFileRoute('/_home/more')({
  head: () => ({ meta: [{ title: 'more · frixaco' }] }),
})
