#!/usr/bin/env node
/**
 * check-live-links.mjs: publish gate: every URL the live discovery files advertise
 * must resolve to something real.
 *
 * WHY THIS EXISTS: without a top-level 404.html, Pages serves the homepage with 200 for
 * any path it has no file for, so a dead link looked alive to every crawler and agent.
 * public/404.html ends that, which turns every such link into a hard 404. This gate
 * reads the LIVE sitemap.xml, llms.txt, llms-full.txt, AGENTS.md, SKILL.md and
 * api-catalog (served by the worker, not this repository) and refuses a deploy while any
 * URL in them is broken, so the worker's fixes must ship first.
 *
 * Each first-party URL gets exactly one rule, decided before it is fetched:
 *   anchor  API endpoints (api.headlessoracle.com, /v5/, /v1/, /mcp, /oauth/, and every
 *           api-catalog anchor). They answer 4xx without a key or a body, so any status
 *           passes as long as the worker answered: the final response is not text/html
 *           and does not carry the homepage canonical tag.
 *   page    everything else on headlessoracle.com: final status 200, and not the
 *           homepage unless the final path is /.
 * A URL with a template (`{`, or `:` in an api-catalog anchor path) is skipped and listed.
 * A page that fails live passes as `(fixed by this deploy)` only when allowDistFixes is
 * set and dist/ has a file for it, or dist/_redirects maps it to one.
 * Other URLs must answer 200, or 200 through the host's public API (npm, PyPI, GitHub),
 * which covers hosts that refuse scripted page fetches.
 *
 * Exit codes:
 *   0  PASS   : every URL resolves
 *   1  FAIL   : every failing URL is listed
 *   2  a source file could not be fetched or parsed, or a URL fetch errored
 *
 * Usage:
 *   node scripts/check-live-links.mjs
 * Import: `runLiveLinks({ allowDistFixes })` returns { code, lines } without side effects.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXIT_PASS = 0;
const EXIT_FAIL = 1;
const EXIT_ERROR = 2;

const ORIGIN = 'https://headlessoracle.com';
const CANONICAL = '<link rel="canonical" href="https://headlessoracle.com/">';
const TEXT_SOURCES = ['/llms.txt', '/llms-full.txt', '/AGENTS.md', '/SKILL.md'];
const MAX_REDIRECTS = 5;
const CONCURRENCY = 8;
const TIMEOUT_MS = 20000;
const UA = 'headless-oracle-web check-live-links (+https://headlessoracle.com)';

class SourceError extends Error {}

/** Follows up to MAX_REDIRECTS redirects by hand so the count is enforced. */
async function get(url) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      redirect: 'manual',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      await res.arrayBuffer();
      current = new URL(location, current).href;
      continue;
    }
    return { status: res.status, url: current, type: res.headers.get('content-type') || '', body: await res.text() };
  }
  return { status: 'too-many-redirects', url: current, type: '', body: '' };
}

async function source(path) {
  try {
    const r = await get(ORIGIN + path);
    if (r.status !== 200) throw new SourceError(`${path} answered ${r.status}`);
    return r.body;
  } catch (e) {
    throw e instanceof SourceError ? e : new SourceError(`${path} fetch failed (${e.message})`);
  }
}

