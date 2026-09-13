# Makster Quote — Vercel deployment

Makster Quote is deployed as one dedicated Vercel project that contains both the
public Quote marketing pages and the authenticated Quote application. It remains
separate from the main Makster Atelier website project.

- Vercel project: `makster-quote-app`
- Git branch: `makster-quote-0.1-core`
- Root Directory: `apps/quote`
- Framework Preset: `Next.js`

The `makster-quote-app` project must serve `quote.maksteratelier.com`; do not attach
that domain to the main Makster Atelier website project.

## Route boundary

- `/`, `/ru`, `/en`, `/cs`, `/de`, and `/pl` are public marketing pages.
- `/login`, `/auth/*`, and signed client links under `/q/*` are public product routes.
- `/dashboard`, `/projects/*`, `/quotes/*`, `/clients/*`, `/price-book/*`,
  `/library/*`, and `/settings/*` require a valid Supabase session.
- `/api/webhooks/lemonsqueezy` is public only because it authenticates every request
  with the Lemon Squeezy signature.
- `robots.txt` blocks authenticated application routes and tokenized client links
  from search indexing.

Do not move the marketing site into a second Quote deployment. The shared deployment
keeps sign-in, cookie locale selection, canonical URLs, and checkout redirects on one
origin while the route guard preserves the public/application boundary.

## Production domain checklist

1. Add `quote.maksteratelier.com` to the `makster-quote-app` Vercel project and apply
   the DNS record shown by Vercel.
2. Set `NEXT_PUBLIC_APP_URL=https://quote.maksteratelier.com` for Production.
3. Add `https://quote.maksteratelier.com/auth/confirm` to the Supabase Auth redirect
   allow list and set the production Site URL to the Quote origin.
4. Set the same production origin in Lemon Squeezy checkout and webhook settings.
5. Keep `LEMONSQUEEZY_TEST_MODE=true` until checkout, portal, webhook signature,
   duplicate-event handling, and subscription-state updates pass end-to-end testing.
6. Verify `/`, every locale route, `/robots.txt`, and `/sitemap.xml` return `200`,
   while an anonymous request to `/dashboard` redirects to `/login`.
