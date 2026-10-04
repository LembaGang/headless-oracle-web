#!/usr/bin/env node
/**
 * check-agent-discovery.mjs: publish gate for the homepage's agent discovery surface.
 *
 * WHY THIS EXISTS: the `Link` header lives in public/_headers (static responses) and in
 * lib/agent-discovery.js (the Pages Function response). Two copies drift; this holds the
 * built _headers to the constant, and refuses a header whose targets do not answer 200
 * live, or whose relations are not the four registered ones agents look for.
 *
 * It also keeps public/index.md (served to `Accept: text/markdown`) in step with
 * index.html. The Markdown is hand-written, so it drifts unless something compares them.
 * Nothing here is hardcoded: the free pool, the paid quotas, the prices and the venue
 * count are extracted from both files with the same patterns and must agree, the page's
 * H1 must appear verbatim in the Markdown, and every same-origin link on the page must
 * appear in the Markdown. A page change not mirrored in the Markdown fails.
 *
 * Exit codes (the convention of check-banned.mjs):
 *   0  PASS      : every assertion holds
 *   1  MISMATCH  : every failed assertion is listed, then the gate fails
 *   2  usage / read / fetch error
 *
 * Usage:
 *   node scripts/check-agent-discovery.mjs [--dir=dist] [--html=<dir>/index.html] [--md=<dir>/index.md]
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
    throw new UsageError(`cannot read ${path}: run \`npm run build\` first (${e.code})`);
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

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(n);
    }
    return ENTITIES[e.toLowerCase()] ?? whole;
  });
}

/** What a reader sees: scripts and styles removed, tags stripped, entities decoded. */
function visibleText(html) {
  const noCode = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  return decodeEntities(noCode.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

/**
 * Facts the homepage must state and the Markdown must state identically. The homepage
 * leads with Chirindo Witness since W4 (2026-10-04), so these are its facts: the free
 * pool, the paid quotas, every dollar amount, the monthly prices, the venue count.
 */
const FACTS = {
  pool: /pool of (\d[\d,]*)/g,
  quota: /up to (\d[\d,]*) new checkpoints a UTC day/g,
  dollars: /\$(\d[\d,]*(?:\.\d+)?)/g,
  monthly: /\$(\d[\d,]*(?:\.\d+)?)\/month/g,
  venues: /(\d+)\s+venues/g,
};

/**
 * The market-state facts the homepage carried before W4. It no longer states them, so
 * they are not required; if either file states one, both must state the same values.
 */
const FACTS_IF_PRESENT = {
  price: /(\d+(?:\.\d+)?)\s*USDC/g,
  allowance: /(\d[\d,]*)\s*(?:calls|requests|req)\s*\/\s*day/g,
  exchanges: /(\d+)\s+(?:global\s+)?exchanges/g,
};

function factSet(text, re) {
  return new Set([...text.matchAll(re)].map((m) => m[1]));
}

/** The text of the page's first <h1>, as a reader sees it. */
function firstH1(html) {
  const m = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? visibleText(m[1]) : null;
}

/**
 * Same-origin links on the page as absolute URLs; fragments dropped, pure fragments
 * skipped. A link is an <a href> or a <link rel="alternate"> (the machine-readable
 * alternates an agent follows); the Markdown alternate is the Markdown itself, and
 * stylesheets and fonts are not links a reader follows.
 */
function sameOriginHrefs(html) {
  const out = new Set();
  const tags = [...html.matchAll(/<a\b[^>]*>/gi), ...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => {
    if (!/^<link/i.test(tag)) return true;
    return /\brel\s*=\s*["']alternate["']/i.test(tag) && !/\btype\s*=\s*["']text\/markdown["']/i.test(tag);
  });
  for (const tag of tags) {
    const m = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i);
    if (!m) continue;
    let v = m[1].trim().split('#')[0];
    if (!v) continue;
    if (v.startsWith(ORIGIN)) v = v.slice(ORIGIN.length) || '/';
    else if (!v.startsWith('/') || v.startsWith('//')) continue;
    out.add(ORIGIN + v);
  }
  return out;
}

const SITE_URL = /https:\/\/headlessoracle\.com(?:\/[^\s<>()[\]"'`]*)?/g;

/**
 * Splits Markdown into prose and code. Fenced blocks and inline code spans are code;
 * a URL in code is not a link, so it is held to the page's visible text instead.
 */
function splitMarkdown(md) {
  const code = [];
  const prose = md
    .replace(/^ {0,3}(```|~~~)[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, (block) => {
      code.push(block);
      return ' ';
    })
    .replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (span) => {
      code.push(span);
      return ' ';
    });
  return { prose, code: code.join('\n') };
}

/**
 * Every site URL in prose: [text](url), <url>, a bare URL in a list item or a sentence.
 * Fragments are dropped, as on the page side: /#start and / are the same document.
 */
function proseLinks(prose) {
  return new Set(
    [...prose.matchAll(SITE_URL)].map((m) => {
      const u = m[0].replace(/[.,;:!?]+$/, '').split('#')[0];
      return u === ORIGIN ? ORIGIN + '/' : u;
    }),
  );
}

/** A whole token: delimited by whitespace, a backtick, a quote, or the ends of the text. */
function hasWholeToken(text, token) {
  const delim = (c) => c === undefined || /[\s`'"]/.test(c);
  for (let i = text.indexOf(token); i !== -1; i = text.indexOf(token, i + 1)) {
    if (delim(text[i - 1]) && delim(text[i + token.length])) return true;
  }
  return false;
}

function checkMarkdownSync(htmlPath, mdPath, fails, lines) {
  const html = read(htmlPath);
  const md = read(mdPath).replace(/\r\n/g, '\n');
  const text = visibleText(html);

  const firstLine = md.split('\n')[0];
  if (firstLine !== '# Headless Oracle') fails.push(`Markdown first line is "${firstLine}", must be "# Headless Oracle"`);
  else lines.push('ok   Markdown first line is "# Headless Oracle"');

  for (const [name, re] of [...Object.entries(FACTS), ...Object.entries(FACTS_IF_PRESENT)]) {
    const required = name in FACTS;
    const a = factSet(text, re);
    const b = factSet(md, re);
    const onlyHtml = [...a].filter((v) => !b.has(v));
    const onlyMd = [...b].filter((v) => !a.has(v));
    if (a.size === 0 && required) fails.push(`${name}: no value found on the page (pattern ${re})`);
    else if (onlyHtml.length || onlyMd.length) {
      fails.push(`${name}: page has {${[...a].join(', ')}}, Markdown has {${[...b].join(', ')}}`);
    } else if (a.size === 0) lines.push(`ok   ${name}: stated in neither file (optional since W4)`);
    else lines.push(`ok   ${name} {${[...a].join(', ')}} agrees between page and Markdown`);
  }

  // The hero line is the page's claim; the Markdown must make the same one, verbatim.
  const h1 = firstH1(html);
  const mdText = md.replace(/\s+/g, ' ');
  if (!h1) fails.push('the page has no <h1>');
  else if (!mdText.includes(h1)) fails.push(`the page's H1 "${h1}" does not appear verbatim in the Markdown`);
  else lines.push(`ok   the page's H1 "${h1}" appears verbatim in the Markdown`);

  const { prose, code } = splitMarkdown(md);
  const pageLinks = sameOriginHrefs(html);
  const mdLinks = proseLinks(prose);
  const linkTargets = new Set(parseLink(LINK_HEADER).map((e) => new URL(e.target, ORIGIN).href));

  const missing = [...pageLinks].filter((u) => !mdLinks.has(u));
  if (missing.length) fails.push(`page links missing from the Markdown: ${missing.join(' ')}`);
  else lines.push(`ok   all ${pageLinks.size} same-origin page links appear as Markdown links`);

  const unknown = [...mdLinks].filter((u) => !pageLinks.has(u) && !linkTargets.has(u));
  if (unknown.length) fails.push(`Markdown links not on the page or in LINK_HEADER: ${unknown.join(' ')}`);
  else lines.push(`ok   every Markdown site link is on the page or in LINK_HEADER (${mdLinks.size})`);

  const codeUrls = new Set([...code.matchAll(SITE_URL)].map((m) => m[0]));
  const notVisible = [...codeUrls].filter((u) => !hasWholeToken(text, u));
  if (notVisible.length) fails.push(`URLs in Markdown code not visible on the page as whole tokens: ${notVisible.join(' ')}`);
  else lines.push(`ok   every URL in Markdown code (${codeUrls.size}) is visible on the page as a whole token`);
}

async function main() {
  const dir = resolve(arg('dir', 'dist'));
  const fails = [];
  const lines = [];
  checkMarkdownSync(resolve(arg('html', join(dir, 'index.html'))), resolve(arg('md', join(dir, 'index.md'))), fails, lines);
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
  console.log(e instanceof UsageError ? `ERROR ${e.message}` : `ERROR unhandled: ${e.stack || e.message}`);
  process.exitCode = EXIT_ERROR;
}
