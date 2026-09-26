# frixaco.com

Personal website and writing platform built as a small Rust web service with Markdown content.

## Architecture

- `std::net::TcpListener` HTTP server with one thread per connection
- `pulldown-cmark` Markdown rendering
- one shared HTML template with inline CSS and no client-side JavaScript
- gzip compression for text responses larger than 1 KiB
- content read from `src/` at request time

## Routes

- `/` and `/home` — complete single-page site
- `/blog` and `/blog/{slug}` — blog index and posts
- `/more` — standalone personal notes
- `/md/*` — rendered Markdown fragments
- `/pdf` — résumé
- `/pfp.jpg` — profile image

The server binds to `PORT` when set and defaults to `8080`.

## Development

```sh
cargo run
```

The production image is built with the repository `Dockerfile` and deployed on Railway.
