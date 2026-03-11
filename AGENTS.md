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
- Home page content, including project list, lives in `src/sheets/home.md`

## Common Content Tasks

- For add/remove/reorder project entries, edit `src/sheets/home.md`
- Keep project entries in existing markdown shape: heading, one-line description, tech tags
- Preserve surrounding copy/style; avoid incidental rewrites
- When asked for labels like `WIP`, keep them inline in the project heading unless told otherwise
- For content-only edits, prefer minimal verification: diff review, targeted file readback

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
- If Railway CLI says `Unauthorized`, stop and ask user to run `railway login`
- Preferred deploy flow: `railway up --detach`
- After deploy, verify with `railway status`
- Check logs when status looks wrong or user asks for confirmation
- Confirm deploy status and logs after `railway up`

## Communication Style For This Repo

- Be concise
- State assumptions before coding
- Provide short progress updates while executing
- End with what changed, what was verified, and next actions if relevant
