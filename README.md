# Bladewise

An all-in-one operating system for lawn care & landscaping businesses — a
RealGreen SA5–style platform. **This build covers the three core modules —
CRM, scheduling & routing, and estimates & invoicing — plus an owner dashboard
and an activity/notifications center.** It's the full sign → schedule → service →
bill → collect loop, with a cockpit on top.

It is built on the **Node.js standard library only** — the built-in SQLite
database (`node:sqlite`) and HTTP server. There are **no npm dependencies**, so
there is nothing to install. You only need Node.js 22.5 or newer.

## Run it

```bash
node server.mjs
```

Then open <http://localhost:3000>. On first launch it creates the database and
seeds a realistic demo company (Evergreen Lawn & Landscape) with nine customers.

Optional:

```bash
node src/seed.mjs          # seed demo data (no-op if data already exists)
node src/seed.mjs --reset  # wipe and re-seed clean demo data
PORT=8080 node server.mjs  # run on a different port
```

## What's included

Phase 1 — CRM:

- **Dashboard** — active customers, properties, receivables, follow-ups.
- **Customers (CRM)** — account list with status filters and search; account
  detail with contacts, properties, call log, and billing snapshot; create/edit.
- **Properties** — address & access info, turf/bed/lot measurement (with an
  update form), service history, program subscriptions, and a live price
  preview computed from the property's turf square footage.
- **Price book** — area-tiered / per-unit / flat pricing rules and the 7-round
  season program.
- **Unified search** — customers, addresses, phones, emails.

Phase 2 — Scheduling & routing:

- **Schedule board** — a weekly calendar of visits grouped by crew and colored
  by crew, week navigation, and a "needs scheduling" panel that assigns a date
  and crew to visits materialized from each customer's program.
- **Routes** — per crew-day route optimization (nearest-neighbour + 2-opt from
  the depot), distance/drive-time/total-day estimates, manual re-ordering, and a
  self-contained SVG route map (no external tiles).
- **Field app** — a mobile-friendly, sequenced stop list per crew/day with
  access notes, gate codes, pet flags, navigation hand-off, and mark-complete
  (which writes to the property's service history).

The season schedule (visits) is generated from program subscriptions: past
rounds show as completed history, the current round is placed on a route day,
and upcoming rounds wait in the needs-scheduling panel.

Phase 3 — Estimates & invoicing:

- **Estimates** — build an estimate for a property (the program and add-on
  services are auto-priced from the stored turf measurement), send it as a
  hosted link, and let the customer **approve or decline without logging in**.
  Approval converts the estimate into an active subscription and materializes the
  season's visits onto the schedule.
- **Invoicing** — generate invoices from completed visits, view them by status,
  and record payments. Balances and an **accounts-receivable aging** view update
  automatically.
- **Payments** — a hosted, tokenized customer pay page (demo checkout), plus a
  one-click **Run autopay** that charges saved methods for accounts on
  auto-pay/installment terms.

Customer-facing pages live at `/e/<token>` (approve an estimate) and
`/i/<token>` (pay an invoice) — no login, exactly how a homeowner would see them.

Phase 4 — Owner dashboard & activity:

- **Dashboard** — an owner cockpit pulling from every module: collected vs.
  billed with a monthly revenue chart, accounts receivable, active customers and
  prospects, visits completed/upcoming, a receivables list, and a pipeline panel
  (estimates outstanding, active programs, renewals, needs-scheduling).
- **Activity center** — every transactional moment (estimate sent, service
  completed, invoice sent, payment received) is logged to an activity feed with
  an email/SMS channel. In production each event fires a real email or SMS; here
  it's recorded to the feed so you can see the flow.

## How it's organized

```
server.mjs        HTTP server + router (Node std lib)
src/db.mjs        Full database schema (all modules — the spec's data model)
src/models.mjs    Data-access functions + the pricing engine
src/pages.mjs     Server-rendered page views (CRM)
src/render.mjs    HTML layout & formatting helpers
src/seed.mjs      Realistic demo data
public/           Stylesheet + a little vanilla JS
data/             SQLite database file (created on first run)
```

The **full data model from the product spec is already created** in `db.mjs`
(estimates, invoices, payments, leads…), even though the UI so far covers CRM and
scheduling. That is deliberate: the remaining phase (estimates & invoicing)
attaches to this same schema without restructuring.

## Production note

For a real deployment this ports to the stack described in the product spec —
Next.js/React on the front end, the same relational schema on PostgreSQL, Stripe
for payments, and a maps provider for measurement and route optimization. The
zero-dependency build here keeps the running prototype trivial to launch.
```
