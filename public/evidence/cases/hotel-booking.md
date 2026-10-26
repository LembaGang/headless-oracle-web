# A constructed test case: an AI agent books a hotel, and what the evidence shows

Headless Oracle · https://headlessoracle.com/evidence/cases/hotel-booking · as of 2026-10-26

## What this example does not show

The example's own limit, as its page file states it:

> Headless Oracle is the gate's operator and the witness; the traveller, the hotel and the charge are test parties; test card data only.

Three limits from the verifier's online verdict:

| limit | text |
|---|---|
| L24 | v0.10. For a card payment, the payment proof is the card network's authorization record, which the issuer holds; this bundle neither carries nor verifies it. What this verdict shows is whether the decision and the order the gate recorded were witnessed before the charge's authorization time as stated, and whether that order matches the stated charge: the stated charge and its time are the statements of the person running the verifier, taken from the processor's records. |
| L14 | Headless Oracle operates both the gate whose key signed this log and the witness, so the log and the witness receipt are statements by one party. |
| L3 | The witness receipt is Headless Oracle's signed statement that at received\_at it was shown a checkpoint signed by the key with that thumbprint; it is only as reliable as Headless Oracle and its signing key. The witness is operated by Headless Oracle, which also publishes the gate software: it is independent of an operator other than Headless Oracle, not of Headless Oracle. |

## The case

This is a constructed test case for one situation: an AI agent books a hotel stay for a customer who has signed an instruction that sets limits on what the agent may book. A script, using a test key, builds a signed log in the format a Chirindo gate writes, as if for the agent's separate decision call. The log's checkpoint was sent to Headless Oracle's live witness, which signed a receipt with its own clock time. The card charge time is a test value, set one minute after the witness receipt's time, so the ordering the verdict checks holds by construction here.

The customer, the hotel, the stay, its dates and the charge are test values made for this example. No real booking was made, no card was charged, and no AI agent or gate ran: the files show what the verifier checks and what it reports. The limits above are the verifier's standard wording for a log of this format; here Headless Oracle holds the test key and a script built the log.

In variant 1 the order is inside the instruction. In variant 2 the order holds a non-refundable rate, and the instruction allows only refundable ones.

## The two variants

### Variant 1: we-5-1

The online verdict:

**RECORDED-BEFORE-CHARGE** (rule C5)

> RECORDED BEFORE THE CHARGE: the decision and the instruction were recorded before the charge and match it

Checked at 2026-10-26T10:24:25.867Z.

#### The stated charge

| charge id | amount (minor units) | currency | authorized at | merchant order id |
|---|---|---|---|---|
| TEST-ch-we5-1 | 28000 | EUR | 2026-10-25T15:18:03Z | TEST-H-2001 |

#### The committed order, as the online verdict reports it

| merchant | merchant order id | currency | total (minor units) | items sum (minor units) | items |
|---|---|---|---|---|---|
| test-hotel.example | TEST-H-2001 | EUR | 28000 | 28000 | 1 |

| amount matches | currency matches | order id matches | witness received at | before the authorization |
|---|---|---|---|---|
| true | true | true | 2026-10-25T15:17:03.685Z | true |

#### The instruction's card limits, as the online verdict reports them

| limit | result | reason |
|---|---|---|
| currency | inside | null |
| max\_total\_minor | not-declared | null |
| max\_unit\_price\_minor | inside | null |
| merchants | not-declared | null |
| items | not-declared | null |
| categories | inside | null |
| refundable\_only | inside | null |
| service\_window | inside | null |
| locations | inside | null |

Limits exceeded: none.

#### Bindings

| binding | state | reason |
|---|---|---|
| B-LOG | BOUND | null |
| B-CKP | BOUND | null |
| B-WIT | BOUND | null |
| B-KEY | BOUND | null |
| B-INS | BOUND | null |
| B-GRC | ABSENT | null |
| B-CARD | BOUND | null |

#### Does not apply to card payments

| binding | state | reason |
|---|---|---|
| B-PAY | NOT-EVALUATED | card-subject |
| B-CHAIN | NOT-EVALUATED | card-subject |

#### Gaps

None besides the two bindings above that do not apply to card payments.

The verdict JSON and the data-point export (`agent_gaps`) still list those two bindings among the gaps, as the format defines them. B-GRC (the gate receipt) reads ABSENT because these examples carry no gate receipt, and the format does not count that as a gap.

#### The same bundle, checked offline

