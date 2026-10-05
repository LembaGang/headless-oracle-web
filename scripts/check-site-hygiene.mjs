#!/usr/bin/env node
/**
 * check-site-hygiene.mjs: publish gate for the parts of the built site that crawlers,
 * scanners and agents hit before they read a word (W5).
 *
 * WHY THIS EXISTS: each of these failed silently, with nothing red anywhere:
 *   favicon      /favicon.ico answered 404 about 60 times a week.
 *   not-found    before b21a5b9 (2026-10-01) there was no top-level 404.html, so Pages
 *                served the homepage with 200 for any path it had no file for:
 *                /.git/config and /.env were logged answering 200. One catch-all line in
 *                _redirects, a wider _routes.json, or a deleted 404.html brings that back.
 *   emails       Cloudflare Email Obfuscation rewrites any address it sees in HTML to
 *                "[email protected]" plus a script, which agents and text browsers never
 *                undo. <!--email_off-->...<!--/email_off--> is the only opt-out that keeps
 *                the zone setting on for everything else.
 *   twins        a page advertising a Markdown twin that is not built, or a twin no page
 *                points to, is a dead end for an agent.
 *
 * The not-found check reads the build the way Pages routes it, in Pages' order: a Function
 * route (public/_routes.json `include`), then _redirects, then a static file (exact, .html,
 * /index.html), then the top-level 404.html. A scanner path that reaches anything before
 * 404.html is a soft answer and fails. The live status of the same paths is checked after
 * deploy with `--live`.
 *
 * Exit codes:
 *   0  PASS     : every assertion holds
 *   1  FAIL     : every failed assertion is listed
 *   2  usage / read error, or nothing to check
 *
 * Usage:
 *   node scripts/check-site-hygiene.mjs [--dir=dist] [--live]
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXIT_PASS = 0;
const EXIT_FAIL = 1;
const EXIT_ERROR = 2;

const ORIGIN = 'https://headlessoracle.com';

/** Paths scanners ask for. Each must reach the 404 page with status 404. */
export const SCANNER_PATHS = ['/.git/config', '/.env', '/.docker/config.json', '/phpinfo', '/wp-admin/install.php'];

/** Pages whose contact addresses must survive the build (step 4 of W5). */
const CONTACT_PAGES = ['terms.html', 'privacy.html', 'refund.html'];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

function arg(name, fallback) {
  const hit = process.argv.slice(2).find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.slice(name.length + 3) : true;
}

function files(dir, ext) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(p, ext));
    else if (entry.name.endsWith(ext)) out.push(p);
  }
  return out;
}

function distFileFor(dist, pathname) {
  const p = decodeURIComponent(pathname).replace(/\/+$/, '');
  const c = p === '' ? [join(dist, 'index.html')] : [join(dist, p), join(dist, p + '.html'), join(dist, p, 'index.html')];
  return c.find((f) => existsSync(f) && statSync(f).isFile()) || null;
}

