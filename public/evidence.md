# Evidence of what an AI agent was allowed to do, and did

Headless Oracle · https://headlessoracle.com/evidence · as of 2026-10-26

## What it is for

A dispute evidence bundle holds the records of what an AI agent was allowed to do and what it did: the customer's signed instruction, the gate's signed record of the agent's decision, and a witness receipt for a checkpoint of that record's log. Both worked examples here are constructed test cases: a script builds the signed log with a test key, and only the witness receipts are live.

An open verifier checks a bundle and says what it shows and what it does not, so a merchant, a chargeback platform or a card issuer can check the same files without trusting whoever assembled them.

One limit applies to every example here:

> Headless Oracle operates both the gate whose key signed this log and the witness, so the log and the witness receipt are statements by one party.

## The bundle as an envelope: what it carries today

A dispute over a purchase made by an AI agent will draw on records from several parties: the payment provider's record of what the customer allowed, the network's or issuer's authorisation record, the merchant's order, and the agent's own log. No one of them is enough, and no one party holds them all. The evidence bundle is one container for the records it can carry. Each record goes in as a member with its own digest. Where the verifier reads the record's format (instructions in the minimal profile of Annex A, the gate's log and receipts, the witness's checkpoints and receipts, and EVM payment records), it checks it and says what it shows. Verifiable Intent and AP2 instructions are carried with their digests and marked PRESENT, not verified; any other record can be carried as a supporting member, of which only the digest is checked. For a card payment, the issuer's authorisation record is not carried today: the person running the verifier states the charge, from the processor's records. Headless Oracle's witness countersigns the bundle's checkpoints, so the order of the gate's records rests on signatures and hashes; the witness is operated by Headless Oracle, and a time on any party's clock remains that party's statement. The bundle does not replace any network's or provider's record, and no network has adopted it.

## Start here

- [Worked example: a constructed test case of an AI agent ordering a physical item](/evidence/cases/physical-order)
- [Worked example: a constructed test case of an AI agent booking a hotel](/evidence/cases/hotel-booking)
- [Integration: the order fields, the commands and the exit codes](/evidence/integration)
- [The data-point sheet: every member of the export, and the four examples' values](/evidence/datapoints)
- [The examples' operator key set (JWKS)](/evidence/examples/jwks.json)
- [The verifier's source, as one zip](/evidence/examples/chirindo-evidence-6285832c2944.zip)
- [The chirindo repository (commit 6285832c294493001b12d4467259c04a2c4890fb)](https://github.com/LembaGang/chirindo)
