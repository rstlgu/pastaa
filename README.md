# Pastaa on Cloudflare Free

Pastaa uses a static React/Vite frontend, Cloudflare Workers APIs and D1. It does not provision R2, a paid Workers subscription, Supabase, or PostgreSQL. Chat delivery continues to use the existing Pusher account; optional email sharing uses the existing Resend/Turnstile configuration.

## Local development

Requires Node.js 22 or newer. New uploads use 128 KiB chunks to stay within the Free CPU budget; legacy imported files retain their original layout.

```sh
npm ci
cp .env.example .env.local
cp .dev.vars.example .dev.vars
# Set public keys in .env.local and private server settings in .dev.vars.
# RATE_LIMIT_SECRET and EMAIL_VERIFICATION_SECRET must be independent random secrets of at least 32 characters.
npm run db:local
npm run build
npm run dev:api
# In another terminal, npm run dev for frontend hot reload.
```

The full built application is also served at http://localhost:8787 by Wrangler. Static pages/assets avoid server rendering and do not consume dynamic Worker requests. Existing `/v/:shortId`, `/view/:id`, shared page URLs and `chat.pastaa.io` routes are preserved.

## Mandatory expiry

- Paste expiry: 1 hour, 4 hours, 1 day or 7 days; default 7 days.
- Share pages: 1/4/6 hours, 1/7/30 days; default 1 day. Indefinite retention is disabled.
- Chat attachments: 30 seconds, 1/2/5/10 minutes. The timer starts only when all chunks have been verified and the upload completes.
- Incomplete uploads and completed, unattached paste uploads expire after 10 minutes.
- Every file metadata and chunk request checks the server deadline. Expired ciphertext is never served while waiting for cleanup.
- An indexed, bounded Worker Cron runs every minute and deletes expired metadata and ciphertext chunks even if nobody opens the file. Cascading foreign keys and database triggers release the reserved space atomically. Scheduling delays can delay physical cleanup, but cannot extend access.
- Burn-after-reading uses an atomic winning read. Text is deleted immediately. The first reader has at most 120 seconds to transfer encrypted attachments; successful transfers delete their chunks immediately. Concurrent readers cannot claim the same attachment twice.
- Timers remove active application data. They cannot revoke files already downloaded by a recipient or erase Cloudflare's retained Time Travel history.

## Attachment controls

- At most 10 files per paste and 10 MiB of total original data; chat files are individually limited to 10 MiB.
- Allowlist: JPEG, PNG, WebP, GIF, PDF and UTF-8 TXT/Markdown/CSV. Archives, HTML, SVG and executables are blocked.
- Client validation checks name, extension, MIME, actual byte length and file signatures before encryption and again after decryption. Invalid/empty files are rejected. Images are decoded locally with a maximum of 8,192 pixels per dimension and 40 million pixels; PDF trailers are checked and common active-content dictionary entries are rejected.
- The server sees ciphertext only. It validates declared allowed formats, exact ciphertext overhead for one/two encryption layers, actual streamed chunk sizes, SHA-256 digests, ordinal bounds, complete chunk coverage, upload capability and download capability. MIME claims cannot prove the contents of ciphertext; this is not a server antivirus scanner.
- Unpredictable tokens are sent in request headers; only their hashes are stored alongside the file. Paste references contain recipient capabilities, and never encryption keys.
- Upload tickets reserve the entire eventual encoded size before accepting any data. A transactional 200 MiB application budget leaves headroom below D1's 500 MB database limit.
- Default limits: 20 file allocations/hour/IP, 25 MiB of ciphertext allocations/day/IP, 150 MiB/day globally, 360 API requests/minute/IP, 10,000 API requests/day globally. D1 stores persistent counters, with salted IP hashes, and rejects excess use. Failed/abandoned uploads also count toward allocation limits.
- File and paste API responses are never cacheable. Image preview object URLs are revoked at expiry.

## Protection against automated and distributed abuse

