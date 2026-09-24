#!/usr/bin/env node
/**
 * check-banned.mjs — publish gate for claims that must never ship.
 *
 * WHY THIS EXISTS: B-224e. /standards cited an "SEC/CFTC Technical Framework" that does
 * not exist, weeks after the worker had dropped the name, because nothing checked the
 * built pages before `wrangler pages deploy`. A sentence-level review also missed it:
 * the regulator was named in one sentence and the alignment verb sat in the next. An
 * exact-string check caught it. This script is that check, run over everything that
 * ships.
 *
 * Matching is case-insensitive over each file's text with whitespace runs collapsed to
 * one space (and dropped after a hyphen), so a phrase wrapped across source lines is
 * still caught.
 *
 * Every text file under dist/ is scanned (not just .html): meta tags, sitemap, robots
 * and JS bundles all reach crawlers and agents.
 *
 * Exit codes:
 *   0  CLEAN                         — no banned phrase in any shipped file
 *   1  BANNED <file>:<line> "<phrase>" — every hit is listed, then the gate fails
 *   2  usage / read error, or nothing to scan
 *
 * Usage:
 *   node scripts/check-banned.mjs [--dir=dist]
 */

import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const EXIT_CLEAN = 0;
const EXIT_BANNED = 1;
const EXIT_ERROR = 2;

/**
 * Each entry: the phrase, and why it is banned. Add a phrase when a false public claim
 * is found; never remove one without saying why in the commit.
 *
 * Deliberately NOT banned: "regulatory certification" and "compliance guarantee".
 * terms.html uses both to PROHIBIT customers presenting attestations that way, which
 * is honest.
 */
const BANNED = [
  ['SEC/CFTC Technical Framework', 'no such document exists (B-224, B-224e)'],
  ['SEC/CFTC framework', 'short form of the same non-existent document (B-224e)'],
  ['regulatory-aligned', 'implies regulator review or endorsement; none has happened (B-224e)'],
  ['regulatory alignment', 'implies regulator review or endorsement; none has happened (B-224e)'],
  ['built to meet emerging regulatory', 'claims to meet requirements no regulator has set (B-224e)'],
  ['map one-to-one', 'the claimed one-to-one mapping was onto a non-existent requirement (B-224e)'],
  ['tamper-proof', 'overclaim; signatures make tampering detectable, not impossible (directive floor)'],
  ['tamperproof', 'overclaim; spelling variant of tamper-proof (directive floor)'],
  ['the only signed receipt', 'uncalibrated exclusivity claim (directive floor)'],
];

/** Binary assets carry no prose. Anything else is scanned. */
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.avif', '.woff', '.woff2', '.ttf', '.otf', '.pdf', '.wasm']);

function arg(name, fallback) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (!SKIP_EXT.has(extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

/**
 * Report the line where each hit starts. Collapsing whitespace (which lets a match
 * span line breaks) loses line numbers, so each index in the collapsed text is mapped
 * back to its line in the original.
 */
function findHits(text) {
  const collapsed = [];
  const lineOf = [];
  let line = 1;
  let prevSpace = false;
  for (const ch of text) {
    const isSpace = /\s/.test(ch);
    // Whitespace after a hyphen is dropped, so "tamper-\nproof" still reads "tamper-proof".
    const afterHyphen = isSpace && collapsed[collapsed.length - 1] === '-';
    if (!(isSpace && prevSpace) && !afterHyphen) {
      collapsed.push(isSpace ? ' ' : ch.toLowerCase());
      lineOf.push(line);
    }
    if (ch === '\n') line++;
    prevSpace = isSpace;
  }
  const hay = collapsed.join('');
  const hits = [];
  for (const [phrase, why] of BANNED) {
    const needle = phrase.toLowerCase();
    let i = hay.indexOf(needle);
    while (i !== -1) {
      hits.push({ line: lineOf[i], phrase, why });
      i = hay.indexOf(needle, i + 1);
    }
  }
  return hits;
}

function main() {
  const dir = resolve(arg('dir', 'dist'));
  let files;
  try {
    files = walk(dir);
  } catch (e) {
    return { code: EXIT_ERROR, lines: [`ERROR cannot read ${dir} — run \`npm run build\` first (${e.code})`] };
  }
  if (files.length === 0) {
    // An empty directory would pass vacuously; fail closed instead.
    return { code: EXIT_ERROR, lines: [`ERROR no files to scan under ${dir}`] };
  }

  const lines = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch (e) {
      return { code: EXIT_ERROR, lines: [`ERROR cannot read ${file} (${e.code})`] };
    }
    for (const h of findHits(text)) {
      lines.push(`BANNED ${relative(process.cwd(), file)}:${h.line} "${h.phrase}" — ${h.why}`);
    }
  }

  if (lines.length > 0) {
    lines.push(`${lines.length} banned phrase hit(s) in ${dir}; publish blocked.`);
    return { code: EXIT_BANNED, lines };
  }
  return { code: EXIT_CLEAN, lines: [`CLEAN ${files.length} files under ${dir}, ${BANNED.length} banned phrases, 0 hits`] };
}

try {
  const { code, lines } = main();
  lines.forEach((l) => console.log(l));
  process.exitCode = code;
} catch (e) {
  console.log(`ERROR unhandled — ${e.stack || e.message}`);
  process.exitCode = EXIT_ERROR;
}
