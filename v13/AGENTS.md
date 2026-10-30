# AGENTS.md

## About this project

This is my personal website. It's where I show my projects and work, share some facts about myself, publish blog posts, and list ways to contact me.

The goal is to show the world who I am, both as a person and as a developer. It should **not** feel like a generic portfolio site.

## Design direction

- Follow "Readout" design system and the website mockup created in Paper using Paper MCP.
- Clean, cool, efficient, aesthetic, polished, and minimal.
- Right now I want to explore **industrial design**, **neo-brutalism**, and related styles to make the site more interesting and unique.
- Avoid generic portfolio patterns and template-looking layouts.
- Polish bar: extremely polished, Apple-level design and motion, while staying faithful to the mockup. Use the skills in `.claude/skills/` while implementing: `emil-design-eng` and `apple-design` for craft, `animate` / `review-animations` for motion, `mobile-native` for phones, `break-ui` for worst-case content.
- Font: **Paper Mono** everywhere (self-hosted variable font in `public/fonts/`, OFL).

## Content

- No invented content. Use my copy verbatim; never make up labels, numbers, stats or filler text.
- Every stat is a measured, sourced claim, never a snapshot that means nothing to a visitor. Measured stats live in `content/stats/*.json`; how each was measured is in `content/stats/method/README.md`. Re-measure and update both when a project changes.

## Layout and CSS

- Design tokens live in `src/styles/tokens.css` (exported from the Paper design system). Use them; don't hard-code values or fork a parallel set.
- Edge inset: 16px on desktop, 20px on mobile, everywhere (`--inset`). Content inside cards aligns to the same lanes.
- Max width is a 13" MacBook Air viewport (`--page-max`, 1470px): the site fills the whole width there and stays centered on wider screens.
- Fully responsive.
- Use padding, gap and flex/grid layout. Avoid margins; use one only when something is truly impossible without it.

## Features

- **Hero visualizer:** the Shape Lab panel. Build it from `experiments/shape-lab/` (WebGPU, built on [vgpu](https://vgpu.sh)); reuse its renderer, shaders and Readout controls instead of rewriting them. Without WebGPU (or with reduced motion), show the still `public/shape-lab-still.webp` instead.
- **Music player** (app bar): plays a playlist curated by me, with play/pause and previous/next. It keeps playing across navigation.
- **Projects:** the expanded view shows the repo's README, fetched from GitHub on the server (cached), not stored here.
- **Blog:** posts are Markdown files in `content/posts/`.
- **Footer "last updated":** the build date (`__BUILD_DATE__`, set in `vite.config.ts`); every deploy is a fresh build.

## Stack

- [TanStack Start](https://tanstack.com/start) (React, file routes in `src/routes/`), pnpm, Node 24. Charts: TanStack Charts (`@tanstack/react-charts`), to be confirmed against the Readout chart styles.
- It behaves like an SPA: client-side navigation, no full reloads, but every tab and opened view has its own URL (tabs, `/projects/$repo`, `/blog/$slug`). TanStack Router's typed path and search params cover this; no extra URL-state library.
- Data that is fetched (stats, npm, GitHub READMEs) loads on the server without blocking the page: route loaders return the promise unawaited and the component renders it with `<Await>` / Suspense.
- Performance: instant, smooth and polished; aim for 100 on every Lighthouse category.

## Repository layout

- `/` (root): the code for the current website. Work here.
- `content/`: blog posts and project stats (with their measurement method).
- `experiments/shape-lab/`: the standalone Shape Lab demo, the source for the hero visualizer.
- `v11/`: the previous version of the website. **Ignore it unless I explicitly mention it.**
- `v12/`: same as v11 except written using HTML, CSS and JS only. **Ignore it unless I explicitly mention it.**
