#!/usr/bin/env node
/**
 * make-evidence-pages.mjs: writes the /evidence pages (the index, the two card cases, the
 * integration page, the data-point sheet and two unlisted pack pages) and their Markdown
 * twins from the example files under public/evidence/examples/ and from evidence-src/*.json.
 *
 * WHY THIS EXISTS: these pages state what a verifier said about real files. A verdict,
 * size or digest typed by hand drifts from the file it describes, and nothing notices. Here
 * every verdict, binding, limit, time and data point is read from the files the page links,
 * every size and sha256 is computed from those files' bytes, and `--check` (in the deploy
 * chain) fails when a page on disk is not what the files give.
 *
 * Values read from a JSON file are inserted as escaped text, never as markup or a link.
 * The text this script writes itself (the authored text) is held to the word rules below,
 * which `--check` enforces; values copied verbatim from the files are not, since they are
 * the verifier's own words.
 *
 * The pages' "as of" date is `generated` in evidence-src/source.json, never the clock, so
 * `--check` gives the same result on any later day.
 *
 * Exit codes:
 *   0  written, or (with --check) every page matches and every rule holds
 *   1  --check: a page differs or a rule fails (each is listed); or an input is not as expected
 *
 * Usage: node scripts/make-evidence-pages.mjs [--check]
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const EX = join(PUBLIC, 'evidence', 'examples');
const SRC = join(ROOT, 'evidence-src');
const ORIGIN = 'https://headlessoracle.com';
const REPO = 'https://github.com/LembaGang/chirindo';

const CHECK = process.argv.includes('--check');
const problems = [];
const die = (why) => { process.stderr.write(`make-evidence-pages: ${why}\n`); process.exit(1); };

// Values are wrapped in private-use markers while a page is built, so that the authored
// text can be checked on its own; the markers are removed before anything is written.
const VO = '';
const VC = '';
const strip = (s) => s.replaceAll(VO, '').replaceAll(VC, '');
const authoredOf = (s) => s.replace(/[^]*/g, ' ');

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const escMd = (s) => String(s).replace(/([\\`*_[\]<>|#])/g, '\\$1');
// A value from a JSON file, as text. JSON null, true and false show as JSON spells them.
const show = (x) => (x === null ? 'null' : typeof x === 'string' ? x : JSON.stringify(x));
const V = (x) => VO + escHtml(show(x)) + VC;
const VM = (x) => VO + escMd(show(x)) + VC;
// A value inside a code block, where Markdown needs no escaping.
const VMC = (x) => VO + show(x) + VC;

const sha = (b) => createHash('sha256').update(b).digest('hex');
const readJson = (p) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { die(`cannot read ${p}: ${e.message}`); }
};

// ---- inputs ----------------------------------------------------------------------------

const source = readJson(join(SRC, 'source.json'));
if (source.repository !== REPO) die(`source.json repository is ${source.repository}, expected ${REPO}`);
if (!/^[0-9a-f]{40}$/.test(source.commit ?? '')) die('source.json commit is not 40 hex digits');
if (!/^\d{4}-\d{2}-\d{2}$/.test(source.generated ?? '')) die('source.json generated is not a date');
const ZIP = `chirindo-evidence-${source.commit.slice(0, 12)}.zip`;
if (source.zip !== ZIP) die(`source.json zip is ${source.zip}, expected ${ZIP}`);
if (!existsSync(join(EX, ZIP))) die(`public/evidence/examples/${ZIP} is missing`);
const COMMIT = source.commit;
const ASOF = source.generated;

const quotes = readJson(join(SRC, 'quotes.json'));
// The sources the pack pages may quote. Their URLs are written here, not taken from the
// JSON, so that no value from a file becomes a link; quotes.json must name the same ones.
const QURL = {
  1: 'https://www.chargeflow.io/blog/securing-agentic-commerce',
  2: 'https://www.chargeflow.io/blog/agentic-commerce-chargebacks-the-evidence-playbook-merchants-need',
  3: 'https://justt.ai/blog/solving-agentic-commerce-chargebacks/',
  4: 'https://developers.justt.ai/docs/evidence-upload-guide',
  5: 'https://developers.justt.ai/docs/customized-api-params',
};
const qsrc = (n) => {
  const s = quotes.sources.find((x) => x.n === n);
  if (!s || s.url !== QURL[n]) die(`quotes.json source ${n} is missing or names another URL`);
  return s;
};
// A quoted string, only when its source answered 200 and the string was counted there.
const quoted = (n, text) => {
  const s = qsrc(n);
  const hit = s.strings.find((x) => x.s === text);
  if (!hit) die(`quotes.json source ${n} does not list ${JSON.stringify(text)}`);
  return s.status === 200 && hit.count >= 1;
};

const IDS = ['we-4-1', 'we-4-2', 'we-5-1', 'we-5-2'];
const ex = {};
for (const id of IDS) {
  const dir = join(EX, id);
  const page = readJson(join(dir, `${id}.json`));
  const onlineBytes = readFileSync(join(dir, `${id}.online-verdict.json`));
  const online = JSON.parse(onlineBytes.toString('utf8'));
  const dp = readJson(join(dir, `${id}.online.datapoints.json`));
  if (!isDeepStrictEqual(online, page.online?.verdict)) die(`${id}: the online verdict file is not the page's online.verdict`);
  if (dp.agent_evidence_verdict_sha256 !== `sha256:${sha(onlineBytes)}`) die(`${id}: the data-point export is not of the online verdict file`);
  const files = readdirSync(dir).sort().map((name) => {
    const b = readFileSync(join(dir, name));
    return { name, href: `/evidence/examples/${id}/${name}`, size: b.length, sha256: sha(b) };
  });
  ex[id] = { id, page, online, dp, files };
}
const fileOf = (id, name) => ex[id].files.find((f) => f.name === name) ?? die(`${id}: ${name} is missing`);
const shared = ['jwks.json', ZIP].map((name) => {
  const b = readFileSync(join(EX, name));
  return { name, href: `/evidence/examples/${name}`, size: b.length, sha256: sha(b) };
});

const pointerRun = readJson(join(SRC, 'pointer-we-4-1.verdict.json'));

const limitOf = (v, lid) => v.limits.find((l) => l.id === lid) ?? die(`limit ${lid} is not in the verdict`);
const binding = (v, bid) => v.bindings.find((b) => b.id === bid) ?? die(`binding ${bid} is not in the verdict`);
const check = (v, cid) => v.checks.find((c) => c.id === cid) ?? die(`check ${cid} is not in the verdict`);
const isCardSubject = (b) => b.state === 'NOT-EVALUATED' && b.reason === 'card-subject';

// ---- page frame ------------------------------------------------------------------------

const NAV = `<header class="site-head">
  <div class="wrap">
    <a class="wordmark" href="/">Headless Oracle</a>
    <nav aria-label="Main">
      <ul class="nav-list nav-wide">
        <li><a href="/witness">Witness</a></li>
        <li><a href="/verify">Verify</a></li>
        <li><a href="/pricing">Pricing</a></li>
        <li><a href="/docs">Docs</a></li>
        <li><a href="/auditors">For auditors</a></li>
        <li><a href="https://github.com/LembaGang">GitHub</a></li>
      </ul>
      <details class="nav-small">
        <summary>Menu</summary>
        <ul>
          <li><a href="/witness">Witness</a></li>
          <li><a href="/verify">Verify</a></li>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/docs">Docs</a></li>
          <li><a href="/auditors">For auditors</a></li>
          <li><a href="https://github.com/LembaGang">GitHub</a></li>
        </ul>
      </details>
    </nav>
  </div>
</header>`;

const FOOT = `<footer class="site-foot">
  <div class="wrap">
    <span class="mono">Headless Oracle</span>
    <ul class="foot-links">
      <li><a href="/terms">Terms</a></li>
      <li><a href="/privacy">Privacy</a></li>
      <li><a href="/refund">Refund</a></li>
      <li><!--email_off--><a href="mailto:mike@headlessoracle.com">mike@headlessoracle.com</a><!--/email_off--></li>
    </ul>
  </div>
</footer>`;

function htmlPage({ path, title, description, indexable, twin, kicker, h1, body }) {
  const head = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    `<title>${title} · Headless Oracle</title>`,
    `<meta name="description" content="${description}">`,
    indexable ? '<meta name="robots" content="index, follow">' : '<meta name="robots" content="noindex, nofollow">',
    '<meta name="color-scheme" content="light dark">',
    ...(indexable ? [`<link rel="canonical" href="${ORIGIN}${path}">`] : []),
    ...(twin ? [`<link rel="alternate" type="text/markdown" href="${twin}" title="This page in Markdown">`] : []),
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@400;500&display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="/css/site.css">',
    // Digests and long values must wrap on a phone rather than widen the page.
    '<style>.ev code, .ev td, .ev pre { overflow-wrap: anywhere; } .ev pre { white-space: pre-wrap; } .ev table { width: 100%; margin: 0.75rem 0 1.25rem; } .ev th, .ev td { text-align: left; vertical-align: top; padding: 0.35rem 0.6rem 0.35rem 0; border-bottom: 1px solid var(--rule, #ccc); } .ev blockquote { margin: 0.75rem 0; padding-left: 1rem; border-left: 3px solid var(--rule, #ccc); }</style>',
    '</head>',
  ];
  return [
    ...head,
    '<body>',
    '<a class="skip" href="#main">Skip to content</a>',
    '',
    NAV,
    '<main id="main" class="ev">',
    '',
    '<div class="wrap page-head">',
    `  <p class="kicker">${kicker}</p>`,
    `  <h1>${h1}</h1>`,
    '</div>',
    '',
    body,
    '',
    '</main>',
    '',
    FOOT,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

const section = (id, heading, inner) => `<section class="section" id="${id}" aria-labelledby="h-${id}">
  <div class="wrap">
    <h2 id="h-${id}">${heading}</h2>
${inner}
  </div>
</section>
`;

const table = (heads, rows) => `<table>
<thead><tr>${heads.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
<tbody>
${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table>`;
const mdTable = (heads, rows) => [
  `| ${heads.join(' | ')} |`,
  `|${heads.map(() => '---').join('|')}|`,
  ...rows.map((r) => `| ${r.join(' | ')} |`),
].join('\n');

const fileRows = (files) => files.map((f) => [`<a href="${f.href}"><code>${f.name}</code></a>`, String(f.size), `<code>${f.sha256}</code>`]);
const fileRowsMd = (files) => files.map((f) => [`[${f.name}](${f.href})`, String(f.size), `\`${f.sha256}\``]);

// ---- the case pages --------------------------------------------------------------------

const CASES = {
  'physical-order': {
    ids: ['we-4-1', 'we-4-2'],
    title: 'Worked example: a constructed test case of an AI agent ordering a physical item',
    h1: 'A constructed test case: an AI agent orders a physical item, and what the evidence shows',
    case: [
      'This is a constructed test case for one situation: an AI agent orders a physical item for a customer who has signed an instruction that sets limits on what the agent may buy. A script, using a test key, builds a signed log in the format a Chirindo gate writes, as if for the agent\'s separate decision call. The log\'s checkpoint was sent to Headless Oracle\'s live witness, which signed a receipt with its own clock time. The card charge time is a test value, set one minute after the witness receipt\'s time, so the ordering the verdict checks holds by construction here.',
      'The customer, the merchant, the order and the charge are test values made for this example. No real purchase was made, no card was charged, and no AI agent or gate ran: the files show what the verifier checks and what it reports. The limits above are the verifier\'s standard wording for a log of this format; here Headless Oracle holds the test key and a script built the log.',
      'In variant 1 the order is inside the instruction. In variant 2 the order holds a final-sale item, and the instruction allows only refundable items.',
    ],
  },
  'hotel-booking': {
    ids: ['we-5-1', 'we-5-2'],
    title: 'Worked example: a constructed test case of an AI agent booking a hotel',
    h1: 'A constructed test case: an AI agent books a hotel, and what the evidence shows',
    case: [
      'This is a constructed test case for one situation: an AI agent books a hotel stay for a customer who has signed an instruction that sets limits on what the agent may book. A script, using a test key, builds a signed log in the format a Chirindo gate writes, as if for the agent\'s separate decision call. The log\'s checkpoint was sent to Headless Oracle\'s live witness, which signed a receipt with its own clock time. The card charge time is a test value, set one minute after the witness receipt\'s time, so the ordering the verdict checks holds by construction here.',
      'The customer, the hotel, the stay, its dates and the charge are test values made for this example. No real booking was made, no card was charged, and no AI agent or gate ran: the files show what the verifier checks and what it reports. The limits above are the verifier\'s standard wording for a log of this format; here Headless Oracle holds the test key and a script built the log.',
      'In variant 1 the order is inside the instruction. In variant 2 the order holds a non-refundable rate, and the instruction allows only refundable ones.',
    ],
  },
};

function runCommands(id) {
  const { page } = ex[id];
  const args = page.stated.args.map(VMC).join(' ');
  return [
    `git clone ${REPO}.git`,
    'cd chirindo',
    `git checkout ${COMMIT}`,
    'cd examples/ordering-evidence-h4',
    'npm ci',
    'cd ../evidence-bundle',
    'npm ci',
    `node check-bundle.mjs ${VMC(page.bundle.path)} ${args} > ${id}.verdict.json`,
    `node check-bundle.mjs ${VMC(page.bundle.path)} ${args} --online > ${id}.online-verdict.json`,
    `node make-exhibit.mjs ${id}.online-verdict.json --page letter --out ${id}.online.letter.pdf`,
    `node make-datapoints.mjs ${id}.online-verdict.json > ${id}.online.datapoints.json`,
  ];
}
// Commands go into <pre> as escaped text; VMC marks the values for the authored check.
const preCmds = (lines) => `<pre><code>${lines.map((l) => l.split(VO).map((part, i) => (i === 0 ? escHtml(part) : (() => { const [v, rest] = part.split(VC); return VO + escHtml(v) + VC + escHtml(rest); })())).join('')).join('\n')}</code></pre>`;
const mdCmds = (lines) => ['```', ...lines, '```'].join('\n');

function variantBlock(id, n) {
  const { page, online: v, files } = ex[id];
  const c = v.card;
  const ch = v.stated.charge;
  const ins = v.instructions.find((i) => i.cited) ?? die(`${id}: no cited instruction`);
  const main = v.bindings.filter((b) => !isCardSubject(b));
  const card = v.bindings.filter(isCardSubject);
  const gaps = v.verdict.gaps.filter((g) => !(g.state === 'NOT-EVALUATED' && g.reason === 'card-subject'));
  const grc = binding(v, 'B-GRC');
  if (grc.state !== 'ABSENT' || v.verdict.gaps.some((g) => g.binding === 'B-GRC')) die(`${id}: B-GRC is not ABSENT outside the gaps`);
  if (card.length !== 2) die(`${id}: expected two card-subject bindings`);
  const off = page.offline_verdict;
  const exceeded = ins.exceeded.length ? V(ins.exceeded.join(', ')) : 'none';
  const exceededMd = ins.exceeded.length ? VM(ins.exceeded.join(', ')) : 'none';

  const html = `    <h3 id="${id}">Variant ${n}: <code>${id}</code></h3>
    <p>The online verdict:</p>
    <p><strong>${V(v.verdict.code)}</strong> (rule ${V(v.verdict.rule)})</p>
    <blockquote><p>${V(v.verdict.text)}</p></blockquote>
    <p>Checked at ${V(v.checked_at)}.</p>
    <h4>The stated charge</h4>
${table(['charge id', 'amount (minor units)', 'currency', 'authorized at', 'merchant order id'], [[V(ch.id), V(ch.amount_minor), V(ch.currency), V(ch.authorized_at), V(ch.merchant_order_id)]])}
    <h4>The committed order, as the online verdict reports it</h4>
${table(['merchant', 'merchant order id', 'currency', 'total (minor units)', 'items sum (minor units)', 'items'], [[V(c.order.merchant_id), V(c.order.merchant_order_id), V(c.order.currency), V(c.order.total_minor), V(c.order.items_sum_minor), V(c.order.item_count)]])}
${table(['amount matches', 'currency matches', 'order id matches', 'witness received at', 'before the authorization'], [[V(c.matches.amount), V(c.matches.currency), V(c.matches.merchant_order_id), V(c.witness_received_at), V(c.before_authorization)]])}
    <h4>The instruction's card limits, as the online verdict reports them</h4>
${table(['limit', 'result', 'reason'], ins.card_limits.map((l) => [V(l.limit), V(l.result), V(l.reason)]))}
    <p>Limits exceeded: ${exceeded}.</p>
    <h4>Bindings</h4>
${table(['binding', 'state', 'reason'], main.map((b) => [V(b.id), V(b.state), V(b.reason)]))}
    <h4>Does not apply to card payments</h4>
${table(['binding', 'state', 'reason'], card.map((b) => [V(b.id), V(b.state), V(b.reason)]))}
    <h4>Gaps</h4>
${gaps.length ? `    <ul>\n${gaps.map((g) => `      <li>${V(g.binding)} ${V(g.state)}${g.reason === null ? '' : ` (${V(g.reason)})`}</li>`).join('\n')}\n    </ul>` : '    <p>None besides the two bindings above that do not apply to card payments.</p>'}
    <p>The verdict JSON and the data-point export (<code>agent_gaps</code>) still list those two bindings among the gaps, as the format defines them. B-GRC (the gate receipt) reads ABSENT because these examples carry no gate receipt, and the format does not count that as a gap.</p>
    <h4>The same bundle, checked offline</h4>
    <p><strong>${V(off.verdict.code)}</strong> (rule ${V(off.verdict.rule)}, reason ${V(off.verdict.reason)})</p>
    <blockquote><p>${V(off.verdict.text)}</p></blockquote>
    <p>Offline, the verifier trusts the bundle's copy of the witness receipt, so it does not confirm the witness time (the verifier's README, "What an offline run never says").</p>
    <h4>Times, each with its clock</h4>
${table(['what', 'time', 'clock'], v.times.map((t) => [V(t.what), V(t.value), V(t.clock)]))}
    <h4>Every limit of the online verdict</h4>
${table(['limit', 'text'], v.limits.map((l) => [V(l.id), V(l.text)]))}
    <h4>Files</h4>
${table(['file', 'bytes', 'sha256'], fileRows(files))}
    <h4>Run it yourself</h4>
${preCmds(runCommands(id))}
    <p>Or download the zip below, extract it, and start from <code>cd chirindo-evidence/examples/ordering-evidence-h4</code>. The charge and its authorization time are test values. In a real dispute, the person running the verifier states them from the dispute record they hold.</p>
`;

  const md = `### Variant ${n}: ${id}

The online verdict:

**${VM(v.verdict.code)}** (rule ${VM(v.verdict.rule)})

> ${VM(v.verdict.text)}

Checked at ${VM(v.checked_at)}.

#### The stated charge

${mdTable(['charge id', 'amount (minor units)', 'currency', 'authorized at', 'merchant order id'], [[VM(ch.id), VM(ch.amount_minor), VM(ch.currency), VM(ch.authorized_at), VM(ch.merchant_order_id)]])}

#### The committed order, as the online verdict reports it

${mdTable(['merchant', 'merchant order id', 'currency', 'total (minor units)', 'items sum (minor units)', 'items'], [[VM(c.order.merchant_id), VM(c.order.merchant_order_id), VM(c.order.currency), VM(c.order.total_minor), VM(c.order.items_sum_minor), VM(c.order.item_count)]])}

${mdTable(['amount matches', 'currency matches', 'order id matches', 'witness received at', 'before the authorization'], [[VM(c.matches.amount), VM(c.matches.currency), VM(c.matches.merchant_order_id), VM(c.witness_received_at), VM(c.before_authorization)]])}

#### The instruction's card limits, as the online verdict reports them

${mdTable(['limit', 'result', 'reason'], ins.card_limits.map((l) => [VM(l.limit), VM(l.result), VM(l.reason)]))}

Limits exceeded: ${exceededMd}.

#### Bindings

${mdTable(['binding', 'state', 'reason'], main.map((b) => [VM(b.id), VM(b.state), VM(b.reason)]))}

#### Does not apply to card payments

${mdTable(['binding', 'state', 'reason'], card.map((b) => [VM(b.id), VM(b.state), VM(b.reason)]))}

#### Gaps

${gaps.length ? gaps.map((g) => `- ${VM(g.binding)} ${VM(g.state)}${g.reason === null ? '' : ` (${VM(g.reason)})`}`).join('\n') : 'None besides the two bindings above that do not apply to card payments.'}

The verdict JSON and the data-point export (\`agent_gaps\`) still list those two bindings among the gaps, as the format defines them. B-GRC (the gate receipt) reads ABSENT because these examples carry no gate receipt, and the format does not count that as a gap.

#### The same bundle, checked offline

**${VM(off.verdict.code)}** (rule ${VM(off.verdict.rule)}, reason ${VM(off.verdict.reason)})

> ${VM(off.verdict.text)}

Offline, the verifier trusts the bundle's copy of the witness receipt, so it does not confirm the witness time (the verifier's README, "What an offline run never says").

#### Times, each with its clock

${mdTable(['what', 'time', 'clock'], v.times.map((t) => [VM(t.what), VM(t.value), VM(t.clock)]))}

#### Every limit of the online verdict

${mdTable(['limit', 'text'], v.limits.map((l) => [VM(l.id), VM(l.text)]))}

#### Files

${mdTable(['file', 'bytes', 'sha256'], fileRowsMd(files))}

#### Run it yourself

${mdCmds(runCommands(id))}

Or download the zip below, extract it, and start from \`cd chirindo-evidence/examples/ordering-evidence-h4\`. The charge and its authorization time are test values. In a real dispute, the person running the verifier states them from the dispute record they hold.
`;
  return { html, md };
}

function casePage(slug) {
  const cfg = CASES[slug];
  const [a, b] = cfg.ids;
  const v = ex[a].online;
  const front = ['L24', 'L14', 'L3'].map((lid) => limitOf(v, lid));
  for (const lid of ['L24', 'L14', 'L3']) {
    if (limitOf(ex[b].online, lid).text !== limitOf(v, lid).text) die(`${slug}: ${lid} differs between the variants`);
  }
  if (ex[a].page.limit !== ex[b].page.limit) die(`${slug}: the example's limit differs between the variants`);
  const path = `/evidence/cases/${slug}`;
  const variants = cfg.ids.map((id, i) => variantBlock(id, i + 1));
  const description = 'A constructed card dispute test case: a script-built signed log of an AI agent\'s decision under a customer\'s signed instruction, with a live witness receipt, checked against a stated test charge, with the verifier\'s own verdicts and every file needed to rerun them.';

  const body = [
    section('limits', 'What this example does not show', `    <p>The example's own limit, as its page file states it:</p>
    <blockquote><p>${V(ex[a].page.limit)}</p></blockquote>
    <p>Three limits from the verifier's online verdict:</p>
${table(['limit', 'text'], front.map((l) => [V(l.id), V(l.text)]))}`),
    section('case', 'The case', cfg.case.map((p) => `    <p>${escHtml(p)}</p>`).join('\n')),
    section('variants', 'The two variants', variants.map((x) => x.html).join('\n')),
    section('shared', 'Shared files', `    <p>The operator key set the bundles name, and the verifier's source at commit <code>${COMMIT}</code> as one zip.</p>
${table(['file', 'bytes', 'sha256'], fileRows(shared))}
    <p>The source is also in the <a href="${REPO}">chirindo repository</a>, commit <code>${COMMIT}</code>. More: <a href="/evidence">all worked examples</a>, <a href="/evidence/integration">integration</a>, <a href="/evidence/datapoints">the data-point sheet</a>.</p>`),
  ].join('\n');

  const html = htmlPage({ path, title: cfg.title, description, indexable: true, twin: `${path}.md`, kicker: 'Agent dispute evidence', h1: cfg.h1, body });
  const md = `# ${cfg.h1}

Headless Oracle · ${ORIGIN}${path} · as of ${ASOF}

## What this example does not show

The example's own limit, as its page file states it:

> ${VM(ex[a].page.limit)}

Three limits from the verifier's online verdict:

${mdTable(['limit', 'text'], front.map((l) => [VM(l.id), VM(l.text)]))}

## The case

${cfg.case.join('\n\n')}

## The two variants

${variants.map((x) => x.md).join('\n')}
## Shared files

The operator key set the bundles name, and the verifier's source at commit \`${COMMIT}\` as one zip.

${mdTable(['file', 'bytes', 'sha256'], fileRowsMd(shared))}

The source is also in the [chirindo repository](${REPO}), commit \`${COMMIT}\`. More: [all worked examples](/evidence), [integration](/evidence/integration), [the data-point sheet](/evidence/datapoints).
`;
  return [
    { file: `evidence/cases/${slug}.html`, text: html },
    { file: `public/evidence/cases/${slug}.md`, text: md },
  ];
}

// ---- /evidence -------------------------------------------------------------------------

function indexPage() {
  const l14 = limitOf(ex['we-4-1'].online, 'L14');
  const links = [
    ['/evidence/cases/physical-order', 'Worked example: a constructed test case of an AI agent ordering a physical item'],
    ['/evidence/cases/hotel-booking', 'Worked example: a constructed test case of an AI agent booking a hotel'],
    ['/evidence/integration', 'Integration: the order fields, the commands and the exit codes'],
    ['/evidence/datapoints', 'The data-point sheet: every member of the export, and the four examples\' values'],
    ['/evidence/examples/jwks.json', 'The examples\' operator key set (JWKS)'],
    [`/evidence/examples/${ZIP}`, 'The verifier\'s source, as one zip'],
    [REPO, `The chirindo repository (commit ${COMMIT})`],
  ];
  const intro = [
    'A dispute evidence bundle holds the records of what an AI agent was allowed to do and what it did: the customer\'s signed instruction, the gate\'s signed record of the agent\'s decision, and a witness receipt for a checkpoint of that record\'s log. Both worked examples here are constructed test cases: a script builds the signed log with a test key, and only the witness receipts are live.',
    'An open verifier checks a bundle and says what it shows and what it does not, so a merchant, a chargeback platform or a card issuer can check the same files without trusting whoever assembled them.',
  ];
  const body = [
    section('what', 'What it is for', `${intro.map((p) => `    <p>${escHtml(p)}</p>`).join('\n')}
    <p>One limit applies to every example here:</p>
    <blockquote><p>${V(l14.text)}</p></blockquote>`),
    section('links', 'Start here', `    <ul>
${links.map(([href, label]) => `      <li><a href="${href}">${escHtml(label)}</a></li>`).join('\n')}
    </ul>`),
  ].join('\n');
  const html = htmlPage({ path: '/evidence', title: 'Agent dispute evidence: worked examples', description: 'Evidence of what an AI agent was allowed to do and did, checked by an open verifier: two constructed card dispute test cases with every file, the integration fields and the data-point export.', indexable: true, twin: '/evidence.md', kicker: 'Agent dispute evidence', h1: 'Evidence of what an AI agent was allowed to do, and did', body });
  const md = `# Evidence of what an AI agent was allowed to do, and did

Headless Oracle · ${ORIGIN}/evidence · as of ${ASOF}

## What it is for

${intro.join('\n\n')}

One limit applies to every example here:

> ${VM(l14.text)}

## Start here

${links.map(([href, label]) => `- [${label}](${href})`).join('\n')}
`;
  return [{ file: 'evidence.html', text: html }, { file: 'public/evidence.md', text: md }];
}

// ---- /evidence/integration -------------------------------------------------------------

function integrationPage() {
  const id = 'we-4-1';
  const { page } = ex[id];
  const p = pointerRun;
  const p1 = check(p, 'P1.pointer');
  const p2 = check(p, 'P2.entry');
  if (p.pointer?.stated_entry === undefined) die('the pointer run has no pointer');
  const pointerCmd = [`node check-bundle.mjs --evidence-uri ${VMC(p.pointer.uri)} --evidence-entry ${VMC(p.pointer.stated_entry)} --evidence-sha256 ${VMC(p.pointer.stated_sha256)} ${page.stated.args.map(VMC).join(' ')} --online > ${id}.pointer-verdict.json`];
  const setup = [`git clone ${REPO}.git`, 'cd chirindo', `git checkout ${COMMIT}`, 'cd examples/ordering-evidence-h4', 'npm ci', 'cd ../evidence-bundle', 'npm ci'];
  const pathCmds = runCommands(id).slice(7);
  const fields = [
    ['agent_evidence_entry', 'required', 'The cited record\'s entry hash, sha256: and 64 hex digits. It exists at decision time. This is the field that binds: the verifier checks that the record the bundle cites has exactly this entry hash.'],
    ['agent_evidence_uri', 'required', 'An https URL of at most 2,048 characters from which the bundle file can be fetched when a dispute comes. Its origin gives the bundle no standing.'],
    ['agent_evidence_sha256', 'optional', 'The bundle file\'s digest, sha256: and 64 hex digits. When it is given, the fetched bytes must have it.'],
  ];
  const exits = [
    ['check-bundle.mjs', '0', 'one verdict object on stdout, whatever the verdict (FAILS included)'],
    ['check-bundle.mjs', '2', 'nothing on stdout and one line on stderr: a usage error (a malformed or repeated option, an unknown option, a missing bundle, invalid pins, a pointer URI that is not https), or a bundle outside the shape this build judges'],
    ['check-bundle.mjs', '1', 'an internal error, with nothing on stdout; no test reaches it'],
    ['make-exhibit.mjs', '0', 'the exhibit written, nothing on stdout'],
    ['make-exhibit.mjs', '2', 'a usage error, a font file that is not the pinned one, or a file that is not a 0.10 verdict; no file is written'],
    ['make-exhibit.mjs', '3', 'exhibit not written: every limit does not fit one page at 6 points'],
    ['make-datapoints.mjs', '0', 'the export on stdout'],
    ['make-datapoints.mjs', '2', 'a usage error, or a file that is not a 0.10 verdict'],
  ];
  const fetchRules = 'The fetch is one GET with no cookies, no credentials and no other header; at most 5 redirects, each to https and each checked by the verifier\'s own code; a final status of 200; a body of at most 67,108,864 bytes; all within 60 seconds. P1.pointer passes when the bytes are fetched, or when they have the stated digest; another digest fails the run. Then P2.entry: the entry hash of the record the bundle cites must equal the stated entry, or the verdict is FAILS.';
  const result = [
    ['P1.pointer', V(p1.status), `pointer.status ${V(p.pointer.status)}`],
    ['P2.entry', V(p2.status), V(p2.detail)],
    ['verdict', V(p.verdict.code), `checked at ${V(p.checked_at)}`],
  ];
  const resultMd = [
    ['P1.pointer', VM(p1.status), `pointer.status ${VM(p.pointer.status)}`],
    ['P2.entry', VM(p2.status), VM(p2.detail)],
    ['verdict', VM(p.verdict.code), `checked at ${VM(p.checked_at)}`],
  ];
  const lede = 'For engineers and AI coding tools. Everything here is from the verifier\'s README at commit ' + COMMIT + ', and every verifier command shown was run against the files on this site; the clone and checkout lines need commit ' + COMMIT.slice(0, 8) + ' to be public on GitHub.';

  const body = [
    section('fields', 'The three order fields', `    <p>${escHtml(lede)}</p>
    <p>At checkout, the merchant or its agent platform attaches these fields to the order. When a dispute comes, the person running the verifier copies them from the order record they hold.</p>
${table(['field', '', 'what it holds'], fields.map(([f, r, t]) => [`<code>${f}</code>`, r, escHtml(t)]))}`),
    section('setup', 'Set up', `    <p>Node 20 or later. Both folders need their pinned dependencies.</p>
${preCmds(setup)}
    <p>Or download <a href="/evidence/examples/${ZIP}"><code>${ZIP}</code></a>, extract it, and start from <code>cd chirindo-evidence/examples/ordering-evidence-h4</code>.</p>`),
    section('pointer', 'Verify from the order\'s pointer', `    <p>In place of a bundle path, give the three fields as <code>--evidence-uri</code>, <code>--evidence-entry</code> and <code>--evidence-sha256</code>, with the disputed charge as the dispute record states it. This is the constructed worked example's own pointer; the bundle it names is live on this site:</p>
${preCmds(pointerCmd)}
    <p>${escHtml(fetchRules)}</p>
    <p>The run above, in this order:</p>
${table(['check', 'status', 'detail'], result)}`),
    section('path', 'Verify a bundle file, and make the views', `    <p>With a bundle file in hand, give its path. The exhibit (a one-page PDF for a chargeback platform's exhibits) and the data-point export (a flat JSON object for argument engines) are each made from the verdict JSON alone.</p>
${preCmds(pathCmds)}
    <p>The worked examples' outputs of these commands are on the <a href="/evidence/cases/physical-order">physical order</a> and <a href="/evidence/cases/hotel-booking">hotel booking</a> pages. Every member of the export is defined on <a href="/evidence/datapoints">the data-point sheet</a>.</p>`),
    section('exit', 'Exit codes', table(['command', 'exit', 'meaning'], exits.map(([c, e, m]) => [`<code>${c}</code>`, e, escHtml(m)]))),
  ].join('\n');

  const html = htmlPage({ path: '/evidence/integration', title: 'Agent dispute evidence: integration', description: 'The three order fields that point to an agent evidence bundle, the verifier commands with their exit codes, and the exhibit and data-point views, each command run against this site.', indexable: true, twin: '/evidence/integration.md', kicker: 'Agent dispute evidence', h1: 'Integration: the order fields and the verifier commands', body });
  const md = `# Integration: the order fields and the verifier commands

Headless Oracle · ${ORIGIN}/evidence/integration · as of ${ASOF}

## The three order fields

${lede}

At checkout, the merchant or its agent platform attaches these fields to the order. When a dispute comes, the person running the verifier copies them from the order record they hold.

${mdTable(['field', '', 'what it holds'], fields.map(([f, r, t]) => [`\`${f}\``, r, t]))}

