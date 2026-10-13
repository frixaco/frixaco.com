import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite'

import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import type { Plugin } from 'vite'

import { clipFiles } from './src/content/site'
import { tracks } from './src/content/tracks'
import { clipKey, musicBucket, objectKey } from './src/server/bucket'

/**
 * Builds with the bucket's credentials (Railway's) fail if a playlist track or a demo clip isn't in
 * the "music" bucket, instead of a 404 in production. Run scripts/upload-music.ts and
 * scripts/upload-clips.ts first.
 */
function musicInBucket(): Plugin {
  let checked: Promise<void> | undefined
  return {
    name: 'music-in-bucket',
    apply: 'build',
    buildStart() {
      const bucket = musicBucket()
      if (!bucket) return
      // Once per build, not once per environment (client, server).
      const keys = [...tracks.map(({ id }) => objectKey(id)), ...clipFiles.map(clipKey)]
      checked ??= Promise.all(
        keys.map(async (key) => {
          const res = await bucket.client.fetch(bucket.url(key), { method: 'HEAD' })
          return res.ok ? null : `${key} (${res.status})`
        }),
      ).then((missing) => {
        const gone = missing.filter(Boolean)
        if (gone.length) {
          throw new Error(`Not in the music bucket: ${gone.join(', ')}. Run scripts/upload-music.ts / upload-clips.ts.`)
        }
      })
      return checked
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Footer "last updated": the build date, i.e. the deploy date (each deploy is a fresh build).
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  plugins: [
    wgslVitePlugin(),
    musicInBucket(),
    nitro(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
