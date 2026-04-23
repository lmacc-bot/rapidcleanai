# RapidCleanAI

Production-ready Phase 1 MVP SaaS built with Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, Supabase auth, and hosted Stripe checkout.

## What is included

- Strong conversion-focused landing page
- Public pages: `/`, `/pricing`, `/features`, `/faq`, `/contact`
- Legal pages: `/privacy`, `/terms`
- Auth pages: `/login`, `/signup`
- Protected dashboard: `/dashboard`
- Supabase email/password auth
- Basic `profiles` table support with SQL schema
- Hosted Stripe checkout via one Pro Plan link
- Stripe webhook route for automatic billing access activation
- Stubbed `/api/chat` route that returns structured mock JSON
- Vercel-ready app structure

## Project structure

```text
app/
  (public)/
    access-pending/page.tsx
    checkout/
      cancel/page.tsx
      success/page.tsx
    contact/page.tsx
    faq/page.tsx
    features/page.tsx
    login/page.tsx
    pricing/page.tsx
    privacy/page.tsx
    signup/page.tsx
    terms/page.tsx
    layout.tsx
    page.tsx
  (dashboard)/
    dashboard/
      layout.tsx
      page.tsx
  api/
    chat/route.ts
    stripe/
      webhook/route.ts
  globals.css
  layout.tsx
  robots.ts
  sitemap.ts
components/
  ui/
  chat-panel.tsx
  contact-form.tsx
  dashboard-shell.tsx
  feature-card.tsx
  footer.tsx
  glow-button.tsx
  logo.tsx
  navbar.tsx
  pricing-card.tsx
  results-panel.tsx
  section-heading.tsx
lib/
  supabase/
    admin.ts
    access.ts
    actions.ts
    client.ts
    config.ts
    middleware.ts
    server.ts
  stripe-billing.ts
  stripe-server.ts
  mock-quote.ts
  site.ts
  stripe.ts
  utils.ts
styles/
  theme.css
supabase/
  schema.sql
```

## Environment variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET
```

Use the publishable key when available. The app also supports the legacy anon key for compatibility. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` are server-only. Never expose them in the browser.

## Supabase setup

1. Create a Supabase project.
2. In Supabase Auth, enable Email auth.
3. For instant redirect to `/dashboard` after signup in this MVP, disable email confirmation in Auth settings.
4. Run the SQL in [supabase/schema.sql](./supabase/schema.sql) inside the Supabase SQL editor.
5. Create the `public.billing_access` table in Supabase with `user_id`, `email`, `has_access`, `plan`, and `payment_status` columns before testing paid access gating.
6. Copy the project URL, your publishable or anon key, and your service role key into `.env.local`.
7. Keep Row Level Security enabled on user-owned tables. Browser access uses only the public publishable/anon key, so RLS is what protects private data.

## Run locally

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push the project to GitHub.
2. Import the repo into Vercel.
3. Add the same environment variables from `.env.local` in the Vercel project settings.
4. Deploy.
5. In Vercel, set `NEXT_PUBLIC_SITE_URL` to your production domain.

## Stripe link wiring

The app uses one Stripe payment link only:

```ts
// lib/stripe.ts
export const STRIPE_LINK = "https://buy.stripe.com/cNi6oA3nH6Ot7vdc9K00000";
```

It is used in:

- Public navbar `Start Now`
- Homepage hero `Start Now`
- Homepage pricing preview `Start Now`
- Homepage final CTA `Start Now`
- Pricing page `Start Now`
- Features page `Start Now`
- FAQ page `Start Now`
- Contact page `Start Now`
- Login page sidebar `Start Now`
- Signup page sidebar `Start Now`
- Dashboard navbar `Billing`

## Auth flow

- `/login` signs users in with Supabase email/password auth
- `/signup` creates a user, stores `full_name` in user metadata, and creates a `billing_access` row with `has_access = false`, `plan = "pro"`, and `payment_status = "pending"`
- `supabase/schema.sql` creates a `profiles` table and auto-inserts the basic profile from `auth.users`
- `/dashboard` is protected by middleware plus server-side auth and billing access checks
- Authenticated users without `billing_access.has_access = true` are redirected to `/access-pending`
- Stripe webhooks can activate `billing_access` automatically after payment confirmation
- Server code relies on Supabase SSR cookie auth and `auth.getUser()` revalidation rather than trusting client session state

## Security notes

- Public pages remain public, while `/dashboard` is protected in middleware and rechecked server-side in the dashboard layout/page.
- Auth forms and the contact form use lightweight input validation with user-safe error messages.
- `/api/chat` requires an authenticated session, validates JSON payloads, limits request size, and returns safe errors only.
- The chat route includes an MVP in-memory rate limiter. Replace it with a shared backing store before relying on it across multiple server instances.
- The mock AI layer strips prompt-injection-style lines, keeps output constrained to structured JSON, and validates the JSON shape before rendering.
- The UI does not render raw HTML, and the app adds baseline security headers including a CSP, `nosniff`, frame protection, referrer policy, and permissions policy.
- Stripe hosted checkout is the only billing action on the client. Client-side subscription state is not trusted.
- Billing access is enforced server-side through `public.billing_access`. The Stripe webhook now promotes matching rows to active access automatically after payment confirmation.

## Stripe webhook setup

1. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `.env.local` and your Vercel project.
2. In Stripe, create a webhook endpoint that points to:

```text
https://YOUR_DOMAIN/api/stripe/webhook
```

3. Subscribe that webhook to at least:
   - `checkout.session.completed`
   - `invoice.paid`
4. In your Stripe Payment Link settings, set the post-purchase redirect to:

```text
https://YOUR_DOMAIN/checkout/success
```

5. The webhook uses the customer email from Stripe to find the matching `public.billing_access` row and updates it to:
   - `has_access = true`
   - `payment_status = "active"`
   - `plan = "pro"`
6. For this MVP email-based matching to work reliably, customers should complete checkout with the same email address they used at signup.

If a payment arrives before a matching `billing_access` row exists, the webhook logs a safe warning and returns success so Stripe does not keep retrying a non-actionable event.

### Local webhook testing

If you use Stripe CLI locally, forward the relevant events to your local app:

```bash
stripe listen --events checkout.session.completed,invoice.paid --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET` while testing locally.

## AI stub

`POST /api/chat` returns mock structured JSON from `lib/mock-quote.ts`.

This keeps the MVP launchable now while leaving a clean path for a real AI integration later.

## Launch note

The brief provided two support emails:

- Contact page: `support@rapidclean.ai`
- Footer: `support@rapidcleanai.com`

The app currently preserves that brief exactly. Standardize to one email before launch if needed.
