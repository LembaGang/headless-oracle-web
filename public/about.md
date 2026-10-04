# About Headless Oracle

https://headlessoracle.com/about

Mike Msebenzi, founder.

Headless Oracle makes [Chirindo Witness](https://headlessoracle.com/witness), signed receipts for the checkpoints of an agent's log, and signed [market-state receipts](https://headlessoracle.com/docs) for 28 venues.

- **Standards:** Headless Oracle co-authors the IETF draft family defining environmental constraints for Verifiable Intent.
- **Source:** [github.com/LembaGang/chirindo](https://github.com/LembaGang/chirindo), the gate and the witness client. [github.com/LembaGang/receipt-verify](https://github.com/LembaGang/receipt-verify), the verifier. [github.com/LembaGang/headless-oracle-verify](https://github.com/LembaGang/headless-oracle-verify), the market-state receipt verifier. All repositories: [github.com/LembaGang](https://github.com/LembaGang).
- **Signed commits:** Every commit in receipt-verify is SSH-signed. `sh tools/verify-history.sh` checks the whole history against the key in `SIGNING_KEYS`, fingerprint `SHA256:KFZr0BiXIrvl/hsri0vzciGsj+suWiBqHYBwdnnyJXg`. Chirindo commits since 24 July 2026 are signed with the same key.
- **Packages:** [@headlessoracle/chirindo](https://www.npmjs.com/package/@headlessoracle/chirindo), [@headlessoracle/receipt-verify](https://www.npmjs.com/package/@headlessoracle/receipt-verify) and [@headlessoracle/verify](https://www.npmjs.com/package/@headlessoracle/verify) on npm.
- **Contact:** mike@headlessoracle.com
