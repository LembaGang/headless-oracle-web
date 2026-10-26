# Integration: the order fields and the verifier commands

Headless Oracle · https://headlessoracle.com/evidence/integration · as of 2026-10-26

## The three order fields

For engineers and AI coding tools. Everything here is from the verifier's README at commit 6285832c294493001b12d4467259c04a2c4890fb, and every verifier command shown was run against the files on this site; the clone and checkout lines need commit 6285832c to be public on GitHub.

At checkout, the merchant or its agent platform attaches these fields to the order. When a dispute comes, the person running the verifier copies them from the order record they hold.

| field |  | what it holds |
|---|---|---|
| `agent_evidence_entry` | required | The cited record's entry hash, sha256: and 64 hex digits. It exists at decision time. This is the field that binds: the verifier checks that the record the bundle cites has exactly this entry hash. |
| `agent_evidence_uri` | required | An https URL of at most 2,048 characters from which the bundle file can be fetched when a dispute comes. Its origin gives the bundle no standing. |
| `agent_evidence_sha256` | optional | The bundle file's digest, sha256: and 64 hex digits. When it is given, the fetched bytes must have it. |

## Set up

Node 20 or later. Both folders need their pinned dependencies.

```
git clone https://github.com/LembaGang/chirindo.git
cd chirindo
git checkout 6285832c294493001b12d4467259c04a2c4890fb
cd examples/ordering-evidence-h4
npm ci
cd ../evidence-bundle
npm ci
```

Or download [chirindo-evidence-6285832c2944.zip](/evidence/examples/chirindo-evidence-6285832c2944.zip), extract it, and start from `cd chirindo-evidence/examples/ordering-evidence-h4`.

## Verify from the order's pointer

In place of a bundle path, give the three fields as `--evidence-uri`, `--evidence-entry` and `--evidence-sha256`, with the disputed charge as the dispute record states it. This is the constructed worked example's own pointer; the bundle it names is live on this site:

```
node check-bundle.mjs --evidence-uri https://headlessoracle.com/evidence/examples/we-4-1/we-4-1.bundle.json --evidence-entry sha256:4d5ba2f2d80cc39d02022f46d94d98727000c931b92df9fb1bb823c5670e4da4 --evidence-sha256 sha256:2c121a773542054932ed7b69e0798333dabd1c39df6cbdf510d53b72bff7824b --charge-id TEST-ch-we4-1 --charge-amount 4800 --charge-currency USD --charge-authorized-at 2026-10-25T15:08:29Z --merchant-order-id TEST-1001 --pins pages/we-4-1-pins --online > we-4-1.pointer-verdict.json
```

The fetch is one GET with no cookies, no credentials and no other header; at most 5 redirects, each to https and each checked by the verifier's own code; a final status of 200; a body of at most 67,108,864 bytes; all within 60 seconds. P1.pointer passes when the bytes are fetched, or when they have the stated digest; another digest fails the run. Then P2.entry: the entry hash of the record the bundle cites must equal the stated entry, or the verdict is FAILS.

The run above, in this order:

| check | status | detail |
|---|---|---|
| P1.pointer | PASS | pointer.status match |
| P2.entry | PASS | the entry hash of log-d record 0 is the stated entry sha256:4d5ba2f2d80cc39d02022f46d94d98727000c931b92df9fb1bb823c5670e4da4 |
| verdict | RECORDED-BEFORE-CHARGE | checked at 2026-10-26T11:01:50.406Z |

## Verify a bundle file, and make the views

With a bundle file in hand, give its path. The exhibit (a one-page PDF for a chargeback platform's exhibits) and the data-point export (a flat JSON object for argument engines) are each made from the verdict JSON alone.

```
node check-bundle.mjs pages/we-4-1.bundle.json --charge-id TEST-ch-we4-1 --charge-amount 4800 --charge-currency USD --charge-authorized-at 2026-10-25T15:08:29Z --merchant-order-id TEST-1001 --pins pages/we-4-1-pins > we-4-1.verdict.json
node check-bundle.mjs pages/we-4-1.bundle.json --charge-id TEST-ch-we4-1 --charge-amount 4800 --charge-currency USD --charge-authorized-at 2026-10-25T15:08:29Z --merchant-order-id TEST-1001 --pins pages/we-4-1-pins --online > we-4-1.online-verdict.json
node make-exhibit.mjs we-4-1.online-verdict.json --page letter --out we-4-1.online.letter.pdf
node make-datapoints.mjs we-4-1.online-verdict.json > we-4-1.online.datapoints.json
```

The worked examples' outputs of these commands are on the [physical order](/evidence/cases/physical-order) and [hotel booking](/evidence/cases/hotel-booking) pages. Every member of the export is defined on [the data-point sheet](/evidence/datapoints).

## Exit codes

| command | exit | meaning |
|---|---|---|
| `check-bundle.mjs` | 0 | one verdict object on stdout, whatever the verdict (FAILS included) |
| `check-bundle.mjs` | 2 | nothing on stdout and one line on stderr: a usage error (a malformed or repeated option, an unknown option, a missing bundle, invalid pins, a pointer URI that is not https), or a bundle outside the shape this build judges |
| `check-bundle.mjs` | 1 | an internal error, with nothing on stdout; no test reaches it |
| `make-exhibit.mjs` | 0 | the exhibit written, nothing on stdout |
| `make-exhibit.mjs` | 2 | a usage error, a font file that is not the pinned one, or a file that is not a 0.10 verdict; no file is written |
| `make-exhibit.mjs` | 3 | exhibit not written: every limit does not fit one page at 6 points |
| `make-datapoints.mjs` | 0 | the export on stdout |
| `make-datapoints.mjs` | 2 | a usage error, or a file that is not a 0.10 verdict |
