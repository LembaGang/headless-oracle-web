# For auditors and insurers

Headless Oracle · https://headlessoracle.com/auditors

Check an agent's log without taking the operator's word for it.

An agent's log is kept by the team that runs the agent. Chirindo signs and hash-chains each entry; Witness signs a receipt saying when it saw each checkpoint of that log. This page is how you check one against the other yourself, offline, with open-source tools.

## 1. What a witness receipt is, and what it is not

A witness receipt is Headless Oracle's signed statement of what it was shown and when: at `received_at`, a checkpoint signed by the key with that thumbprint. It is only as reliable as Headless Oracle and its signing key. It does not prove that the records are true, who controls the key, or that the records were written at the times they carry.

- Entries after the last witnessed checkpoint can still be cut off or rewritten without detection.
- A history rewritten before it was first witnessed is not detected. The gap between an entry's time and `received_at` is that exposure window.
- A session the operator never presents, or one restarted under a new key or session ID, starts with no receipts.
- Witness is independent of the operator, not of Headless Oracle, which also publishes the gate.
- Receipts are signed one by one, but the list of them is not: a mirror, proxy or modified client can leave receipts out. Query Witness directly.

The full list is in the [Witness spec](https://api.headlessoracle.com/v1/witness/spec), under `honest_limits`.

## 2. Three steps

1. Ask for the complete session log, then fetch its receipts from Witness yourself. A receipt file supplied by the operator relies on the operator; a query to `api.headlessoracle.com` does not.
2. Run the open-source verifier offline. A log cut short or rewritten anywhere up to the last witnessed checkpoint fails, and the check names the lowest failing count.
3. Compare each `received_at` with the entries' times. That gap is the window in which history could have been rewritten before anyone witnessed it.

## 3. Fetch the receipts from Witness yourself

Every entry in a Chirindo log carries the operator key's thumbprint (`kid`) and the `session_id`. Ask Witness for every receipt it holds for that pair. The query is public, needs no account, and answers any origin.

```sh
curl -sS 'https://api.headlessoracle.com/v1/witness/checkpoints?kid=<kid>&session_id=<session_id>'
```

The answer is `{ "kid", "session_id", "receipts": [...], "next_after" }`: at most 500 receipts ordered by count. If `next_after` is present, ask again with `&after=` set to it, and keep going until it is absent. A pair Witness has never seen returns an empty list, not an error.

To try it on the demo log from the homepage:

```sh
curl -sS 'https://api.headlessoracle.com/v1/witness/checkpoints?kid=jz-7FYorYzzTy10kk3T1z8pWn2Ln8JBBhcdweor1xjo&session_id=demo-purchasing-agent-76f75512-dfca-4385-8ad0-16117144c933'
```

### Check each receipt's signature

A receipt is signed by Headless Oracle with Ed25519 over all its fields except `signature`, keys sorted, as JSON with no whitespace; the signature is lowercase hex. Take the public key from [api.headlessoracle.com/v5/keys](https://api.headlessoracle.com/v5/keys): the `keys[]` entry whose `key_id` equals the receipt's `public_key_id` (currently `key_2026_v1`). Pin it: after a key rotation, the endpoint lists only the new key.

Then check the receipt names the checkpoint: the same `kid`, `session_id`, `count` and `last_entry_hash`, and `checkpoint_sha256` equal to the SHA-256 of the signed checkpoint. Finally, the log's entry at that count must hash to that `last_entry_hash`.

## 4. Run the check

- [In your browser](https://headlessoracle.com/verify): paste or drop a bundle of entries, checkpoint, operator key and witness receipt. Nothing is uploaded; the checks run on your machine.
- Offline: [@headlessoracle/receipt-verify](https://www.npmjs.com/package/@headlessoracle/receipt-verify) checks the log's signatures and links; `chirindo verify` from the [Chirindo repository](https://github.com/LembaGang/chirindo) checks the log against witness receipts.
- [Test kit: five tampering cases and an untouched control, chain alone against witnessed](https://github.com/LembaGang/chirindo/tree/main/examples/e015-4-kit). Run it before you rely on the tools: each tampered case should fail and the control should pass.

## 5. Questions

Write to Mike Msebenzi, founder: mike@headlessoracle.com. What Witness is and how its plans work: [Chirindo Witness](https://headlessoracle.com/witness).
