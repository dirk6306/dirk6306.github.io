export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Valid offer id required.' }, 400);
  if (!context.env.WOOT_API_KEY) return json({ error: 'WOOT_API_KEY is not configured in Cloudflare.' }, 500);

  const cacheKey = new Request(`${url.origin}/__woot_cache/offer/${id}`, { method: 'GET' });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(`https://developer.woot.com/offers/${id}`, {
    headers: { Accept: 'application/json', 'x-api-key': context.env.WOOT_API_KEY }
  });
  if (!upstream.ok) return json({ error: `Woot API returned ${upstream.status}` }, upstream.status);

  const response = new Response(await upstream.text(), {status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900, s-maxage=3600'}});
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
