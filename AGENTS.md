# AGENTS.md

## Repo Intent

- Personal website
- Rust server
- Markdown-first content
- Low operational complexity

## Working Rules

- Keep changes small, isolated, reversible
- Fix root cause, not symptom
- Preserve existing route behavior unless task says otherwise
- Avoid adding dependencies unless clear value
- Prefer stable, production-safe defaults

## Architecture Notes

- Server-rendered HTML
- Markdown converted to HTML at startup
- Pre-rendered content held in shared in-memory state
- Single-process web service

## Runtime Contract

- Bind to `PORT` when provided
- Default to `8080` locally
- Keep endpoints backward-compatible
- Cache headers matter for public content

## Coding Guidance

- Match existing Rust/Axum style
- Keep handlers straightforward and explicit
- Handle unhappy paths as carefully as happy paths
- Avoid broad refactors during feature or bug tasks

## Verification

- For code changes:
  - `cargo check`
  - `cargo fmt --check`
  - `cargo clippy -- -D warnings` when practical
- Route smoke test locally when behavior changes
- For docs-only changes:
  - skip heavy checks unless requested

## Railway Deploy Guidance

- Use Dockerfile builder
- Keep image/runtime simple and debuggable
- Prefer deterministic builds over smallest image
- Confirm deploy status and logs after `railway up`

## Communication Style For This Repo

- Be concise
- State assumptions before coding
- Provide short progress updates while executing
- End with what changed, what was verified, and next actions if relevant
