# Headless Oracle docs

Headless Oracle · https://headlessoracle.com/docs

Two products: Chirindo Witness, signed receipts for the checkpoints of an agent's log, and signed market-state receipts for 28 venues. Machine-readable: [Witness spec](https://api.headlessoracle.com/v1/witness/spec), [OpenAPI](https://headlessoracle.com/openapi.json), [llms.txt](https://headlessoracle.com/llms.txt), [prices as JSON](https://headlessoracle.com/v5/pricing).

## Chirindo Witness quickstart

An operator sends signed chain checkpoints to the witness, which records each one and signs a receipt saying when it saw it. The witness attests only "at time T, I received this checkpoint, validly signed by the key with this thumbprint". It does not attest who owns the key, nor that the records are true.

What it adds: a cut-off tail, or a rewrite by the key holder (edit, delete or reorder, then re-sign and re-link), of any history up to the last witnessed checkpoint, made after that checkpoint was witnessed, is detected when the chain is compared with the witness's receipts. Records after the last witnessed checkpoint, and a history rewritten before it was first witnessed, are not. The full list is in the [Witness spec](https://api.headlessoracle.com/v1/witness/spec), under `honest_limits`.

The free pool needs no account and no key: anonymous checkpoints share one daily pool (figure in the plan table below). Because anyone can submit without an account, anyone can use up the rate limit or the daily cap until it resets; paid plans get their own key and quota.

### Send your first checkpoint

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

Witness answers `201` with a receipt signed by Headless Oracle. The checkpoint's keys are written in sorted order, so `JSON.stringify` gives the exact bytes the spec signs. With the gate, the count and the head hash come from your log; here they stand in for one placeholder entry.

