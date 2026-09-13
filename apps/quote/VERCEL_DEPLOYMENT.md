# Makster Quote — Vercel deployment

Makster Quote is one Next.js application located in `apps/quote`.

## Canonical routes

- `/` — public Makster Quote marketing site
- `/login` — sign in / registration
- `/onboarding` — authenticated workspace setup
- `/dashboard` — authenticated application home
- `/projects`, `/quotes`, `/clients`, `/price-book`, `/library`, `/settings/*` — authenticated application routes
- `/q/[token]` — public client quote
- `/api/webhooks/lemonsqueezy` — public verified billing webhook

The dashboard must never be moved back to `/`. The marketing site and the working application share the same Next.js build but remain separate route areas.

## Vercel project

- Vercel project: `makster-quote-app`
- Production branch: `makster-quote-0.1-core`
- Root Directory: `apps/quote`
- Framework Preset: `Next.js`

Do not create a second root-level Next.js application or change the Vercel Root Directory to `/`. A root-level build can produce a misleading green deployment while the real Quote application in `apps/quote` is not being built.

## Required production environment

At minimum, configure the public Supabase connection and canonical application URL. Email and billing variables are server-only and must never use the `NEXT_PUBLIC_` prefix.

Use `apps/quote/.env.example` as the canonical variable list. Secret values must stay in Vercel/Supabase/Resend/Lemon Squeezy and must not be committed to Git.

## Release verification

Before merging a release branch, run from `apps/quote`:

```bash
npm ci
npm run typecheck
npm run pdf:smoke
npm run build
```

Then verify that `/` is public, `/dashboard` redirects anonymous users to `/login`, authenticated navigation stays inside the application, and public client links under `/q/[token]` remain accessible without an app session.