**PAYMENT-NOT-VERIFIED** (rule C3, reason offline-witness-data)

> NOT VERIFIED: the record does not show that the decision was recorded before the charge and matches it

Offline, the verifier trusts the bundle's copy of the witness receipt, so it does not confirm the witness time (the verifier's README, "What an offline run never says").

#### Times, each with its clock

| what | time | clock |
|---|---|---|
| log-d record 0 ts | 2026-10-25T15:17:01.472Z | operator |
| selected checkpoint ts (sidecar-d line 1) | 2026-10-25T15:17:01.475Z | operator |
| selected witness receipt received\_at (sidecar-d line 1) | 2026-10-25T15:17:03.685Z | headless-oracle |
| selected witness receipt checkpoint\_ts (sidecar-d line 1) | 2026-10-25T15:17:01.475Z | headless-oracle |
| ins-d iat | 2026-10-24T15:07:27Z | principal |
| ins-d valid\_from | 2026-10-24T15:07:27Z | principal |
| ins-d valid\_until | 2026-11-09T00:00:00Z | principal |
| stated authorization time | 2026-10-25T15:18:03Z | processor |

#### Every limit of the online verdict

| limit | text |
|---|---|
| L1 | A gate entry is the operator's own signed statement of what its gate saw and decided. The bundle does not show that a decision was wise, that the agent read the instruction correctly, or that any member's contents are true. |
| L2 | A log records what passed through the gate. It does not show that no action bypassed the gate. The verifier reports the gate version each entry names; chirindo entries through release 0.5.2 carry the constant 0.0.1 in place of a version. chirindo through release 0.5.2 (source read at tags v0.3.0, v0.4.0, v0.5.1 and v0.5.2; run on 0.5.2) forwarded a tools/call without an id member without evaluating policy or writing a receipt, and ran an allowed tools/call with id null without a receipt. |
| L3 | The witness receipt is Headless Oracle's signed statement that at received\_at it was shown a checkpoint signed by the key with that thumbprint; it is only as reliable as Headless Oracle and its signing key. The witness is operated by Headless Oracle, which also publishes the gate software: it is independent of an operator other than Headless Oracle, not of Headless Oracle. |
| L6 | A key's binding to an organisation goes no further than an https origin that served it to the verifier (B-KEY BOUND) or, for a standalone key, than the key itself (KEY-ONLY). An address is an address, not a person or a company. |
| L7 | Times on the principal's, the issuer's, the operator's and Headless Oracle's clocks are those parties' statements, and the block timestamp is set by the block producer within the chain's rules. Only the orderings that need no clock rest on signatures and hashes alone. |
| L8 | This bundle is named in none of the card network rules read for this specification (scope: the pages its sources list; the dispute chapters of the Visa Core Rules and the body of the Mastercard Chargeback Guide could not be read). It is evidence a decider may weigh within the existing reason codes. |
| L9 | The bundle carries what its assembler chose to put in. A verifier can show that the pieces present bind; it cannot show that a piece which would contradict them was left out, except where the witness's receipts show a longer history than the log carried (TRUNCATED) or a different one (FAIL). |
| L12 | The principal key in a minimal instruction is bound to no person, account or payer; the bundle shows that the holder of that key signed the instruction. |
| L13 | Uses and budget are counted only over what the bundle carries: the records whose arguments it carries and the payments it binds. Uses and payments outside the bundle cannot be counted; the output gives the number of records whose arguments are not carried. |
| L14 | Headless Oracle operates both the gate whose key signed this log and the witness, so the log and the witness receipt are statements by one party. |
| L17 | This version does not verify card payments: whether the action connects to the card payment is not verified. |
| L24 | v0.10. For a card payment, the payment proof is the card network's authorization record, which the issuer holds; this bundle neither carries nor verifies it. What this verdict shows is whether the decision and the order the gate recorded were witnessed before the charge's authorization time as stated, and whether that order matches the stated charge: the stated charge and its time are the statements of the person running the verifier, taken from the processor's records. |
| L25 | v0.10. The committed order is the agent's statement at decision time, as the gate recorded it: its merchant, items, prices, refundability, dates and places are what the agent's call named. The bundle does not show that the merchant fulfilled that order, that the charge was for it beyond the fields compared, or that an item's attributes are true. |

#### Files

