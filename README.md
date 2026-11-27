# Minecraft Multi-Tenant Store CMS (MVP)

Multi-tenant webstore platform for Minecraft servers.

| Surface | Host |
|---|---|
| Landing page | `business.com` |
| Super admin | `admin.business.com` |
| Store admin | `{slug}-admin.business.com` |
| Storefront | `{slug}.business.com` |
| API | `api.business.com` |

## Stack
- **apps/web**: Next.js 15 (App Router, server actions, Tailwind). One app serves all four surfaces via hostname rewrites in `middleware.ts`.
- **apps/api**: NestJS 10 REST API (`/v1`), JWT auth, cron jobs.
- **packages/db**: Prisma schema + client for Neon Postgres.
- **packages/shared**: Zod schemas, pricing/commission maths, slug + host rules shared by web and api.
- **apps/plugin**: Paper plugin that runs purchase commands in-game and handles `/link`.

## Business rules
- **Commission (customer side):** `total = (price - store discount) + commission%`. Commission % is set per store by the super admin (default from global config `defaultCommissionPercent`). Each order snapshots the % and amounts.
- Customers pay the store directly (UPI/bank), so the platform fee is collected from the store. Super admin records **settlements** per store; unsettled commission is shown as "Commission due".
- **Store addresses:** slugs are 3-32 chars `[a-z0-9-]`, cannot end with `-admin` (the host would clash with another store's admin panel), and cannot be a reserved word. Built-in reserved words live in `packages/shared/src/slug.ts`; super admins can add more via the `reservedSlugs` global setting (JSON array). Store **display names** have no restrictions.
- Manual UPI flow: order `PENDING` -> player submits UTR -> `AWAITING_VERIFICATION` -> admin verifies -> `SUCCESSFUL` (commands queued) or `FAILED`/`CANCELLED`. A UTR can only be used once per store. Unpaid orders auto-cancel after `PENDING_ORDER_TTL_HOURS`.
- Timed packages (monthly / N days) get `expiresAt` on verification; a cron job queues the package's expiry commands.

## Local setup
```bash
cp .env.example .env            # fill DATABASE_URL / DIRECT_DATABASE_URL from Neon
# local values:
#   ROOT_DOMAIN=localhost:3000  WEB_PROTOCOL=http
#   API_URL=http://localhost:4000  PUBLIC_API_URL=http://localhost:4000
pnpm install
pnpm db:migrate                 # creates tables in Neon
pnpm db:seed                    # super admin from SUPERADMIN_EMAIL/PASSWORD + demo store
pnpm dev                        # web :3000, api :4000
```
Browsers resolve `*.localhost` automatically:
- http://localhost:3000 - landing
- http://admin.localhost:3000 - super admin
- http://demo-admin.localhost:3000 - demo store admin (the seeded super admin can log in)
- http://demo.localhost:3000 - demo storefront

### Discord login
Create an app at https://discord.com/developers, add redirect `${PUBLIC_API_URL}/v1/auth/discord/callback`, and set `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`. One redirect URL serves every store: the store slug travels in the signed OAuth `state`, then the API hands off to `{slug}.business.com/auth/callback`.

### Uploads
Logos, QR codes and package images go to any S3-compatible bucket (Cloudflare R2 recommended). Set the `S3_*` variables.

## Plugin
```bash
cd apps/plugin && gradle build   # -> build/libs/StoreDelivery-0.1.0.jar
```
Drop the jar in `plugins/`, start the server once, then set `api-url` and `plugin-key` (Store admin > Store settings > Generate key) in `plugins/StoreDelivery/config.yml` and run `/storedelivery reload`.
- Polls `POST /v1/plugin/queue` with online players, runs commands from console, acks results (5 retries with backoff, then marked failed; admins can retry from the order page).
- Command placeholders: `{username}`, `{uuid}`, `{order}`.
- `/link <code>` verifies a player's Minecraft account against the code shown on the storefront Account page.

## Deployment
- **DNS:** `business.com`, `*.business.com` -> web; `api.business.com` -> api. On Vercel add both the apex and the wildcard domain (requires Vercel nameservers for wildcard SSL).
- **API:** any Node host (Railway, Render, Fly). Run `pnpm db:deploy` on release.
- Cookies are host-only, so sessions never leak between store/admin subdomains.

## API overview (`/v1`)
- `auth/*`: admin login, me, Discord SSO, player token exchange
- `platform/*` (super admin): stores CRUD, enable/disable, commission, members, settlements, admins, all orders + CSV, stats, audit logs, global config
- `stores/:slug/*` (store admin): settings, discount, plugin key, uploads, stats, categories, packages, payment config, orders (filter, verify, status, redeliver, CSV), customers
- `s/:slug/*` (storefront): catalog, package, me, username + link code, orders, payment reference, cancel
- `plugin/*` (plugin key): queue, ack, link

## Not in MVP (next)
Cart with multiple packages, Microsoft account login, payment gateway (Razorpay/Cashfree) for auto-verification, email/Discord webhook notifications, custom domains per store, GST invoices, refresh-token rotation and 2FA for admins, Postgres RLS.
