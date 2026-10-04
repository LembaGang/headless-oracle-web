# Chirindo Witness

Headless Oracle · https://headlessoracle.com/witness

Agent logs your auditor can check without trusting you.

Chirindo signs each agent action into a hash-chained log. Witness signs a receipt saying when it saw each checkpoint of that log. If the log is later cut short, or rewritten by whoever holds the key, anywhere up to the last witnessed checkpoint, comparing it with the witness receipts shows it.

Checking is free, with open-source tools, and an auditor can fetch the receipts from Witness directly instead of taking them from the operator.

- [Get a free checkpoint](https://headlessoracle.com/witness#start): free checkpoints need no account and come from a shared pool of 2,000 a UTC day.
- [Evidence Starter, $49/month](https://headlessoracle.com/pricing#witness): paid plans get their own key and quota.

## How it works

1. **Every tool call becomes a signed entry.** The Chirindo gate sits in front of your MCP server. Each call it allows or denies is written as an entry signed with your key, carrying the hash of the entry before it. Change one in the middle and the signature and the next link no longer match.
2. **Checkpoints go to Witness.** Every so often the gate signs a checkpoint, the entry count and the hash at the head of the log, and sends it to Witness. Witness keeps it and signs a receipt with the time it received it. Only the checkpoint is sent: never arguments, results or records.
3. **Anyone compares, offline.** An auditor checks the log against the witness receipts with open-source tools. A log shorter than a witnessed count, or different from what Witness saw at that count, fails, and the check names the count where it fails.

### What a witness receipt is, and what it is not

A witness receipt is Headless Oracle's signed statement of what it was shown and when: at `received_at`, a checkpoint signed by the key with that thumbprint. It is only as reliable as Headless Oracle and its signing key. It does not prove that the records are true, who controls the key, or that the records were written at the times they carry.

- Entries after the last witnessed checkpoint can still be cut off or rewritten without detection.
- A history rewritten before it was first witnessed is not detected. The gap between an entry's time and `received_at` is that exposure window.
- A session the operator never presents, or one restarted under a new key or session ID, starts with no receipts.
- Witness is independent of the operator, not of Headless Oracle, which also publishes the gate.

The full list is in the [Witness spec](https://api.headlessoracle.com/v1/witness/spec), under `honest_limits`.

## Start in a minute

Witness accepts only a checkpoint signed with an Ed25519 key, so the request reads its body from a file. This script makes a key and a one-entry checkpoint and writes `checkpoint.json`. It needs Node 20 or later and nothing else.

`checkpoint.mjs`:

```js
import { generateKeyPairSync, sign, createHash } from "node:crypto"; import { writeFileSync } from "node:fs";
const { privateKey, publicKey } = generateKeyPairSync("ed25519"), x = publicKey.export({ format: "jwk" }).x;
const sha = (s, enc) => createHash("sha256").update(s).digest(enc), kid = sha(`{"crv":"Ed25519","kty":"OKP","x":"${x}"}`, "base64url");
const cp = { count: 1, kid, last_entry_hash: "sha256:" + sha("first entry", "hex"), session_id: "try-" + Date.now(), ts: new Date().toISOString(), type: "checkpoint", v: "evidence.action/1" };
cp.sig = sign(null, Buffer.from(JSON.stringify(cp)), privateKey).toString("base64url");
writeFileSync("checkpoint.json", JSON.stringify({ checkpoint: cp, public_key_jwk: { kty: "OKP", crv: "Ed25519", x } }));
```

```sh
node checkpoint.mjs
curl -sS https://api.headlessoracle.com/v1/witness/checkpoints \
  -H 'Content-Type: application/json' \
  --data-binary @checkpoint.json
```

Witness answers `201` with a receipt signed by Headless Oracle. The checkpoint's keys are written in sorted order, so `JSON.stringify` gives the exact bytes the spec signs. With the gate, the count and the head hash come from your log; here they stand in for one placeholder entry. Free checkpoints share a pool of 2,000 new ones a UTC day.

### Put the gate in front of your MCP server

```sh
npx -y @headlessoracle/chirindo init
npx -y @headlessoracle/chirindo proxy --policy policy.json --server-label my-server -- <your MCP server command>
npx -y @headlessoracle/chirindo verify .gate/sessions/<session-id>.jsonl --key .gate/identity.json
```

`init` makes the signing key. The second line is the command your MCP client launches in place of your server; `policy.json` lists the tools to deny, and `{"deny": []}` records everything and blocks nothing. `verify` checks every signature and link offline.

Sending checkpoints to Witness from the gate (`chirindo checkpoint`, `proxy --checkpoint-every`) is on the main branch of the [Chirindo repository](https://github.com/LembaGang/chirindo); the current npm release, 0.4.0, does not include it yet.

## Test kit and spec

- [Test kit: five tampering cases and an untouched control, chain alone against witnessed](https://github.com/LembaGang/chirindo/tree/main/examples/e015-4-kit)
- The [Witness spec](https://api.headlessoracle.com/v1/witness/spec) is machine-readable: request format, every check in order, receipt format, signing and its limits.
- [Check a log against its witness receipt in your browser](https://headlessoracle.com/verify), or offline with [@headlessoracle/receipt-verify](https://www.npmjs.com/package/@headlessoracle/receipt-verify) and `chirindo verify`.
- [For auditors and insurers: checking a log without relying on the operator](https://headlessoracle.com/auditors)

## Plans

| Plan | Price | What you get |
|---|---|---|
| Free | $0 | Anonymous checkpoints from a shared pool of 2,000 new ones a UTC day |
| Evidence Starter | $49/month | Your own Witness key, up to 1,000 new checkpoints a UTC day |
| Evidence | $199/month | Your own Witness key, up to 3,000 new checkpoints a UTC day |
| Evidence pilot | $4,900 fixed | For a team in its audit window, scope agreed by conversation |
| Annual programmes | $60,000 or $150,000 a year | By invoice, after a conversation |

Evidence Starter and Evidence prices are introductory until 31 December 2026. Checking receipts is always free. [All plans and terms](https://headlessoracle.com/pricing#witness)