| file | bytes | sha256 |
|---|---|---|
| [pins.json](/evidence/examples/we-5-1/pins.json) | 2776 | `f79e079688f45432768da26f02d088b3277adaed0f5ad9c3ac1699dd952cd476` |
| [we-5-1.bundle.json](/evidence/examples/we-5-1/we-5-1.bundle.json) | 8011 | `ffd6def6008684f2dffd16b52936b1c78875f5313b442215f7e65a41ad306572` |
| [we-5-1.json](/evidence/examples/we-5-1/we-5-1.json) | 40372 | `d02edc349dbe3232ebd28be5364b00b7b4f1772392119e7dff3eb9254874a5f8` |
| [we-5-1.letter.pdf](/evidence/examples/we-5-1/we-5-1.letter.pdf) | 776006 | `10c056008e1ff0568f5832d6894809315876506998d7891c2a19d076c40469a4` |
| [we-5-1.online-verdict.json](/evidence/examples/we-5-1/we-5-1.online-verdict.json) | 17049 | `634f363420ec2b0c187b66e9fc6e93a6c8bb6919529d594a74234d238b559d43` |
| [we-5-1.online.datapoints.json](/evidence/examples/we-5-1/we-5-1.online.datapoints.json) | 1512 | `99f3bde41a0b5ef497bec3739f4bf858c7eed8d70571536c7a128d2ec1f7caf9` |
| [we-5-1.online.letter.pdf](/evidence/examples/we-5-1/we-5-1.online.letter.pdf) | 775062 | `55c006ad9ef2bdf9b3b0c7164de41b2dd15c67396f44a76fee026faf7a361d8a` |

#### Run it yourself

```
git clone https://github.com/LembaGang/chirindo.git
cd chirindo
git checkout 6285832c294493001b12d4467259c04a2c4890fb
cd examples/ordering-evidence-h4
npm ci
cd ../evidence-bundle
npm ci
node check-bundle.mjs pages/we-5-1.bundle.json --charge-id TEST-ch-we5-1 --charge-amount 28000 --charge-currency EUR --charge-authorized-at 2026-10-25T15:18:03Z --merchant-order-id TEST-H-2001 --pins pages/we-5-1-pins > we-5-1.verdict.json
node check-bundle.mjs pages/we-5-1.bundle.json --charge-id TEST-ch-we5-1 --charge-amount 28000 --charge-currency EUR --charge-authorized-at 2026-10-25T15:18:03Z --merchant-order-id TEST-H-2001 --pins pages/we-5-1-pins --online > we-5-1.online-verdict.json
node make-exhibit.mjs we-5-1.online-verdict.json --page letter --out we-5-1.online.letter.pdf
node make-datapoints.mjs we-5-1.online-verdict.json > we-5-1.online.datapoints.json
```

Or download the zip below, extract it, and start from `cd chirindo-evidence/examples/ordering-evidence-h4`. The charge and its authorization time are test values. In a real dispute, the person running the verifier states them from the dispute record they hold.

### Variant 2: we-5-2

The online verdict:

**OUTSIDE-INSTRUCTION** (rule C4)

> OUTSIDE THE INSTRUCTION: the decision was recorded before the charge and matches it, and the order falls outside the instruction or goes against the decision

Checked at 2026-10-26T10:24:28.928Z.

#### The stated charge

| charge id | amount (minor units) | currency | authorized at | merchant order id |
|---|---|---|---|---|
| TEST-ch-we5-2 | 24000 | EUR | 2026-10-25T15:14:34Z | TEST-H-2001 |

#### The committed order, as the online verdict reports it

| merchant | merchant order id | currency | total (minor units) | items sum (minor units) | items |
|---|---|---|---|---|---|
| test-hotel.example | TEST-H-2001 | EUR | 24000 | 24000 | 1 |

| amount matches | currency matches | order id matches | witness received at | before the authorization |
|---|---|---|---|---|
| true | true | true | 2026-10-25T15:13:34.504Z | true |

#### The instruction's card limits, as the online verdict reports them

| limit | result | reason |
|---|---|---|
| currency | inside | null |
| max\_total\_minor | not-declared | null |
| max\_unit\_price\_minor | inside | null |
| merchants | not-declared | null |
| items | not-declared | null |
| categories | inside | null |
| refundable\_only | outside | null |
| service\_window | inside | null |
| locations | inside | null |

Limits exceeded: refundable\_only.

#### Bindings