## Set up

Node 20 or later. Both folders need their pinned dependencies.

${mdCmds(setup)}

Or download [${ZIP}](/evidence/examples/${ZIP}), extract it, and start from \`cd chirindo-evidence/examples/ordering-evidence-h4\`.

## Verify from the order's pointer

In place of a bundle path, give the three fields as \`--evidence-uri\`, \`--evidence-entry\` and \`--evidence-sha256\`, with the disputed charge as the dispute record states it. This is the constructed worked example's own pointer; the bundle it names is live on this site:

${mdCmds(pointerCmd)}

${fetchRules}

The run above, in this order:

${mdTable(['check', 'status', 'detail'], resultMd)}

## Verify a bundle file, and make the views

With a bundle file in hand, give its path. The exhibit (a one-page PDF for a chargeback platform's exhibits) and the data-point export (a flat JSON object for argument engines) are each made from the verdict JSON alone.

${mdCmds(pathCmds)}

The worked examples' outputs of these commands are on the [physical order](/evidence/cases/physical-order) and [hotel booking](/evidence/cases/hotel-booking) pages. Every member of the export is defined on [the data-point sheet](/evidence/datapoints).

## Exit codes

${mdTable(['command', 'exit', 'meaning'], exits.map(([c, e, m]) => [`\`${c}\``, e, m]))}
`;
  return [{ file: 'evidence/integration.html', text: html }, { file: 'public/evidence/integration.md', text: md }];
}

// ---- /evidence/datapoints --------------------------------------------------------------

// Each member of evidence-bundle-datapoints/0.10 in the order lib/datapoints.mjs builds it
// (at the commit in source.json): name, line, JSON type(s), what null means, definition.
const MEMBERS = [
  ['agent_evidence_format', 28, 'string', 'never null', 'The constant evidence-bundle-datapoints/0.10.'],
  ['agent_evidence_verdict', 29, 'string', 'never null', 'The verdict code (verdict.code).'],
  ['agent_evidence_verdict_text', 30, 'string', 'never null', 'The verdict text (verdict.text).'],
  ['agent_evidence_verdict_rule', 31, 'string or null', 'the verdict JSON\'s verdict.rule is null', 'The rule that gave the verdict (verdict.rule).'],
  ['agent_evidence_verdict_reason', 32, 'string or null', 'the verdict has no reason (verdict.reason is null)', 'The verdict\'s reason (verdict.reason).'],
  ['agent_evidence_mode', 33, 'string', 'never null', 'online or offline (mode).'],
  ['agent_evidence_checked_at', 34, 'string', 'never null', 'When the verifier ran (checked_at).'],
  ['agent_evidence_bundle_sha256', 35, 'string or null', 'no bundle bytes were read, as when a pointer fetch fails', 'The bundle file\'s digest (bundle_sha256).'],
  ['agent_evidence_verdict_sha256', 37, 'string', 'never null', 'sha256: and the SHA-256 of the verdict JSON\'s bytes; the one member computed over the verdict JSON as a whole.'],
  ['agent_evidence_uri', 38, 'string or null', 'no pointer was given', 'The pointer\'s URI (pointer.uri).'],
  ['agent_evidence_entry', 39, 'string or null', 'no pointer was given', 'The entry the pointer stated (pointer.stated_entry).'],
  ['agent_evidence_entry_cited', 40, 'boolean or null', 'P2.entry was not evaluated or not listed (no pointer given)', 'true when the check P2.entry passed, false when it failed.'],
  ['agent_evidence_pointer_status', 41, 'string or null', 'no pointer was given', 'The pointer fetch\'s status (pointer.status).'],
  ['agent_decision', 42, 'string or null', 'the verdict reports no decision (decision.value is null)', 'The gate\'s decision on the cited action (decision.value).'],
  ['agent_decision_before_auth', 45, 'boolean or null', 'the time rule is unconfirmed (B-WIT not BOUND), it was not judged, or the subject is not a card subject with a stated charge', 'card.before_authorization, only when B-WIT is BOUND: true when the witness received the checkpoint before the stated authorization time.'],
  ['agent_order_matches_charge', 46, 'boolean or null', 'no order reference was compared, the order is not committed, or the subject is not a card subject with a stated charge', 'false when any compared field of card.matches is false; true when the amount, the currency and at least one order reference compared true.'],
  ['agent_order_reference_matched', 47, 'boolean or null', 'no order reference was compared, or the subject is not a card subject with a stated charge', 'true when the merchant order id or the checkout reference compared true and neither is false; false when either is false.'],
  ['agent_charge_id', 48, 'string or null', 'no charge was stated', 'The stated charge id (stated.charge.id).'],
  ['agent_authorization_time', 49, 'string or null', 'the verdict has no card section', 'The stated authorization time (card.authorized_at).'],
  ['agent_witness_time', 50, 'string or null', 'the verdict has no card section', 'The witness receipt\'s received_at (card.witness_received_at).'],
  ['agent_witness_state', 51, 'string or null', 'B-WIT is not listed', 'The state of B-WIT in bindings.'],
  ['agent_witness_time_as_supplied', 52, 'boolean or null', 'no covering receipt was read (B-WIT NOT-EVALUATED, ABSENT or FAIL)', 'true when B-WIT is SUPPLIED or TRUNCATED (the receipt is the bundle\'s copy), false when it is BOUND.'],
  ['agent_log_state', 53, 'string or null', 'B-LOG is not listed', 'The state of B-LOG.'],
  ['agent_key_state', 54, 'string or null', 'B-KEY is not listed', 'The state of B-KEY.'],
  ['agent_card_binding_state', 55, 'string or null', 'B-CARD is not listed', 'The state of B-CARD.'],
  ['agent_instruction_state', 56, 'string or null', 'B-INS is not listed', 'The state of B-INS.'],
  ['agent_instruction_scope_ok', 57, 'boolean or null', 'the instruction\'s scope was not judged (B-INS in any other state)', 'true when B-INS is BOUND or MATCHED, false when it is EXCEEDS or UNBOUND-OUTSIDE.'],
  ['agent_instruction_exceeded', 58, 'string or null', 'no instruction is cited', 'The cited instruction\'s exceeded limits, joined with commas in their order; the empty string when none is exceeded.'],
  ['agent_gate_receipt_state', 59, 'string or null', 'B-GRC is not listed', 'The state of B-GRC.'],
  ['agent_gaps', 60, 'string', 'never null', 'Each member of verdict.gaps as binding:state, joined with commas in their order, reasons left out.'],
  ['agent_limits', 61, 'string', 'never null', 'Each limit id of limits, joined with commas in their order.'],
  ['agent_verifier', 62, 'string', 'never null', 'verifier.name, a space, and verifier.version.'],
  ['agent_verifier_commit', 63, 'string', 'never null', 'verifier.commit, as the verifier records it.'],
];

function datapointsPage() {
  for (const id of IDS) {
    const keys = Object.keys(ex[id].dp).sort();
    const ours = MEMBERS.map((m) => m[0]).sort();
    if (!isDeepStrictEqual(keys, ours)) die(`${id}: the export's members are not the ${MEMBERS.length} this sheet defines`);
  }
  const l8 = limitOf(ex['we-4-1'].online, 'L8');
  const lede = `Every member of evidence-bundle-datapoints/0.10, in the order lib/datapoints.mjs builds it at commit ${COMMIT}, with the line that defines it. Each member is a string, a boolean or null, and is defined from the verdict JSON alone. Every boolean is three-valued, and null never means true. The export file itself lists the members sorted by name (RFC 8785).`;
  const reasonCodes = 'This sheet does not map members to card network reason codes. Limit L8 of each verdict says how the bundle relates to them:';
  const body = [
    section('members', 'The members', `    <p>${escHtml(lede)}</p>
${table(['member', 'line', 'type', 'null means', 'definition'], MEMBERS.map(([n, line, t, nul, d]) => [`<code>${n}</code>`, String(line), escHtml(t), escHtml(nul), escHtml(d)]))}
    <p>${escHtml(reasonCodes)}</p>
    <blockquote><p>${V(l8.text)}</p></blockquote>`),
    section('values', 'The four constructed worked examples, online', `    <p>The exports of the four online verdicts, from the files beside each example (<code>&lt;id&gt;.online.datapoints.json</code>). Values are shown as JSON writes them.</p>
${table(['member', ...IDS.map((id) => `<a href="/evidence/examples/${id}/${id}.online.datapoints.json"><code>${id}</code></a>`)], MEMBERS.map(([n]) => [`<code>${n}</code>`, ...IDS.map((id) => `<code>${V(JSON.stringify(ex[id].dp[n]))}</code>`)]))}
    <p>See the cases: <a href="/evidence/cases/physical-order">physical order</a> (we-4-1, we-4-2) and <a href="/evidence/cases/hotel-booking">hotel booking</a> (we-5-1, we-5-2).</p>`),
  ].join('\n');
  const html = htmlPage({ path: '/evidence/datapoints', title: 'Agent dispute evidence: the data-point sheet', description: 'Every member of the evidence-bundle-datapoints/0.10 export: its type, what null means and its definition from the verdict JSON, with the four worked examples\' values.', indexable: true, twin: '/evidence/datapoints.md', kicker: 'Agent dispute evidence', h1: 'The data-point export, member by member', body });
  const md = `# The data-point export, member by member

Headless Oracle · ${ORIGIN}/evidence/datapoints · as of ${ASOF}

## The members

${lede}

${mdTable(['member', 'line', 'type', 'null means', 'definition'], MEMBERS.map(([n, line, t, nul, d]) => [`\`${n}\``, String(line), t, nul, d]))}

