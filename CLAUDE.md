# Headless Oracle Web (Frontend)

## Two-Repo Architecture
Headless Oracle runs as two Cloudflare deployments:

| Repo | Runtime | Handles | Deploy Command |
|---|---|---|---|
| `headless-oracle-v5` | Cloudflare Worker | API routes only (81 paths in OpenAPI) | `npm run deploy` (wrangler deploy) |
| `headless-oracle-web` (this repo) | Cloudflare Pages | All HTML pages | `npm run deploy` (wrangler pages deploy) |

**How routing works**: The Worker has a catch-all route on `headlessoracle.com/*`.
For API paths (`/v5/*`, `/mcp`, `/.well-known/*`, `/openapi.json`, etc.) the Worker
responds directly. For HTML paths (`/`, `/pricing`, `/docs`, `/status`, etc.) the
Worker's Pages passthrough guard calls `fetch(request)` to forward to Pages.
The Worker contains zero HTML templates — all HTML generation code was removed Day 44.

## Tech Stack
- **Build**: Vite 7 (multi-page HTML, no framework)
- **Deploy**: `wrangler pages deploy dist` → Cloudflare Pages (manual, NOT git CI)
- **Crypto**: `@noble/ed25519` + `@noble/hashes` (used in verify.html client-side)

## CRITICAL: How Deployment Works
This project does NOT use Cloudflare Pages' automatic git integration.
Pushing to GitHub alone does NOT update the live site.
You MUST run `npm run deploy` to push the built `dist/` to Cloudflare Pages.

**Always deploy with:**
```
npm run build && npx wrangler pages deploy dist --project-name headless-oracle-web
```
Or simply: `npm run deploy`

## Project Structure
- `index.html` — Homepage (28 exchange pills, hero, live demo, instant key provisioning)
- `docs.html` — Full API documentation (28 exchanges, all endpoints, DST calendar)
- `status.html` — Live status dashboard (real-time checks for all exchanges)
- `pricing.html` — Pricing tiers with Paddle checkout + instant key buttons
- `verify.html` — Client-side Ed25519 receipt verifier
- `traction.html` — Live traction metrics dashboard
- `blog.html` — Blog
- `terms.html` — Terms of Service
- `privacy.html` — Privacy Policy
- `refund.html` — Refund Policy
- `public/` — Static assets copied verbatim to dist/ (ed25519-public-key.txt, integration guides)
- `public/docs/` — Integration guides (quickstart, LangGraph, Bun, Anthropic Claude, DataCamp, x402)
- `src/` — Shared JS modules (if any)
- `vite.config.js` — Multi-entry build config (all 10 HTML pages registered)
- `dist/` — Built output (committed, deployed to Cloudflare Pages)

## Supported Exchanges (28 total, reflected across all pages)
23 traditional: XNYS, XNAS, XLON, XJPX, XPAR, XHKG, XSES, XASX, XBOM, XNSE,
XSHG, XSHE, XKRX, XJSE, XBSP, XSWX, XMIL, XIST, XSAU, XDFM, XNZE, XHEL, XSTO
5 extended: XCBT, XNYM (CME overnight), XCBO (Cboe options), XCOI (Coinbase 24/7), XBIN (Binance 24/7)

## Live API Base URL
`https://headlessoracle.com`

## Companion Repos
- **headless-oracle-v5** — The Cloudflare Worker (API, signing, MCP, billing, telemetry)
- **packages/sdk-typescript** — @headlessoracle/sdk TypeScript SDK (not yet published)
- **packages/sdk-python** — headless-oracle-sdk Python SDK (not yet published)

## llms.txt — served by the Worker, not Pages
`headlessoracle.com/llms.txt` is intercepted by the Cloudflare Worker
(headless-oracle-v5) before it reaches this Pages site. The canonical
source is the `LLMS_TXT` constant in `headless-oracle-v5/src/index.ts`.

Do NOT add llms.txt files to this repo — they will never be served and
will only create sync problems. Edit the worker constant instead.

## Adding a New Page
1. Create the `.html` file in the project root
2. Register it in `vite.config.js` under `build.rollupOptions.input`
3. Run `npm run deploy` to build and push

## Commands
- `npm run dev` — Local dev server (Vite HMR)
- `npm run build` — Build to `dist/`
- `npm run deploy` — Build + deploy to Cloudflare Pages (THIS is what updates the live site)
- `npm run preview` — Preview the built dist/ locally

## Current State (Day 44 — 2026-04-10)
- **Pages**: 10 HTML pages (index, docs, status, pricing, verify, traction, blog, terms, privacy, refund)
- **Conversion**: Instant key provisioning live, Paddle checkout working
- **Integration guides**: quickstart, LangGraph, Bun, Anthropic Claude, DataCamp, x402 payments
