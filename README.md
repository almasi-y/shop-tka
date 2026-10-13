# Code Innovators Shop

Code Innovators Shop is a robotics e-commerce application built with Next.js
16, React 19, TypeScript, Tailwind CSS, Clerk, Sanity, Zustand, Paystack, and
the Vercel AI SDK.

The customer storefront provides Sanity-managed catalog browsing, category and
brand filtering, product pages, persistent user carts and wishlists, checkout,
orders, returns, restock notifications, and order tracking. The repository also
contains a custom Sanity-powered admin dashboard and the embedded Sanity Studio.

## Application areas

| Area | Route | Purpose |
| --- | --- | --- |
| Storefront | `/` | Catalog, categories, products, cart, wishlist, and AI assistant |
| Customer account | `/orders`, `/account/address`, `/returns` | Orders, saved address, tracking, and return requests |
| Checkout | `/checkout` | Validated shipping details and Paystack checkout |
| Admin dashboard | `/admin` | Inventory, catalog, orders, tracking, returns, and shipping rates |
| Sanity Studio | `/studio` | Direct Sanity content management |

## Requirements

- Node.js 24 LTS (the version is pinned in `.nvmrc` and `package.json`)
- pnpm 10
- Clerk application
- Sanity project and dataset
- Paystack account
- Vercel AI Gateway credentials and credits only when the AI assistant is
  enabled

## Local setup

Install dependencies, copy the environment template, and start Next.js:

```bash
nvm install
nvm use
pnpm install
cp .env.example .env.local
pnpm dev
```

Node.js 25 is intentionally unsupported because it is not an LTS release. Use
the pinned Node.js 24 LTS runtime locally and in deployment environments.
While the project remains on TypeScript 5, `next.config.ts` uses Next's
documented TypeScript compiler-API checker; this avoids unreliable detached
`tsc --showConfig` output capture in the local environment.
The build script explicitly selects Webpack because the current Turbopack
production build did not terminate reliably for this combined storefront and
embedded Studio bundle.

The storefront is available at `http://localhost:3000`. Never commit
`.env.local` or paste its secret values into documentation, issues, or chat.

### Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Clerk browser configuration |
| `CLERK_SECRET_KEY` | Server only | Clerk server authentication |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Public | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Public | Sanity dataset, normally `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Public | Pinned Sanity API version |
| `SANITY_API_READ_TOKEN` | Server only | Authenticated published-content reads |
| `SANITY_API_WRITE_TOKEN` | Server only | Separate Editor token for carts, wishlists, orders, returns, and subscriptions |
| `PAYSTACK_SECRET_KEY` | Server only | Paystack initialization, verification, and webhook signatures |
| `NEXT_PUBLIC_BASE_URL` | Server/public config | Callback origin, such as `http://localhost:3000` or `https://shop-tka.vercel.app` |
| `PAYMENT_OPERATIONS_SECRET` | Server only | Protects readiness and manual reconciliation endpoints; use a random 32+ character Production Secret |
| `CRON_SECRET` | Server only | Authenticates Vercel Cron; use a different random 32+ character Production Secret |
| `PAYMENT_ALERT_WEBHOOK_URL` | Server only | Optional HTTPS destination for sanitized payment failure alerts |
| `AI_GATEWAY_API_KEY` | Server only | Local Vercel AI Gateway access |
| `NEXT_PUBLIC_AI_ASSISTANT_ENABLED` | Public | Feature switch; keep `false` until Gateway credits/model access are ready |

Use matching Paystack test keys for local/test transactions and live keys only
in the Vercel Production environment. Test and live Paystack webhook settings
are independent.

## Development commands

```bash
pnpm dev        # start the development server
pnpm typecheck  # run TypeScript without emitting files
pnpm lint       # run ESLint
pnpm build      # create the verified Webpack production build
pnpm start      # serve a completed production build
pnpm typegen    # regenerate Sanity schema/query types
pnpm payments:readiness                 # check deployed payment dependencies
pnpm payments:reconcile -- order-...    # safely recover one paid reference
```

Run `pnpm typegen` whenever a Sanity schema or typed GROQ query changes. Before
pushing payment-related changes, run typecheck, lint, and a production build,
then exercise the complete payment flow described below.

## Sanity content and migrations

Sanity owns products, category trees, brands, promotions, customers, carts,
wishlists, restock subscriptions, shipping settings, orders, tracking events,
and return requests.

The catalog seed is idempotent: it looks up categories and brands by slug and
allows Sanity to assign document IDs.

```bash
pnpm seed:catalog
```

Available migrations are stored in `migrations/`:

- `normalize-product-title`
- `normalize-order-fields`
- `add-order-tracking`

Review a migration as a dry run before applying it:

```bash
pnpm exec sanity migration run normalize-product-title
pnpm exec sanity migration run normalize-product-title --no-dry-run --no-confirm
```

Use the dataset configured in `.env.local`, and back up or export important
production data before a material migration.

## Paystack payment flow

1. A signed-in customer submits their cart and shipping address to
   `POST /api/checkout`.
2. The server re-fetches product prices and stock from Sanity, calculates the
   configured county shipping fee, validates the browser's expected shipping
   fee, and initializes Paystack in KES.
3. Paystack redirects the customer to `/checkout/success` with the transaction
   reference after payment.
4. The signature-verified `charge.success` webhook normally invokes the shared
   fulfillment routine in
   `lib/checkout/fulfill-paystack-transaction.ts`.
