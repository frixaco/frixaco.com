# frixaco.com

Personal website and writing platform, built as a Rust web service, powered by Markdown.

## Overview

This site is intentionally simple:

- server-rendered HTML
- markdown-first content workflow
- minimal client-side complexity
- small runtime surface area

The application pre-renders markdown into HTML at startup, keeps rendered content in memory, and serves it through lightweight HTTP routes.

## Architecture

- **Application layer:** Axum routes for pages, markdown endpoints, and resume delivery
- **Rendering layer:** Comrak converts markdown to HTML during boot
- **State model:** precomputed content stored in shared in-memory state
- **Delivery model:** single long-running Rust binary bound to `PORT` (fallback `8080`)
- **Caching:** default cache-control response header for public content

## Tech Stack

- Rust (stable)
- Axum
- Tokio
- Comrak
- include_dir
- tower-http
- tracing-subscriber

## Runtime Behavior

- Accepts `PORT` from environment (Railway-compatible)
- Falls back to `8080` for local development
- Serves:
  - main pages (`/`, `/home`, `/blog`, `/more`)
  - individual posts (`/blog/{slug}`)
  - raw rendered markdown endpoints (`/md/*`)
  - PDF resume endpoint (`/pdf`)

## Deployment

Production deploy targets Railway using a Dockerfile-based build for deterministic toolchain/runtime behavior.

## Design Principles

- Minimum bundle size
- Zero bloat
- Simple to maintain and modify
