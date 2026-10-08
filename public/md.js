// Minimal Markdown -> HTML renderer for blog posts.
// Supports: front matter, ATX headings, paragraphs, fenced code, blockquotes,
// ordered/unordered lists, horizontal rules, inline code, links, images,
// bold and italic. Anything else renders as plain paragraph text.

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => escape(s).replace(/"/g, "&quot;");

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)/;
const HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$/;
const RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}> ?/;
const ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])( +|$)/;

export function frontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (kv) data[kv[1]] = kv[2];
  }
  return { data, body: src.slice(m[0].length) };
}

export function inline(text) {
  const slots = [];
  const keep = (html) => `\u0000${slots.push(html) - 1}\u0000`;

  text = text
    .replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => {
      code = code.replace(/\n/g, " ");
      if (/^ .*[^ ].* $/.test(code)) code = code.slice(1, -1);
      return keep(`<code>${escape(code)}</code>`);
    })
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
      keep(`<img src="${attr(src)}" alt="${attr(alt)}" loading="lazy" />`),
    )
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) =>
      keep(`<a href="${attr(href)}">`) + label + keep("</a>"),
    );

  return escape(text)
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    .replace(/__(?=\S)([\s\S]*?\S)__(?!\w)/g, "<strong>$1</strong>")
    .replace(/\*(?=\S)([\s\S]*?\S)\*/g, "<em>$1</em>")
    .replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/\u0000(\d+)\u0000/g, (_, i) => slots[i]);
}

function blocks(lines) {
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    let m;

    if (!line.trim()) {
      i++;
    } else if ((m = line.match(FENCE))) {
      const close = new RegExp(`^ {0,3}${m[1][0]}{${m[1].length},}\\s*$`);
      const code = [];
      for (i++; i < lines.length && !close.test(lines[i]); i++) {
        code.push(lines[i] + "\n");
      }
      i++;
      const lang = m[2] ? ` class="language-${attr(m[2])}"` : "";
      html += `<pre><code${lang}>${escape(code.join(""))}</code></pre>\n`;
    } else if ((m = line.match(HEADING))) {
      const n = m[1].length;
      html += `<h${n}>${inline(m[2] || "")}</h${n}>\n`;
      i++;
    } else if (RULE.test(line)) {
      html += "<hr />\n";
      i++;
    } else if (QUOTE.test(line)) {
      const inner = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        inner.push(lines[i++].replace(QUOTE, ""));
      }
      html += `<blockquote>\n${blocks(inner)}</blockquote>\n`;
    } else if (ITEM.test(line)) {
      const ordered = /\d/.test(line.match(ITEM)[2]);
      const start = ordered ? parseInt(line.match(ITEM)[2], 10) : 1;
      const items = [];
      let loose = false;

      while (i < lines.length) {
        const im = lines[i].match(ITEM);
        if (!im || /\d/.test(im[2]) !== ordered) break;
        const width = im[0].length || im[1].length + im[2].length + 1;
        const body = [lines[i].slice(im[0].length)];
        for (i++; i < lines.length; i++) {
          const next = lines[i];
          if (!next.trim()) {
            body.push("");
          } else if (next.startsWith(" ".repeat(width))) {
            body.push(next.slice(width));
          } else if (body.at(-1) !== "" && !ITEM.test(next) && !FENCE.test(next)) {
            body.push(next.trimStart()); // lazy paragraph continuation
          } else {
            break;
          }
        }
        while (body.at(-1) === "") body.pop();
        if (body.includes("")) loose = true;
        items.push(body);
        if (i > 0 && !lines[i - 1].trim() && ITEM.test(lines[i] || "")) {
          loose = true;
        }
      }

      const tag = ordered ? "ol" : "ul";
      html += ordered && start !== 1 ? `<ol start="${start}">\n` : `<${tag}>\n`;
      for (const body of items) {
        let inner = blocks(body);
        if (!loose) inner = inner.replace(/<p>([\s\S]*?)<\/p>\n/g, "$1\n");
        html += loose ? `<li>\n${inner}</li>\n` : `<li>${inner.replace(/\n$/, "")}</li>\n`;
      }
      html += `</${tag}>\n`;
    } else {
      const para = [line.trim()];
      for (i++; i < lines.length; i++) {
        const next = lines[i];
        if (
          !next.trim() ||
          FENCE.test(next) ||
          HEADING.test(next) ||
          QUOTE.test(next) ||
          RULE.test(next) ||
          /^ {0,3}([-*+] +\S|1[.)] +\S)/.test(next)
        ) {
          break;
        }
        para.push(next.trim());
      }
      html += `<p>${inline(para.join("\n"))}</p>\n`;
    }
  }

  return html;
}

export function render(src) {
  return blocks(src.replace(/\r\n?/g, "\n").split("\n"));
}
