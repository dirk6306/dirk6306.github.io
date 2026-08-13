const ALLOWED = new Set(['All','Clearance','Computers','Electronics','Featured','Home','Gourmet','Shirts','Sports','Tools','Wootoff']);

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const name = url.searchParams.get('name') || 'All';
  if (!ALLOWED.has(name)) return json({ error: 'Unsupported Woot feed.' }, 400);
  if (!context.env.WOOT_API_KEY) return json({ error: 'WOOT_API_KEY is not configured in Cloudflare.' }, 500);

  const cacheKey = new Request(`${url.origin}/__woot_cache/feed/${name}`, { method: 'GET' });
  const cache = caches.default;
  const force = url.searchParams.get('refresh') === '1';
  if (!force) {
    const cached = await cache.match(cacheKey);
    if (cached) return withHeaders(cached);
  }

  const upstream = await fetch(`https://developer.woot.com/feed/${encodeURIComponent(name)}`, {
    headers: { Accept: 'application/json', 'x-api-key': context.env.WOOT_API_KEY }
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    return json({ error: `Woot API returned ${upstream.status}`, detail: detail.slice(0, 300) }, upstream.status);
  }

  const body = await upstream.text();
  const response = new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=900',
      'access-control-allow-origin': '*'
    }
  });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function json(data, status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function withHeaders(response){const h=new Headers(response.headers);h.set('x-woot-scout-cache','HIT');return new Response(response.body,{status:response.status,headers:h})}
