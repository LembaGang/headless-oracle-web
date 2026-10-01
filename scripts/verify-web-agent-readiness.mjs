#!/usr/bin/env node
/**
 * verify-web-agent-readiness.mjs: post-deploy proof that the live site serves what the
 * agent-readiness commits (E1 to E5) built. Run after `npm run deploy`, never instead of it.
 *
 * WHY THIS EXISTS: every check in the deploy gate runs against dist/ or against the
 * worker's files before publish. None of them observes the deployed Pages project. This
 * does, against https://headlessoracle.com, with nothing allowed to pass by virtue of a
 * local dist/ file.
 *
 * One PASS/FAIL line per check; INFO lines are printed, never asserted.
 * Exit codes: 0 every check passed, 1 any FAIL.
 *
 * Usage (Node 18+, no dependencies):
 *   node scripts/verify-web-agent-readiness.mjs
 */

import { runLiveLinks } from './check-live-links.mjs';

const ORIGIN = 'https://headlessoracle.com';
const SCAN_API = 'https://isitagentready.com/api/scan';
const RELS = ['api-catalog', 'service-desc', 'service-doc', 'describedby'];
const TIMEOUT_MS = 30000;

let failed = 0;
function report(ok, label, detail) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`);
}

async function get(path, init = {}) {
  return fetch(ORIGIN + path, { signal: AbortSignal.timeout(TIMEOUT_MS), ...init });
}

/** Runs one check; a thrown error is a FAIL with its message, never a crash. */
async function check(label, fn) {
  try {
    const [ok, detail] = await fn();
    report(ok, label, detail);
  } catch (e) {
    report(false, label, `error ${e.message}`);
  }
}

await check('1 GET / default: 200 text/html, Link has the four rels, Vary has Accept', async () => {
  const r = await get('/');
  await r.arrayBuffer();
  const type = r.headers.get('content-type') || '';
  const link = r.headers.get('link') || '';
  const vary = (r.headers.get('vary') || '').toLowerCase();
  const missing = RELS.filter((rel) => !link.includes(`rel="${rel}"`));
  const ok = r.status === 200 && type.startsWith('text/html') && missing.length === 0 && vary.split(',').some((v) => v.trim() === 'accept');
  return [ok, `status ${r.status}, type ${type}, missing rels [${missing.join(', ')}], vary "${vary}"`];
});

await check('2 GET / Accept: text/markdown: 200 text/markdown, body equals live /index.md', async () => {
  const r = await get('/', { headers: { Accept: 'text/markdown' } });
  const body = await r.text();
  const type = r.headers.get('content-type') || '';
  const md = await get('/index.md');
  const mdBody = await md.text();
  const ok = r.status === 200 && type.startsWith('text/markdown') && md.status === 200 && body === mdBody;
  return [ok, `status ${r.status}, type ${type}, /index.md ${md.status}, bodies ${body === mdBody ? 'equal' : 'differ'}`];
});

await check('3 GET /does-not-exist-xyz: 404', async () => {
  const r = await get('/does-not-exist-xyz', { redirect: 'manual' });
  await r.arrayBuffer();
  return [r.status === 404, `status ${r.status}`];
});

await check('4 GET /upgrade (no follow): 301 to /pricing', async () => {
  const r = await get('/upgrade', { redirect: 'manual' });
  await r.arrayBuffer();
  const loc = r.headers.get('location') || '';
  return [r.status === 301 && loc.endsWith('/pricing'), `status ${r.status}, location "${loc}"`];
});

for (const path of ['/docs/mpas', '/docs/sma-protocol/rfc-001']) {
  await check(`5 GET ${path}: 404`, async () => {
    const r = await get(path, { redirect: 'manual' });
    await r.arrayBuffer();
    return [r.status === 404, `status ${r.status}`];
  });
}

await check('6 live discovery links, no dist/ allowance', async () => {
  const { code, lines } = await runLiveLinks({ allowDistFixes: false });
  for (const l of lines) if (!l.startsWith('PASS')) console.log(`     ${l}`);
  return [code === 0, `runLiveLinks code ${code}`];
});

let scan = null;
try {
  const r = await fetch(SCAN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: ORIGIN }),
    signal: AbortSignal.timeout(120000),
  });
  if (r.status !== 200) throw new Error(`scan API answered ${r.status}`);
  scan = await r.json();
} catch (e) {
  report(false, '7 isitagentready scan', `error ${e.message}`);
}

if (scan) {
  const status = (cat, name) => scan.checks?.[cat]?.[name]?.status ?? 'missing';
  // webMcp is asserted because E5 shipped; drop it from this list if E5 is ever reverted.
  for (const [cat, name] of [
    ['discoverability', 'linkHeaders'],
    ['contentAccessibility', 'markdownNegotiation'],
    ['discovery', 'ard'],
    ['discovery', 'webMcp'],
  ]) {
    const s = status(cat, name);
    report(s === 'pass', `7 scan ${cat}.${name}`, s);
  }
  console.log(`INFO 7 scan discovery.authMd: ${status('discovery', 'authMd')}`);
  console.log(`INFO 7 scan discovery.a2aAgentCard: ${status('discovery', 'a2aAgentCard')} (expected fail, ruling R2)`);
  console.log(`INFO 7 scan discoverability.dnsAid: ${status('discoverability', 'dnsAid')} (expected fail, deferred)`);
  console.log(`INFO 7 scan level ${scan.level} ${scan.levelName}, scannedAt ${scan.scannedAt}`);
}

console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exitCode = failed ? 1 : 0;
