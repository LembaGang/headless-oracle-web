/**
 * agent-discovery.js — the one copy of the homepage's agent discovery values.
 *
 * WHY THIS EXISTS: the homepage `Link` header is set in two places that Pages treats
 * separately. `public/_headers` covers the static response; a Pages Function response
 * ignores `_headers`, so functions/index.js sets the header itself. Both must say the
 * same thing, and scripts/check-agent-discovery.mjs holds `_headers` to this constant.
 *
 * Only registered link relations are used (api-catalog, service-desc, service-doc,
 * describedby). Each target answers 200 on the live site; the check re-fetches them.
 */

export const LINK_HEADER =
  '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc", </docs>; rel="service-doc", </llms.txt>; rel="describedby"';
