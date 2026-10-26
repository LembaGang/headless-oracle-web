# Evidence of what an AI agent was allowed to do, and did

Headless Oracle · https://headlessoracle.com/evidence · as of 2026-10-26

## What it is for

A dispute evidence bundle holds the records of what an AI agent was allowed to do and what it did: the customer's signed instruction, the gate's signed record of the agent's decision, and a witness receipt for that record.

An open verifier checks a bundle and says what it shows and what it does not, so a merchant, a chargeback platform or a card issuer can check the same files without trusting whoever assembled them.

One limit applies to every example here:

> Headless Oracle operates both the gate whose key signed this log and the witness, so the log and the witness receipt are statements by one party.

## Start here

- [Worked example: a physical order bought by an AI agent](/evidence/cases/physical-order)
- [Worked example: a hotel booking made by an AI agent](/evidence/cases/hotel-booking)
- [Integration: the order fields, the commands and the exit codes](/evidence/integration)
- [The data-point sheet: every member of the export, and the four examples' values](/evidence/datapoints)
- [The examples' operator key set (JWKS)](/evidence/examples/jwks.json)
- [The verifier's source, as one zip](/evidence/examples/chirindo-evidence-6285832c2944.zip)
- [The chirindo repository (commit 6285832c294493001b12d4467259c04a2c4890fb)](https://github.com/LembaGang/chirindo)
