import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

// Placeholder until the Home screen from the Paper mock is built.
function Home() {
  return (
    <main className="page">
      <p>frixaco.com</p>
      <p>last updated {__BUILD_DATE__}</p>
    </main>
  )
}
