# Pricing

Headless Oracle · https://headlessoracle.com/pricing

This page sells three things, in this order: get your tool graded, the outside checkpoint, and the programme. All three rest on the five-alteration test, which is public and free to run. Prices are in US dollars. The same prices are served as JSON at [https://headlessoracle.com/v5/pricing](https://headlessoracle.com/v5/pricing). The plan id is the value to send as `plan` to `POST https://headlessoracle.com/v5/checkout`, or the tier id in `/v5/pricing` where a plan has no checkout.

## Run the five-alteration test

The need, in a published control's words: AIUC-1's logging control E015 lists, among the things an implementation may include, logs that are "tamper-evident and independently verifiable" (item E015.4, log integrity protection). The test below is our own reading of that control. It is not an AIUC document, and we do not claim that AIUC, any auditor, any insurer or any network endorses, requires or has reviewed it.

The five-alteration test is for any tool that keeps a log of an AI agent's actions and has a command that verifies the log. It shows whether that verification catches five specific alterations of one log. It does not show that the tool is tamper-evident in general.

Take one log of at least five records and make five altered copies: edit one record, remove one, swap two neighbours, cut off the last two, and rewrite a record and sign the whole log again with the key of the company running the agent, the operator. Run the tool's own verification on each copy and write down what it catches.

A signed, hash-chained log can catch the first three on its own. Cutting off the end is caught only by something outside the log that fixes where it ends, such as a checkpoint held by someone other than the operator. Rewriting and re-signing is caught only against a checkpoint or copy held by someone other than the operator, and only for history up to when it was taken.

We ran it on Chirindo, our own tool. The chain alone caught the edit, the removal and the swap, and reported the cut-off and re-signed copies as valid. Checked against the witness checkpoints, all five altered copies failed verification, so all five alterations were caught. Those checkpoints came from a local stub witness and were read from a file the operator supplies, which the test does not count as an outside party. So by the test's own definition our run is not a pass.

A pass means each of the five altered copies failed verification, the tool said where, and for the last two the check was made against an outside party. A pass must state how many records came after the last outside checkpoint: those records can be cut off or rewritten without detection. A pass does not show that every action was recorded, or that any record is true. Any outside witness qualifies, not only ours. Headless Oracle's witness is run by Headless Oracle alone today: it is one outside party, not several. When the operator being tested is Headless Oracle itself, that witness is not an outside party. The kit's own results use a local stub witness, not a witness service.

Headless Oracle wrote this test. Headless Oracle also makes Chirindo, the tool in our run above, and runs a witness service, the outside checkpoint sold below. Run the test yourself; do not take our results on trust.

- [Read the test and run it](https://github.com/LembaGang/chirindo/blob/main/examples/e015-4-kit/PROCEDURE.md)
- [Our own run: all twelve checks](https://github.com/LembaGang/chirindo/blob/main/examples/e015-4-kit/RESULTS.md)

## Get your tool graded

We run the five-alteration test on one version of your tool and publish the result: what your tool's own verification printed for each copy, whether the last two alterations were checked against an outside party, and how many records came after the last outside checkpoint. A published pass carries the limits listed above. If your tool changes, a re-grade publishes the new result beside the original. Headless Oracle wrote the test, makes Chirindo and runs a witness service, so run the test yourself rather than take our grade on trust. Introductory prices, held until 31 December 2026.

### The neutrality rule

A paid entry buys the run and the published record, never the verdict. Every entry carries an Interests section: the referee is the author of a competing format; independence is not claimed; recomputability from pinned bytes is claimed; the text and the implementation are scored separately; a finding stands until its author corrects the record, and the correction is published beside it. Verification of any receipt is free, always.

| Plan | Plan id | Price | What you get |
|---|---|---|---|
| Conformance entry | `conformance_entry` | $2,500 one-time | One version of your tool run through the five-alteration test. The run and the result are published, with the count of records after the last outside checkpoint. |
| Re-grade | `regrade` | $750 one-time | A fresh run after your tool changed. The new result is published beside the original. |

Ask to be graded: `POST https://headlessoracle.com/v5/referee/intake` with `implementation`, `repository_or_url`, `format`, `version`, `contact_email`, `methodology_version_read` and `consent_to_be_named` (a boolean). You receive an intake id; the run is not scheduled until the entry fee is paid.

## The outside checkpoint: Chirindo Witness

A signed hash chain catches edits to an agent's log, but not the last records being cut off, or a history rewritten by whoever holds the signing key. Witness keeps signed checkpoints of your log outside your control, so both show up when the log is checked against Witness, for everything up to the last checkpoint it signed. Verification is free and open source: anyone can run the check themselves.

The test counts any outside witness, not only ours. Headless Oracle's witness is run by Headless Oracle alone today: it is one outside party, not several. When the operator being tested is Headless Oracle itself, that witness is not an outside party.

| Plan | Plan id | Price | What you get |
|---|---|---|---|
| Free | `witness_free` | $0 | Anonymous checkpoints from a shared pool, currently 2,000 new checkpoints per UTC day |
| Evidence Starter | `custody_90d` | $49/month | Your own Witness key, shown on screen after payment. Up to 1,000 new checkpoints per UTC day, drawn from your own quota, not the free pool. For one production agent or a pilot. |
| Evidence | `custody_1y` | $199/month | Your own Witness key, shown on screen after payment. Up to 3,000 new checkpoints per UTC day, drawn from your own quota, not the free pool. For teams preparing evidence for AIUC-1 E015.4 log integrity across several agents. |

Evidence Starter and Evidence are introductory until 31 December 2026.

Buying without the page: `POST /v5/checkout {"plan":"custody_90d"}` returns a `transaction_id` for Paddle checkout and a `claim_token`; after payment, `POST /v5/claim {"claim_token":"…"}` answers `{"state":"ready","key":"…"}` once the payment is recorded. Details in the [Witness quickstart](https://headlessoracle.com/docs#witness-plans).

Evidence that may support AIUC-1 E015.4. It does not make anyone compliant or certified; the honest limits are in the [Witness spec](https://api.headlessoracle.com/v1/witness/spec).

- [Test kit: five tampering cases and an untouched control, chain alone vs witnessed](https://github.com/LembaGang/chirindo/tree/main/examples/e015-4-kit)
- [Read the Witness spec](https://api.headlessoracle.com/v1/witness/spec)

## The programme

For a platform or an audit firm that wants the test and the register of published grades inside its own product or audit work. Two annual programmes, at $60,000 a year and $150,000 a year. Neither is bought from this page: both are by invoice after a conversation. Write to mike@headlessoracle.com with the subject "Programme" and say which of the two you are asking about.

The market-state API's plans are on [their own page](https://headlessoracle.com/pricing/market-state).

## Terms

- [Terms](https://headlessoracle.com/terms)
- [Refund policy](https://headlessoracle.com/refund)
