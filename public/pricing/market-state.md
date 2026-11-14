# Market-state API plans

Headless Oracle · https://headlessoracle.com/pricing/market-state

Plans for the market-state API. Prices are in US dollars. The same prices are served as JSON at [https://headlessoracle.com/v5/pricing](https://headlessoracle.com/v5/pricing). The plan id is the value to send as `plan` to `POST https://headlessoracle.com/v5/checkout`, or the tier id in `/v5/pricing` where a plan has no checkout. For the five-alteration test, grading and the outside checkpoint, see [Pricing](https://headlessoracle.com/pricing).

## Market-state API

| Plan | Plan id | Price | What you get |
|---|---|---|---|
| Sandbox | `sandbox` | $0 | 200 calls over 7 days. `POST /v5/sandbox` with an email in the body; the `sb_` key is returned in the response; one per IP; all 28 exchanges; Ed25519 signed receipts |
| Free Tier | `free` | $0 | 500 API calls/day; all 28 exchanges; Ed25519 signed receipts; instant provisioning, no credit card |
| Pay-per-use | `x402` | $0.001/request | 0.001 USDC on Base mainnet, no subscription and no API key; HTTP 402 machine-readable |
| Credits | `credits` | $5 one-time | 1,000 API calls, no expiry; pay via card |
| Builder | `builder` | $99/month | 50,000 API calls/day; all 28 exchanges; webhook subscriptions; receipt audit log |
| Pro | `pro` | $299/month | 200,000 API calls/day; all 28 exchanges; 25 webhook subscriptions; priority support |
| Protocol / Enterprise | `protocol` | from $500/month | Unlimited calls, dedicated support, direct engineering access; service levels by agreement after the public beta. Contact mike@headlessoracle.com |

All plans include Ed25519 cryptographic signatures on every response, a fail-closed architecture, and 28 global exchanges across 7 regions (Americas, Europe, Middle East, Africa, Asia, Pacific, Derivatives & Crypto).

Free key, no email or signup:

```sh
curl -X POST https://headlessoracle.com/v5/keys/instant -H "Content-Type: application/json" -d '{"agent_id":"my-trading-bot"}'
```

x402 discovery: [https://headlessoracle.com/.well-known/x402.json](https://headlessoracle.com/.well-known/x402.json)
