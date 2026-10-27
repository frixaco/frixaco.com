// Uploads the project demo clips from the local public/clips/ folder to the "music" Railway bucket
// (under clips/), skipping objects whose content (SHA-256) is already there.
//
//   railway run --service portfolio-web node scripts/upload-clips.ts
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { clipFiles } from '../src/content/site.ts'
import { clipKey, musicBucket } from '../src/server/bucket.ts'

const bucket = musicBucket()
if (!bucket) throw new Error('Missing MUSIC_* variables: run this through `railway run --service portfolio-web`.')
const { client, url } = bucket

for (const file of clipFiles) {
  const key = clipKey(file)
  const body = await readFile(join('public/clips', file))
  const hash = createHash('sha256').update(body).digest('hex')

  const head = await client.fetch(url(key), { method: 'HEAD' })
  if (head.ok && head.headers.get('x-amz-meta-sha256') === hash) {
    console.log(`= ${key}`)
    continue
  }

  const put = await client.fetch(url(key), {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': file.endsWith('.webm') ? 'video/webm' : 'video/mp4',
      // Re-recording a clip changes its content, not its name: revalidate daily rather than
      // pinning it forever (the presigned URL also changes daily).
      'Cache-Control': 'public, max-age=86400',
      // What the skip check above compares.
      'x-amz-meta-sha256': hash,
    },
  })
  if (!put.ok) throw new Error(`${key}: ${put.status} ${await put.text()}`)
  console.log(`+ ${key} (${(body.length / 1e6).toFixed(1)} MB)`)
}
