// PostHog's reverse proxy: the browser talks to /ingest on this origin, which forwards to PostHog
// (US Cloud). Scripts and remote config come from the assets host, events go to the API host.
import { createFileRoute } from '@tanstack/react-router'

const API_HOST = 'us.i.posthog.com'
const ASSET_HOST = 'us-assets.i.posthog.com'

async function proxy({ request, params }: { request: Request; params: { _splat?: string } }) {
  const path = `/${params._splat ?? ''}`
  const host = path.startsWith('/static/') || path.startsWith('/array/') ? ASSET_HOST : API_HOST
  const url = new URL(path, `https://${host}`)
  url.search = new URL(request.url).search

  const headers = new Headers(request.headers)
  for (const name of ['host', 'cookie', 'authorization', 'connection']) headers.delete(name)
  // The visitor's IP, not this server's: PostHog derives location and the cookieless visitor hash
  // from it. Railway's edge puts it in X-Real-IP.
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (ip) headers.set('x-forwarded-for', ip)
  headers.set('x-forwarded-host', new URL(request.url).host)

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  const res = await fetch(url, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  }).catch(() => null)
  if (!res) return new Response('Bad gateway', { status: 502 })

  // fetch already decoded the body: drop the headers that describe the encoded one.
  const out = new Headers(res.headers)
  out.delete('content-encoding')
  out.delete('content-length')
  return new Response(res.body, { status: res.status, headers: out })
}

export const Route = createFileRoute('/ingest/$')({
  server: { handlers: { GET: proxy, POST: proxy, OPTIONS: proxy } },
})
