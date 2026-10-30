import { createFileRoute } from '@tanstack/react-router'
import { RESUME_URL } from '#/content/site'

// The previous site linked the resume as /pdf; keep those links working.
export const Route = createFileRoute('/pdf')({
  server: {
    handlers: {
      GET: ({ request }) => Response.redirect(new URL(RESUME_URL, request.url), 301),
    },
  },
})
