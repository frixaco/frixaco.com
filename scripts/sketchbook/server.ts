// The sketchbook: a local page to draw the site's pencil marks with a pen or mouse. Each drawing
// is saved with its timing and pressure to content/marks/<id>.json, which the site replays.
//
//   pnpm sketchbook        (then open http://<this machine>:4400)
//
// Dev tool only: it listens on every interface so a tablet on the same network can reach it,
// and it can only write content/marks/<id>.json.
import { createServer } from 'node:http'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { join } from 'node:path'

const PORT = Number(process.env.PORT ?? 4400)
const root = join(import.meta.dirname, '../..')
const marksDir = join(root, 'content/marks')
const ID = /^[a-z0-9-]+$/

await mkdir(marksDir, { recursive: true })

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  const send = (status: number, body: string | Buffer, type = 'text/plain') => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
    res.end(body)
  }
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      return send(200, await readFile(join(import.meta.dirname, 'index.html')), 'text/html; charset=utf-8')
    }
    // The brushes, shared with the site.
    if (req.method === 'GET' && url.pathname === '/ink.js') {
      const ts = await readFile(join(root, 'src/lib/ink.ts'), 'utf8')
      return send(200, stripTypeScriptTypes(ts), 'text/javascript; charset=utf-8')
    }
    if (req.method === 'GET' && url.pathname === '/font.woff2') {
      return send(200, await readFile(join(root, 'public/fonts/PaperMono-Variable.woff2')), 'font/woff2')
    }
    // Every saved mark, keyed by id.
    if (req.method === 'GET' && url.pathname === '/marks') {
      const files = (await readdir(marksDir)).filter((f) => f.endsWith('.json'))
      const all: Record<string, unknown> = {}
      for (const f of files) all[f.slice(0, -5)] = JSON.parse(await readFile(join(marksDir, f), 'utf8'))
      return send(200, JSON.stringify(all), 'application/json')
    }
    const put = url.pathname.match(/^\/marks\/([^/]+)$/)
    if (req.method === 'PUT' && put && ID.test(put[1])) {
      let body = ''
      for await (const chunk of req) {
        body += chunk
        if (body.length > 5_000_000) return send(413, 'too large')
      }
      const mark = JSON.parse(body)
      await writeFile(join(marksDir, `${put[1]}.json`), `${JSON.stringify(mark)}\n`)
      return send(204, '')
    }
    send(404, 'not found')
  } catch (error) {
    send(500, String(error))
  }
}).listen(PORT, '0.0.0.0', () => console.log(`sketchbook: http://localhost:${PORT}`))
