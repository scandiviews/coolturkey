/* www -> apex, 301.
 *
 * This belongs in a zone-level Redirect Rule, which is cheaper because it never
 * runs compute. It lives here instead because the deploy token has zone read
 * but not rulesets write, and a redirect that exists beats a redirect that is
 * documented as a to-do.
 *
 * Note for future editors: Pages `_redirects` CANNOT do this. It matches paths
 * only, never hostnames, so an absolute-URL rule for www looks correct and
 * silently never fires. That is why this is a Function.
 *
 * Everything that is not www falls straight through to the static asset, so the
 * apex keeps its normal caching and headers.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === 'www.coolturkey.org') {
    url.hostname = 'coolturkey.org';
    return new Response(null, {
      status: 301,
      headers: {
        Location: url.toString(),          // preserves path AND query
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  return context.next();
}