${reasonCodes}

> ${VM(l8.text)}

## The four constructed worked examples, online

The exports of the four online verdicts, from the files beside each example (\`<id>.online.datapoints.json\`). Values are shown as JSON writes them.

${mdTable(['member', ...IDS.map((id) => `[${id}](/evidence/examples/${id}/${id}.online.datapoints.json)`)], MEMBERS.map(([n]) => [`\`${n}\``, ...IDS.map((id) => `\`${VMC(JSON.stringify(ex[id].dp[n]))}\``)]))}

See the cases: [physical order](/evidence/cases/physical-order) (we-4-1, we-4-2) and [hotel booking](/evidence/cases/hotel-booking) (we-5-1, we-5-2).
`;
  return [{ file: 'evidence/datapoints.html', text: html }, { file: 'public/evidence/datapoints.md', text: md }];
}

// ---- the unlisted pack pages -----------------------------------------------------------

const dateOf = (s) => s.fetched_at.slice(0, 10);
const attribution = (n, author) => {
  const s = qsrc(n);
  return `${V(author)}, "${V(s.title)}" (<a href="${QURL[n]}">${escHtml(QURL[n])}</a>, read ${V(dateOf(s))})`;
};
const q = (text) => `"${V(text)}"`;
const fileLink = (id, name) => { const f = fileOf(id, name); return `<a href="${f.href}"><code>${f.name}</code></a> (${f.size} bytes)`; };

function packFront(company, exampleId) {
  const v = ex[exampleId].online;
  return `    <p><strong>Prepared for the ${company} team. As of ${ASOF}, ${company} has not reviewed or endorsed this page, and no page or menu on this site links to it.</strong></p>
    <p>The example's own limit:</p>
    <blockquote><p>${V(ex[exampleId].page.limit)}</p></blockquote>
