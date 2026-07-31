// Bladewise — database layer
// Uses Node's built-in SQLite (node:sqlite). No external dependencies.
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.BLADEWISE_DB || join(dataDir, 'bladewise.db');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// ---------------------------------------------------------------------------
// Schema — implements the data model from the product spec (Section 9).
// The full model is created so the foundation is real; Phase 1 (CRM) drives
// the UI, later phases (scheduling, invoicing) attach without restructuring.
// ---------------------------------------------------------------------------
export function initSchema() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    phone         TEXT,
    email         TEXT,
    address       TEXT,
    depot_lat     REAL,
    depot_lng     REAL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    org_id        INTEGER NOT NULL REFERENCES organizations(id),
    name          TEXT NOT NULL,
    email         TEXT,
    role          TEXT NOT NULL DEFAULT 'csr', -- owner | csr | dispatcher | technician
    crew_id       INTEGER,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS crews (
    id            INTEGER PRIMARY KEY,
    org_id        INTEGER NOT NULL REFERENCES organizations(id),
    name          TEXT NOT NULL,
    color         TEXT DEFAULT '#2f855a'
  );

  -- Account: the billing / customer relationship
  CREATE TABLE IF NOT EXISTS accounts (
    id            INTEGER PRIMARY KEY,
    org_id        INTEGER NOT NULL REFERENCES organizations(id),
    name          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'active', -- prospect | active | hold | cancelled
    billing_address TEXT,
    terms         TEXT DEFAULT 'per_service', -- per_service | prepay | installment
    balance       REAL NOT NULL DEFAULT 0,
    source        TEXT,           -- how they came in (web, phone, referral...)
    notes         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Contact: a person attached to an account (optionally a property)
  CREATE TABLE IF NOT EXISTS contacts (
    id            INTEGER PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    property_id   INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    phone         TEXT,
    email         TEXT,
    is_primary    INTEGER NOT NULL DEFAULT 0,
    contact_pref  TEXT DEFAULT 'phone', -- phone | email | sms
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Property: a physical service location (where the operational data lives)
  CREATE TABLE IF NOT EXISTS properties (
    id            INTEGER PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    address       TEXT NOT NULL,
    city          TEXT,
    state         TEXT,
    zip           TEXT,
    lat           REAL,
    lng           REAL,
    turf_sqft     INTEGER,         -- treatable turf area — drives pricing
    bed_sqft      INTEGER,
    lot_sqft      INTEGER,
    measure_method TEXT,           -- manual | map_draw | aerial
    measured_at   TEXT,
    gate_code     TEXT,
    has_pets      INTEGER NOT NULL DEFAULT 0,
    access_notes  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Measurement history (current values denormalized onto properties)
  CREATE TABLE IF NOT EXISTS measurements (
    id            INTEGER PRIMARY KEY,
    property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    turf_sqft     INTEGER,
    bed_sqft      INTEGER,
    lot_sqft      INTEGER,
    method        TEXT,
    captured_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Service catalog & pricing
  CREATE TABLE IF NOT EXISTS service_types (
    id            INTEGER PRIMARY KEY,
    org_id        INTEGER NOT NULL REFERENCES organizations(id),
    name          TEXT NOT NULL,
    kind          TEXT NOT NULL DEFAULT 'program', -- program | onetime
    rule_type     TEXT NOT NULL DEFAULT 'area_tier', -- area_tier | per_unit | flat
    base_price    REAL DEFAULT 0,   -- area_tier: price up to base_up_to_sqft
    base_up_to_sqft INTEGER DEFAULT 5000,
    per_unit_price REAL DEFAULT 0,  -- price per unit_sqft beyond base / per_unit
    unit_sqft     INTEGER DEFAULT 1000,
    min_price     REAL DEFAULT 0,
    flat_price    REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS service_programs (
    id            INTEGER PRIMARY KEY,
    org_id        INTEGER NOT NULL REFERENCES organizations(id),
    name          TEXT NOT NULL,
    description   TEXT
  );

  CREATE TABLE IF NOT EXISTS program_rounds (
    id            INTEGER PRIMARY KEY,
    program_id    INTEGER NOT NULL REFERENCES service_programs(id) ON DELETE CASCADE,
    seq           INTEGER NOT NULL,
    name          TEXT NOT NULL,
    service_type_id INTEGER REFERENCES service_types(id),
    window_start  TEXT,   -- e.g. '03-15'
    window_end    TEXT,   -- e.g. '04-30'
    products      TEXT
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id            INTEGER PRIMARY KEY,
    property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    program_id    INTEGER NOT NULL REFERENCES service_programs(id),
    status        TEXT NOT NULL DEFAULT 'active',
    auto_renew    INTEGER NOT NULL DEFAULT 1,
    season_year   INTEGER,
    price         REAL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS estimates (
    id            INTEGER PRIMARY KEY,
    property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'draft', -- draft | sent | approved | declined
    subtotal      REAL NOT NULL DEFAULT 0,
    token         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS estimate_lines (
    id            INTEGER PRIMARY KEY,
    estimate_id   INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    service_type_id INTEGER REFERENCES service_types(id),
    program_id    INTEGER REFERENCES service_programs(id),
    description   TEXT,
    sqft          INTEGER,
    price         REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS visits (
    id            INTEGER PRIMARY KEY,
    property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
    service_type_id INTEGER REFERENCES service_types(id),
    name          TEXT,
    status        TEXT NOT NULL DEFAULT 'scheduled', -- scheduled|assigned|in_progress|completed|invoiced
    scheduled_date TEXT,
    window_start  TEXT,
    window_end    TEXT,
    crew_id       INTEGER REFERENCES crews(id),
    seq           INTEGER,
    completed_at  TEXT,
    invoice_id    INTEGER,
    price         REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS service_history (
    id            INTEGER PRIMARY KEY,
    property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    visit_id      INTEGER REFERENCES visits(id) ON DELETE SET NULL,
    service_date  TEXT NOT NULL,
    service_name  TEXT NOT NULL,
    technician    TEXT,
    products      TEXT,
    notes         TEXT
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id            INTEGER PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'open', -- open | paid | overdue | void
    subtotal      REAL NOT NULL DEFAULT 0,
    amount_paid   REAL NOT NULL DEFAULT 0,
    terms         TEXT,
    token         TEXT,
    issued_date   TEXT,
    due_date      TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoice_lines (
    id            INTEGER PRIMARY KEY,
    invoice_id    INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    visit_id      INTEGER REFERENCES visits(id),
    description   TEXT,
    amount        REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS payments (
    id            INTEGER PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount        REAL NOT NULL,
    method        TEXT DEFAULT 'card', -- card | ach | check | cash
    reference     TEXT,
    applied_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id            INTEGER PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    brand         TEXT,
    last4         TEXT,
    token         TEXT,
    autopay       INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS leads (
    id            INTEGER PRIMARY KEY,
    org_id        INTEGER NOT NULL REFERENCES organizations(id),
    account_id    INTEGER REFERENCES accounts(id),
    name          TEXT NOT NULL,
    phone         TEXT,
    email         TEXT,
    address       TEXT,
    source        TEXT,
    status        TEXT NOT NULL DEFAULT 'new', -- new | estimating | won | lost
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS call_logs (
    id            INTEGER PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id       INTEGER REFERENCES users(id),
    note          TEXT NOT NULL,
    follow_up_at  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id            INTEGER PRIMARY KEY,
    org_id        INTEGER NOT NULL REFERENCES organizations(id),
    account_id    INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,        -- estimate_sent | service_complete | invoice_sent | payment_received | appointment | estimate_approved
    channel       TEXT NOT NULL DEFAULT 'email', -- email | sms | internal
    title         TEXT NOT NULL,
    body          TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(org_id);
  CREATE INDEX IF NOT EXISTS idx_properties_account ON properties(account_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);
  CREATE INDEX IF NOT EXISTS idx_history_property ON service_history(property_id);
  CREATE INDEX IF NOT EXISTS idx_calls_account ON call_logs(account_id);
  `);
}

export function tableCount(name) {
  try {
    return db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get().n;
  } catch {
    return 0;
  }
}
