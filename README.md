# frixaco.com

Personal website. Plain HTML, CSS and JS — no build step, no dependencies.

## Layout

- `public/index.html` — the whole site: content, inline CSS, route switching
- `public/posts/*.md` — blog posts (the only Markdown on the site)
- `public/md.js` — minimal Markdown renderer, loaded only on post pages
- `Caddyfile` — routing, compression, cache headers
- `v11/` — previous version (Rust)

## Routes

- `/`, `/home`, `/blog`, `/more` — `index.html`; an inline script picks which sections to show
- `/blog/{slug}.md` — post page; fetches `posts/{slug}.md` and renders it client-side
- `/pdf`, `/md` — résumé as PDF / Markdown
- anything else — 404 status with the "not found" view

Adding a post: drop `posts/{slug}.md` in place and add an entry to the `#blog` list in `index.html`.

## Development

```sh
SITE_ROOT=public mise x caddy@2.10.2 -- caddy run --config Caddyfile
```

Serves on `PORT` (default `8080`). Deployed on Railway via the `Dockerfile`.