${table(['limit', 'text'], ['L24', 'L14', 'L3'].map((lid) => [V(lid), V(limitOf(v, lid).text)]))}`;
}

function chargeflowPage() {
  const s1 = qsrc(1);
  const s2 = qsrc(2);
  const chen = s1.strings.find((x) => x.s === 'Ariel Chen');
  const mosh = s2.strings.find((x) => x.s === 'Dan Moshkovich');
  const v1 = ex['we-4-1'].online;
  const dp1 = ex['we-4-1'].dp;
  const dp2 = ex['we-4-2'].dp;
  const st = (bid) => V(binding(v1, bid).state);
  const LT = (lid) => `<blockquote><p>${V(lid)}: ${V(limitOf(v1, lid).text)}</p></blockquote>`;
  const item = (text) => (quoted(2, text) ? q(text) : V(text));

  const chenLine = quoted(1, 'As agent context becomes available, it belongs in the decisions made at every stage') && chen?.count >= 1
    ? `    <blockquote><p>${q('As agent context becomes available, it belongs in the decisions made at every stage')}</p></blockquote>
    <p>${attribution(1, 'Ariel Chen')}.</p>`
    : '';
  const stages = `    <p>The physical order case at three stages, stating only what its verdicts and data points show:</p>
    <ul>
      <li>Before fulfilment: variant 2 (<code>we-4-2</code>) reads ${V(dp2.agent_evidence_verdict)}, with <code>agent_instruction_scope_ok</code> ${V(dp2.agent_instruction_scope_ok)} and <code>agent_instruction_exceeded</code> ${V(dp2.agent_instruction_exceeded)}: a final-sale item, against an instruction that allows only refundable items.</li>
      <li>When the customer complains: the same values are available from the same files.</li>
      <li>After a chargeback: variant 1 (<code>we-4-1</code>) reads ${V(dp1.agent_evidence_verdict)}, with its exhibit ${fileLink('we-4-1', 'we-4-1.online.letter.pdf')} and its verdict JSON ${fileLink('we-4-1', 'we-4-1.online-verdict.json')}.</li>
    </ul>`;
  const rows = [
    [item('Agent identity and signature check'), `The gate's signed record of which agent key acted. The key's origin, as B-KEY shows it, is headlessoracle.com, the operator itself. A payment network's agent-identity record is not in this bundle.${LT('L6')}`, `B-LOG ${st('B-LOG')}; B-KEY ${st('B-KEY')}`],
    [item('Customer mandate'), `The customer's signed instruction with its limits.${LT('L12')}`, `B-INS ${st('B-INS')}`],
    [item('Cart as approved and as placed'), `The cart committed at decision time, against the stated charge, and inside the instruction's limits. How the order was placed in the merchant's system is not in this bundle.${LT('L25')}`, `B-CARD ${st('B-CARD')}; B-INS ${st('B-INS')}; <code>agent_order_matches_charge</code> ${V(dp1.agent_order_matches_charge)}`],
    ['Timing', `The witness's received_at before the stated authorization time (B-CARD rule 3).${LT('L3')}${LT('L7')}`, `B-WIT ${st('B-WIT')}; <code>agent_decision_before_auth</code> ${V(dp1.agent_decision_before_auth)}`],
    [`${item('Customer recognition')}, ${item('Payment authentication')}, ${item('Fulfillment')}`, `Not carried by this bundle: they are the platform's and the processor's records. For payment authentication:${LT('L24')}`, 'not carried'],
    [item('Notification and cancel window'), 'Not carried by this bundle.', 'not carried'],
  ];
  const tableHead = mosh?.count >= 1 && s2.status === 200
    ? `    <p>The items of the evidence playbook by ${attribution(2, 'Dan Moshkovich')}, each with what this bundle supplies and the state in variant 1's online verdict:</p>`
    : '    <p>The items of a published evidence playbook, each with what this bundle supplies and the state in variant 1\'s online verdict:</p>';
  const exhibits = `    <p>Two of the playbook's exhibit names: the ${item('mandate record')} sits beside the customer's signed instruction, and the ${item('cart as approved compared with the order as placed')} beside the cart against the charge. Our exhibit's sections for the customer's signed instruction and for the cart against the charge are in the online exhibits: ${fileLink('we-4-1', 'we-4-1.online.letter.pdf')} and ${fileLink('we-4-2', 'we-4-2.online.letter.pdf')}. The playbook's signature verification record is not mapped here: it is a payment network's agent-identity record, not the gate operator's key.</p>`;
  const cmd = runCommands('we-4-1')[8];
  const body = [
    section('front', 'Read this first', packFront('Chargeflow', 'we-4-1')),
    section('stages', 'At every stage', `${chenLine}\n${stages}`),
    section('items', 'The playbook\'s items', `${tableHead}\n${table(['item', 'what this bundle supplies', 'state in we-4-1'], rows)}\n${exhibits}`),
    section('more', 'Run it', `    <p>The <a href="/evidence/cases/physical-order">physical order case</a>, <a href="/evidence/integration">integration</a>, and <a href="/evidence/examples/${ZIP}"><code>${ZIP}</code></a>. The one command for variant 1, from <code>examples/evidence-bundle</code> after setup:</p>
${preCmds([cmd])}`),
  ].join('\n');
  return [{ file: 'evidence/for/chargeflow.html', text: htmlPage({ path: '/evidence/for/chargeflow', title: 'Agent dispute evidence, prepared for Chargeflow', description: 'A worked agent card dispute mapped to a published evidence playbook. Not reviewed or endorsed by Chargeflow.', indexable: false, twin: null, kicker: 'Agent dispute evidence', h1: 'An agent card dispute, mapped to the evidence playbook', body }) }];
}

