# Headless Oracle

Ed25519-signed market-state attestations for AI agents.

28 exchanges. 60-second TTL. Fail-closed.

Headless Oracle is a fail-closed execution guardrail for AI agents and RWA bots. Get a cryptographically signed market status receipt before your agent executes. Agents pay 0.001 USDC per request via [x402](https://headlessoracle.com/docs/x402-payments) on Base mainnet.

## Key facts

- x402: agents can pay for themselves, 0.001 USDC/req.
- Free API key: 500 calls/day, all 28 exchanges. No signup. No credit card.
- Every response is Ed25519 signed. Verify the signature yourself, no trust required.
- Fail-closed by design. Anything other than `OPEN` halts your agent. UNKNOWN = halt, always.

## Start here

1. Query the demo endpoint, no signup. Returns a signed JSON receipt instantly. Swap `XNYS` for any supported MIC code.

   ```
   curl https://headlessoracle.com/v5/demo?mic=XNYS
   ```

2. Get a free API key (instant, no card). Returns a key instantly in the response. 500 calls/day, all 28 exchanges.

   ```
   curl -X POST https://headlessoracle.com/v5/keys/instant \
     -H "Content-Type: application/json" \
     -d '{"agent_id":"my-trading-bot"}'
   ```

3. Or let your agent pay for itself: 0.001 USDC per request via [x402 micropayments](https://headlessoracle.com/docs/x402-payments) on Base mainnet.

Verify any receipt yourself, no server needed: [Verify](https://headlessoracle.com/verify).

## Exchanges

28 exchanges. Global 24/7 coverage.

NYSE (XNYS), NASDAQ (XNAS), B3 (XBSP), LSE (XLON), Euronext (XPAR), SIX (XSWX), Milan (XMIL), Helsinki (XHEL), Stockholm (XSTO), Istanbul (XIST), Tadawul (XSAU), DFM (XDFM), JSE (XJSE), Shanghai (XSHG), Shenzhen (XSHE), HKEX (XHKG), Tokyo (XJPX), Seoul (XKRX), BSE (XBOM), NSE (XNSE), SGX (XSES), Sydney (XASX), NZX (XNZE), CME (XCBT), NYMEX (XNYM), Cboe (XCBO), Coinbase (XCOI), Binance (XBIN).

## Open standards

Apache 2.0, designed to be implemented by any operator, not just Headless Oracle.

- [SMA Protocol](https://github.com/LembaGang/sma-protocol): Signed Market Attestation. The canonical format for a cryptographically signed market-state receipt. Ed25519, 60s TTL, fail-closed semantics.
- [MPAS-1.0](https://github.com/LembaGang/mpas-spec): Multi-Party Attestation. Quorum consensus across N independent oracle operators.
- [APTS-1.0](https://github.com/LembaGang/agent-pretrade-safety-standard): Agent Pre-Trade Safety. Vendor-neutral.

## Links

- [Home](https://headlessoracle.com/)
- [Docs](https://headlessoracle.com/docs)
- [OpenAPI 3.1 specification](https://headlessoracle.com/openapi.json)
- [llms.txt](https://headlessoracle.com/llms.txt)
- [x402 payments](https://headlessoracle.com/docs/x402-payments)
- [Pricing](https://headlessoracle.com/pricing)
- [Status](https://headlessoracle.com/status)
- [Dashboard](https://headlessoracle.com/dashboard)
- [Verify a receipt](https://headlessoracle.com/verify)
- [Standards](https://headlessoracle.com/standards)
- [Blog](https://headlessoracle.com/blog)
- [Essay: x402 delivery integrity](https://headlessoracle.com/essays/x402-delivery-integrity)
- [Essay: environment Internet-Draft](https://headlessoracle.com/essays/environment-internet-draft)
- [/v5/compliance](https://headlessoracle.com/v5/compliance)
- [/v5/stack](https://headlessoracle.com/v5/stack)
- [Terms](https://headlessoracle.com/terms)
- [Privacy](https://headlessoracle.com/privacy)
- [Refund Policy](https://headlessoracle.com/refund)

Headless Oracle provides verifiable data attestations, not legal or financial advice. Contact: mike@headlessoracle.com
