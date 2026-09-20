# Robotics Store

AI-assisted robotics e-commerce application built with Next.js 16, Clerk,
Sanity, Paystack, Zustand, and the Vercel AI SDK.

## Local setup

Copy `.env.example` to `.env.local`, fill in the credentials, then run:

```bash
pnpm install
pnpm dev
```

The customer store is available at `http://localhost:3000`, the custom Sanity
admin at `/admin`, and Sanity Studio at `/studio`.

## Validation

```bash
pnpm typegen
pnpm typecheck
pnpm lint
pnpm build
```

Run `pnpm typegen` whenever a Sanity schema or GROQ query changes.

## Sanity content

The catalog seed is idempotent: it looks up categories and brands by slug and
lets Sanity assign document IDs.

```bash
pnpm seed:catalog
```

Schema normalization migrations are dry-run by default:

```bash
pnpm sanity migrations run normalize-product-title
pnpm sanity migrations run normalize-order-fields
```

After reviewing the dry-run output, append `--no-dry-run` to apply a migration
to the configured dataset.

## Paystack

Checkout uses Paystack's hosted payment page. Configure the production webhook
URL as:

```text
https://YOUR_DOMAIN/api/webhooks/paystack
```

Orders are created only from a signature-verified `charge.success` webhook.
The checkout callback polls for that order before clearing the customer's cart.