function urlsInText(text) {
  return [...text.matchAll(/https?:\/\/[^\s<>()[\]"'`]+/g)].map((m) => m[0].replace(/[.,;:!?*]+$/, ''));
}

function isFirstParty(u) {
  return u.hostname === 'headlessoracle.com' || u.hostname === 'api.headlessoracle.com';
}

function isAnchorUrl(u) {
  if (u.hostname === 'api.headlessoracle.com') return true;
  return u.hostname === 'headlessoracle.com' && /^\/(v5\/|v1\/|mcp|oauth\/)/.test(u.pathname);
}

function distHasFile(dist, pathname) {
  const p = decodeURIComponent(pathname).replace(/\/+$/, '');
  if (p === '') return existsSync(join(dist, 'index.html'));
  return [join(dist, p), join(dist, p + '.html'), join(dist, p, 'index.html')].some((f) => existsSync(f) && statSync(f).isFile());
}

function distRedirects(dist) {
  const file = join(dist, '_redirects');
  if (!existsSync(file)) return new Map();
  const map = new Map();
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const [from, to] = line.trim().split(/\s+/);
    if (from && to && !from.startsWith('#')) map.set(from, new URL(to, ORIGIN).pathname);
  }
  return map;
}

function fixedByDeploy(dist, redirects, pathname) {
  if (distHasFile(dist, pathname)) return true;
  const to = redirects.get(pathname);
  return to !== undefined && distHasFile(dist, to);
}

async function checkOne(item, ctx) {
  const { url, rule } = item;
  let r;
  try {
    r = await get(url);
  } catch (e) {
    return { level: 'ERROR', line: `ERROR ${rule.padEnd(7)} ${url} fetch failed (${e.message})` };
  }
  const final = r.url !== url ? ` -> ${r.url}` : '';
  const homepage = r.body.includes(CANONICAL) && new URL(r.url).pathname !== '/';

  if (rule === 'anchor') {
    const ok = !r.type.toLowerCase().startsWith('text/html') && !r.body.includes(CANONICAL);
    return ok
      ? { level: 'PASS', line: `PASS  anchor  ${url} ${r.status} ${r.type.split(';')[0]}${final}` }
      : { level: 'FAIL', line: `FAIL  anchor  ${url} ${r.status} ${r.type.split(';')[0]}${final} (not answered by the worker)` };
  }

  if (rule === 'page') {
    if (r.status === 200 && !homepage) return { level: 'PASS', line: `PASS  page    ${url} 200${final}` };
    const why = homepage ? `${r.status} serves the homepage` : `${r.status}`;
    if (ctx.allowDistFixes && fixedByDeploy(ctx.dist, ctx.redirects, new URL(url).pathname)) {
      return { level: 'PASS', line: `PASS  page    ${url} ${why}${final} (fixed by this deploy)` };
    }
    return { level: 'FAIL', line: `FAIL  page    ${url} ${why}${final}` };
  }

  // 'target' (api-catalog relation href) and 'other' both need a final 200.
  if (r.status === 200) return { level: 'PASS', line: `PASS  ${rule.padEnd(7)} ${url} 200${final}` };
  if (rule === 'other') {
    const api = apiUrlFor(new URL(url));
    if (api) {
      try {
        const a = await get(api);
        if (a.status === 200) return { level: 'PASS', line: `PASS  other   ${url} ${r.status}, 200 (via API)` };
        return { level: 'FAIL', line: `FAIL  other   ${url} ${r.status}; API ${api} ${a.status}` };
      } catch (e) {
        return { level: 'ERROR', line: `ERROR other   ${url} ${r.status}; API ${api} fetch failed (${e.message})` };
      }
    }
  }
  return { level: 'FAIL', line: `FAIL  ${rule.padEnd(7)} ${url} ${r.status}${final}` };
}

/** The host's public API for a package, project, repository or pull request page. */
function apiUrlFor(u) {
  const parts = u.pathname.split('/').filter(Boolean);
  if (u.hostname === 'www.npmjs.com' || u.hostname === 'npmjs.com') {
    if (parts[0] !== 'package' || parts.length < 2) return null;
    const name = parts[1].startsWith('@') && parts[2] ? `${parts[1]}%2F${parts[2]}` : parts[1];
    return `https://registry.npmjs.org/${name}`;
  }
  if (u.hostname === 'pypi.org' && parts[0] === 'project' && parts[1]) return `https://pypi.org/pypi/${parts[1]}/json`;
  if (u.hostname === 'github.com' && parts.length >= 2) {
    const repo = `https://api.github.com/repos/${parts[0]}/${parts[1].replace(/\.git$/, '')}`;
    if (parts[2] === 'pull' && /^\d+$/.test(parts[3] || '')) return `${repo}/pulls/${parts[3]}`;
    return repo;
  }
  return null;
}

async function pool(items, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await worker(items[i]);
      }
    }),
  );
  return out;
}