| binding | state | reason |
|---|---|---|
| B-LOG | BOUND | null |
| B-CKP | BOUND | null |
| B-WIT | BOUND | null |
| B-KEY | BOUND | null |
| B-INS | EXCEEDS | null |
| B-GRC | ABSENT | null |
| B-CARD | BOUND | null |

#### Does not apply to card payments

| binding | state | reason |
|---|---|---|
| B-PAY | NOT-EVALUATED | card-subject |
| B-CHAIN | NOT-EVALUATED | card-subject |

#### Gaps

- B-INS EXCEEDS

The verdict JSON and the data-point export (`agent_gaps`) still list those two bindings among the gaps, as the format defines them. B-GRC (the gate receipt) reads ABSENT because these examples carry no gate receipt, and the format does not count that as a gap.

#### The same bundle, checked offline

**PAYMENT-NOT-VERIFIED** (rule C3, reason offline-witness-data)

> NOT VERIFIED: the record does not show that the decision was recorded before the charge and matches it

Offline, the verifier trusts the bundle's copy of the witness receipt, so it does not confirm the witness time (the verifier's README, "What an offline run never says").

#### Times, each with its clock

| what | time | clock |
|---|---|---|
| log-d record 0 ts | 2026-10-25T15:13:34.502Z | operator |
| selected checkpoint ts (sidecar-d line 1) | 2026-10-25T15:13:34.503Z | operator |
| selected witness receipt received\_at (sidecar-d line 1) | 2026-10-25T15:13:34.504Z | headless-oracle |
| selected witness receipt checkpoint\_ts (sidecar-d line 1) | 2026-10-25T15:13:34.503Z | headless-oracle |
| ins-d iat | 2026-10-24T15:07:27Z | principal |
| ins-d valid\_from | 2026-10-24T15:07:27Z | principal |
| ins-d valid\_until | 2026-11-09T00:00:00Z | principal |
| stated authorization time | 2026-10-25T15:14:34Z | processor |

#### Every limit of the online verdict

| limit | text |
|---|---|
| L1 | A gate entry is the operator's own signed statement of what its gate saw and decided. The bundle does not show that a decision was wise, that the agent read the instruction correctly, or that any member's contents are true. |
| L2 | A log records what passed through the gate. It does not show that no action bypassed the gate. The verifier reports the gate version each entry names; chirindo entries through release 0.5.2 carry the constant 0.0.1 in place of a version. chirindo through release 0.5.2 (source read at tags v0.3.0, v0.4.0, v0.5.1 and v0.5.2; run on 0.5.2) forwarded a tools/call without an id member without evaluating policy or writing a receipt, and ran an allowed tools/call with id null without a receipt. |
| L3 | The witness receipt is Headless Oracle's signed statement that at received\_at it was shown a checkpoint signed by the key with that thumbprint; it is only as reliable as Headless Oracle and its signing key. The witness is operated by Headless Oracle, which also publishes the gate software: it is independent of an operator other than Headless Oracle, not of Headless Oracle. |
| L6 | A key's binding to an organisation goes no further than an https origin that served it to the verifier (B-KEY BOUND) or, for a standalone key, than the key itself (KEY-ONLY). An address is an address, not a person or a company. |
| L7 | Times on the principal's, the issuer's, the operator's and Headless Oracle's clocks are those parties' statements, and the block timestamp is set by the block producer within the chain's rules. Only the orderings that need no clock rest on signatures and hashes alone. |
| L8 | This bundle is named in none of the card network rules read for this specification (scope: the pages its sources list; the dispute chapters of the Visa Core Rules and the body of the Mastercard Chargeback Guide could not be read). It is evidence a decider may weigh within the existing reason codes. |
| L9 | The bundle carries what its assembler chose to put in. A verifier can show that the pieces present bind; it cannot show that a piece which would contradict them was left out, except where the witness's receipts show a longer history than the log carried (TRUNCATED) or a different one (FAIL). |
| L12 | The principal key in a minimal instruction is bound to no person, account or payer; the bundle shows that the holder of that key signed the instruction. |
| L13 | Uses and budget are counted only over what the bundle carries: the records whose arguments it carries and the payments it binds. Uses and payments outside the bundle cannot be counted; the output gives the number of records whose arguments are not carried. |
| L14 | Headless Oracle operates both the gate whose key signed this log and the witness, so the log and the witness receipt are statements by one party. |
| L17 | This version does not verify card payments: whether the action connects to the card payment is not verified. |
| L24 | v0.10. For a card payment, the payment proof is the card network's authorization record, which the issuer holds; this bundle neither carries nor verifies it. What this verdict shows is whether the decision and the order the gate recorded were witnessed before the charge's authorization time as stated, and whether that order matches the stated charge: the stated charge and its time are the statements of the person running the verifier, taken from the processor's records. |
| L25 | v0.10. The committed order is the agent's statement at decision time, as the gate recorded it: its merchant, items, prices, refundability, dates and places are what the agent's call named. The bundle does not show that the merchant fulfilled that order, that the charge was for it beyond the fields compared, or that an item's attributes are true. |

