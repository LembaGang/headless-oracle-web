#!/usr/bin/env node
/**
 * check-prices.mjs — publish gate for price drift between the built pricing page
 * and the live pricing API.
 *
 * WHY THIS EXISTS: every price on pricing.html is a literal in the markup (agents and
 * crawlers read HTML, so injecting them at runtime is not an option). Literals drift.
 * The worker is the single source of truth for what a plan actually costs; this script
 * refuses to let a page ship that disagrees with it.
 *
 * The API serves its offerings in two shapes and this reads both:
 *   api.tiers[]            {id, price_usd|price_usdc, price_label, calls_per_day}
 *   api.referee.services[] {plan, name, usd, cycle}   — plus referee.neutrality and
 *                                                       referee.introductory_until
 *
 * Three states, three exit codes:
 *   0  MATCH                          — every plan the API knows agrees with the page
 *   1  MISMATCH <field> page=<a> api=<b>  — first disagreement, named
 *   3  REFEREE_SECTION_ABSENT_FROM_API — the six referee services are on the page but
 *                                        the API carries no referee.services[] block.
 *                                        Not a mismatch. Still blocks publish: shipping
 *                                        a page that advertises services the API cannot
 *                                        sell is the worse failure. The gate opens by
 *                                        itself once the worker deploys. A referee
 *                                        block that is PRESENT but missing one of the
 *                                        six is a mismatch, not an absence.
 *   2  usage / fetch / parse error
 *
 * Usage:
 *   node scripts/check-prices.mjs [--page=dist/pricing.html] [--api=https://headlessoracle.com/v5/pricing]
 *     [--offer-pages=dist/index.html,dist/pricing.html,dist/witness.html]   JSON-LD Offers held to the API too
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_PAGE = 'dist/pricing.html';
const DEFAULT_API = 'https://headlessoracle.com/v5/pricing';

const EXIT_MATCH = 0;
const EXIT_MISMATCH = 1;
const EXIT_ERROR = 2;
const EXIT_REFEREE_ABSENT = 3;

/** The six referee services. Absence of any of these from the page is a page defect. */
const REFEREE_PLANS = [
  'conformance_entry',
  'regrade',
  'dispute',
  'dispute_note',
  'custody_90d',
  'custody_1y',
];

/** Byte-exact neutrality rule. Paraphrase is a defect, not a style choice. */
const NEUTRALITY_RULE =
  'A paid entry buys the run and the published record, never the verdict. Every entry ' +
  'carries an Interests section: the referee is the author of a competing format; ' +
  'independence is not claimed; recomputability from pinned bytes is claimed; the text ' +
  'and the implementation are scored separately; a finding stands until its author ' +
  'corrects the record, and the correction is published beside it. Verification of any ' +
  'receipt is free, always.';

/**
 * Report a terminal state and unwind. Deliberately NOT process.exit(): calling it while
 * undici still holds a keep-alive socket trips a libuv assertion on Windows and the
 * shell sees 127 instead of the gate's own code. main() sets process.exitCode and lets
 * the event loop drain.
 */
class Gate extends Error {
  constructor(code, lines) {
    super(Array.isArray(lines) ? lines[0] : lines);
    this.code = code;
    this.lines = Array.isArray(lines) ? lines : [lines];
  }
}

function fail(code, lines) {
  throw new Gate(code, lines);
}

function arg(name, fallback) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/**
 * Walk forward from the opening tag of a data-price-item element and return its full
 * outerHTML, counting nested <div> depth. Regex alone cannot find the close.
 */