- Every data API, including reads, chat and attachments, requires a signed 20-minute session issued after server-side Turnstile verification. Siteverify must report the exact request hostname and `pastaa-access` action. Tokens are single-use at Cloudflare. Sessions are tied to the host, salted IP/browser fingerprint and expiry, and use HttpOnly, Secure, SameSite=Strict host-only cookies. A change of IP/browser requires a fresh verification.
- Turnstile pre-clearance is Managed. The zone WAF applies Managed Challenge to `/api/` on both production hosts: unverified traffic is challenged before invoking the Worker or D1. There is no API exemption, including `/api/access` and `/api/health`. The Turnstile widget grants verified visitors clearance for the zone's configured Challenge Passage.
- The Free WAF rate rule blocks more than 240 `/api/` requests in 10 seconds per IP, for 10 seconds. The threshold leaves room for a complete maximum-size encrypted file upload/download. Counters are local to Cloudflare locations and enforcement is approximate.
- Native Worker limits run before D1: 360 requests/minute/IP, 360/minute/session, 6 access handshakes/minute/IP and 30 creations/updates/minute/session. These are per Cloudflare location and complement the exact persistent D1 quotas. Invalid/expired sessions and unknown API paths never touch D1. An isolate-local circuit breaker also reduces database calls after the daily global cap is reached.
- `workers_dev` and preview URLs are disabled, and APIs reject other hosts and cross-origin writes. Production does not accept localhost origins. This closes alternate URLs that would bypass the zone WAF.
- Editors/chat remain mounted while verification renews; simultaneous browser requests wait for one verification rather than repeating challenges. Home, chat lobby, privacy and terms remain public static pages.
- These controls reduce abuse but cannot guarantee availability against an unlimited attack or CAPTCHA-solving services. Authorized traffic and Worker rejections can still consume provider quotas; there is no automatic paid upgrade.

## Publishing without enabling charges

1. Confirm the account's **Workers Free** plan in the authenticated Cloudflare dashboard. The domain's Free plan is separate from Workers pricing.
2. Authenticate Wrangler with only account/user read, Workers scripts/routes edit, D1 edit and zone read scopes. Do not enable R2 or upgrade Workers.
3. Create a D1 database named `pastaa` using `npx wrangler d1 create pastaa`, then put its UUID in `wrangler.jsonc`.
4. Apply `npm run db:remote`. Set the secrets from `.dev.vars.example` with `wrangler secret put`; copy existing Pusher/Resend/Turnstile settings securely. Private secrets never belong in `VITE_*` variables.
5. Run `npm run typecheck`, `npm test`, `npm run build`, and `npx wrangler deploy --dry-run`.
6. Set `PASTAA_FREE_PLAN_VERIFIED` to the account ID only after checking Workers Free, then run `npm run deploy`. The deploy wrapper rejects R2/paid-product bindings, placeholder database IDs and the wrong account. It does not change billing plans.
7. Verify both production hosts with a real Turnstile session and confirm unverified API traffic is challenged at the WAF. Keep workers.dev and preview URLs disabled. Configure the zone's Managed Challenge and Free rate rule as described above; review those rules separately from code deployments.

Cloudflare Free quotas block requests when exhausted; application limits reduce use but cannot guarantee availability under unlimited traffic. This project never automatically upgrades the account. Existing Pusher and Resend quotas remain independent.

## Preserving existing data

`prisma/schema.prisma` documents the source PostgreSQL schema only; Prisma is not used by the application.

Run the read-only import using a local, ignored env file with the existing `DATABASE_URL`:

```sh
node --env-file=.env.migration.local scripts/import-postgres.mjs
```

The script reads an internally consistent PostgreSQL snapshot, imports active pastes/pages through parameterized D1 queries, preserves IDs and encryption metadata, preserves legacy 512 KiB ciphertext chunks, and prints counts only. It aborts if the live data cannot fit the application budget. Existing expired rows are excluded; indefinite paste/page retention is capped at 7/30 days. Source data is never deleted. PostgreSQL TLS uses `verify-full`; Supabase imports use the official pinned CA bundle from the [Supabase CLI](https://github.com/supabase/cli/tree/develop/apps/cli-go/internal/gen/types/templates). Set `PGSSLROOTCERT` to override the trusted root for another provider.

Chat messages are already ephemeral. Supabase chat attachments have at most 10 minutes of lifetime: allow existing transfers to expire before changing the chat route. Freeze writes to the old application for the final snapshot/import/cutover so writes made during the transition cannot be lost. Keep the old deployment and database available for rollback until production verification passes.

## Verification

`npm test` runs API integration tests against a real local D1 engine, including concurrent reads, transactional ownership/budget controls, malformed/incomplete uploads, expiry checks and scheduled cascading deletion. The deployment has also been checked in a browser for encrypted text/files and two-participant chat. Live logs for 128 KiB chunks showed successful operations within the 10 ms Free CPU budget in the sampled run; this is a measurement, not an unlimited-traffic guarantee. Local tests do not enforce the remote CPU limit.

Compatible dependency security fixes were applied, including Tiptap, ProseMirror, Faker and React Router. Remaining npm advisories concern the Tailwind build tool chain; user content is not passed to that compiler.

For final cutover, set `MIGRATION_FREEZE=1`, route both domains’ APIs to the Worker, allow outstanding source requests/transfers to finish, import the final snapshot, switch the full-domain routes and remove the freeze. The API responds with `503` and `Retry-After` while frozen. Keep Vercel available for rollback.