#### Files

| file | bytes | sha256 |
|---|---|---|
| [pins.json](/evidence/examples/we-5-2/pins.json) | 2776 | `f79e079688f45432768da26f02d088b3277adaed0f5ad9c3ac1699dd952cd476` |
| [we-5-2.bundle.json](/evidence/examples/we-5-2/we-5-2.bundle.json) | 8023 | `8da516d746229d963701c9a4634540e30e7adb8cf5c974619146e5654c582bdc` |
| [we-5-2.json](/evidence/examples/we-5-2/we-5-2.json) | 40763 | `9ad0ad549a40baf629d681a1cfc2409556b6a012654324242c2f65859f7c8031` |
| [we-5-2.letter.pdf](/evidence/examples/we-5-2/we-5-2.letter.pdf) | 776016 | `39336a5821aad7da592247d411f579f9010c0f7c890135b0539a062e6d27e550` |
| [we-5-2.online-verdict.json](/evidence/examples/we-5-2/we-5-2.online-verdict.json) | 17232 | `bae6151b0fe34b2eb3f09490a7b2b9a9eb99abf38daf9ba6c7ab1802c7b077e7` |
| [we-5-2.online.datapoints.json](/evidence/examples/we-5-2/we-5-2.online.datapoints.json) | 1593 | `a256a7faca1ff6e0e1627dabd8a3d8d1fee0ed82bc4dcaf4af2e0debaf448553` |
| [we-5-2.online.letter.pdf](/evidence/examples/we-5-2/we-5-2.online.letter.pdf) | 775170 | `5ad3be1702e5f77001342806deaf0453ed79251084283964a13edb4c643e27c7` |

#### Run it yourself

```
git clone https://github.com/LembaGang/chirindo.git
cd chirindo
git checkout 6285832c294493001b12d4467259c04a2c4890fb
cd examples/ordering-evidence-h4
npm ci
cd ../evidence-bundle
npm ci
node check-bundle.mjs pages/we-5-2.bundle.json --charge-id TEST-ch-we5-2 --charge-amount 24000 --charge-currency EUR --charge-authorized-at 2026-10-25T15:14:34Z --merchant-order-id TEST-H-2001 --pins pages/we-5-2-pins > we-5-2.verdict.json
node check-bundle.mjs pages/we-5-2.bundle.json --charge-id TEST-ch-we5-2 --charge-amount 24000 --charge-currency EUR --charge-authorized-at 2026-10-25T15:14:34Z --merchant-order-id TEST-H-2001 --pins pages/we-5-2-pins --online > we-5-2.online-verdict.json
node make-exhibit.mjs we-5-2.online-verdict.json --page letter --out we-5-2.online.letter.pdf
node make-datapoints.mjs we-5-2.online-verdict.json > we-5-2.online.datapoints.json
```

Or download the zip below, extract it, and start from `cd chirindo-evidence/examples/ordering-evidence-h4`. The charge and its authorization time are test values. In a real dispute, the person running the verifier states them from the dispute record they hold.

## Shared files

The operator key set the bundles name, and the verifier's source at commit `6285832c294493001b12d4467259c04a2c4890fb` as one zip.

| file | bytes | sha256 |
|---|---|---|
| [jwks.json](/evidence/examples/jwks.json) | 142 | `d72d37e6aff4e58734ed6cec607f5c1151f573589ed81cc7f2a14ce3a8bc27ed` |
| [chirindo-evidence-6285832c2944.zip](/evidence/examples/chirindo-evidence-6285832c2944.zip) | 2049433 | `14f4d580e03a4ca777dae602312c7f341335a1f04a9327910ee7efa7a4095f24` |

The source is also in the [chirindo repository](https://github.com/LembaGang/chirindo), commit `6285832c294493001b12d4467259c04a2c4890fb`. More: [all worked examples](/evidence), [integration](/evidence/integration), [the data-point sheet](/evidence/datapoints).
