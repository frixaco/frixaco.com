// Intrinsic sizes for README images, so the browser reserves their space before they
// load and the opened README doesn't jump as screenshots arrive (server only).

type Size = { width: number; height: number }

/** Width and height from the first bytes of a PNG or GIF, or from an SVG's own attributes. */
function parse(bytes: Uint8Array, text: () => string): Size | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // PNG: signature, then the IHDR chunk's width and height (big-endian).
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47) {
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }
  // GIF: "GIF8", then the logical screen size (little-endian).
  if (bytes.length >= 10 && view.getUint32(0) === 0x47494638) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) }
  }
  const svg = text().match(/<svg\b[^>]*>/)?.[0]
  if (svg) {
    const attr = (name: string) => Number(svg.match(new RegExp(`\\s${name}="([\\d.]+)(?:px)?"`))?.[1])
    const box = svg.match(/viewBox="[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/)
    const width = attr('width') || Number(box?.[1])
    const height = attr('height') || Number(box?.[2])
    if (width > 0 && height > 0) return { width: Math.round(width), height: Math.round(height) }
  }
  return null
}

async function measure(src: string): Promise<Size | null> {
  try {
    const svg = /\.svg(\?|$)/i.test(src)
    const res = await fetch(src, {
      headers: svg ? {} : { Range: 'bytes=0-63' },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    return parse(bytes, () => new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

/** Adds width/height to every <img> that has neither; images that can't be measured stay as they are. */
export async function sizeImages(html: string): Promise<string> {
  const tags = [...new Set(html.match(/<img\b[^>]*>/g) ?? [])].filter((tag) => !/\s(width|height)=/.test(tag))
  const sized = await Promise.all(
    tags.map(async (tag) => {
      const src = tag.match(/\ssrc="([^"]+)"/)?.[1]
      const size = src ? await measure(src.replace(/&amp;/g, '&')) : null
      return [tag, size ? tag.replace(/^<img/, `<img width="${size.width}" height="${size.height}"`) : tag] as const
    }),
  )
  for (const [from, to] of sized) html = html.split(from).join(to)
  return html
}