5. If the webhook has not created the order, the signed-in success page calls
   `POST /api/checkout/status`. The server verifies the transaction directly
   with Paystack, confirms the Clerk user, amount, currency, items, shipping,
   and metadata, and invokes the same fulfillment routine.
6. Fulfillment uses a deterministic order ID based on the Paystack reference.
   Webhook retries, page refreshes, and concurrent delivery therefore create
   one order and adjust inventory at most once.
7. The customer cart is cleared only after the order is confirmed in Sanity.

Before initializing Paystack, checkout performs a Sanity dry-run mutation.
This proves that the deployed write token can create an order without changing
content. If the token is missing, revoked, stale, or lacks permission,
checkout returns `503` and confirms that the customer has not been charged.

### Payment operations

Two server-only endpoints provide operational safeguards:

- `GET /api/internal/payments/readiness` checks required variables, the
  production callback URL, Paystack authentication, Sanity reads, and a
  non-mutating Sanity write dry run.
- `POST /api/internal/payments/reconcile` verifies one `order-...` reference
  directly with Paystack and runs the shared idempotent fulfillment routine.

Both require `Authorization: Bearer $PAYMENT_OPERATIONS_SECRET`. The supplied
commands read the secret and base URL from `.env.local`; they never print the
secret:

```bash
pnpm payments:readiness
pnpm payments:reconcile -- order-your-paystack-reference
```

Vercel Cron calls `/api/cron/reconcile-payments` every day at 01:15 UTC
(04:15 East Africa Time). It scans the last seven days of successful KES
transactions created by this application, compares them with Sanity orders,
and idempotently recovers missing ones. Vercel supplies
`Authorization: Bearer $CRON_SECRET` automatically.

Payment routes emit structured JSON events such as
`payment.webhook_fulfillment.failed`, `payment.checkout_preflight.failed`, and
`payment.cron_reconciliation.failed`. Configure a Vercel log alert for payment
events at error level. If `PAYMENT_ALERT_WEBHOOK_URL` is present, the same
failures are also sent as sanitized JSON without customer details or secrets.

### Production webhook

The live Paystack webhook must be exactly:

```text
https://shop-tka.vercel.app/api/webhooks/paystack
```

Do not leave a temporary ngrok URL configured in Paystack after local testing.
On 9 October 2026, a live payment was left on “Confirming Payment” because the
live webhook still targeted an offline ngrok tunnel and received HTTP 404. The
authenticated verification fallback now protects customers from that single
failure path, but the Vercel webhook must still remain correctly configured.

On 13 October 2026, another successful live payment reached Paystack with
valid amount, customer, item, shipping, and address metadata, but neither the
webhook nor the authenticated fallback created its Sanity order. The payment
was recovered with the shared idempotent fulfillment routine: one order was
created and inventory was decremented once. The same routine and configured
write token worked locally, so verify the Vercel **Production** value of
`SANITY_API_WRITE_TOKEN` (present, current, Editor-capable, and for the same
Sanity project/dataset), then redeploy. A configured variable name alone is
not sufficient—each release must prove a production function can create the
order. Do not ask a customer to pay again while reconciling an already
successful Paystack transaction.

### Payment release checklist

Any change involving the cart, authentication, products, prices, stock,
shipping, checkout routes, Paystack metadata, Sanity order fields, or route
protection must be treated as payment-affecting.

- Test checkout with the correct Paystack environment and keys.
- Confirm the initialized amount includes the current shipping fee.
- Confirm Paystack returns to the expected success URL.
- Confirm the webhook receives `200 OK` and the order appears in Sanity.
- Confirm both the webhook and callback recovery functions can write with the
  deployed Production `SANITY_API_WRITE_TOKEN`; after changing a Vercel
  variable, redeploy before testing.
- Confirm the customer sees the order under `/orders` and the cart clears.
- Deliver the same event twice and confirm no duplicate order or stock change.
- Test with webhook delivery unavailable and confirm server-side verification
  safely creates the order.
- Preserve compatibility with transactions initialized by the currently
  deployed version; never require a customer to pay again to repair an order.

The more detailed permanent payment rules and implementation roadmap live in
[the implementation plan](.claude/plan/ecommerce-implementation-plan.md).

## Production deployment

Vercel deploys the connected Git branch. Configure all environment variables
for the intended Vercel environment, especially the server-only Clerk, Sanity,
and Paystack secrets. `NEXT_PUBLIC_BASE_URL` must be
`https://shop-tka.vercel.app` in production.

Before promoting a production change:

1. Run `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
2. Confirm Vercel Production contains the required environment variables.
3. Confirm Paystack's live webhook uses the Vercel URL above.
4. Test a payment end to end before considering payment work complete.
5. Inspect Vercel function logs and Paystack webhook delivery details for any
   non-2xx response.
6. Run `pnpm payments:readiness` against the deployed Production URL and require
   an `ok: true` response before accepting live payments.
7. Confirm the Vercel Cron job is enabled and its most recent run returned
   `200`.

Pushing a reviewed commit to the connected production branch triggers the
normal Vercel redeployment. Environment-variable changes require a new
deployment before functions can use them.

## Project guidance

- Keep the existing storefront UI unless a UI change has been explicitly
  agreed.
- Prefer direct imports; do not introduce barrel exports.
- Keep secrets server-only and out of source control.
- Update both this README and the implementation plan whenever architecture,
  setup, deployment, or a production-critical workflow materially changes.
- The AI assistant remains disabled until Vercel AI Gateway credits and an
  available Anthropic model are configured.
