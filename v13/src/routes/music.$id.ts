// The player's audio. In production it lives in the "music" Railway bucket: this answers with a
// redirect to a presigned URL, so the browser streams (and seeks) straight from the bucket, whose
// egress is free. Without bucket credentials (local dev) it streams the file from music/ instead.
import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import { createFileRoute } from '@tanstack/react-router'
import { tracks } from '#/content/tracks'
import { musicBucket, objectKey } from '#/server/bucket'

const DAY = 86_400

/** S3 date-time format: 20261011T000000Z. */
const amzDate = (date: Date) => date.toISOString().replace(/[:-]|\.\d{3}/g, '')

export const Route = createFileRoute('/music/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const track = tracks.find((t) => t.id === params.id)
        if (!track) return new Response(null, { status: 404 })
        const bucket = musicBucket()
        if (!bucket) {
          if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 })
          return streamLocal(request, track.file)
        }
        const url = bucket.url(objectKey(track.id))
        url.searchParams.set('X-Amz-Expires', String(2 * DAY))
        // The player (a CORS request) gets a URL signed as of the start of the UTC day: the same
        // URL all day, so the browser's cache of the audio keeps working, valid for at least a day.
        // Anything else (opening the link in a tab) gets its own URL: the bucket doesn't send
        // Vary: Origin, so a cached copy without CORS headers must never be the player's.
        const cors = (request.headers.get('sec-fetch-mode') ?? 'cors') === 'cors'
        const date = cors ? new Date(Math.floor(Date.now() / (DAY * 1000)) * DAY * 1000) : new Date()
        const signed = await bucket.client.sign(url, { aws: { signQuery: true, datetime: amzDate(date) } })
        return new Response(null, {
          status: 302,
          headers: { Location: signed.url, 'Cache-Control': 'public, max-age=3600', Vary: 'Sec-Fetch-Mode' },
        })
      },
    },
  },
})

/** Dev only: the file from music/, with byte ranges (media seeking needs 206 responses). */
async function streamLocal(request: Request, file: string) {
  // Japanese names can sit on disk decomposed (NFD): match them composed.
  const dir = resolve('music')
  const name = (await readdir(dir).catch(() => [])).find((n) => n.normalize('NFC') === file.normalize('NFC'))
  if (!name) return new Response(null, { status: 404 })
  const path = resolve(dir, name)
  const { size } = await stat(path)

  const headers: Record<string, string> = { 'Content-Type': 'audio/mp4', 'Accept-Ranges': 'bytes' }
  let start = 0
  let end = size - 1
  const range = request.headers.get('range')
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (m && (m[1] || m[2])) {
      // "bytes=-N" is the last N bytes.
      start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]))
      end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
    }
    if (!m || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } })
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`
  }
  headers['Content-Length'] = String(end - start + 1)
  const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream<Uint8Array>
  return new Response(body, { status: range ? 206 : 200, headers })
}
