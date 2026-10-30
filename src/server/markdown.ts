// Markdown -> HTML for blog posts and project READMEs (server only).
// Headings get ids for the contents rail; code blocks get a language bar;
// a paragraph that is only a GitHub user-attachments URL becomes a video.
import { Marked, type Tokens } from 'marked'

export interface Heading {
  depth: number
  text: string
  id: string
}

export interface Rendered {
  html: string
  headings: Heading[]
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

/**
 * Measured values in prose (8.85ms, 81%, 120+fps, 3x, 16MB) — the substance of a devlog.
 * They get the project's color, as the same kind of numbers do on its card.
 */
const MEASURE = /(?<![\w.#/&-])~?\d[\d,_]*(?:\.\d+)?\+?(?:\s?(?:ms|µs|ns|fps|MB|KB|kB|GB)|%|x)(?![\w%])/g
const markMeasures = (html: string) => html.replace(MEASURE, '<span class="md-measure">$&</span>')

const ATTACHMENT = /^https:\/\/github\.com\/user-attachments\/assets\/[\w-]+$/

interface Options {
  /** Turns a relative URL into an absolute one (READMEs); `image` is true for images. */
  resolve?: (url: string, image: boolean) => string
}

const isRelative = (url: string) => !/^([a-z]+:|#|\/\/)/i.test(url)

export function renderMarkdown(source: string, { resolve }: Options = {}): Rendered {
  const headings: Heading[] = []
  const used = new Map<string, number>()
  const url = (href: string, image: boolean) => (resolve && isRelative(href) ? resolve(href, image) : href)
  // Heading levels without gaps (a post's #### right under ## is an h3), so the outline a screen
  // reader reads has no holes: the level is how deep the heading sits under the ones before it.
  // data-depth keeps the written depth, which the styles follow.
  const open: number[] = []

  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens)
        const base = slugify(text) || 'section'
        const n = used.get(base) ?? 0
        used.set(base, n + 1)
        const id = n ? `${base}-${n}` : base
        headings.push({ depth, text: decode(inner.replace(/<[^>]+>/g, '')), id })
        while (open.length && open[open.length - 1] >= depth) open.pop()
        open.push(depth)
        const level = Math.min(depth, (headings[0]?.depth ?? depth) + open.length - 1)
        return `<h${level} id="${id}" data-depth="${depth}">${inner}</h${level}>\n`
      },
      // A task list's box: read out as done or not.
      checkbox({ checked }: Tokens.Checkbox) {
        return `<input type="checkbox" disabled${checked ? ' checked' : ''} aria-label="${checked ? 'done' : 'not done'}"> `
      },
      code({ text, lang }: Tokens.Code) {
        const language = (lang ?? '').split(/\s/)[0]
        const bar = language ? `<div class="md-code-bar">${escape(language)}</div>` : ''
        return `<figure class="md-code">${bar}<pre><code>${escape(text)}</code></pre></figure>\n`
      },
      paragraph({ tokens }: Tokens.Paragraph) {
        const only = tokens.length === 1 ? tokens[0] : null
        const href = only && (only.type === 'link' || only.type === 'text') ? ('href' in only ? only.href : only.raw).trim() : ''
        if (ATTACHMENT.test(href)) {
          // The #t fragment makes Safari, too, paint the first frame as the thumbnail.
          return `<figure class="md-video"><video src="${escape(href)}#t=0.001" controls playsinline preload="metadata"></video></figure>\n`
        }
        return `<p>${this.parser.parseInline(tokens)}</p>\n`
      },
      link({ href, title, tokens }: Tokens.Link) {
        const target = url(href, false)
        const external = /^https?:/.test(target)
        return `<a href="${escape(target)}"${title ? ` title="${escape(title)}"` : ''}${
          external ? ' target="_blank" rel="noopener noreferrer"' : ''
        }>${this.parser.parseInline(tokens)}</a>`
      },
      image({ href, title, text }: Tokens.Image) {
        return `<img src="${escape(url(href, true))}" alt="${escape(text)}"${
          title ? ` title="${escape(title)}"` : ''
        } loading="lazy" decoding="async">`
      },
      text(token: Tokens.Text | Tokens.Escape) {
        if ('tokens' in token && token.tokens) return this.parser.parseInline(token.tokens)
        return markMeasures('escaped' in token && token.escaped ? token.text : escape(token.text))
      },
      table(token: Tokens.Table) {
        // Wide tables scroll inside the column instead of widening the page.
        const head = token.header.map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join('')
        const rows = token.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`)
          .join('')
        return `<div class="md-table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`
      },
    },
  })

  let html = marked.parse(source, { async: false })
  // Raw HTML in READMEs (<img src="docs/x.png">) gets the same URL fix.
  if (resolve) {
    html = html.replace(/(<img[^>]*?\ssrc=")([^"]+)(")/g, (m, a: string, src: string, b: string) =>
      isRelative(src) ? a + resolve(src, true) + b : m,
    )
  }
  return { html, headings }
}
