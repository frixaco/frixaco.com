// The "music" Railway bucket (S3-compatible), from the MUSIC_* variables Railway references into
// the portfolio-web service: the player's audio, and the project demo clips under clips/. Shared by
// the /music and /clips routes, the upload scripts and the build check.
// No relative/alias imports: scripts and vite.config.ts load this file directly.
import { AwsClient } from 'aws4fetch'

export interface Bucket {
  client: AwsClient
  /** Virtual-hosted URL of an object (what the bucket's Credentials tab asks for). */
  url(key: string): URL
}

/** null without credentials (local dev, local builds). */
export function musicBucket(env: Record<string, string | undefined> = process.env): Bucket | null {
  const { MUSIC_BUCKET, MUSIC_ENDPOINT, MUSIC_ACCESS_KEY_ID, MUSIC_SECRET_ACCESS_KEY } = env
  if (!MUSIC_BUCKET || !MUSIC_ENDPOINT || !MUSIC_ACCESS_KEY_ID || !MUSIC_SECRET_ACCESS_KEY) return null
  const endpoint = new URL(MUSIC_ENDPOINT)
  return {
    // Railway buckets sign with region "auto".
    client: new AwsClient({
      accessKeyId: MUSIC_ACCESS_KEY_ID,
      secretAccessKey: MUSIC_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto',
    }),
    url: (key) => new URL(`${endpoint.protocol}//${MUSIC_BUCKET}.${endpoint.host}/${key}`),
  }
}

/** Bucket key of a track: its id plus the file's extension. */
export const objectKey = (id: string) => `${id}.m4a`

/** Bucket key of a project demo clip file (`letui-letty.webm`). */
export const clipKey = (file: string) => `clips/${file}`
