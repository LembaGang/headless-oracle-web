// The sitemap drift check (scripts/check-live-links.mjs, checkSitemapDrift) fails closed:
// a public page (built, no noindex) missing from the sitemap fails the run, whether or
// not the drift baseline lists it. Until 2026-11-10 the baseline exempted 15 such pages,
// /evidence among them, and the deploy passed with them missing.
//
// Run: node --test scripts/check-live-links.test.mjs
// No network: every sitemap URL in these cases is a built page, so no live fetch is made.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { checkSitemapDrift } from './check-live-links.mjs';

const ORIGIN = 'https://headlessoracle.com';
const page = (robots) => `<!doctype html><html><head><meta name="robots" content="${robots}"><title>t</title></head><body></body></html>`;

let root;
let cwd;
before(() => {
  cwd = process.cwd();
  root = mkdtempSync(join(os.tmpdir(), 'drift-'));
  mkdirSync(join(root, 'dist', 'evidence', 'for'), { recursive: true });
  writeFileSync(join(root, 'dist', 'index.html'), page('index, follow'));
  writeFileSync(join(root, 'dist', 'evidence.html'), page('index, follow'));
  writeFileSync(join(root, 'dist', 'evidence', 'for', 'pack.html'), page('noindex, nofollow'));
  mkdirSync(join(root, 'scripts'));
  process.chdir(root); // the check reads scripts/sitemap-drift-baseline.json from the working directory
});
after(() => {
  process.chdir(cwd);
  rmSync(root, { recursive: true, force: true });
});

const baseline = (missing) =>
  writeFileSync(join(root, 'scripts', 'sitemap-drift-baseline.json'), JSON.stringify({ missing_from_sitemap: missing, not_indexable_in_sitemap: [] }));

test('a public page missing from the sitemap fails', async () => {
  baseline([]);
  const r = await checkSitemapDrift(join(root, 'dist'), [`${ORIGIN}/`]);
  assert.ok(r.fail >= 1);
  assert.ok(r.lines.some((l) => l.startsWith('FAIL') && l.includes('/evidence')), r.lines.join('\n'));
});

test('a public page missing from the sitemap fails even when the baseline lists it', async () => {
  baseline(['/evidence']);
  const r = await checkSitemapDrift(join(root, 'dist'), [`${ORIGIN}/`]);
  assert.ok(r.fail >= 1, r.lines.join('\n'));
  assert.ok(r.lines.some((l) => l.startsWith('FAIL') && l.includes('/evidence')), r.lines.join('\n'));
});

test('a noindex page may be missing; with every public page listed the check passes', async () => {
  baseline([]);
  const r = await checkSitemapDrift(join(root, 'dist'), [`${ORIGIN}/`, `${ORIGIN}/evidence`]);
  assert.equal(r.fail, 0, r.lines.join('\n'));
  assert.ok(!r.lines.some((l) => l.includes('/evidence/for/pack')), 'the noindex page is not reported');
});
