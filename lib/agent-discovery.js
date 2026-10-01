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

/**
 * True only when the client prefers Markdown to HTML. HTML stays the default: an absent
 * header, a browser's `text/html,...,*\/*;q=0.8`, or `text/html, text/markdown;q=0.5`
 * all get HTML. `*\/*` is ignored so a wildcard never turns a browser into a Markdown
 * client. A malformed q-value counts as 0, so a broken header falls back to HTML.
 */
export function wantsMarkdown(acceptHeader) {
  if (!acceptHeader) return false;
  let mdQ = null;
  let htmlQ = 0;
  for (const range of acceptHeader.split(',')) {
    const [type, ...params] = range.split(';').map((s) => s.trim().toLowerCase());
    let q = 1;
    for (const p of params) {
      const m = p.match(/^q\s*=\s*(.*)$/);
      if (m) q = /^(0(\.\d{0,3})?|1(\.0{0,3})?)$/.test(m[1]) ? Number(m[1]) : 0;
    }
    if (type === 'text/markdown') mdQ = Math.max(mdQ ?? 0, q);
    else if (type === 'text/html') htmlQ = Math.max(htmlQ, q);
  }
  return mdQ !== null && mdQ > 0 && mdQ >= htmlQ;
}
