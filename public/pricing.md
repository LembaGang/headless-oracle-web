# Pricing

Headless Oracle · https://headlessoracle.com/pricing

Three families, in this order: Chirindo Witness for agent-log evidence, the market-state API, and referee services and programmes. Prices are in US dollars. The same prices are served as JSON at [https://headlessoracle.com/v5/pricing](https://headlessoracle.com/v5/pricing). The plan id is the value to send as `plan` to `POST https://headlessoracle.com/v5/checkout`, or the tier id in `/v5/pricing` where a plan has no checkout.

## Chirindo Witness

Agent logs your auditor can check without trusting you.

A signed hash chain catches edits to an agent's log, but not the last records being cut off, or a history rewritten by whoever holds the signing key. Witness keeps signed checkpoints of your log outside your control, so both show up when the log is checked against Witness, for everything up to the last checkpoint it signed. Verification is free and open source: anyone can run the check themselves.

| Plan | Plan id | Price | What you get |
|---|---|---|---|
| Free | `witness_free` | $0 | Anonymous checkpoints from a shared pool, currently 2,000 new checkpoints per UTC day |
| Evidence Starter | `custody_90d` | $49/month | Your own Witness key, shown on screen after payment. Up to 1,000 new checkpoints per UTC day, drawn from your own quota, not the free pool. For one production agent or a pilot. |
| Evidence | `custody_1y` | $199/month | Your own Witness key, shown on screen after payment. Up to 3,000 new checkpoints per UTC day, drawn from your own quota, not the free pool. For teams preparing evidence for AIUC-1 E015.4 log integrity across several agents. |

Evidence Starter and Evidence are introductory until 31 December 2026.

Buying without the page: `POST /v5/checkout {"plan":"custody_90d"}` returns a `transaction_id` for Paddle checkout and a `claim_token`; after payment, `POST /v5/claim {"claim_token":"…"}` answers `{"state":"ready","key":"…"}` once the payment is recorded. Details in the [Witness quickstart](https://headlessoracle.com/docs#witness-plans).

Evidence pilot for a team in its audit window: $4,900 fixed price, scope agreed by conversation. Write to mike@headlessoracle.com.

Evidence that may support AIUC-1 E015.4. It does not make anyone compliant or certified; the honest limits are in the [Witness spec](https://api.headlessoracle.com/v1/witness/spec).

- [Test kit: five tampering cases and an untouched control, chain alone vs witnessed](https://github.com/LembaGang/chirindo/tree/main/examples/e015-4-kit)
- [Read the Witness spec](https://api.headlessoracle.com/v1/witness/spec)

## Market-state API

| Plan | Plan id | Price | What you get |
|---|---|---|---|
| Sandbox | `sandbox` | $0 | 200 calls over 7 days. Demo endpoint, no key needed; all 28 exchanges; Ed25519 signed receipts |
| Free Tier | `free` | $0 | 500 API calls/day; all 28 exchanges; Ed25519 signed receipts; instant provisioning, no credit card |
| Pay-per-use | `x402` | $0.001/request | 0.001 USDC on Base mainnet, no subscription and no API key; HTTP 402 machine-readable |
| Credits | `credits` | $5 one-time | 1,000 API calls, no expiry; pay via card |
| Builder | `builder` | $99/month | 50,000 API calls/day; all 28 exchanges; webhook subscriptions; receipt audit log |
| Pro | `pro` | $299/month | 200,000 API calls/day; all 28 exchanges; 25 webhook subscriptions; priority support |
| Protocol / Enterprise | `protocol` | from $500/month | Unlimited calls, custom SLA, dedicated support, direct engineering access. Contact mike@headlessoracle.com |

All plans include Ed25519 cryptographic signatures on every response, a fail-closed architecture, and 28 global exchanges across 7 regions (Americas, Europe, Middle East, Africa, Asia, Pacific, Derivatives & Crypto).

Free key, no email or signup:

```sh
curl -X POST https://headlessoracle.com/v5/keys/instant -H "Content-Type: application/json" -d '{"agent_id":"my-trading-bot"}'
```

x402 discovery: [https://headlessoracle.com/.well-known/x402.json](https://headlessoracle.com/.well-known/x402.json)

## Referee practice: conformance and disputes

Paid referee work against the published methodology: a graded conformance run, a re-grade after you change your implementation, and a dispute package. Introductory pricing, held until 31 December 2026.

### The neutrality rule

A paid entry buys the run and the published record, never the verdict. Every entry carries an Interests section: the referee is the author of a competing format; independence is not claimed; recomputability from pinned bytes is claimed; the text and the implementation are scored separately; a finding stands until its author corrects the record, and the correction is published beside it. Verification of any receipt is free, always.

| Plan | Plan id | Price | What you get |
|---|---|---|---|
| Conformance entry | `conformance_entry` | $2,500 one-time | One implementation graded against the published methodology. The run and the record are published. |
| Re-grade | `regrade` | $750 one-time | A fresh run of an entry already on the register, after its implementation changed. The correction is published beside the original. |
| Dispute package | `dispute` | $500 one-time | The pinned bytes, the recomputation steps and the finding, packaged so a third party can reproduce the result themselves. |
| Dispute package with verification note | `dispute_note` | $1,500 one-time | The dispute package, plus a written note recording what was recomputed, what it establishes and what it does not. |

### Annual programmes

Two annual programmes exist, at $60,000 a year and $150,000 a year. Neither is bought from this page: both are by invoice after a conversation. Start with the conformance intake and say which programme you are asking about.

Conformance intake: `POST https://headlessoracle.com/v5/referee/intake` with `implementation`, `repository_or_url`, `format`, `version`, `contact_email`, `methodology_version_read` and `consent_to_be_named` (a boolean). You receive an intake id; the entry is not scheduled until the entry fee is paid.

## Terms

- [Terms](https://headlessoracle.com/terms)
- [Refund policy](https://headlessoracle.com/refund)
