// Sets the "music" Railway bucket's CORS rules, then uploads the player's tracks from the local
// music/ folder, skipping objects whose content (SHA-256) is already there.
//
//   railway run --service portfolio-web node scripts/upload-music.ts
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tracks } from '../src/content/tracks.ts'
import { musicBucket, objectKey } from '../src/server/bucket.ts'

const bucket = musicBucket()
if (!bucket) throw new Error('Missing MUSIC_* variables: run this through `railway run --service portfolio-web`.')
const { client, url } = bucket
const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex')

// First, so a failed upload never leaves a bucket that plays silent: the player reads the audio
// through Web Audio (the visualizer), so it loads it with CORS. Any origin: the audio is public
// (anyone can get a link from /music/<id>) and the requests carry no credentials, so www, the
// Railway domain, previews and local builds on any port all work.
const cors = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>Content-Range</ExposeHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <ExposeHeader>Accept-Ranges</ExposeHeader>
    <MaxAgeSeconds>86400</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`
const res = await client.fetch(`${url('')}?cors`, {
  method: 'PUT',
  body: cors,
  headers: { 'Content-Type': 'application/xml', 'Content-MD5': createHash('md5').update(cors).digest('base64') },
})
if (!res.ok) throw new Error(`CORS: ${res.status} ${await res.text()}`)
console.log('CORS rules set')

// Japanese names can sit on disk decomposed (NFD); match them composed.
const dir = 'music'
const onDisk = new Map((await readdir(dir)).map((name) => [name.normalize('NFC'), name]))

for (const track of tracks) {
  const key = objectKey(track.id)
  const name = onDisk.get(track.file.normalize('NFC'))
  if (!name) throw new Error(`Missing music/${track.file}`)
  const body = await readFile(join(dir, name))
  const hash = sha256(body)

  const head = await client.fetch(url(key), { method: 'HEAD' })
  if (head.ok && head.headers.get('x-amz-meta-sha256') === hash) {
    console.log(`= ${key}`)
    continue
  }

  const put = await client.fetch(url(key), {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': 'audio/mp4',
      'Cache-Control': 'public, max-age=31536000, immutable',
      // What the skip check above compares.
      'x-amz-meta-sha256': hash,
    },
  })
  if (!put.ok) throw new Error(`${key}: ${put.status} ${await put.text()}`)
  console.log(`+ ${key} (${(body.length / 1e6).toFixed(1)} MB)`)
}