export async function runLiveLinks({ allowDistFixes = true } = {}) {
  const dist = resolve('dist');
  const items = new Map();
  const skipped = [];
  const add = (url, rule) => items.set(`${rule} ${url}`, { url, rule });

  let sitemap, catalog;
  const texts = [];
  try {
    sitemap = await source('/sitemap.xml');
    for (const p of TEXT_SOURCES) texts.push(await source(p));
    const raw = await source('/.well-known/api-catalog');
    try {
      catalog = JSON.parse(raw);
    } catch (e) {
      throw new SourceError(`/.well-known/api-catalog is not JSON (${e.message})`);
    }
    if (!Array.isArray(catalog.linkset)) throw new SourceError('/.well-known/api-catalog has no linkset[]');
  } catch (e) {
    if (e instanceof SourceError) return { code: EXIT_ERROR, lines: [`ERROR ${e.message}`] };
    throw e;
  }

  const locs = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) return { code: EXIT_ERROR, lines: ['ERROR /sitemap.xml has no <loc> entries'] };

  const classify = (raw) => {
    if (raw.includes('{')) return skipped.push(raw);
    let u;
    try {
      u = new URL(raw);
    } catch {
      return skipped.push(raw);
    }
    if (!isFirstParty(u)) return add(raw, 'other');
    add(raw, isAnchorUrl(u) ? 'anchor' : 'page');
  };
  for (const loc of locs) classify(loc);
  for (const text of texts) for (const u of urlsInText(text)) classify(u);
  for (const entry of catalog.linkset) {
    for (const [rel, value] of Object.entries(entry)) {
      if (rel === 'anchor') continue;
      for (const link of Array.isArray(value) ? value : []) if (link?.href) add(new URL(link.href, ORIGIN).href, 'target');
    }
    const anchor = entry.anchor;
    if (typeof anchor !== 'string') continue;
    const afterHost = anchor.replace(/^https?:\/\/[^/]+/, '');
    if (anchor.includes('{') || afterHost.includes(':')) skipped.push(anchor);
    else add(anchor, 'anchor');
  }

  const ctx = { allowDistFixes, dist, redirects: distRedirects(dist) };
  const list = [...items.values()].sort((a, b) => a.url.localeCompare(b.url) || a.rule.localeCompare(b.rule));
  const results = await pool(list, (item) => checkOne(item, ctx));

  const lines = results.map((r) => r.line);
  const uniqSkipped = [...new Set(skipped)];
  for (const s of uniqSkipped) lines.push(`SKIPPED template ${s}`);
  const count = (lvl) => results.filter((r) => r.level === lvl).length;
  const fixed = results.filter((r) => r.line.endsWith('(fixed by this deploy)')).length;
  lines.push(
    `SUMMARY ${results.length} checked: ${count('PASS')} pass (${fixed} fixed by this deploy), ${count('FAIL')} fail, ` +
      `${count('ERROR')} error; ${uniqSkipped.length} skipped template(s); sources: sitemap ${locs.length} locs, ` +
      `${TEXT_SOURCES.join(' ')}, api-catalog ${catalog.linkset.length} anchors; allowDistFixes=${allowDistFixes}`,
  );
  const code = count('ERROR') ? EXIT_ERROR : count('FAIL') ? EXIT_FAIL : EXIT_PASS;
  return { code, lines };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const { code, lines } = await runLiveLinks();
    lines.forEach((l) => console.log(l));
    process.exitCode = code;
  } catch (e) {
    console.log(`ERROR unhandled: ${e.stack || e.message}`);
    process.exitCode = EXIT_ERROR;
  }
}
