# Rustam Ashurmatov

> Full-Stack Engineer — TypeScript, Node.js, AWS, React, Rust

Tashkent, Uzbekistan (UTC+5) | [rr.ashurmatov.21@gmail.com](mailto:rr.ashurmatov.21@gmail.com) | +998 90 917 0991 | [frixaco.com](https://frixaco.com/) | [github.com/frixaco](https://github.com/frixaco) | [linkedin.com/in/frixaco](https://linkedin.com/in/frixaco)

## Summary

Full-stack engineer with 5+ years at startups, mostly remote for US and EU teams, strongest on backend, data and payments, with React/Next.js and React Native on the front end. On a 5-person team at a US music-tech startup, owns the backend, payments and AWS data pipeline for two products; cut a 1M-artist pipeline from 9 days to 7 hours and roughly halved its data-provider bill.

## Experience

### Vbrato & Ekko

**Software Engineer** | Remote (US) | May 2023 – Present

US music-tech startup: Vbrato (paid artist collaborations) and Ekko (paid song covers). 5-person team.

- Rebuilt a sequential multi-step AWS Step Functions data pipeline as fan-out/fan-in: cut a full 1M-artist refresh from **9 days to 7 hours** (~30x faster) and vendor API calls from **25M+ to 11M** a month, roughly halving the provider bill.
- Built Ekko's backend, payments and media watermarking (custom FFmpeg build) in ~4 months after the 2026 pivot, and contributed heavily to its iOS app (screens, payments, polish) through App Store submission.
- Owned payments across backend, web and mobile: custom checkout, Stripe Connect creator payouts, Apple Pay, Google Pay and international bank payouts.
- Migrated **1M+ artist profiles** and **100M+ metric records** from MySQL to OpenSearch, behind GraphQL and REST APIs.
- Replaced a paid chat vendor with an in-house real-time messaging system (AWS AppSync GraphQL subscriptions, push notifications), saving about **$6K a year**.
- Built the Next.js web app from scratch, including its design system, and a custom React Native/Expo audio player.

### GeoAlert

**Frontend Software Engineer** | Tashkent, Uzbekistan | Dec 2022 – Jun 2023

B2B AI mapping platform for satellite imagery; clients in Europe, the Middle East and Asia.

- Moved thousands of existing users to Keycloak single sign-on through new Next.js auth flows, with **zero downtime**.
- Owned the frontend for team accounts as the platform expanded to larger businesses: dashboards to invite members, assign roles and permissions, share projects and processing jobs, and track usage, quotas and billing.

### Livereach

**Software Engineer** | Remote (EU) | Nov 2021 – Jan 2023

Social media aggregator for brands, plus an embeddable shoppable feed on e-commerce sites across Europe.

- Cut the embeddable feed's JavaScript bundle by **~20%** by replacing Redux with a small custom reactive store; the widget runs on third-party store pages in carousel, list, masonry and slider layouts.
- Incrementally migrated a legacy Angular dashboard to React 18 (strangler fig), including its complex filters.

### Moishlem

**Backend Software Engineer** | Remote (EU) | Aug 2020 – Oct 2021

Online sports and real-estate insurance.

- Built NestJS payment and subscription flows on banking APIs; merged two backends and redesigned the PostgreSQL schema.

## Projects

### LeTUI | Rust, TypeScript, Bun | [github.com/frixaco/letui](https://github.com/frixaco/letui) | 2025

- Terminal UI library built from scratch (~10k lines): TypeScript component API with signal-based state over a Rust layout and rendering engine with cell-level diffing; prebuilt binaries for macOS, Linux and Windows.
- Averages **453 fps** on full-screen animation (p99 frame **5.6 ms**, M4 Pro), covered in a 3-part blog series.

### Senmei | TypeScript, WebGPU, WebCodecs | [senmei.frixaco.com](https://senmei.frixaco.com/) | 2026

- In-browser MKV player from scratch: Matroska parser, WebCodecs decoding, HTTP Range streaming, seeking, track switching.
- Upscales **1080p anime to 4K** in real time on WebGPU with Anime4K shaders ported to WGSL (**32.3 ms** per frame on an M4 Pro).

### Xport | TypeScript, React (TanStack Start), PostgreSQL | [xport.frixaco.com](https://xport.frixaco.com/) | 2025

- Paid web app and zero-dependency npm CLI that export X threads, timelines and articles to Markdown or JSON, with OAuth sign-in, Polar credit billing and Lighthouse scores of 99+.
- Crash-safe jobs save progress, cursors and credits to PostgreSQL after every page and resume after a crash.

## Skills

- **Programming:** TypeScript, JavaScript, Rust, SQL; working knowledge of Go and Python
- **Backend and data:** Node.js, Bun, NestJS, Fastify, GraphQL, REST, WebSockets, PostgreSQL, MySQL, OpenSearch
- **Cloud:** AWS (Lambda, ECS, SQS, Step Functions, AppSync, CloudFormation), Docker, CI/CD, Linux
- **Frontend and mobile:** React, Next.js, React Native, Expo, TanStack, Angular, Zustand, Playwright
- **Payments and media:** Stripe, Stripe Connect, Apple Pay, Google Pay, banking APIs; WebGPU, WGSL, WebCodecs, FFmpeg

## Education

### Tashkent University of Information Technologies

**BSc Software Engineering** | 2019 – 2023
GPA 4.57/5

Languages: English, Uzbek
