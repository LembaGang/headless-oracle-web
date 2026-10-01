/**
 * Homepage content negotiation: `Accept: text/markdown` gets public/index.md, everyone
 * else gets index.html as before.
 *
 * WHY A FUNCTION: Cloudflare's built-in Markdown for Agents needs a paid plan; the site
 * stays on Free (founder ruling R1, 2026-10-01). public/_routes.json limits this to `/`
 * so no other path spends the shared Free request quota.
 *
 * `_headers` does not apply to Function responses, so the Link header is set here from
 * the same constant `_headers` is checked against.
 *
 * No x-markdown-tokens header: no tokenizer is available without a dependency, and an
 * estimate would be a made-up number.
 */

import { LINK_HEADER, wantsMarkdown } from '../lib/agent-discovery.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'GET' && request.method !== 'HEAD') return context.next();

  if (wantsMarkdown(request.headers.get('Accept'))) {
    const md = await context.env.ASSETS.fetch(new URL('/index.md', request.url));
    if (md.status === 200) {
      return new Response(request.method === 'HEAD' ? null : await md.text(), {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'Link': LINK_HEADER,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }
    // Serving HTML beats failing the request; the log makes the missing file visible.
    console.log(`markdown requested but /index.md answered ${md.status}; serving HTML`);
  }

  const res = await context.next();
  const headers = new Headers(res.headers);
  headers.set('Link', LINK_HEADER);
  const vary = headers.get('Vary');
  if (!vary) headers.set('Vary', 'Accept');
  else if (!vary.split(',').some((v) => v.trim().toLowerCase() === 'accept')) headers.set('Vary', `${vary}, Accept`);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