With the Chirindo gate in front of your MCP server, checkpoints come from your real log: see [/witness](https://headlessoracle.com/witness#start) for `npx -y @headlessoracle/chirindo init`, `proxy` and `verify`.

### Verify a receipt

1. **Fetch the receipts from Witness yourself.** Public, no auth: `GET https://api.headlessoracle.com/v1/witness/checkpoints?kid=<thumbprint>&session_id=<id>`. Verifying against a sidecar file trusts the operator who supplied it. Only querying the witness is independent of the operator.
2. **Take the Witness public key.** Use `public_key` (hex, 32 raw bytes) of the `keys[]` entry in `GET https://api.headlessoracle.com/v5/keys` whose `key_id` equals the receipt's `public_key_id`, and pin it.
3. **Check the signature.** The signed bytes are all receipt fields except `signature`, keys sorted, `JSON.stringify` with no whitespace, UTF-8; the signature is Ed25519, hex.
4. **Compare the log with the receipts.** In your browser at [/verify](https://headlessoracle.com/verify), or offline with [@headlessoracle/receipt-verify](https://www.npmjs.com/package/@headlessoracle/receipt-verify) and `chirindo verify`. A log shorter than a witnessed count, or different from what Witness saw at that count, fails, and the check names the count where it fails.

### Plans

| Plan | Plan id | Price | Quota |
|---|---|---|---|
| Free pool | `witness_free` | $0 | 2,000 new checkpoints per UTC day, shared by every anonymous caller |
| Evidence Starter | `custody_90d` | $49/month | Up to 1,000 new checkpoints per UTC day, your own key |
| Evidence | `custody_1y` | $199/month | Up to 3,000 new checkpoints per UTC day, your own key |

Buy from [/pricing](https://headlessoracle.com/pricing#witness), or start the checkout yourself. `POST /v5/checkout` returns a `transaction_id` for Paddle checkout and a `claim_token`; after payment, `POST /v5/claim` with the `claim_token` answers `{"state":"ready","key":"…"}` once the payment is recorded. Until then it can answer 404 or carry `retry_after_seconds`, so poll.

```sh
curl -sS -X POST https://headlessoracle.com/v5/checkout \
  -H 'Content-Type: application/json' \
  -d '{"plan":"custody_90d"}'

curl -sS -X POST https://headlessoracle.com/v5/claim \
  -H 'Content-Type: application/json' \
  -d '{"claim_token":"<claim_token from the checkout response>"}'
```

## Market-state receipts

Headless Oracle provides a cryptographically verifiable defensive execution layer for autonomous agents operating across global markets.

### Quick start

Using Claude Code? [Add Headless Oracle to Claude Code in 3 steps](https://headlessoracle.com/docs/quickstart). Copy one `.mcp.json` file and your agent has pre-trade verification.

Try the public demo endpoint, no API key needed:

```sh
curl https://headlessoracle.com/v5/demo

# Any supported exchange:
curl "https://headlessoracle.com/v5/demo?mic=XLON"
curl "https://headlessoracle.com/v5/demo?mic=XJPX"
```

For production use, fetch a signed attestation with your API key:

```sh
curl -X GET "https://headlessoracle.com/v5/status?mic=XNYS" \
     -H "X-Oracle-Key: YOUR_API_KEY"
```

Check when the next session opens (no auth required): `curl "https://headlessoracle.com/v5/schedule?mic=XNYS"`

Verify Oracle's signing infrastructure is live: `curl "https://headlessoracle.com/v5/health"`

### Supported exchanges

28 exchanges across 7 regions (including derivatives and 24/7 crypto). All DST transitions are handled server-side using IANA timezone data, with no hardcoded UTC offsets. All times are local to the exchange. The full directory is at `/v5/exchanges`.

| MIC | Exchange | Local hours | Timezone | DST |
|---|---|---|---|---|
| XNYS | New York Stock Exchange | 09:30 – 16:00 | America/New_York | Mar 8 |
| XNAS | NASDAQ | 09:30 – 16:00 | America/New_York | Mar 8 |
| XBSP | B3 (São Paulo Stock Exchange) | 10:00 – 17:00 | America/Sao_Paulo | Brazil (Nov) |
| XLON | London Stock Exchange | 08:00 – 16:30 | Europe/London | Mar 29 |
| XPAR | Euronext Paris | 09:00 – 17:30 | Europe/Paris | Mar 29 |
| XSWX | SIX Swiss Exchange | 09:00 – 17:30 | Europe/Zurich | Mar 29 |
| XMIL | Borsa Italiana (Milan) | 09:00 – 17:30 | Europe/Rome | Mar 29 |
| XHEL | Nasdaq Helsinki | 10:00 – 18:30 | Europe/Helsinki | Mar 29 |
| XSTO | Nasdaq Stockholm | 09:00 – 17:30 | Europe/Stockholm | Mar 29 |
| XIST | Borsa Istanbul | 10:00 – 18:00 | Europe/Istanbul | Mar 29 |
| XSAU | Saudi Exchange (Tadawul), Sun–Thu | 10:00 – 15:00 | Asia/Riyadh | None |
| XDFM | Dubai Financial Market, Sun–Thu | 10:00 – 14:00 | Asia/Dubai | None |
| XJSE | Johannesburg Stock Exchange | 09:00 – 17:00 | Africa/Johannesburg | None |
| XSHG | Shanghai Stock Exchange | 09:30 – 15:00 (lunch 11:30–13:00) | Asia/Shanghai | None |
| XSHE | Shenzhen Stock Exchange | 09:30 – 15:00 (lunch 11:30–13:00) | Asia/Shanghai | None |
| XHKG | Hong Kong Exchanges and Clearing | 09:30 – 16:00 (lunch 12:00–13:00) | Asia/Hong_Kong | None |
| XJPX | Japan Exchange Group (Tokyo) | 09:00 – 15:30 (lunch 11:30–12:30) | Asia/Tokyo | None |
| XKRX | Korea Exchange (Seoul) | 09:00 – 15:30 | Asia/Seoul | None |
| XBOM | BSE Ltd (Bombay Stock Exchange) | 09:15 – 15:30 | Asia/Kolkata | None |
| XNSE | National Stock Exchange of India | 09:15 – 15:30 | Asia/Kolkata | None |
| XSES | Singapore Exchange | 09:00 – 17:00 | Asia/Singapore | None |
| XASX | Australian Securities Exchange (Sydney) | 10:00 – 16:00 | Australia/Sydney | Oct (AU) |
| XNZE | New Zealand Exchange (Auckland) | 10:00 – 16:45 | Pacific/Auckland | Oct (NZ) |

Also covered, not listed in the table: XCBT, XNYM, XCBO, XCOI and XBIN.

2026 DST risk events, after which hardcoded UTC offsets compute incorrect hours:

- Mar 8: US clocks spring forward (EST to EDT). Affects XNYS, XNAS.
- Mar 29: UK/EU clocks spring forward (GMT/CET to BST/CEST). Affects XLON, XPAR.
- Oct 25: UK/EU clocks fall back. Affects XLON, XPAR.
- Nov 1: US clocks fall back. Affects XNYS, XNAS.

### Endpoints

- `GET /v5/status` (authenticated): primary endpoint for production market status checks. Header `X-Oracle-Key: YOUR_API_KEY`; query `mic=XNYS` (or any of the 28 supported MIC codes, see `/v5/exchanges`).
- `GET /v5/demo` (public): a signed receipt for any exchange, no auth. Query `mic=XNYS` (optional, defaults to XNYS). For integration testing and verification development.
- `GET /v5/schedule` (public): next scheduled open and close times. Includes `lunch_break` for exchanges with midday breaks (XJPX, XHKG); `lunch_break` is `null` otherwise. Does not reflect real-time halts or manual overrides.
- `GET /v5/exchanges` (public): the directory of supported exchanges with MIC codes, names and timezones.
- `GET /v5/keys` (public): the Ed25519 public key registry and `canonical_payload_spec`. `valid_until` is `null` when no key rotation is scheduled; it will be set in advance of any planned rotation.
- `GET /v5/batch` (authenticated): signed status receipts for several exchanges in one request, each independently signed. Query `mics=XNYS,XNAS,XLON` (comma-separated, deduplicated). One invalid MIC returns 400 for the whole request; a Tier 3 signing failure fails the whole batch.
- `GET /v5/health` (public): signed liveness probe, to tell "Oracle is down" from "market is genuinely UNKNOWN". 200 with a valid signature means the signing infrastructure is alive; 500 `CRITICAL_FAILURE` means the signing system is offline.

`/v5/schedule` example:

```json
{
  "mic": "XJPX",
  "name": "Japan Exchange Group (Tokyo)",
  "timezone": "Asia/Tokyo",
  "queried_at": "2026-03-10T01:00:00.000Z",
  "current_status": "OPEN",
  "next_open":  "2026-03-10T03:30:00.000Z",
  "next_close": "2026-03-10T06:30:00.000Z",
  "lunch_break": { "start": "11:30", "end": "12:30" },
  "note": "Times are UTC. lunch_break times are local exchange time (see timezone field)."
}
```

### Response schema

```json
{
  "receipt_id":     "uuid-v4",
  "issued_at":      "ISO-8601-Timestamp (UTC)",
  "expires_at":     "ISO-8601-Timestamp (UTC, issued_at + 60s)",
  "mic":            "XNYS",
  "status":         "OPEN",
  "source":         "SCHEDULE",
  "schema_version": "v5.0",
  "public_key_id":  "key_2026_v1",
  "signature":      "hex_string"
}
```

Do not act on a receipt whose `expires_at` has passed.

Status values:

- **OPEN:** the venue is in an active trading session. Single-name halts do not change venue status; see [/halt-gate](https://headlessoracle.com/halt-gate).
- **CLOSED:** outside trading hours: weekend, holiday, or after close.
- **HALTED:** manually halted (circuit breaker or emergency override). Treat identically to CLOSED.
- **UNKNOWN:** Oracle cannot determine status. **Treat as CLOSED. Halt all execution.**

Source values:

- **SCHEDULE:** derived from the exchange holiday/hours calendar.
- **OVERRIDE:** set manually, during circuit breakers or emergency halts. Includes a `reason` field.
- **SYSTEM:** internal fallback when the primary logic errored. Always paired with UNKNOWN.

### Verification logic

To confirm a receipt is authentic, reconstruct the signed payload and verify the Ed25519 signature against the [published public key](https://headlessoracle.com/ed25519-public-key.txt).

The signature covers a fixed allowlist of receipt fields enumerated in `canonical_payload_spec` at [/v5/keys](https://headlessoracle.com/v5/keys) (union of `receipt_fields`, `override_fields`, `health_fields`). Filter the response to that allowlist, sort the keys alphabetically, then minify with no whitespace. Decoration the worker added after signing (`extensions`, a duplicated `receipt` wrapper, `discovery_url`) must be excluded so the message bytes match what was signed.

```js
const ORACLE_BASE = "https://headlessoracle.com";

async function verifyReceipt(receipt) {
  const { keys, canonical_payload_spec: spec } =
    await fetch(`${ORACLE_BASE}/v5/keys`).then(r => r.json());

  const canonicalFields = [
    ...spec.receipt_fields,
    ...(spec.override_fields || []),
    ...(spec.health_fields  || []),
  ].filter((v, i, a) => a.indexOf(v) === i).sort();

  const filtered = {};
  for (const key of canonicalFields) {
    if (key !== "signature" && key in receipt) filtered[key] = receipt[key];
  }
  const canonical = JSON.stringify(filtered);

  const keyBytes  = hexToBytes(keys[0].public_key);
  const sigBytes  = hexToBytes(receipt.signature);
  const msgBytes  = new TextEncoder().encode(canonical);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "Ed25519" }, false, ["verify"]
  );
  return crypto.subtle.verify({ name: "Ed25519" }, cryptoKey, sigBytes, msgBytes);
}

function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
}
```

```python
import json, requests
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

ORACLE_BASE = "https://headlessoracle.com"

def verify_and_check(mic="XNYS"):
    receipt = requests.get(
        f"{ORACLE_BASE}/v5/status?mic={mic}",
        headers={"X-Oracle-Key": "YOUR_KEY"},
        timeout=4,
    ).json()
    keys_doc = requests.get(f"{ORACLE_BASE}/v5/keys", timeout=4).json()
    public_key_hex = keys_doc["keys"][0]["public_key"]
    spec           = keys_doc["canonical_payload_spec"]

    canonical_fields = sorted(set(
        spec["receipt_fields"]
        + spec.get("override_fields", [])
        + spec.get("health_fields",  [])
    ))
    filtered = {k: receipt[k] for k in canonical_fields
                if k != "signature" and k in receipt}

    canonical = json.dumps(filtered, sort_keys=True, separators=(",", ":"))
    sig       = bytes.fromhex(receipt["signature"])

    try:
        VerifyKey(bytes.fromhex(public_key_hex)).verify(canonical.encode(), sig)
    except BadSignatureError:
        return False  # fail closed
    return receipt["status"] == "OPEN"
```

Or use the [browser-based verifier](https://headlessoracle.com/verify). An independent client-side verifier on a separate trust boundary is at [verify.headlessoracle.com](https://verify.headlessoracle.com). Reference implementation: [github.com/headlessoracle/demo-agent](https://github.com/headlessoracle/demo-agent), a ~100-line Node.js verifier (MIT).

### Fail-closed architecture

A four-tier safety cascade. If anything fails at any tier, the response defaults to `UNKNOWN`, never a false `OPEN`.

| Tier | Behaviour |
|---|---|
| TIER 0 | Manual override active: returns HALTED or CLOSED with a signed reason. |
| TIER 1 | Schedule-based calculation: holidays, weekends, trading hours, half-days, lunch breaks. |
| TIER 2 | Fail-closed safety net: any Tier 1 error returns a signed UNKNOWN receipt. |
| TIER 3 | Catastrophic: signing system offline. Returns unsigned CRITICAL_FAILURE with HTTP 500. |

Integrator rule (binding): execute *only* if `status === 'OPEN'` AND the Ed25519 signature is valid. Any other result (CLOSED, HALTED, UNKNOWN, timeout, network error, or invalid signature) must halt execution. This is a contractual obligation under the [Terms of Service](https://headlessoracle.com/terms).

### Circuit breaker overrides

The `OVERRIDE` source broadcasts HALTED during exchange circuit breakers, emergency closures or scheduled maintenance. An override receipt carries a `reason` field, is signed with the same Ed25519 key as schedule-based receipts, and verifies the same way. Treat HALTED identically to CLOSED.

### MCP integration

An MCP (Model Context Protocol) server at `POST https://headlessoracle.com/mcp`, JSON-RPC 2.0, protocol version `2024-11-05` (Streamable HTTP transport). No authentication required for MCP tool calls.

- `get_market_status`: whether an exchange is open or closed, as a signed receipt. Treat UNKNOWN or HALTED as CLOSED and halt execution. Input `{ "mic": "XNYS" }`.
- `get_market_schedule`: next open and close times, including lunch breaks for XJPX, XHKG, XSHG and XSHE. Not signed; does not reflect real-time halts. Input `{ "mic": "XJPX" }`.
- `list_exchanges`: all 28 supported exchanges with MIC codes, names and timezones. No input.
- `get_payment_options`: the ways to authenticate or pay before a request that needs a key or payment: sandbox, x402 per request, credits, subscriptions and the Chirindo Witness plans. Always returns 200. No input.

Receipts are verified with `POST /v5/verify` or offline against [/v5/keys](https://headlessoracle.com/v5/keys); there is no MCP verification tool.

Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "headless-oracle": {
      "url": "https://headlessoracle.com/mcp"
    }
  }
}
```

The public key for receipts returned by MCP tools is at [/.well-known/oracle-keys.json](https://headlessoracle.com/.well-known/oracle-keys.json) (RFC 8615).

### API keys and billing

`/v5/status`, `/v5/batch` and `/v5/account` require an API key in the `X-Oracle-Key` header. All other endpoints are public. Keys come from anonymous Paddle checkout at `POST /v5/checkout`, with no account creation. The body must name a plan, for example `{"plan":"builder"}` (no plan is 400 `PLAN_REQUIRED`); the response carries `url` (`https://buy.paddle.com/checkout/txn_…`), `transaction_id` and `claim_token`. After payment, `POST /v5/claim {"claim_token":"…"}` returns the key for 24 hours; bought from the pricing page, the key appears there. Keys are prefixed `ho_live_`. Plans and prices: [pricing.md](https://headlessoracle.com/pricing.md).

```sh
curl https://headlessoracle.com/v5/account \
     -H "X-Oracle-Key: YOUR_API_KEY"
# Returns: { "plan": "pro", "status": "active", "key_prefix": "ho_live_..." }
```

Error codes:

- **401 API_KEY_REQUIRED:** no key in the header.
- **403 INVALID_API_KEY:** key not found. Check for typos or use `/v5/account` to confirm it is active.
- **402 PAYMENT_REQUIRED:** subscription suspended or cancelled. Update billing to restore access.

### Open standards

Published as Apache 2.0 open standards:

- **SMA Protocol, Signed Market Attestation** ([GitHub](https://github.com/LembaGang/sma-protocol)): the canonical JSON schema for a signed market-state receipt: fields, Ed25519 signing, canonical payload serialisation (alphabetical key sort), 60-second TTL, and fail-closed UNKNOWN semantics. Conformance vectors: [/v5/conformance-vectors](https://headlessoracle.com/v5/conformance-vectors).
- **MPAS-1.0, Multi-Party Attestation Aggregation** ([GitHub](https://github.com/LembaGang/mpas-spec)): how N independent operators' SMA receipts are aggregated into one `AggregatedAttestation` with quorum consensus.
- **APTS-1.0, Agent Pre-Trade Safety Standard** ([GitHub](https://github.com/LembaGang/agent-pretrade-safety-standard)): a vendor-neutral 6-step checklist before executing: fetch signed attestation, verify circuit breakers, verify settlement window, verify TTL, verify Ed25519 signature, halt on any failure.

### Guides

- [MCP setup](https://headlessoracle.com/docs/quickstart)
- [x402 payments](https://headlessoracle.com/docs/x402-payments)