/** Pages pattern (`*` splat, `:name` placeholder) to a whole-path RegExp. */
function pagesPattern(from) {
  const re = from
    .split(/(\*|:[A-Za-z]\w*)/)
    .map((part) => (part === '*' ? '.*' : part.startsWith(':') ? '[^/]+' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${re}$`);
}

function checkFavicon(dist, htmlFiles, fail) {
  for (const name of ['favicon.ico', 'favicon-32x32.png']) {
    const f = join(dist, name);
    if (!existsSync(f) || statSync(f).size === 0) fail(`FAIL  favicon   dist/${name} missing or empty`);
  }
  // An .ico starts 00 00 01 00; a PNG with its 8-byte signature. A renamed file is not an icon.
  const ico = existsSync(join(dist, 'favicon.ico')) ? readFileSync(join(dist, 'favicon.ico')) : Buffer.alloc(0);
  if (ico.length && !(ico[0] === 0 && ico[1] === 0 && ico[2] === 1 && ico[3] === 0)) fail('FAIL  favicon   dist/favicon.ico is not an ICO file');
  for (const f of htmlFiles) {
    const html = readFileSync(f, 'utf8');
    if (!/<link\b[^>]*\brel="icon"[^>]*\bhref="\/favicon\.ico"/i.test(html)) fail(`FAIL  favicon   ${rel(dist, f)} has no <link rel="icon" href="/favicon.ico">`);
  }
}

function checkNotFound(dist, fail) {
  if (!existsSync(join(dist, '404.html'))) {
    fail('FAIL  not-found dist/404.html missing: Pages would serve the homepage with 200 for unknown paths');
  }
  let include = [];
  let exclude = [];
  const routes = join(dist, '_routes.json');
  if (existsSync(routes)) {
    const r = JSON.parse(readFileSync(routes, 'utf8'));
    include = (r.include || []).map(pagesPattern);
    exclude = (r.exclude || []).map(pagesPattern);
  } else if (existsSync(resolve('functions'))) {
    // No _routes.json with a functions/ directory: Pages invokes Functions for every path.
    include = [/^.*$/];
  }
  const redirects = [];
  const red = join(dist, '_redirects');
  if (existsSync(red)) {
    for (const line of readFileSync(red, 'utf8').split(/\r?\n/)) {
      const [from, to, status] = line.trim().split(/\s+/);
      if (from && to && !from.startsWith('#')) redirects.push({ from, to, status: status || '302', re: pagesPattern(from) });
    }
  }
  for (const path of SCANNER_PATHS) {
    if (include.some((re) => re.test(path)) && !exclude.some((re) => re.test(path))) {
      fail(`FAIL  not-found ${path} reaches a Pages Function (_routes.json include)`);
      continue;
    }
    const r = redirects.find((x) => x.re.test(path));
    if (r) {
      fail(`FAIL  not-found ${path} matches _redirects "${r.from} ${r.to} ${r.status}"`);
      continue;
    }
    const file = distFileFor(dist, path);
    if (file) {
      fail(`FAIL  not-found ${path} is served from ${rel(dist, file)}`);
      continue;
    }
  }
}

function checkEmails(dist, htmlFiles, fail, notes) {
  const seen = new Map();
  for (const f of htmlFiles) {
    const html = readFileSync(f, 'utf8');
    const where = rel(dist, f);
    if (/\/cdn-cgi\/l\/email-protection|\[email(?:&#160;|\s)protected\]/i.test(html)) fail(`FAIL  email     ${where} contains Cloudflare's obfuscated form`);
    // Scripts are left alone by Email Obfuscation (JSON-LD on /witness keeps its address live),
    // and an HTML comment cannot sit inside a script anyway.
    const masked = html
      .replace(/<script\b[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length))
      .replace(/<!--email_off-->[\s\S]*?<!--\/email_off-->/g, (m) => ' '.repeat(m.length));
    for (const m of masked.matchAll(EMAIL)) {
      const line = html.slice(0, m.index).split('\n').length;
      fail(`FAIL  email     ${where}:${line} ${m[0]} is outside <!--email_off--> and will be obfuscated`);
    }
    const all = new Set(html.match(EMAIL) || []);
    seen.set(where.split(sep).join('/'), all);
  }
  for (const page of CONTACT_PAGES) {
    const got = seen.get(page);
    if (!got || got.size === 0) fail(`FAIL  email     ${page} carries no contact address`);
    else notes.push(`ok    email     ${page}: ${[...got].sort().join(', ')}`);
  }
}

function checkTwins(dist, htmlFiles, fail, notes) {
  const headers = existsSync(join(dist, '_headers')) ? readFileSync(join(dist, '_headers'), 'utf8') : '';
  const advertised = new Set();
  for (const f of htmlFiles) {
    const html = readFileSync(f, 'utf8');
    for (const m of html.matchAll(/<link\b[^>]*\btype="text\/markdown"[^>]*>/gi)) {
      let href = (m[0].match(/\bhref="([^"]+)"/) || [])[1];
      if (!href || !/\brel="alternate"/.test(m[0])) continue;
      // The essays point at their Markdown source on GitHub; only same-origin twins ship here.
      if (href.startsWith(ORIGIN + '/')) href = href.slice(ORIGIN.length);
      if (!href.startsWith('/')) continue;
      advertised.add(href);
      if (!existsSync(join(dist, href))) fail(`FAIL  twin      ${rel(dist, f)} advertises ${href}, not in dist/`);
    }
  }
  for (const md of readdirSync(dist).filter((n) => n.endsWith('.md'))) {
    const href = `/${md}`;
    if (!advertised.has(href)) fail(`FAIL  twin      dist/${md} is not advertised by any page's <link rel="alternate" type="text/markdown">`);
    const base = md.replace(/\.md$/, '');
    // `/` gets its Link header from the Pages Function; every other twin from _headers.
    if (base !== 'index' && !headers.includes(`</${md}>; rel="alternate"; type="text/markdown"`)) {
      fail(`FAIL  twin      dist/_headers has no Link to </${md}> for /${base}`);
    }
    if (statSync(join(dist, md)).size < 200) fail(`FAIL  twin      dist/${md} is under 200 bytes`);
    notes.push(`ok    twin      ${href}`);
  }
}

async function checkLive(fail, notes) {
  const targets = [...SCANNER_PATHS.map((p) => [p, 404]), ['/favicon.ico', 200]];
  for (const [path, want] of targets) {
    let res;
    try {
      res = await fetch(ORIGIN + path, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
      await res.arrayBuffer();
    } catch (e) {
      fail(`FAIL  live      ${path} fetch failed (${e.message})`);
      continue;
    }
    const line = `${path} ${res.status} ${(res.headers.get('content-type') || '').split(';')[0]}`;
    if (res.status !== want) fail(`FAIL  live      ${line} (want ${want})`);
    else notes.push(`ok    live      ${line}`);
  }
}

function rel(dist, f) {
  return relative(dist, f);
}

export async function runHygiene({ dir = 'dist', live = false } = {}) {
  const dist = resolve(dir);
  if (!existsSync(dist)) return { code: EXIT_ERROR, lines: [`ERROR ${dist} missing; run \`npm run build\` first`] };
  const htmlFiles = files(dist, '.html');
  if (htmlFiles.length === 0) return { code: EXIT_ERROR, lines: [`ERROR no .html files under ${dist}`] };
  const failures = [];
  const notes = [];
  const fail = (l) => failures.push(l);
  checkFavicon(dist, htmlFiles, fail);
  checkNotFound(dist, fail);
  checkEmails(dist, htmlFiles, fail, notes);
  checkTwins(dist, htmlFiles, fail, notes);
  if (live) await checkLive(fail, notes);
  const lines = [...notes, ...failures];
  lines.push(
    failures.length
      ? `FAIL site hygiene: ${failures.length} failure(s) over ${htmlFiles.length} pages`
      : `PASS site hygiene: ${htmlFiles.length} pages; favicon, ${SCANNER_PATHS.length} scanner paths reach 404.html, addresses outside email_off: 0, twins advertised${live ? ', live checks' : ''}`,
  );
  return { code: failures.length ? EXIT_FAIL : EXIT_PASS, lines };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const { code, lines } = await runHygiene({ dir: arg('dir', 'dist'), live: arg('live', false) === true });
    lines.forEach((l) => console.log(l));
    process.exitCode = code;
  } catch (e) {
    console.log(`ERROR unhandled: ${e.stack || e.message}`);
    process.exitCode = EXIT_ERROR;
  }
}
