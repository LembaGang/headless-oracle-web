# Headless Oracle Web (Frontend)

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
- `index.html` — Homepage (7 exchange pills, hero, live demo)
- `docs.html` — Full API documentation (7 exchanges, all endpoints, DST calendar)
- `status.html` — Live status dashboard (real-time checks for all 7 exchanges)
- `verify.html` — Client-side Ed25519 receipt verifier
- `terms.html` — Terms of Service
- `privacy.html` — Privacy Policy
- `public/` — Static assets copied verbatim to dist/ (ed25519-public-key.txt)
- `src/` — Shared JS modules (if any)
- `vite.config.js` — Multi-entry build config (all HTML pages registered here)
- `dist/` — Built output (committed, deployed to Cloudflare Pages)

## Supported Exchanges (reflected across all pages)
XNYS (NYSE), XNAS (NASDAQ), XLON (LSE), XJPX (JPX Tokyo),
XPAR (Euronext Paris), XHKG (HKEX), XSES (SGX Singapore)

## Live API Base URL
`https://headlessoracle.com`

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

## Worktree Note
Active development happens in `.claude/worktrees/cool-carson/`.
After finishing work in the worktree, merge into `main` and run `npm run deploy` from the repo root.
