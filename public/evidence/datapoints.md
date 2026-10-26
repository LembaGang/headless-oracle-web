# The data-point export, member by member

Headless Oracle · https://headlessoracle.com/evidence/datapoints · as of 2026-10-26

## The members

Every member of evidence-bundle-datapoints/0.10, in the order lib/datapoints.mjs builds it at commit 6285832c294493001b12d4467259c04a2c4890fb, with the line that defines it. Each member is a string, a boolean or null, and is defined from the verdict JSON alone. Every boolean is three-valued, and null never means true. The export file itself lists the members sorted by name (RFC 8785).

| member | line | type | null means | definition |
|---|---|---|---|---|
| `agent_evidence_format` | 28 | string | never null | The constant evidence-bundle-datapoints/0.10. |
| `agent_evidence_verdict` | 29 | string | never null | The verdict code (verdict.code). |
| `agent_evidence_verdict_text` | 30 | string | never null | The verdict text (verdict.text). |
| `agent_evidence_verdict_rule` | 31 | string or null | the verdict JSON's verdict.rule is null | The rule that gave the verdict (verdict.rule). |
| `agent_evidence_verdict_reason` | 32 | string or null | the verdict has no reason (verdict.reason is null) | The verdict's reason (verdict.reason). |
| `agent_evidence_mode` | 33 | string | never null | online or offline (mode). |
| `agent_evidence_checked_at` | 34 | string | never null | When the verifier ran (checked_at). |
| `agent_evidence_bundle_sha256` | 35 | string or null | no bundle bytes were read, as when a pointer fetch fails | The bundle file's digest (bundle_sha256). |
| `agent_evidence_verdict_sha256` | 37 | string | never null | sha256: and the SHA-256 of the verdict JSON's bytes; the one member computed over the verdict JSON as a whole. |
| `agent_evidence_uri` | 38 | string or null | no pointer was given | The pointer's URI (pointer.uri). |
| `agent_evidence_entry` | 39 | string or null | no pointer was given | The entry the pointer stated (pointer.stated_entry). |
| `agent_evidence_entry_cited` | 40 | boolean or null | P2.entry was not evaluated or not listed (no pointer given) | true when the check P2.entry passed, false when it failed. |
| `agent_evidence_pointer_status` | 41 | string or null | no pointer was given | The pointer fetch's status (pointer.status). |
| `agent_decision` | 42 | string or null | the verdict reports no decision (decision.value is null) | The gate's decision on the cited action (decision.value). |
| `agent_decision_before_auth` | 45 | boolean or null | the time rule is unconfirmed (B-WIT not BOUND), it was not judged, or the subject is not a card subject with a stated charge | card.before_authorization, only when B-WIT is BOUND: true when the witness received the checkpoint before the stated authorization time. |
| `agent_order_matches_charge` | 46 | boolean or null | no order reference was compared, the order is not committed, or the subject is not a card subject with a stated charge | false when any compared field of card.matches is false; true when the amount, the currency and at least one order reference compared true. |
| `agent_order_reference_matched` | 47 | boolean or null | no order reference was compared, or the subject is not a card subject with a stated charge | true when the merchant order id or the checkout reference compared true and neither is false; false when either is false. |
| `agent_charge_id` | 48 | string or null | no charge was stated | The stated charge id (stated.charge.id). |
| `agent_authorization_time` | 49 | string or null | the verdict has no card section | The stated authorization time (card.authorized_at). |
| `agent_witness_time` | 50 | string or null | the verdict has no card section | The witness receipt's received_at (card.witness_received_at). |
| `agent_witness_state` | 51 | string or null | B-WIT is not listed | The state of B-WIT in bindings. |
| `agent_witness_time_as_supplied` | 52 | boolean or null | no covering receipt was read (B-WIT NOT-EVALUATED, ABSENT or FAIL) | true when B-WIT is SUPPLIED or TRUNCATED (the receipt is the bundle's copy), false when it is BOUND. |
| `agent_log_state` | 53 | string or null | B-LOG is not listed | The state of B-LOG. |
| `agent_key_state` | 54 | string or null | B-KEY is not listed | The state of B-KEY. |
| `agent_card_binding_state` | 55 | string or null | B-CARD is not listed | The state of B-CARD. |
| `agent_instruction_state` | 56 | string or null | B-INS is not listed | The state of B-INS. |
| `agent_instruction_scope_ok` | 57 | boolean or null | the instruction's scope was not judged (B-INS in any other state) | true when B-INS is BOUND or MATCHED, false when it is EXCEEDS or UNBOUND-OUTSIDE. |
| `agent_instruction_exceeded` | 58 | string or null | no instruction is cited | The cited instruction's exceeded limits, joined with commas in their order; the empty string when none is exceeded. |
| `agent_gate_receipt_state` | 59 | string or null | B-GRC is not listed | The state of B-GRC. |
| `agent_gaps` | 60 | string | never null | Each member of verdict.gaps as binding:state, joined with commas in their order, reasons left out. |
| `agent_limits` | 61 | string | never null | Each limit id of limits, joined with commas in their order. |
| `agent_verifier` | 62 | string | never null | verifier.name, a space, and verifier.version. |
| `agent_verifier_commit` | 63 | string | never null | verifier.commit, as the verifier records it. |

This sheet does not map members to card network reason codes. Limit L8 of each verdict says how the bundle relates to them:

> This bundle is named in none of the card network rules read for this specification (scope: the pages its sources list; the dispute chapters of the Visa Core Rules and the body of the Mastercard Chargeback Guide could not be read). It is evidence a decider may weigh within the existing reason codes.

## The four worked examples, online

The exports of the four online verdicts, from the files beside each example (`<id>.online.datapoints.json`). Values are shown as JSON writes them.

| member | [we-4-1](/evidence/examples/we-4-1/we-4-1.online.datapoints.json) | [we-4-2](/evidence/examples/we-4-2/we-4-2.online.datapoints.json) | [we-5-1](/evidence/examples/we-5-1/we-5-1.online.datapoints.json) | [we-5-2](/evidence/examples/we-5-2/we-5-2.online.datapoints.json) |
|---|---|---|---|---|
| `agent_evidence_format` | `"evidence-bundle-datapoints/0.10"` | `"evidence-bundle-datapoints/0.10"` | `"evidence-bundle-datapoints/0.10"` | `"evidence-bundle-datapoints/0.10"` |
| `agent_evidence_verdict` | `"RECORDED-BEFORE-CHARGE"` | `"OUTSIDE-INSTRUCTION"` | `"RECORDED-BEFORE-CHARGE"` | `"OUTSIDE-INSTRUCTION"` |
| `agent_evidence_verdict_text` | `"RECORDED BEFORE THE CHARGE: the decision and the instruction were recorded before the charge and match it"` | `"OUTSIDE THE INSTRUCTION: the decision was recorded before the charge and matches it, and the order falls outside the instruction or goes against the decision"` | `"RECORDED BEFORE THE CHARGE: the decision and the instruction were recorded before the charge and match it"` | `"OUTSIDE THE INSTRUCTION: the decision was recorded before the charge and matches it, and the order falls outside the instruction or goes against the decision"` |
| `agent_evidence_verdict_rule` | `"C5"` | `"C4"` | `"C5"` | `"C4"` |
| `agent_evidence_verdict_reason` | `null` | `null` | `null` | `null` |
| `agent_evidence_mode` | `"online"` | `"online"` | `"online"` | `"online"` |
| `agent_evidence_checked_at` | `"2026-10-26T10:24:17.554Z"` | `"2026-10-26T10:24:20.220Z"` | `"2026-10-26T10:24:25.867Z"` | `"2026-10-26T10:24:28.928Z"` |
| `agent_evidence_bundle_sha256` | `"sha256:2c121a773542054932ed7b69e0798333dabd1c39df6cbdf510d53b72bff7824b"` | `"sha256:4e2e8dd7ad37c31436ebab4ca631a288941e75b6d940aea4e9354261a4b5304b"` | `"sha256:ffd6def6008684f2dffd16b52936b1c78875f5313b442215f7e65a41ad306572"` | `"sha256:8da516d746229d963701c9a4634540e30e7adb8cf5c974619146e5654c582bdc"` |
| `agent_evidence_verdict_sha256` | `"sha256:5d07e29301af328156a97da02816925ffb1b321ce8af96825918dc0a6c671777"` | `"sha256:e6199fa824f15b78d193acc086c860067a0857e1a4bfa3c0bb3a476b0f68022a"` | `"sha256:634f363420ec2b0c187b66e9fc6e93a6c8bb6919529d594a74234d238b559d43"` | `"sha256:bae6151b0fe34b2eb3f09490a7b2b9a9eb99abf38daf9ba6c7ab1802c7b077e7"` |
| `agent_evidence_uri` | `null` | `null` | `null` | `null` |
| `agent_evidence_entry` | `null` | `null` | `null` | `null` |
| `agent_evidence_entry_cited` | `null` | `null` | `null` | `null` |
| `agent_evidence_pointer_status` | `null` | `null` | `null` | `null` |
| `agent_decision` | `"allow"` | `"allow"` | `"allow"` | `"allow"` |
| `agent_decision_before_auth` | `true` | `true` | `true` | `true` |
| `agent_order_matches_charge` | `true` | `true` | `true` | `true` |
| `agent_order_reference_matched` | `true` | `true` | `true` | `true` |
| `agent_charge_id` | `"TEST-ch-we4-1"` | `"TEST-ch-we4-2"` | `"TEST-ch-we5-1"` | `"TEST-ch-we5-2"` |
| `agent_authorization_time` | `"2026-10-25T15:08:29Z"` | `"2026-10-25T15:14:32Z"` | `"2026-10-25T15:18:03Z"` | `"2026-10-25T15:14:34Z"` |
| `agent_witness_time` | `"2026-10-25T15:07:29.255Z"` | `"2026-10-25T15:13:32.531Z"` | `"2026-10-25T15:17:03.685Z"` | `"2026-10-25T15:13:34.504Z"` |
| `agent_witness_state` | `"BOUND"` | `"BOUND"` | `"BOUND"` | `"BOUND"` |
| `agent_witness_time_as_supplied` | `false` | `false` | `false` | `false` |
| `agent_log_state` | `"BOUND"` | `"BOUND"` | `"BOUND"` | `"BOUND"` |
| `agent_key_state` | `"BOUND"` | `"BOUND"` | `"BOUND"` | `"BOUND"` |
| `agent_card_binding_state` | `"BOUND"` | `"BOUND"` | `"BOUND"` | `"BOUND"` |
| `agent_instruction_state` | `"BOUND"` | `"EXCEEDS"` | `"BOUND"` | `"EXCEEDS"` |
| `agent_instruction_scope_ok` | `true` | `false` | `true` | `false` |
| `agent_instruction_exceeded` | `""` | `"refundable_only"` | `""` | `"refundable_only"` |
| `agent_gate_receipt_state` | `"ABSENT"` | `"ABSENT"` | `"ABSENT"` | `"ABSENT"` |
| `agent_gaps` | `"B-PAY:NOT-EVALUATED,B-CHAIN:NOT-EVALUATED"` | `"B-PAY:NOT-EVALUATED,B-CHAIN:NOT-EVALUATED,B-INS:EXCEEDS"` | `"B-PAY:NOT-EVALUATED,B-CHAIN:NOT-EVALUATED"` | `"B-PAY:NOT-EVALUATED,B-CHAIN:NOT-EVALUATED,B-INS:EXCEEDS"` |
| `agent_limits` | `"L1,L2,L3,L6,L7,L8,L9,L12,L13,L14,L17,L24,L25"` | `"L1,L2,L3,L6,L7,L8,L9,L12,L13,L14,L17,L24,L25"` | `"L1,L2,L3,L6,L7,L8,L9,L12,L13,L14,L17,L24,L25"` | `"L1,L2,L3,L6,L7,L8,L9,L12,L13,L14,L17,L24,L25"` |
| `agent_verifier` | `"chirindo examples/evidence-bundle 0.10.0"` | `"chirindo examples/evidence-bundle 0.10.0"` | `"chirindo examples/evidence-bundle 0.10.0"` | `"chirindo examples/evidence-bundle 0.10.0"` |
| `agent_verifier_commit` | `"unrecorded"` | `"unrecorded"` | `"unrecorded"` | `"unrecorded"` |

See the cases: [physical order](/evidence/cases/physical-order) (we-4-1, we-4-2) and [hotel booking](/evidence/cases/hotel-booking) (we-5-1, we-5-2).
