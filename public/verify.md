# Verify

Headless Oracle · https://headlessoracle.com/verify

Check a receipt in your browser. Two kinds of receipt: a Chirindo agent log with its Witness receipt, and a signed market-state receipt. The checks on the page run on your machine with WebCrypto; nothing you paste is sent anywhere.

## Chirindo log + Witness receipt

The page takes a JSON bundle with four members:

- `entries`: the log, in order
- `checkpoint`: signed with the operator key
- `operator_public_key_jwk`
- `witness_receipt`

The Witness public key is not taken from the bundle: the page fetches it from [api.headlessoracle.com/v5/keys](https://api.headlessoracle.com/v5/keys). If that fetch fails, the witness receipt is not checked; paste the `public_key` (hex) of the entry whose `key_id` matches the receipt's `public_key_id`, or check offline with `chirindo verify` from the [Chirindo repository](https://github.com/LembaGang/chirindo).

Checks run by the page, in order:

1. Entries signed by the operator key and hash-linked
2. Checkpoint signed by the operator key
3. Receipt signed by Witness, naming this checkpoint
4. Log at the witnessed count matches what Witness saw

A witness receipt is Headless Oracle's signed statement that at `received_at` it was shown a checkpoint signed by the key with that thumbprint; it is only as reliable as Headless Oracle and its signing key. It does not prove who controls the key, that the records are true, or that they were written at the times they carry. The full list of limits is in the [Witness spec](https://api.headlessoracle.com/v1/witness/spec), under `honest_limits`.

Verifying against a receipt file supplied by the operator trusts that operator. Only querying the witness is independent of the operator:

```sh
curl -sS "https://api.headlessoracle.com/v1/witness/checkpoints?kid=<thumbprint>&session_id=<id>"
```

Offline: [@headlessoracle/receipt-verify](https://www.npmjs.com/package/@headlessoracle/receipt-verify) on npm checks the log, and `chirindo verify` checks the witness receipt.

## Market-state receipt

Paste a signed receipt JSON to verify its Ed25519 signature using the Web Crypto API, in your browser. No data is sent to Headless Oracle's servers. Ed25519 in WebCrypto needs Chrome 113+, Firefox 128+, or a recent Safari.

- Public keys: [/.well-known/oracle-keys.json](https://headlessoracle.com/.well-known/oracle-keys.json) (RFC 8615) and [/v5/keys](https://headlessoracle.com/v5/keys). Hex is the canonical format; PEM/SPKI is accepted as a legacy fallback.
- The signed bytes: the receipt fields listed in `canonical_payload_spec` at `/v5/keys`, keys sorted alphabetically, minified with no whitespace. Fields added after signing (`extensions`, a duplicated `receipt` wrapper, `discovery_url`) are excluded. Step by step, with samples: [Verification logic](https://headlessoracle.com/docs#verification).
- An independent client-side verifier on a separate trust boundary: [verify.headlessoracle.com](https://verify.headlessoracle.com), served from a separate Cloudflare Pages deployment.

A receipt to try: [https://headlessoracle.com/v5/demo](https://headlessoracle.com/v5/demo)
