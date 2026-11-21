# Makster Production Worker 0.9 — deployment checklist

## Before migration

- Create a Supabase development branch or local Supabase stack.
- Create the migration filename with `supabase migration new makster_production_worker_0_9`.
- Apply migrations 0.1 through 0.9 in order.
- Run database advisors and pgTAP smoke tests.
- Do not test first on production data.

## Server credentials

Create a dedicated server secret key for the Production Worker where possible.

```text
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Never place the secret key in:

- Next.js public env;
- browser JS;
- Windows client bundle;
- Git repository;
- machine program files.

## Queue

Confirm queue exists:

`makster-production`

Keep queue access server-side. The 0.9 worker uses service-only RPC wrappers and does not require exposing `pgmq_public` to browser clients.

## Storage

Confirm private bucket exists:

`makster-manufacturing-private`

Worker output path:

```text
<org>/<project>/release/<release>/machine/<machine>/<job>/<file>
```

## Signing

The release signing private key is not a worker input. The worker only receives/loads the public key needed to verify an already signed release.

## Postprocessor

Do not register a live postprocessor until all are true:

- exact machine and controller identified;
- format/API specification obtained;
- output compared against vendor software or verified reference jobs;
- postprocessor artifact SHA-256 recorded;
- DB profile trust = `verified`;
- machine profile trust = `verified`;
- regression test project physically verified.

## Worker

One iteration:

```bash
npm run worker:once
```

Continuous service:

```bash
npm run worker:start
```

Recommended initial visibility timeout: 300 seconds.

## Acceptance test

Before allowing any real job:

1. enqueue one signed test project;
2. confirm claim/lease;
3. simulate worker crash and confirm visibility retry;
4. simulate Storage failure and confirm same job retries;
5. change postprocessor artifact hash and confirm drift block;
6. alter a release file and confirm signature/hash block;
7. complete a safe test and confirm queue message moves to archive only after artifacts exist.