function justtPage() {
  const s3 = qsrc(3);
  const v1 = ex['we-5-1'].online;
  const dp1 = ex['we-5-1'].dp;
  const dp2 = ex['we-5-2'].dp;
  const st = (bid) => V(binding(v1, bid).state);
  const LT = (lid) => `<blockquote><p>${V(lid)}: ${V(limitOf(v1, lid).text)}</p></blockquote>`;
  const ITEMS = ['Proof that the customer delegated authority', 'Timing and scope of approval', 'Rules or parameters that were set', 'Did the agent correctly interpret the instructions'];
  const confirmed = s3.status === 200 && ITEMS.every((t) => quoted(3, t)) && quoted(3, 'Ronen Shnidman');
  const it = (i, plain) => (confirmed ? q(ITEMS[i]) : escHtml(plain));
  const ins = v1.instructions.find((i) => i.cited) ?? die('we-5-1: no cited instruction');
  const limitsShown = ins.card_limits.filter((l) => l.result !== 'not-declared').map((l) => `${V(l.limit)} ${V(l.result)}`).join(', ');
  const rows = [
    [it(0, 'delegated authority'), `The customer's signed instruction.${LT('L12')}`, `B-INS ${st('B-INS')}`],
    [it(1, 'timing and scope of approval'), `The instruction's validity window and card limits, and the witness time against the stated authorization.${LT('L7')}`, `B-INS ${st('B-INS')}; B-WIT ${st('B-WIT')}; <code>agent_decision_before_auth</code> ${V(dp1.agent_decision_before_auth)}`],
    [it(2, 'rules or parameters that were set'), `The gate's decision on the action (<code>decision</code>: ${V(v1.decision.value)}) and the instruction's card limits as the verdict lists them (${limitsShown}). Gap: a chirindo record does not commit to the policy that produced the decision.`, `B-INS ${st('B-INS')}`],
    [it(3, 'whether the agent interpreted the instructions correctly'), `Not shown by the records in this bundle.${LT('L1')}`, 'not shown'],
  ];
  const lead = confirmed
    ? `    <p>The four "missing evidence" items in ${attribution(3, 'Ronen Shnidman')}, each with what this bundle shows and the state in variant 1's online verdict:</p>`
    : '    <p>Four kinds of missing evidence Justt has written about, each with what this bundle shows and the state in variant 1\'s online verdict:</p>';
  const dpRows = MEMBERS.map(([n]) => [`<code>${n}</code>`, `<code>${V(JSON.stringify(dp1[n]))}</code>`, `<code>${V(JSON.stringify(dp2[n]))}</code>`]);
  const tailor = quoted(5, 'tailor-made solutions to each of our valued customers')
    ? `    <p>Justt's documentation describes per-customer API parameters: ${q('tailor-made solutions to each of our valued customers')} (<a href="${QURL[5]}">${escHtml(QURL[5])}</a>, read ${V(dateOf(qsrc(5)))}).</p>`
    : '';
  const fmtOk = quoted(4, 'Supported formats : PDF') && quoted(4, 'Maximum file size : 6MB');
  const upload = fmtOk
    ? `    <p>The evidence upload guide states ${q('Supported formats : PDF')} and ${q('Maximum file size : 6MB')} (<a href="${QURL[4]}">${escHtml(QURL[4])}</a>, read ${V(dateOf(qsrc(4)))}).</p>`
    : '';
  const cmd = runCommands('we-5-1')[8];
  const body = [
    section('front', 'Read this first', packFront('Justt', 'we-5-1')),
    section('items', 'The missing evidence', `${lead}\n${table(['item', 'what this bundle shows', 'state in we-5-1'], rows)}`),
    section('datapoints', 'The data points', `    <p>The online exports of variant 1 (<code>we-5-1</code>, ${V(dp1.agent_evidence_verdict)}) and variant 2 (<code>we-5-2</code>, ${V(dp2.agent_evidence_verdict)}). Every member is defined on <a href="/evidence/datapoints">the data-point sheet</a>.</p>
${table(['member', 'we-5-1', 'we-5-2'], dpRows)}
${tailor}`),
    section('exhibit', 'The exhibit', `    <p>The online exhibits, one page each: ${fileLink('we-5-1', 'we-5-1.online.letter.pdf')} and ${fileLink('we-5-2', 'we-5-2.online.letter.pdf')}.</p>
${upload}`),
    section('more', 'Run it', `    <p>The <a href="/evidence/cases/hotel-booking">hotel booking case</a>, <a href="/evidence/integration">integration</a>, and <a href="/evidence/examples/${ZIP}"><code>${ZIP}</code></a>. The one command for variant 1, from <code>examples/evidence-bundle</code> after setup:</p>
${preCmds([cmd])}`),
  ].join('\n');
  return [{ file: 'evidence/for/justt.html', text: htmlPage({ path: '/evidence/for/justt', title: 'Agent dispute evidence, prepared for Justt', description: 'A worked agent card dispute mapped to published kinds of missing evidence. Not reviewed or endorsed by Justt.', indexable: false, twin: null, kicker: 'Agent dispute evidence', h1: 'An agent card dispute, and the missing evidence', body }) }];
}

