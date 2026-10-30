// The server entry: Start's handler, with its responses compressed. Nitro serves the built
// assets itself, precompressed (vite.config.ts); pages, server functions and server routes come
// through here, and Railway's edge passes them on as they are.
import { Readable, pipeline } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { constants, createBrotliCompress, createGzip } from 'node:zlib'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

const COMPRESSIBLE = /^(text\/|application\/(json|javascript|x-ndjson|xml)|image\/svg\+xml)/

function compress(request: Request, response: Response) {
  const type = response.headers.get('content-type') ?? ''
  if (!response.body || response.headers.has('content-encoding') || !COMPRESSIBLE.test(type)) return response
  const accept = request.headers.get('accept-encoding') ?? ''
  const encoding = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null
  if (!encoding) return response

  // Flushed after every chunk, so streamed HTML (deferred loaders) still arrives as it renders.
  // Brotli at quality 5: most of the size win of 11 at a fraction of the CPU, per request.
  const encoder =
    encoding === 'br'
      ? createBrotliCompress({
          flush: constants.BROTLI_OPERATION_FLUSH,
          params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
        })
      : createGzip({ flush: constants.Z_SYNC_FLUSH })
  const source = Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>)
  const body = Readable.toWeb(pipeline(source, encoder, () => {})) as ReadableStream<Uint8Array>

  const headers = new Headers(response.headers)
  headers.set('content-encoding', encoding)
  headers.delete('content-length')
  headers.append('vary', 'Accept-Encoding')
  return new Response(body, { status: response.status, statusText: response.statusText, headers })
}

export default createServerEntry({
  async fetch(request, opts) {
    return compress(request, await handler.fetch(request, opts))
  },
})
