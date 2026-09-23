# 🎂 CakeCart - Production-Ready Artisanal Home-Bakery Platform

CakeCart is a small-batch home-bakery ordering web application engineered with strict daily oven capacity limits, pickup slot scheduling, custom piped inscriptions (40-char limit), and seamless deployment on Vercel with Neon Serverless PostgreSQL and Drizzle ORM.

---

## 👥 Three Autonomous Agents Architecture

- **Agent 1 (App Agent)**: Designed a responsive bakery interface using Next.js App Router, Tailwind CSS, Lucide icons, and artisanal styling (warm cream, terracotta, espresso). Features home hero, live 7-day capacity counters, menu with multi-filtering, custom cake configurator, pickup date/slot selector with 48h lead time enforcement, cart & hold checkout, digital QR collection passes, customer self-service order cancellation (24h cut-off), and baker studio management.
- **Agent 2 (Database Engine Agent)**: Modeled and implemented Neon PostgreSQL tables via Drizzle ORM with integer minor units for currency, UTC timestamps, UUID primary keys, and strict SQL check constraints (`reserved_cakes <= max_cakes`, custom message length <= 40 chars). Implemented atomic database transactions with row-level locks, 10-minute capacity reservation holds, idempotent payment webhooks, and automatic hold release.
- **Agent 3 (QA Agent)**: Validated the entire system with comprehensive automated test suites (`scripts/run-qa-tests.ts`), confirming concurrent race condition safety (only 1 buyer wins the last cake), expired hold releases, 48h minimum lead time enforcement, 40-character message limits, payment idempotency, and clean production build compilation.

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **Database**: Neon Serverless PostgreSQL / Embedded PostgreSQL Engine
- **ORM**: Drizzle ORM with SQL migrations
- **Authentication**: Email & Password with `jose` JWT stored in `httpOnly` secure cookies
- **Payments**: Stripe Test Mode & Idempotent Webhook Engine
- **Storage**: Vercel Blob with local base64 fallback
- **Cron Jobs**: Vercel Cron (`vercel.json`) running `/api/cron/release-holds` protected by `CRON_SECRET`

---

## 🚀 Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run Database Migration & Seed Data
```bash
npx tsx src/db/seed.ts
```
*Seeds master baker credentials, test customer, categories, signature cakes with sizes and flavours, dietary tags, and 14 days of daily capacity and 90-minute pickup slots.*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Running the QA Agent Test Suite

Execute the automated test suite simulating race conditions, capacity locks, and business rule enforcement:
```bash
npx tsx scripts/run-qa-tests.ts
```

**Tested Assertions:**
1. Database migration & 14-day schedule seeding.
2. Server-side rejection of orders with < 48 hours lead time.
3. Server-side rejection of custom cake messages > 40 characters.
4. Concurrency race condition: 2 simultaneous buyers for the last cake; confirms only 1 succeeds and capacity never overbooks.
5. Payment idempotency: Duplicate webhook/retry events process safely without double booking.
6. Order cancellation cut-off: Rejection of cancellations within 24 hours of scheduled collection.
7. Expired hold cleanup: Automatic decrement of reserved cakes and slot counters.

---

## 🔐 Demo Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Master Baker** | `baker@cakecart.com` | `baker123` | Baker Command Center (`/baker`) |
| **Test Customer** | `alice@example.com` | `customer123` | Order Menu, Checkout, My Orders |

---

## 🌐 Deploying to Vercel with Neon PostgreSQL

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of CakeCart"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **Add New Project** → Import your repository.
3. **Connect Neon Database via Vercel Marketplace**:
   - Under the **Storage** tab in your Vercel project, select **Neon Postgres** (Serverless).
   - This automatically injects `DATABASE_URL` (pooled connection) into your environment.
4. **Add Environment Variables in Vercel Project Settings**:
   - `JWT_SECRET`: A strong 64-character random string.
   - `CRON_SECRET`: Secret token for `/api/cron/release-holds`.
   - `STRIPE_SECRET_KEY`: `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET`: `whsec_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_test_...`
   - `NEXT_PUBLIC_APP_URL`: Your Vercel production domain (e.g. `https://cakecart.vercel.app`).
5. **Database Migration during Vercel Build**:
   Add this to your Vercel build command if running fresh:
   ```bash
   npx drizzle-kit push && npm run build
   ```
   Or run `npx tsx src/db/seed.ts` via the Vercel CLI or one-off script.
