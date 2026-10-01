#!/usr/bin/env node
/**
 * check-agent-discovery.mjs — publish gate for the homepage's agent discovery surface.
 *
 * WHY THIS EXISTS: the `Link` header lives in public/_headers (static responses) and in
 * lib/agent-discovery.js (the Pages Function response). Two copies drift; this holds the
 * built _headers to the constant, and refuses a header whose targets do not answer 200
 * live, or whose relations are not the four registered ones agents look for.
 *
 * Exit codes (the convention of check-banned.mjs):
 *   0  PASS      — every assertion holds
 *   1  MISMATCH  — every failed assertion is listed, then the gate fails
 *   2  usage / read / fetch error
 *
 * Usage:
 *   node scripts/check-agent-discovery.mjs [--dir=dist]
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LINK_HEADER } from '../lib/agent-discovery.js';

const EXIT_PASS = 0;
const EXIT_MISMATCH = 1;
const EXIT_ERROR = 2;

const ORIGIN = 'https://headlessoracle.com';
const REGISTERED_RELS = ['api-catalog', 'service-desc', 'service-doc', 'describedby'];

class UsageError extends Error {}

function arg(name, fallback) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    throw new UsageError(`cannot read ${path} — run \`npm run build\` first (${e.code})`);
  }
}

/** The `Link:` value under the `/` rule in a _headers file, or null if there is none. */
function linkUnderRoot(headersText) {
  let inRoot = false;
  for (const raw of headersText.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      inRoot = line.trim() === '/';
      continue;
    }
    const m = line.match(/^\s+Link:\s?(.*)$/i);
    if (inRoot && m) return m[1];
  }
  return null;
}

function parseLink(value) {
  return value.split(/,\s*(?=<)/).map((part) => {
    const target = part.match(/^<([^>]*)>/)?.[1];
    const rel = part.match(/;\s*rel="([^"]*)"/)?.[1];
    return { target, rel };
  });
}

async function checkLinkHeader(dir, fails, lines) {
  const fromHeaders = linkUnderRoot(read(join(dir, '_headers')));
  if (fromHeaders === null) fails.push(`no Link header under / in ${join(dir, '_headers')}`);
  else if (fromHeaders !== LINK_HEADER) {
    fails.push(`_headers Link differs from LINK_HEADER\n  _headers: ${fromHeaders}\n  constant: ${LINK_HEADER}`);
  } else lines.push('ok   _headers Link under / is byte-equal to LINK_HEADER');

  const entries = parseLink(LINK_HEADER);
  const rels = entries.map((e) => e.rel).sort();
  const want = [...REGISTERED_RELS].sort();
  if (rels.length !== want.length || rels.some((r, i) => r !== want[i])) {
    fails.push(`rel set is [${rels.join(', ')}], must be exactly [${want.join(', ')}]`);
  } else lines.push(`ok   rel set is exactly ${want.join(', ')}`);

  for (const { target, rel } of entries) {
    if (!target) {
      fails.push(`an entry of LINK_HEADER has no <target> (rel=${rel})`);
      continue;
    }
    const url = new URL(target, ORIGIN).href;
    let res;
    try {
      res = await fetch(url, { redirect: 'follow' });
      await res.arrayBuffer();
    } catch (e) {
      throw new UsageError(`fetch ${url} failed (${e.message})`);
    }
    if (res.status !== 200) fails.push(`${rel} target ${url} answered ${res.status}, must be 200`);
    else lines.push(`ok   ${rel} target ${url} answered 200`);
  }
}

async function main() {
  const dir = resolve(arg('dir', 'dist'));
  const fails = [];
  const lines = [];
  await checkLinkHeader(dir, fails, lines);
  if (fails.length > 0) {
    return { code: EXIT_MISMATCH, lines: [...lines, ...fails.map((f) => `FAIL ${f}`), `${fails.length} failure(s); publish blocked.`] };
  }
  return { code: EXIT_PASS, lines: [...lines, 'PASS agent discovery'] };
}

try {
  const { code, lines } = await main();
  lines.forEach((l) => console.log(l));
  process.exitCode = code;
} catch (e) {
  console.log(e instanceof UsageError ? `ERROR ${e.message}` : `ERROR unhandled — ${e.stack || e.message}`);
  process.exitCode = EXIT_ERROR;
}
