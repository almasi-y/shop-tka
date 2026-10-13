# E-Commerce AI App Implementation Plan — Code Innovators Shop (v2)

**Last materially updated:** 13 October 2026

**Overview:** Build a complete AI-powered e-commerce platform using Next.js 16,
Clerk authentication, Sanity for products/categories/brands/orders, Paystack
for payments, and Vercel AI SDK for intelligent product search.

**This is an alternative architecture to `build-prompts.md`** — different
stack (Clerk instead of Supabase Auth, Sanity-for-orders instead of
Supabase/Postgres, Paystack instead of Stripe), same underlying business
(robotics components & kits).

**Core requirement driving this version:** categories, subcategories, brands,
products, images, and descriptions are all Sanity content — never hardcoded
in application code. The category tree in particular must support nesting
(main category → subcategory) generically, not as a fixed list in the
codebase.

## Living Plan and Regression-Critical Rules

This file is the project's living source of truth. Update it regularly—not
only at the end of the project—whenever any of the following happens:

- a feature, phase, or migration is completed;
- an architectural or product decision changes;
- a production incident reveals a new invariant or operational requirement;
- an external integration, environment variable, route, schema, or deployment
  procedure changes; or
- a known limitation, deferred task, or required follow-up is discovered.

Record the current state and the reason for a material decision. Never place
API keys, tokens, customer details, or other secrets in this file.

### Payment safety is a permanent release gate

Payments, paid-order creation, inventory adjustment, shipping totals, and
customer order visibility are regression-critical. A change that touches or
can indirectly affect checkout, cart data, authentication, shipping rates,
Paystack metadata/callbacks/webhooks, Sanity clients/order schemas/order
queries, route protection, environment variables, or deployment routing must
not be treated as complete until the payment flow has been reverified.

Every payment-affecting change must preserve or explicitly migrate in-flight
transactions created by the currently deployed version. The correction must
also recover already-successful payments that are missing an order; customers
must never be asked to pay twice because application code changed.

Minimum payment regression checks:

1. The server recalculates product prices, stock, shipping, and the final
   Paystack amount; it never trusts a browser-supplied total.
2. The Paystack reference, status, currency, amount, Clerk user, item arrays,
   shipping fee, and shipping address are validated before an order is made.
3. Both the signed webhook and the authenticated callback verification path
   use the same order-fulfillment routine.
4. Fulfillment is idempotent by Paystack reference: retries, duplicate
   webhooks, callback refreshes, and concurrent requests create one order and
   decrement inventory at most once.
5. A user can reconcile only a transaction whose Paystack metadata contains
   that same Clerk user ID.
6. The cart clears only after the application has confirmed that the order
   exists; a pending or failed confirmation retains it.
7. Run focused lint and TypeScript checks, then a production build and an
   end-to-end test covering browser → checkout API → Paystack → webhook or
   verification fallback → Sanity order → customer Orders page.
8. In both Paystack test and live modes, confirm the configured webhook URL,
   inspect the delivery response, and verify that Vercel has the matching
   Paystack secret plus Sanity read/write tokens for the target environment.
9. Test one duplicate delivery and one webhook-unavailable scenario. Both
   must finish safely without duplicate orders, duplicate stock deductions,
   or an endless confirmation screen.

---

## Phase 1: Foundation Setup

### 1.1 Install Core Dependencies

```bash
# Authentication (customer-facing)
pnpm add @clerk/nextjs

# Sanity App SDK (admin dashboard)
pnpm add @sanity/sdk-react

# State Management
pnpm add zustand

# UI Components
pnpm dlx shadcn@latest init

# Payments (Paystack) — no heavyweight server SDK needed, Paystack's
# REST API is called directly via fetch from API routes. This package
# is just for a nicer client-side inline popup, if wanted.
pnpm add react-paystack

# AI
pnpm add ai @ai-sdk/openai
```

### 1.2 Configure Clerk Authentication (for `/(app)` routes only)

