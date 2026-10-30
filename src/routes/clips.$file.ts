// The project demo clips. In production they live in the "music" Railway bucket under clips/:
// this answers with a redirect to a presigned URL, so the browser streams (and seeks) straight
// from the bucket. Locally they sit in public/clips/ (git-ignored), which is served before this
// route ever runs.
import { createFileRoute } from '@tanstack/react-router'
import { clipFiles } from '#/content/site'
import { clipKey, musicBucket } from '#/server/bucket'

const DAY = 86_400

/** S3 date-time format: 20261011T000000Z. */
const amzDate = (date: Date) => date.toISOString().replace(/[:-]|\.\d{3}/g, '')

export const Route = createFileRoute('/clips/$file')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!clipFiles.includes(params.file)) return new Response(null, { status: 404 })
        const bucket = musicBucket()
        if (!bucket) return new Response(null, { status: 404 })
        const url = bucket.url(clipKey(params.file))
        url.searchParams.set('X-Amz-Expires', String(2 * DAY))
        // Signed as of the start of the UTC day: the same URL all day, so the browser's cache of
        // the video keeps working. <video> loads without CORS, so one URL serves every request.
        const date = new Date(Math.floor(Date.now() / (DAY * 1000)) * DAY * 1000)
        const signed = await bucket.client.sign(url, { aws: { signQuery: true, datetime: amzDate(date) } })
        return new Response(null, {
          status: 302,
          headers: { Location: signed.url, 'Cache-Control': 'public, max-age=3600' },
        })
      },
    },
  },
})
