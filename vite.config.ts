import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite'

import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import type { Plugin } from 'vite'

import { tracks } from './src/content/tracks'
import { musicBucket, objectKey } from './src/server/bucket'

/**
 * Builds with the bucket's credentials (Railway's) fail if a playlist track isn't in the "music"
 * bucket, instead of the player hitting a 404 in production. Run scripts/upload-music.ts first.
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
      checked ??= Promise.all(
        tracks.map(async ({ id }) => {
          const res = await bucket.client.fetch(bucket.url(objectKey(id)), { method: 'HEAD' })
          return res.ok ? null : `${objectKey(id)} (${res.status})`
        }),
      ).then((missing) => {
        const gone = missing.filter(Boolean)
        if (gone.length) throw new Error(`Not in the music bucket: ${gone.join(', ')}. Run scripts/upload-music.ts.`)
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