// ---- build, write or check -------------------------------------------------------------

const built = [
  ...indexPage(),
  ...casePage('physical-order'),
  ...casePage('hotel-booking'),
  ...integrationPage(),
  ...datapointsPage(),
  ...chargeflowPage(),
  ...justtPage(),
];

const BANNED_AUTHORED = ['proven', 'proof of payment', 'payment verified', 'verified payment', 'guarantee', 'certified', 'partner', 'integrates with', 'fraud-proof', 'tamper-proof', '—'];
const INTERNAL = /\bLead\b|\bruling\b|\bfounder\b|\bhandoff\b|\bB-[0-9]{2,3}\b|PLAN_/;
const MARKERS = ['[relayed', '[verified', '[open]', 'this drafter'];
const ALL_NAMES = /chargeflow|justt|moshkovich|shnidman|ariel chen/i;
const NOT_IN_CHARGEFLOW = /justt|shnidman/i;
const NOT_IN_JUSTT = /chargeflow|moshkovich|ariel chen/i;

for (const { file, text } of built) {
  const out = strip(text);
  const authored = authoredOf(text).toLowerCase();
  for (const w of BANNED_AUTHORED) if (authored.includes(w)) problems.push(`${file}: authored text contains ${JSON.stringify(w)}`);
  if (file === 'evidence/for/chargeflow.html') { if (NOT_IN_CHARGEFLOW.test(out)) problems.push(`${file}: names the other company or its author`); }
  else if (file === 'evidence/for/justt.html') { if (NOT_IN_JUSTT.test(out)) problems.push(`${file}: names the other company or its authors`); }
  else if (ALL_NAMES.test(out)) problems.push(`${file}: names a company or author outside the pack pages`);
  if (INTERNAL.test(out)) problems.push(`${file}: carries an internal reference (${out.match(INTERNAL)[0]})`);
  for (const m of MARKERS) if (out.includes(m)) problems.push(`${file}: carries ${JSON.stringify(m)}`);
  if (out.includes('/evidence/for/')) problems.push(`${file}: contains /evidence/for/`);
  for (const m of out.matchAll(/(?:href="|\]\()(\/evidence\/examples\/[^")]+)/g)) {
    if (!existsSync(join(PUBLIC, m[1]))) problems.push(`${file}: links ${m[1]}, which is not in public/`);
  }
  if (!file.endsWith('.md') && /<script\b|\son[a-z]+=/i.test(out)) problems.push(`${file}: has a script element or an inline event handler`);
}

if (CHECK) {
  for (const { file, text } of built) {
    const p = join(ROOT, file);
    const want = strip(text);
    if (!existsSync(p)) problems.push(`${file}: missing on disk`);
    else if (readFileSync(p, 'utf8') !== want) problems.push(`${file}: differs from what the files give (run node scripts/make-evidence-pages.mjs)`);
  }
  if (problems.length) {
    for (const p of problems) process.stdout.write(`FAIL  ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(`PASS evidence pages: ${built.length} files match their sources; content rules hold\n`);
} else {
  if (problems.length) {
    for (const p of problems) process.stdout.write(`FAIL  ${p}\n`);
    process.exit(1);
  }
  for (const { file, text } of built) {
    const p = join(ROOT, file);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, strip(text));
    process.stdout.write(`wrote ${file} ${Buffer.byteLength(strip(text))} B\n`);
  }
}
