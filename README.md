# Woot Scout

A mobile-first standalone PWA for browsing live Woot deals, searching the catalog, and ranking the biggest discounts.

## Included in v1

- Live `All` Woot feed plus category feeds
- Biggest percentage discount sorting
- Biggest dollar savings sorting
- 30% / 50% / 60% / 70%+ filters
- Under $25 quick filter
- Clearance shortcut
- Search across title, subtitle, and categories
- Saved deals stored locally on-device
- Installable PWA shell
- Cloudflare Pages Functions proxy so the Woot API key never ships to the browser
- Edge caching to reduce Woot API usage

## Cloudflare Pages setup

1. Create a Cloudflare Pages project from this GitHub repository.
2. Use no framework preset. The project is plain static HTML/CSS/JS with Pages Functions.
3. Add an encrypted environment variable / secret named `WOOT_API_KEY` and set it to the Woot API key.
4. Deploy.

Do **not** add the Woot API key to this repository or to `app.js`.

## API routes

- `/api/feed?name=All`
- `/api/feed?name=Clearance`
- `/api/offer?id=<offer-guid>`

The frontend only talks to these same-origin routes. The Cloudflare function attaches the `x-api-key` header server-side.