function sliceElement(html, openIdx) {
  const tagEnd = html.indexOf('>', openIdx);
  if (tagEnd === -1) return null;
  let depth = 1;
  const re = /<(\/?)div\b/gi;
  re.lastIndex = tagEnd + 1;
  let m;
  while ((m = re.exec(html)) !== null) {
    depth += m[1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(openIdx, m.index);
  }
  return null;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

/** Normalise "$2,500" / "2500" / "0.001" to a Number. */
function money(s) {
  if (s === null || s === undefined) return null;
  const n = Number(String(s).replace(/[$,]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parsePage(html) {
  const items = [];
  const openRe = /<div\b[^>]*\bdata-price-item\b[^>]*>/gi;
  let m;
  while ((m = openRe.exec(html)) !== null) {
    const openTag = m[0];
    const block = sliceElement(html, m.index);
    if (block === null) {
      fail(EXIT_ERROR, `ERROR unclosed data-price-item element for plan=${attr(openTag, 'data-plan')}`);
    }
    // Every "$N" the reader actually sees inside this card.
    const visible = (block.match(/\$[\d,]+(?:\.\d+)?/g) || []).map(money);
    items.push({
      plan: attr(openTag, 'data-plan'),
      price: money(attr(openTag, 'data-price-usd')),
      cycle: attr(openTag, 'data-cycle'),
      callsPerDay: attr(openTag, 'data-calls-per-day'),
      introductoryUntil: attr(openTag, 'data-introductory-until'),
      visible,
    });
  }
  return items;
}

/** Derive the billing cycle from the API's price_label. */
function apiCycle(tier) {
  const label = String(tier.price_label || '').toLowerCase();
  if (/one-?time/.test(label)) return 'one-time';
  if (/request/.test(label)) return 'request';
  if (/month/.test(label)) return 'month';
  if (money(tier.price_usd) === 0) return 'free';
  return 'unknown';
}

function apiPrice(tier) {
  if (tier.price_usd !== undefined && tier.price_usd !== null) return money(tier.price_usd);
  if (tier.price_usdc !== undefined && tier.price_usdc !== null) return money(tier.price_usdc);
  return null;
}

/**
 * The referee services do not ship as tiers. The worker serves them under
 * `referee.services[]` as {plan, name, usd, cycle}, where `usd` is a decimal string
 * ("2500.00") and `cycle` is null for a one-time charge or {interval, frequency} for a
 * subscription. Normalise them onto the same {price, cycle} shape the tier comparison
 * already uses, so every existing check applies to the six unchanged.
 *
 * A frequency other than 1 is deliberately NOT flattened to the bare interval: an API
 * billing every 3 months yields "3-month", which will not match a page saying "month".
 * That is a real disagreement and should be loud.
 */
function refereeCycle(service) {
  if (service.cycle === null || service.cycle === undefined) return 'one-time';
  const { interval, frequency } = service.cycle;
  if (frequency === undefined || frequency === null || Number(frequency) === 1) {
    return String(interval);
  }
  return `${frequency}-${interval}`;
}

/** Unified plan -> {price, cycle, source} map across tiers[] and referee.services[]. */
function buildApiPlans(api, refereeBlock) {
  const byPlan = new Map();
  for (const tier of api.tiers) {
    byPlan.set(tier.id, { price: apiPrice(tier), cycle: apiCycle(tier), source: 'tiers' });
  }
  if (refereeBlock) {
    for (const service of refereeBlock.services) {
      byPlan.set(service.plan, {
        price: money(service.usd),
        cycle: refereeCycle(service),
        source: 'referee.services',
      });
    }
  }
  return byPlan;
}

async function main() {
  const pagePath = resolve(arg('page', DEFAULT_PAGE));
  const apiUrl = arg('api', DEFAULT_API);
  const offerPages = arg('offer-pages', DEFAULT_OFFER_PAGES.join(',')).split(',').filter(Boolean);

  let html;
  try {
    html = readFileSync(pagePath, 'utf8');
  } catch (e) {
    fail(EXIT_ERROR, `ERROR cannot read built page ${pagePath} — run \`npm run build\` first (${e.code})`);
  }

  let api;
  try {
    const res = await fetch(apiUrl, { headers: { accept: 'application/json' } });
    if (!res.ok) fail(EXIT_ERROR, `ERROR ${apiUrl} returned HTTP ${res.status}`);
    api = await res.json();
  } catch (e) {
    if (e instanceof Gate) throw e;
    fail(EXIT_ERROR, `ERROR cannot fetch ${apiUrl} — ${e.message}`);
  }

  const tiers = Array.isArray(api.tiers) ? api.tiers : [];
  if (tiers.length === 0) fail(EXIT_ERROR, `ERROR ${apiUrl} carried no tiers`);

  // The referee block is optional by design: its absence is state 3, not an error.
  const refereeBlock =
    api.referee && Array.isArray(api.referee.services) && api.referee.services.length > 0
      ? api.referee
      : null;

  const pageItems = parsePage(html);
  if (pageItems.length === 0) {
    fail(EXIT_ERROR, `ERROR no data-price-item elements found in ${pagePath}`);
  }

  // --- Page integrity: the things a price check alone would not notice ---------------

  if (/\bpri_/.test(html)) {
    const bad = (html.match(/\bpri_[A-Za-z0-9_]*/) || [])[0];
    fail(EXIT_MISMATCH, `MISMATCH price_id_leaked page=${bad} api=<worker holds price ids, page must not>`);
  }

  // The rule is checked against two independent authorities: the constant above (which
  // catches the API and the page drifting together) and the worker's own
  // referee.neutrality (which catches the page and the constant drifting together).
  // Either direction is a mismatch.
  if (!html.includes(NEUTRALITY_RULE)) {
    fail(EXIT_MISMATCH, 'MISMATCH neutrality_rule page=<altered or absent> api=<canonical constant>');
  }

  if (refereeBlock) {
    if (typeof refereeBlock.neutrality !== 'string' || refereeBlock.neutrality.length === 0) {
      fail(EXIT_MISMATCH, 'MISMATCH neutrality_rule page=<present> api=<referee.neutrality missing>');
    }
    if (refereeBlock.neutrality !== NEUTRALITY_RULE) {
      fail(
        EXIT_MISMATCH,
        `MISMATCH neutrality_rule page=<canonical constant> api=<differs from constant, ${refereeBlock.neutrality.length} chars>`,
      );
    }
    if (!html.includes(refereeBlock.neutrality)) {
      fail(EXIT_MISMATCH, 'MISMATCH neutrality_rule page=<does not carry api referee.neutrality> api=<referee.neutrality>');
    }
  }

  for (const plan of REFEREE_PLANS) {
    if (!pageItems.some((i) => i.plan === plan)) {
      fail(EXIT_MISMATCH, `MISMATCH referee_service_missing page=<absent> api=${plan}`);
    }
  }

  // --- Introductory window ------------------------------------------------------------
  // The page prints "Introductory until 31 December 2026" beside every referee price.
  // If the worker moves the window and the page does not, the page is selling on a date
  // that has passed.

  if (refereeBlock) {
    const apiUntil = refereeBlock.introductory_until;
    if (!apiUntil) {
      fail(EXIT_MISMATCH, 'MISMATCH introductory_until page=<present> api=<referee.introductory_until missing>');
    }
    for (const item of pageItems.filter((i) => REFEREE_PLANS.includes(i.plan))) {
      if (item.introductoryUntil !== apiUntil) {
        fail(
          EXIT_MISMATCH,
          `MISMATCH introductory_until page=${item.introductoryUntil || '<missing>'} api=${apiUntil} (plan ${item.plan})`,
        );
      }
    }
  }

  // --- The visible figure must agree with the machine-readable attribute -------------
  // Without this, someone edits the big "$99" and leaves data-price-usd="99", and the
  // check stays green while the page lies.

  for (const item of pageItems) {
    if (item.price === null) {
      fail(EXIT_MISMATCH, `MISMATCH ${item.plan}.data-price-usd page=<missing> api=<required>`);
    }
    if (item.price > 0 && !item.visible.includes(item.price)) {
      fail(
        EXIT_MISMATCH,
        `MISMATCH ${item.plan}.visible_price page=${JSON.stringify(item.visible)} api=${item.price} (attribute and printed figure disagree)`,
      );
    }
  }

  // --- Page vs API ------------------------------------------------------------------

  const apiByPlan = buildApiPlans(api, refereeBlock);
  const tierById = new Map(tiers.map((t) => [t.id, t]));
  const absentFromApi = [];

  for (const item of pageItems) {
    const offering = apiByPlan.get(item.plan);
    if (!offering) {
      absentFromApi.push(item.plan);
      continue;
    }
    if (offering.price !== item.price) {
      fail(EXIT_MISMATCH, `MISMATCH ${item.plan}.price page=${item.price} api=${offering.price}`);
    }
    if (offering.cycle !== item.cycle) {
      fail(EXIT_MISMATCH, `MISMATCH ${item.plan}.cycle page=${item.cycle} api=${offering.cycle}`);
    }
    // B-113: the allowance is a literal on the page; the worker derives it from one
    // constant. This is what stops the two drifting apart. Tier-only — referee services
    // carry no per-day allowance.
    const tier = tierById.get(item.plan);
    if (tier && item.callsPerDay !== null && tier.calls_per_day !== undefined && tier.calls_per_day !== null) {
      if (Number(item.callsPerDay) !== Number(tier.calls_per_day)) {
        fail(
          EXIT_MISMATCH,
          `MISMATCH ${item.plan}.calls_per_day page=${item.callsPerDay} api=${tier.calls_per_day}`,
        );
      }
    }
  }

  // A referee block that is present but incomplete is a disagreement, not an absence.
  // Only a wholly absent referee block is state 3.
  if (refereeBlock) {
    const missing = absentFromApi.filter((p) => REFEREE_PLANS.includes(p));
    if (missing.length > 0) {
      fail(
        EXIT_MISMATCH,
        `MISMATCH referee_service_missing_from_api page=${missing[0]} api=<referee.services present but does not offer it>`,
      );
    }
  }

  const unexpectedAbsent = absentFromApi.filter((p) => !REFEREE_PLANS.includes(p));
  if (unexpectedAbsent.length > 0) {
    fail(EXIT_MISMATCH, `MISMATCH unknown_plan page=${unexpectedAbsent[0]} api=<not offered>`);
  }

  const checked = pageItems.filter((i) => apiByPlan.has(i.plan)).map((i) => i.plan);

  // --- JSON-LD offers on the other pages -----------------------------------------------
  const offerLines = checkOfferPages(offerPages, tiers);

  if (absentFromApi.length > 0) {
    return {
      code: EXIT_REFEREE_ABSENT,
      lines: [
        `REFEREE_SECTION_ABSENT_FROM_API missing=${absentFromApi.join(',')}`,
        `  ${checked.length} API plans checked and in agreement: ${checked.join(', ')}`,
        `  The six referee services are on the page and priced, but ${apiUrl} carries`,
        '  no referee.services[] block. Publish stays blocked until the worker deploy',
        '  lands, so that the page and the API go live together.',
      ],
    };
  }

  return {
    code: EXIT_MATCH,
    lines: [
      `MATCH ${checked.length} plans agree between ${pagePath} and ${apiUrl}`,
      `  ${checked.join(', ')}`,
      ...offerLines,
    ],
  };
}

/**
 * Pages whose JSON-LD Offers are held to the API. Agents and answer engines read these
 * prices without ever opening /pricing, so a stale literal there misleads exactly them.
 * Every Offer must carry a `sku` naming an API tier id; a listed page with no Offers fails.
 */
const DEFAULT_OFFER_PAGES = ['dist/index.html', 'dist/pricing.html', 'dist/witness.html'];

function jsonLdBlocks(html, page) {
  const out = [];
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      out.push(JSON.parse(m[1]));
    } catch (e) {
      fail(EXIT_MISMATCH, `MISMATCH jsonld_unparseable page=${page} api=<n/a> (${e.message})`);
    }
  }
  return out;
}

function collectOffers(node, out) {
  if (Array.isArray(node)) node.forEach((n) => collectOffers(n, out));
  else if (node && typeof node === 'object') {
    if (node['@type'] === 'Offer') out.push(node);
    Object.values(node).forEach((v) => collectOffers(v, out));
  }
  return out;
}

/** What a reader sees: no scripts, styles, comments or tags; entities left as written. */
function pageText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');
}

function checkOfferPages(pages, tiers) {
  const lines = [];
  const tierById = new Map(tiers.map((t) => [t.id, t]));
  for (const page of pages) {
    let html;
    try {
      html = readFileSync(resolve(page), 'utf8');
    } catch (e) {
      fail(EXIT_ERROR, `ERROR cannot read ${page} for its JSON-LD offers (${e.code})`);
    }
    const offers = collectOffers(jsonLdBlocks(html, page), []);
    if (offers.length === 0) fail(EXIT_MISMATCH, `MISMATCH jsonld_offers page=${page}:<none> api=<at least one Offer expected>`);
    const text = pageText(html);
    for (const o of offers) {
      const tier = tierById.get(o.sku);
      if (!tier) fail(EXIT_MISMATCH, `MISMATCH jsonld_offer_sku page=${page}:${o.sku ?? '<missing>'} api=<no tier with that id>`);
      const price = money(o.price);
      if (price !== apiPrice(tier)) fail(EXIT_MISMATCH, `MISMATCH ${o.sku}.jsonld_price page=${page}:${o.price} api=${apiPrice(tier)}`);
      if (o.priceCurrency !== 'USD') fail(EXIT_MISMATCH, `MISMATCH ${o.sku}.jsonld_currency page=${page}:${o.priceCurrency} api=USD`);
      if ((o.priceValidUntil ?? null) !== (tier.introductory_until ?? null)) {
        fail(EXIT_MISMATCH, `MISMATCH ${o.sku}.jsonld_priceValidUntil page=${page}:${o.priceValidUntil ?? '<none>'} api=${tier.introductory_until ?? '<none>'}`);
      }
      // A daily checkpoint figure in the offer must be the API's.
      const n = String(o.description || '').match(/(?:pool of|up to) (\d[\d,]*)/);
      if (tier.checkpoints_per_day !== undefined && (!n || money(n[1]) !== tier.checkpoints_per_day)) {
        fail(EXIT_MISMATCH, `MISMATCH ${o.sku}.jsonld_checkpoints_per_day page=${page}:${n ? n[1] : '<none>'} api=${tier.checkpoints_per_day}`);
      }
      // A paid monthly offer must also be what the page shows a human.
      // Tags between the figure and the cycle ("$49</p><p>/month") read as a space.
      if (price > 0 && tier.interval === 'month' && !new RegExp(`\\$${price}\\s*/\\s*month\\b`).test(text)) {
        fail(EXIT_MISMATCH, `MISMATCH ${o.sku}.visible_price page=${page}:<no "$${price}/month" in the text> api=${price}`);
      }
    }
    lines.push(`  JSON-LD offers agree on ${page}: ${offers.map((o) => `${o.sku}=${o.price}`).join(', ')}`);
  }
  return lines;
}

try {
  const { code, lines } = await main();
  lines.forEach((l) => console.log(l));
  process.exitCode = code;
} catch (e) {
  if (e instanceof Gate) {
    e.lines.forEach((l) => console.log(l));
    process.exitCode = e.code;
  } else {
    console.log(`ERROR unhandled — ${e.stack || e.message}`);
    process.exitCode = EXIT_ERROR;
  }
}