- Create Clerk project and obtain API keys
- Add `ClerkProvider` to `app/(app)/layout.tsx` (NOT root layout)
- Create `proxy.ts` for protected routes (Next.js 16 replaces middleware.ts with proxy.ts)
- Protect: `/(app)/checkout`, `/(app)/orders`

### 1.3 Environment Variables

```env
# Sanity (already configured)
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
NEXT_PUBLIC_SANITY_API_VERSION=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
# Note: Paystack webhook verification uses HMAC SHA512 signed with
# PAYSTACK_SECRET_KEY itself — there's no separate webhook secret like Stripe.

# AI
OPENAI_API_KEY=
```

### 1.4 Sanity Setup (Already Configured)

The project already has:
- `sanity.config.ts` - Studio configuration at `/studio`
- `sanity/env.ts` - Environment variable handling
- `sanity/lib/client.ts` - Sanity client
- `sanity/lib/image.ts` - Image URL builder
- `sanity/lib/live.ts` - Live preview support
- `sanity/schemaTypes/index.ts` - Schema registry (currently empty)

### 1.5 Sanity App SDK Setup (for `/(admin)` routes)

- Install `@sanity/sdk-react` for admin dashboard
- Add `SanityApp` provider to `app/(admin)/layout.tsx`
- Sanity handles authentication for admin users
- Use `useDocuments`, `useDocument`, `useEditDocument` hooks for real-time content management

---

## Phase 2: Sanity Schema Design

> Sanity Studio is already configured at `/studio`. This phase adds the
> content schemas — including the nested category structure.

### 2.1 Category Schema (`sanity/schemaTypes/categoryType.ts`)

Fields: `title`, `slug`, `description`, `icon`, **`parentCategory`** (reference
to `categoryType`, optional — self-referencing).

- A category with no `parentCategory` is a top-level category (e.g.
  "Sensors").
- A category *with* a `parentCategory` is a subcategory (e.g. "Temperature
  Sensors & Probes" → parent "Sensors").
- **Confirmed: real data goes three levels deep** — e.g. Sensors →
  Temperature Sensors & Probes → Thermostats. Self-referencing means this
  is handled automatically at any depth, no schema change needed regardless
  of how deep a given branch goes.

### 2.2 Brand Schema (`sanity/schemaTypes/brandType.ts`) — NEW

Fields: `title`, `slug`, `logo` (image). Powers the "Popular Brands" sidebar
and brand filtering, same principle as categories — brands are Sanity
documents, not a hardcoded list.

### 2.3 Product Schema (`sanity/schemaTypes/productType.ts`)

Fields: `title`, `slug`, `description`, `price`, `images[]`, `category`
(reference to `categoryType` — can point to a top-level category OR a
subcategory, whichever is most specific for that product), `brand`
(reference to `brandType`), `color`, `size`, `stock`, `aiKeywords[]`,
`aiTags[]` (kept for AI search, Phase 7).

### 2.4 Order Schema (`sanity/schemaTypes/orderType.ts`)

Fields: `orderNumber`, `clerkUserId`, `customerEmail`, `products[]` (refs),
`quantities`, `totalPrice`, `shippingAddress`, `paystackReference`, `status`,
`createdAt`.

### 2.5 Register Schemas

Update `sanity/schemaTypes/index.ts` with all schema types: `productType`,
`categoryType`, `brandType`, `orderType`.

### 2.6 Seed Initial Category/Brand Data

This is a one-time content-entry step (via a seed script or manually in
Sanity Studio) — it puts your actual category list into Sanity as documents,
which the app then queries dynamically. This is *not* the same as hardcoding
into components — the components never reference category names directly,
only query whatever exists in Sanity.

**Known category data to seed (from your reference screenshots):**

Top-level categories (no `parentCategory`):
- Development Boards
- DIY & Maker Kits
- 3D Printers and Parts
- Drone Parts
- Sensors
- Mechanical Parts & Measurement Tools
- Electronic Modules and Displays
- IoT and Wireless Modules
- Electronic Components
- Batteries, Power Supply & Accessories
- Motors | Drivers | Pumps | Actuators
- Educational Trainer Kits

Subcategories under **Sensors** (`parentCategory` → Sensors):
Temperature Sensors & Probes, Environment Sensors, Sensor Modules,
Electrical Sensors, Distance Sensors, RFID Card/Tags & Reader, Ultrasonic
Sensors & Modules, Barcode Scanners, Biometric/Fingerprint Sensor,
Vibration/Tilt Sensor, Flow Sensors, Level Sensors, Smart IoT Sensors,
Humidity Sensors, Pressure Transducers & Transmitters, Pressure Sensor,
Force and Flex Film Sensors, PIR/IR and Optical Sensor, Photoelectric
Sensor, Color Sensors, Proximity Sensor, Line Sensor, Gas Sensor, Rotary
Encoder, IMU/Accelerometer/Magnetometer & Gyroscope, Flame Sensors, ECG/EMG
& Heart Rate Sensors, Load Sensor, Hall Sensor, **Thermoelectric Peltier
Elements** *(confirmed full name)*.

Third-level categories confirmed so far (`parentCategory` → the Sensors
subcategory named):
- **Temperature Sensors & Probes** → Thermostats, Temperature Sensor Probes, Temperature Sensor Modules, Temperature & Humidity ICs, Thermistors, Thermocouples
- **Environment Sensors** → Rain Sensors, Air Quality Sensor, Soil Moisture Sensors, Water Quality Sensors, Wind Speed & Direction Sensors
- **Sensor Modules** → ACEBOTT Modules, Light Sensor Module, Sound Sensor Modules
- **Electrical Sensors** → Voltage Sensor, Current Sensor, Power Sensor
- **Distance Sensors** → Laser Distance Sensors, IR & ToF Distance Sensors
- **RFID Card/Tags & Reader** → RFID Readers and Writers, RFID Tags & Cards
- **Ultrasonic Sensors & Modules** → Multi-Brand Ultrasonic Sensors, Ultrasonic Humidifier Module

**Open item:** the remaining Sensors subcategories (Barcode Scanners,
Biometric/Fingerprint Sensor, Vibration/Tilt Sensor, Flow Sensors, and the
rest down the list) haven't had their third-level breakdown shown yet, and
none of the other 10 top-level categories (Development Boards, DIY & Maker
Kits, etc.) have any subcategory data yet either. All of this is just
content to add in Sanity whenever you have it — no code changes needed
either way, since the tree renders whatever exists.

Popular brand example seen: **TESCA** (add more as you have them).

---

## Phase 3: Product Browsing UI

### 3.1 Category Sidebar Component (`components/app/CategorySidebar.tsx`)

- Queries Sanity for all categories where `parentCategory` is null (top
  level), each with their children resolved via GROQ (`*[_type ==
  "category" && !defined(parentCategory)]{..., "children":
  *[_type=="category" && parentCategory._ref==^._id]}`)
- Renders recursively — works for however many levels of nesting actually
  exist in the data, no hardcoded depth
- Matches the two views from your reference screenshots: a flat
  browsing list (no arrows) when already inside a category, and an
  expandable list (with arrows) at the top level

### 3.2 Brand Filter Component (`components/app/BrandFilter.tsx`)

- Queries Sanity for all brand documents, renders as a filter list
  ("Popular Brands" sidebar section)

### 3.3 Price Range Filter Component (`components/app/PriceRangeFilter.tsx`) — NEW

- Your reference screenshots show a "SHOP BY PRICE" sidebar block with
  bucketed ranges in KES (e.g. "KES0.00 - KES1,124.00"), and **the actual
  bucket boundaries differ per category** — Temperature Sensors & Probes
  tops out around KES1,124, Distance Sensors around KES17,750+. This means
  the ranges must be **computed dynamically** from the real min/max price
  of products within whatever category is currently being viewed, not a
  fixed set of ranges in code — e.g. query the category's products, take
  min/max price, and divide into a fixed number of even buckets (3–5,
  matching what's shown).

### 3.4 Combined Filtering & Search Logic (`lib/sanity/queries.ts`) — NEW

This was missing — the components above described the filter *widgets*,
not how the filters actually combine into a query. Logic:

- **Filter dimensions:** category (incl. subcategory/any depth), brand
  (multi-select), price range (min/max), and product name/text search.
- **Combination rule:** all active dimensions are combined with **AND**
  (e.g. category X AND brand Y AND price between A–B AND name matches
  "sensor"). Within a multi-select dimension (e.g. two brands checked),
  those are combined with **OR**, then AND'd with everything else — this
  is standard faceted-filter behavior and matches what the sidebar UI
  implies.
- **Category filtering across depth:** because a top-level category page
  (e.g. "Sensors") must show products from *all* its descendants
  (subcategories and their subcategories), not just products tagged
  directly to "Sensors" itself — resolve descendant category IDs in
  application code first (fetch the category tree, walk it recursively in
  JS to collect every descendant `_id` under the selected category), then
  pass that full ID array into the product query's `category._ref in
  $categoryIds` clause. Don't try to do the recursion inside a single GROQ
  query — walking the already-fetched tree in JS is simpler and more
  reliable than nested GROQ dereferencing.
- **State lives in the URL** (e.g. `?category=temperature-sensors&brand=acebott,tesca&minPrice=100&maxPrice=5000&q=probe`) so filtered views are shareable, bookmarkable, and back-button-friendly — not component-local state.
- **Text search** matches on product `title` (and optionally `description`) using GROQ's `match` operator with a wildcard.

Example query shape:
```groq
*[
  _type == "product"
  && (!defined($categoryIds) || category._ref in $categoryIds)
  && (!defined($brandIds) || brand._ref in $brandIds)
  && (!defined($minPrice) || price >= $minPrice)
  && (!defined($maxPrice) || price <= $maxPrice)
  && (!defined($searchTerm) || title match $searchTerm + "*")
] | order(price asc) {
  _id, title, slug, price, images, brand->{title,slug}, category->{title,slug}
}
```
All five `$` params are optional/undefined when that filter isn't active, so this one query serves the landing page, category pages, and a dedicated search results page alike.

### 3.5 Shared Product Card Component

Create `components/ProductCard.tsx` - reusable across landing, search, AI results

- Product image, title, price, brand, Add to Basket button
- Uses Shadcn Card component

### 3.6 Landing Page (`app/page.tsx`)

- Fetch products from Sanity using `SanityLive`
- Search bar with query filtering
- Filter sidebar: `CategorySidebar` + `BrandFilter` + `PriceRangeFilter`, all feeding the combined query from 3.4
- Sort dropdown: relevance, price asc/desc
- Grid of ProductCard components

### 3.7 Category/Subcategory Page (`app/category/[slug]/page.tsx`)

- Dynamic route resolving any category document by slug, regardless of
  whether it's top-level, a subcategory, or a third-level category
- If the category has children, show them as a sub-navigation list; if not
  (a leaf category), show the product grid filtered to that category (and
  its descendants, per 3.4), with `PriceRangeFilter` recomputed for that
  specific set of products

### 3.8 Product Detail Page (`app/products/[slug]/page.tsx`)

- Dynamic route fetching single product
- Image gallery with multiple images
- Full description, price, brand, category breadcrumb, metadata
- Add to Basket button with quantity selector

---

## Phase 4: Shopping Cart System

### 4.1 Cart Store (Context Provider Pattern)

Using Zustand with Context for Next.js SSR safety:
- `lib/store/cart-store.ts` - Store factory using `createStore` from `zustand/vanilla`
- `lib/store/cart-store-provider.tsx` - Context provider + convenience hooks
- Wrap `app/(app)/layout.tsx` with `<CartStoreProvider>`
- Persist to localStorage via `persist` middleware

@see https://zustand.docs.pmnd.rs/guides/nextjs

### 4.2 Cart UI Components

- `components/CartSheet.tsx` - slide-out cart panel
- `components/CartItem.tsx` - individual cart item row
- `components/CartSummary.tsx` - subtotal and checkout button

### 4.3 Cart Provider Integration

Add cart provider to layout, cart icon in header with item count

---

## Phase 5: Paystack Checkout Integration

### 5.1 Transaction Initialize API (`app/api/checkout/route.ts`)

- Call Paystack's `POST /transaction/initialize` REST endpoint (plain
  `fetch`, using `PAYSTACK_SECRET_KEY`) with the server-calculated cart total,
  shipping fee, customer email, and metadata (`clerkUserId`, `productIds`,
  `quantities`, price snapshots, and the validated shipping address)
- Re-fetch products and shipping settings on the server; validate stock and
  reject stale prices or shipping fees before initializing Paystack
- Return the `authorization_url` Paystack gives back

### 5.2 Checkout Page (`app/checkout/page.tsx`)

- Protected route (requires Clerk auth)
- Display cart summary
- "Proceed to Checkout" button
- Redirect to the `authorization_url` (Paystack's hosted payment page) —
  or use `react-paystack`'s inline popup as an alternative to a full
  redirect, your call once you see both in practice

### 5.3 Success Page (`app/checkout/success/page.tsx`)

- Verify the returned reference through the authenticated server endpoint
- Display order confirmation only after the Sanity order exists
- Clear the cart only after confirmed order creation
- Link to orders page

---

## Phase 6: Paystack Webhooks and Orders

### 6.1 Webhook Handler (`app/api/webhooks/paystack/route.ts`)

Handle the `charge.success` event:

- Verify the `x-paystack-signature` header (HMAC SHA512 of the raw request
  body, signed with `PAYSTACK_SECRET_KEY`) — reject anything that doesn't
  match
- Extract payment details
- Validate successful status, KES currency, paid amount, ownership, items,
  price snapshots, shipping fee, and shipping address
- Create the Sanity order and adjust inventory atomically where possible
- Use a deterministic order ID/reference check so duplicate webhook delivery
  cannot create a duplicate order or deduct inventory twice
- Include: user ID, products, quantities, price snapshots, address, shipping,
  `paystackReference`, payment/fulfillment status, and tracking information

### 6.2 Payment Reconciliation Fallback

- `lib/checkout/fulfill-paystack-transaction.ts` is the single shared,
  idempotent fulfillment routine used by both payment confirmation paths.
- The webhook remains the primary path.
- `POST /api/checkout/status?reference=...` is the authenticated recovery
  path. If Sanity has no order, it verifies the transaction directly with
  Paystack, confirms that its metadata belongs to the signed-in Clerk user,
  and invokes the same fulfillment routine.
- `GET /api/checkout/status` remains a read-only order-status check.
- This fallback is required protection against webhook configuration errors,
  temporary delivery outages, and callback/webhook timing races.

### 6.3 Orders List Page (`app/orders/page.tsx`)

- Protected route
- Fetch orders from Sanity filtered by `clerkUserId`
- Display order cards: date, total, status

### 6.4 Order Detail Page (`app/orders/[id]/page.tsx`)

- Fetch single order by ID
- Verify ownership (clerkUserId match)
- Show purchased items, address, payment status, timestamps

---

## Phase 7: AI Search Assistant

### 7.1 AI Search API (`app/api/ai/search/route.ts`)

Using Vercel AI SDK:

- Parse natural language query
- Extract filters: category/subcategory (any depth), brand, price range, keywords
- Resolve extracted category/brand names to their Sanity document IDs, then
  reuse the exact same query shape from Section 3.4 (`categoryIds`,
  `brandIds`, `minPrice`, `maxPrice`, `searchTerm`) — the AI layer's job is
  turning natural language into those same params, not a second filtering
  system
- Return matching products with AI explanation

### 7.2 AI Chat UI (`components/AISearchAssistant.tsx`)

- Floating chat button or sidebar panel
- Chat message interface
- Product cards embedded in AI responses
- Uses `useChat` hook from Vercel AI SDK

### 7.3 AI Tools Definition

Define tools for:

- `searchProducts` - query Sanity using the shared filter query from Section 3.4 (category incl. descendants, brand, price, keywords)
- `getProductDetails` - fetch single product
- `addToCart` - add product to cart from chat

---

## Phase 8: Admin Dashboard (Sanity App SDK)

> The admin dashboard at `/(admin)` uses Sanity App SDK with Sanity authentication.

### 8.1 Admin Layout (`app/(admin)/layout.tsx`)

- Wrap with `SanityApp` provider
- Sanity handles authentication automatically
- Real-time updates via App SDK hooks

### 8.2 Product Management (`app/(admin)/products/page.tsx`)

- List all products using `useDocuments`
- Create/edit products using `useEditDocument`, including assigning
  category and brand references
- Real-time sync with Content Lake
- Each product in its own Suspense boundary

### 8.3 Category & Brand Management (`app/(admin)/categories/page.tsx`) — NEW

- List all categories using `useDocuments`, shown as a tree (parents with
  their children nested)
- Create/edit categories, including setting `parentCategory` to build out
  subcategories for the other 11 top-level categories over time
- Manage brands the same way

### 8.4 Order Management (`app/(admin)/orders/page.tsx`)

- View all orders using `useDocuments`
- Update order status using `useEditDocument`
- Filter by status, date, customer

### 8.5 Dashboard Home (`app/(admin)/page.tsx`)

- Overview stats (total orders, revenue, products)
- Recent orders list
- Quick actions

---

## Phase 9: Polish and Deployment

### 9.1 Loading States

- Skeleton components for product grid and category sidebar
- Loading states for checkout
- Optimistic UI for cart updates

### 9.2 Error Handling

- Error boundaries for critical sections
- Toast notifications for cart actions
- Graceful fallbacks for failed fetches

### 9.3 Deployment

- Configure Vercel environment variables
- Set the **live** Paystack webhook URL to
  `https://shop-tka.vercel.app/api/webhooks/paystack`; do not leave a temporary
  ngrok URL configured after local testing. Test and live webhook settings
  must each point to the intended environment.
- Test full flow in production mode (Paystack test mode first)

### 9.4 Production Payment Incident — 9 October 2026

- **Symptom:** a successful live payment remained on “Confirming Payment,”
  and no matching Sanity order existed.
- **Verified cause:** Paystack's live `charge.success` event was still being
  delivered to the former ngrok URL. That tunnel was offline and returned
  HTTP 404; Paystack showed the event as pending/retrying after six attempts.
- **Correction in this codebase:** fulfillment was extracted into the shared
  idempotent routine described in Section 6.2, and the success flow now uses
  server-side Paystack verification as a recovery path when the webhook has
  not created the order.
- **Required operational correction:** update the live Paystack webhook URL
  to the Vercel endpoint above, deploy the recovery code, and retry the failed
  event or revisit the signed-in success URL so the paid order is reconciled.
- **Release lesson:** every move between localhost/ngrok/preview/production
  must include a Paystack webhook-target check and a real delivery-response
  check; a working callback URL does not prove the webhook is configured.

---

## Application Architecture

The app has three distinct sections with separate auth:

| Route Group | Purpose | Auth |
|-------------|---------|------|
| `/(app)/...` | Customer-facing e-commerce | Clerk |
| `/(admin)/...` | Custom admin dashboard (Sanity App SDK) | Sanity |
| `/studio/...` | Sanity Studio | Sanity |

## Key Files Structure

```
app/
  layout.tsx              # Root layout (minimal, no auth providers)

  (app)/                  # Customer-facing routes (Clerk auth)
    layout.tsx            # ClerkProvider, CartProvider
    page.tsx              # Landing page with products
    category/[slug]/page.tsx   # Category or subcategory page
    products/[slug]/page.tsx
    checkout/page.tsx
    checkout/success/page.tsx
    orders/page.tsx
    orders/[id]/page.tsx
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx

  (admin)/                # Admin dashboard (Sanity App SDK + Sanity auth)
    layout.tsx            # SanityApp provider
    page.tsx              # Admin dashboard home
    products/page.tsx     # Product management
    categories/page.tsx   # Category & brand management
    orders/page.tsx       # Order management

  api/
    checkout/route.ts
    webhooks/paystack/route.ts
    ai/search/route.ts

  studio/[[...tool]]/page.tsx  # Sanity Studio (Sanity auth)

components/
  app/                    # Customer-facing components
    ProductCard.tsx
    ProductGrid.tsx
    CategorySidebar.tsx
    BrandFilter.tsx
    PriceRangeFilter.tsx
    CartSheet.tsx
    CartItem.tsx
    AISearchAssistant.tsx
    Header.tsx
  admin/                  # Admin components (Sanity App SDK)
    ProductList.tsx
    CategoryTree.tsx
    OrderList.tsx
    Dashboard.tsx

lib/
  store/
    cart-store.ts            # Zustand store factory (vanilla)
    cart-store-provider.tsx  # Context provider + hooks
  sanity/
    queries.ts               # GROQ queries — category tree, and the shared getFilteredProducts() query (Section 3.4) used by the landing page, category pages, and AI search alike

sanity/
  schemaTypes/
    productType.ts
    categoryType.ts           # self-referencing parentCategory
    brandType.ts
    orderType.ts
    index.ts
```

---

## Recommended Build Order

Execute phases sequentially. Each phase is designed to be testable before
moving to the next:

1. **Phase 1** - Verify Clerk login works at `/(app)`
2. **Phase 2** - Add category tree, brands, and sample products in Sanity Studio at `/studio`
3. **Phase 3** - Browse categories/subcategories and view products at `/(app)`
4. **Phase 4** - Add items to cart
5. **Phase 5** - Complete Paystack checkout (test mode)
6. **Phase 6** - Verify orders appear after payment
7. **Phase 7** - Test AI search queries across categories/brands
8. **Phase 8** - Build admin dashboard at `/(admin)` with Sanity auth, including category/brand management
9. **Phase 9** - Deploy and verify webhooks

---

## Key Decisions

| Decision | Choice |
|----------|--------|
| Package Manager | pnpm |
| Runtime | Node.js 24 LTS, pinned by `.nvmrc` and `package.json`; do not use Node.js 25 for this project |
| Build type checker | Next.js TypeScript compiler API (`experimental.useTypeScriptCli: false`) while the project uses TypeScript 5 |
| Production bundler | Webpack via `next build --webpack`; the current Turbopack build did not terminate reliably for the combined storefront and Studio bundle |
| CMS (Products, Categories, Brands, Orders) | Sanity |
| Category structure | Self-referencing `parentCategory` — supports nesting, no hardcoded depth |
| AI Provider | Vercel AI SDK |
| Customer Auth (`/(app)`) | Clerk with proxy.ts |
| Admin Auth (`/(admin)`) | Sanity (via App SDK) |
| Studio Auth (`/studio`) | Sanity |
| Payments | Paystack (Transaction Initialize + redirect, or inline popup via react-paystack) |

---

## Coding Conventions

| Convention | Rule |
|------------|------|
| Barrel Exports | **Do NOT use** `index.ts` barrel exports. Import directly from source files. |
| Imports | Use direct imports: `import { x } from "./store/cart"` not `from "./store"` |
| Quotes | Double quotes for strings |
| Semicolons | Required |
