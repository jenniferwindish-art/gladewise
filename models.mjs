// Bladewise — data access functions
import { db } from './db.mjs';
import { randomUUID } from 'node:crypto';

const mkToken = () => randomUUID().replace(/-/g, '').slice(0, 20);

// Single-org demo: everything is scoped to org #1. Multi-tenant scoping is in
// the schema (org_id on every root table) and becomes real when auth lands.
export const ORG_ID = 1;

export function getOrg() {
  return db.prepare('SELECT * FROM organizations WHERE id = ?').get(ORG_ID);
}

// ---- Dashboard metrics -----------------------------------------------------
export function dashboardStats() {
  const q = (sql, ...p) => db.prepare(sql).get(...p);
  return {
    activeAccounts: q("SELECT COUNT(*) n FROM accounts WHERE org_id=? AND status='active'", ORG_ID).n,
    prospects: q("SELECT COUNT(*) n FROM accounts WHERE org_id=? AND status='prospect'", ORG_ID).n,
    properties: q("SELECT COUNT(*) n FROM properties p JOIN accounts a ON a.id=p.account_id WHERE a.org_id=?", ORG_ID).n,
    receivable: q("SELECT COALESCE(SUM(balance),0) s FROM accounts WHERE org_id=?", ORG_ID).s,
    openInvoices: q("SELECT COUNT(*) n FROM invoices i JOIN accounts a ON a.id=i.account_id WHERE a.org_id=? AND i.status IN ('open','overdue')", ORG_ID).n,
    subscriptions: q("SELECT COUNT(*) n FROM subscriptions s JOIN properties p ON p.id=s.property_id JOIN accounts a ON a.id=p.account_id WHERE a.org_id=? AND s.status='active'", ORG_ID).n,
    followUps: q("SELECT COUNT(*) n FROM call_logs c JOIN accounts a ON a.id=c.account_id WHERE a.org_id=? AND c.follow_up_at IS NOT NULL AND date(c.follow_up_at) >= date('now')", ORG_ID).n,
  };
}

// ---- Accounts --------------------------------------------------------------
export function listAccounts({ status = null, q = null } = {}) {
  let sql = `
    SELECT a.*,
      (SELECT COUNT(*) FROM properties p WHERE p.account_id=a.id) AS property_count,
      (SELECT phone FROM contacts c WHERE c.account_id=a.id ORDER BY is_primary DESC LIMIT 1) AS phone
    FROM accounts a WHERE a.org_id=@org`;
  const params = { org: ORG_ID };
  if (status) { sql += ' AND a.status=@status'; params.status = status; }
  if (q) {
    sql += ` AND (a.name LIKE @q OR EXISTS(
      SELECT 1 FROM properties p WHERE p.account_id=a.id AND p.address LIKE @q) OR EXISTS(
      SELECT 1 FROM contacts c WHERE c.account_id=a.id AND (c.phone LIKE @q OR c.email LIKE @q OR c.name LIKE @q)))`;
    params.q = `%${q}%`;
  }
  sql += ' ORDER BY a.name COLLATE NOCASE';
  return db.prepare(sql).all(params);
}

export function getAccount(id) {
  return db.prepare('SELECT * FROM accounts WHERE id=? AND org_id=?').get(id, ORG_ID);
}

export function createAccount(data) {
  const info = db.prepare(`INSERT INTO accounts (org_id,name,status,billing_address,terms,source,notes)
    VALUES (@org,@name,@status,@billing_address,@terms,@source,@notes)`).run({
      org: ORG_ID,
      name: data.name,
      status: data.status || 'prospect',
      billing_address: data.billing_address || null,
      terms: data.terms || 'per_service',
      source: data.source || null,
      notes: data.notes || null,
    });
  return Number(info.lastInsertRowid);
}

export function updateAccount(id, data) {
  db.prepare(`UPDATE accounts SET name=@name, status=@status, billing_address=@billing_address,
    terms=@terms, source=@source, notes=@notes WHERE id=@id AND org_id=@org`).run({
      id, org: ORG_ID,
      name: data.name, status: data.status,
      billing_address: data.billing_address || null, terms: data.terms || 'per_service',
      source: data.source || null, notes: data.notes || null,
    });
}

// ---- Contacts --------------------------------------------------------------
export function listContacts(accountId) {
  return db.prepare('SELECT * FROM contacts WHERE account_id=? ORDER BY is_primary DESC, name').all(accountId);
}

export function createContact(accountId, data) {
  const info = db.prepare(`INSERT INTO contacts (account_id,property_id,name,phone,email,is_primary,contact_pref)
    VALUES (@account_id,@property_id,@name,@phone,@email,@is_primary,@contact_pref)`).run({
      account_id: accountId,
      property_id: data.property_id || null,
      name: data.name, phone: data.phone || null, email: data.email || null,
      is_primary: data.is_primary ? 1 : 0, contact_pref: data.contact_pref || 'phone',
    });
  return Number(info.lastInsertRowid);
}

// ---- Properties ------------------------------------------------------------
export function listProperties(accountId) {
  return db.prepare(`SELECT p.*,
    (SELECT COUNT(*) FROM subscriptions s WHERE s.property_id=p.id AND s.status='active') AS active_subs
    FROM properties p WHERE p.account_id=? ORDER BY p.address`).all(accountId);
}

export function getProperty(id) {
  return db.prepare(`SELECT p.*, a.name AS account_name, a.org_id
    FROM properties p JOIN accounts a ON a.id=p.account_id WHERE p.id=?`).get(id);
}

export function createProperty(accountId, data) {
  const info = db.prepare(`INSERT INTO properties
    (account_id,address,city,state,zip,turf_sqft,bed_sqft,lot_sqft,measure_method,measured_at,gate_code,has_pets,access_notes)
    VALUES (@account_id,@address,@city,@state,@zip,@turf,@bed,@lot,@method,@measured,@gate,@pets,@access)`).run({
      account_id: accountId,
      address: data.address, city: data.city || null, state: data.state || null, zip: data.zip || null,
      turf: intOrNull(data.turf_sqft), bed: intOrNull(data.bed_sqft), lot: intOrNull(data.lot_sqft),
      method: data.turf_sqft ? (data.measure_method || 'manual') : null,
      measured: data.turf_sqft ? new Date().toISOString().slice(0, 10) : null,
      gate: data.gate_code || null, pets: data.has_pets ? 1 : 0, access: data.access_notes || null,
    });
  const pid = Number(info.lastInsertRowid);
  if (data.turf_sqft) recordMeasurement(pid, data);
  return pid;
}

export function updateMeasurement(propertyId, data) {
  db.prepare(`UPDATE properties SET turf_sqft=@turf, bed_sqft=@bed, lot_sqft=@lot,
    measure_method=@method, measured_at=@measured WHERE id=@id`).run({
      id: propertyId,
      turf: intOrNull(data.turf_sqft), bed: intOrNull(data.bed_sqft), lot: intOrNull(data.lot_sqft),
      method: data.measure_method || 'manual', measured: new Date().toISOString().slice(0, 10),
    });
  recordMeasurement(propertyId, data);
}

function recordMeasurement(propertyId, data) {
  db.prepare(`INSERT INTO measurements (property_id,turf_sqft,bed_sqft,lot_sqft,method)
    VALUES (?,?,?,?,?)`).run(propertyId, intOrNull(data.turf_sqft), intOrNull(data.bed_sqft),
      intOrNull(data.lot_sqft), data.measure_method || 'manual');
}

export function propertyHistory(propertyId) {
  return db.prepare('SELECT * FROM service_history WHERE property_id=? ORDER BY service_date DESC').all(propertyId);
}

export function propertySubscriptions(propertyId) {
  return db.prepare(`SELECT s.*, sp.name AS program_name
    FROM subscriptions s JOIN service_programs sp ON sp.id=s.program_id
    WHERE s.property_id=? ORDER BY s.season_year DESC`).all(propertyId);
}

// ---- Call log --------------------------------------------------------------
export function listCalls(accountId) {
  return db.prepare(`SELECT c.*, u.name AS user_name FROM call_logs c
    LEFT JOIN users u ON u.id=c.user_id WHERE c.account_id=? ORDER BY c.created_at DESC`).all(accountId);
}

export function createCall(accountId, data) {
  db.prepare('INSERT INTO call_logs (account_id,user_id,note,follow_up_at) VALUES (?,?,?,?)')
    .run(accountId, data.user_id || null, data.note, data.follow_up_at || null);
}

// ---- Account financials snapshot ------------------------------------------
export function accountInvoices(accountId) {
  return db.prepare('SELECT * FROM invoices WHERE account_id=? ORDER BY created_at DESC').all(accountId);
}

// ---- Unified search --------------------------------------------------------
export function search(term) {
  const like = `%${term}%`;
  const accounts = db.prepare(`SELECT id,name,status FROM accounts
    WHERE org_id=@org AND name LIKE @q ORDER BY name LIMIT 8`).all({ org: ORG_ID, q: like });
  const properties = db.prepare(`SELECT p.id,p.address,p.city,p.account_id,a.name AS account_name
    FROM properties p JOIN accounts a ON a.id=p.account_id
    WHERE a.org_id=@org AND (p.address LIKE @q OR p.zip LIKE @q) ORDER BY p.address LIMIT 8`)
    .all({ org: ORG_ID, q: like });
  const contacts = db.prepare(`SELECT c.id,c.name,c.phone,c.email,c.account_id,a.name AS account_name
    FROM contacts c JOIN accounts a ON a.id=c.account_id
    WHERE a.org_id=@org AND (c.name LIKE @q OR c.phone LIKE @q OR c.email LIKE @q) ORDER BY c.name LIMIT 8`)
    .all({ org: ORG_ID, q: like });
  return { accounts, properties, contacts };
}

// ---- Pricing engine (used by estimates; available now for property pages) --
export function priceService(serviceType, turfSqft) {
  const sqft = turfSqft || 0;
  let price = 0;
  if (serviceType.rule_type === 'flat') {
    price = serviceType.flat_price;
  } else if (serviceType.rule_type === 'per_unit') {
    price = (sqft / (serviceType.unit_sqft || 1000)) * serviceType.per_unit_price;
  } else { // area_tier
    price = serviceType.base_price;
    const extra = Math.max(0, sqft - (serviceType.base_up_to_sqft || 0));
    if (extra > 0) price += Math.ceil(extra / (serviceType.unit_sqft || 1000)) * serviceType.per_unit_price;
  }
  return Math.max(price, serviceType.min_price || 0);
}

export function listServiceTypes() {
  return db.prepare('SELECT * FROM service_types WHERE org_id=? ORDER BY kind DESC, name').all(ORG_ID);
}

export function listPrograms() {
  return db.prepare('SELECT * FROM service_programs WHERE org_id=? ORDER BY name').all(ORG_ID);
}

function intOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

// ===========================================================================
// PHASE 2 — Scheduling & routing
// ===========================================================================

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
// Monday of the week containing `iso`
export function weekStart(iso) {
  const d = new Date((iso || todayISO()) + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function listCrews() {
  return db.prepare('SELECT * FROM crews WHERE org_id=? ORDER BY name').all(ORG_ID);
}
export function getCrew(id) {
  return db.prepare('SELECT * FROM crews WHERE id=?').get(id);
}
export function getDepot() {
  const o = getOrg();
  return { lat: o.depot_lat, lng: o.depot_lng, name: o.name, address: o.address };
}

// Rich visit row with property + account + crew
function visitSelect(where) {
  return `SELECT v.*, p.address, p.city, p.state, p.zip, p.lat, p.lng, p.turf_sqft,
      p.access_notes, p.gate_code, p.has_pets,
      a.id AS account_id, a.name AS account_name,
      cr.name AS crew_name, cr.color AS crew_color
    FROM visits v
    JOIN properties p ON p.id=v.property_id
    JOIN accounts a ON a.id=p.account_id
    LEFT JOIN crews cr ON cr.id=v.crew_id
    WHERE a.org_id=@org ${where}`;
}

export function getVisit(id) {
  return db.prepare(visitSelect('AND v.id=@id')).get({ org: ORG_ID, id });
}

export function visitsBetween(start, end) {
  return db.prepare(visitSelect('AND v.scheduled_date >= @start AND v.scheduled_date <= @end')
    + ' ORDER BY v.scheduled_date, v.crew_id, COALESCE(v.seq, 999), a.name')
    .all({ org: ORG_ID, start, end });
}

// The scheduling board: 7 days from weekStart, each with its visits
export function scheduleWeek(anchorISO) {
  const start = weekStart(anchorISO);
  const end = addDays(start, 6);
  const visits = visitsBetween(start, end);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    days.push({ date, visits: visits.filter(v => v.scheduled_date === date) });
  }
  return { start, end, prev: addDays(start, -7), next: addDays(start, 7), days };
}

// Visits that still need a date (scheduled, no scheduled_date), coming due
export function needsScheduling(withinDays = 60) {
  const horizon = addDays(todayISO(), withinDays);
  return db.prepare(visitSelect(
    "AND v.status='scheduled' AND v.scheduled_date IS NULL AND v.window_start <= @horizon")
    + ' ORDER BY v.window_start, a.name')
    .all({ org: ORG_ID, horizon });
}

export function assignVisit(id, { scheduled_date, crew_id }) {
  db.prepare('UPDATE visits SET scheduled_date=?, crew_id=?, status=?, seq=NULL WHERE id=?')
    .run(scheduled_date || null, crew_id ? Number(crew_id) : null,
      scheduled_date ? 'scheduled' : 'scheduled', id);
}

// ---- Routing ---------------------------------------------------------------
export function haversineMiles(aLat, aLng, bLat, bLng) {
  const R = 3958.8, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Stops assigned to a crew on a date (in stored seq order)
export function routeStops(crewId, date) {
  return db.prepare(visitSelect('AND v.crew_id=@crew AND v.scheduled_date=@date')
    + ' ORDER BY COALESCE(v.seq, 999), a.name')
    .all({ org: ORG_ID, crew: Number(crewId), date });
}

function routeDistance(order, depot) {
  if (!order.length) return 0;
  let d = dist(depot, order[0]);
  for (let i = 0; i < order.length - 1; i++) d += dist(order[i], order[i + 1]);
  d += dist(order[order.length - 1], depot); // return to depot
  return d;
}
function dist(a, b) { return haversineMiles(a.lat, a.lng, b.lat, b.lng); }

// Nearest-neighbour construction + 2-opt improvement, starting/ending at depot
export function optimizeOrder(stops, depot) {
  const withGeo = stops.filter(s => s.lat != null && s.lng != null);
  const noGeo = stops.filter(s => s.lat == null || s.lng == null);
  if (withGeo.length <= 1) return [...withGeo, ...noGeo];

  // Nearest neighbour
  const remaining = [...withGeo];
  const order = [];
  let cur = depot;
  while (remaining.length) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = dist(cur, remaining[i]);
      if (d < bd) { bd = d; bi = i; }
    }
    cur = remaining[bi];
    order.push(cur);
    remaining.splice(bi, 1);
  }
  // 2-opt
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const cand = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1));
        if (routeDistance(cand, depot) + 1e-9 < routeDistance(order, depot)) {
          order.splice(0, order.length, ...cand);
          improved = true;
        }
      }
    }
  }
  return [...order, ...noGeo];
}

export function optimizeRoute(crewId, date) {
  const stops = routeStops(crewId, date);
  const ordered = optimizeOrder(stops, getDepot());
  const tx = db.prepare('UPDATE visits SET seq=? WHERE id=?');
  ordered.forEach((s, i) => tx.run(i + 1, s.id));
  return ordered.length;
}

export function moveStop(id, dir) {
  const v = getVisit(id);
  if (!v || !v.scheduled_date || !v.crew_id) return;
  const stops = routeStops(v.crew_id, v.scheduled_date);
  const idx = stops.findIndex(s => s.id === id);
  const swap = dir === 'up' ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= stops.length) return;
  const a = stops[idx], b = stops[swap];
  const tx = db.prepare('UPDATE visits SET seq=? WHERE id=?');
  // ensure both have seq values
  const aSeq = a.seq || idx + 1, bSeq = b.seq || swap + 1;
  tx.run(bSeq, a.id);
  tx.run(aSeq, b.id);
}

// Distance / time estimate for an ordered stop list
export function routeStats(stops, depot, { mph = 28, serviceMin = 25 } = {}) {
  const geo = stops.filter(s => s.lat != null && s.lng != null);
  const miles = routeDistance(geo, depot);
  const driveMin = (miles / mph) * 60;
  const serviceTotal = stops.length * serviceMin;
  return {
    stops: stops.length,
    miles: Math.round(miles * 10) / 10,
    driveMin: Math.round(driveMin),
    serviceMin: serviceTotal,
    totalMin: Math.round(driveMin + serviceTotal),
  };
}

// Distinct upcoming crew-days that have stops (for the routes index)
export function routeDays() {
  return db.prepare(`SELECT v.scheduled_date AS date, v.crew_id, cr.name AS crew_name, cr.color AS crew_color,
      COUNT(*) AS stops
    FROM visits v JOIN properties p ON p.id=v.property_id JOIN accounts a ON a.id=p.account_id
    JOIN crews cr ON cr.id=v.crew_id
    WHERE a.org_id=@org AND v.scheduled_date IS NOT NULL AND v.status IN ('scheduled','assigned','in_progress')
    GROUP BY v.scheduled_date, v.crew_id
    ORDER BY v.scheduled_date, cr.name`).all({ org: ORG_ID });
}

export function completeVisit(id, data = {}) {
  const v = getVisit(id);
  if (!v) return;
  const now = todayISO();
  db.prepare("UPDATE visits SET status='completed', completed_at=? WHERE id=?").run(now, id);
  db.prepare(`INSERT INTO service_history (property_id,visit_id,service_date,service_name,technician,products,notes)
    VALUES (?,?,?,?,?,?,?)`).run(v.property_id, id, now, v.name || 'Service',
      data.technician || v.crew_name || null, data.products || null, data.notes || null);
  notify('service_complete', { accountId: v.account_id, channel: 'sms',
    title: `Service completed — ${v.account_name}`, body: `${v.name || 'Service'} at ${v.address}. Customer notified by text.` });
}

export function scheduleStats() {
  const q = (sql, ...p) => db.prepare(sql).get(...p);
  return {
    needs: q(`SELECT COUNT(*) n FROM visits v JOIN properties p ON p.id=v.property_id JOIN accounts a ON a.id=p.account_id
      WHERE a.org_id=? AND v.status='scheduled' AND v.scheduled_date IS NULL`, ORG_ID).n,
    scheduled: q(`SELECT COUNT(*) n FROM visits v JOIN properties p ON p.id=v.property_id JOIN accounts a ON a.id=p.account_id
      WHERE a.org_id=? AND v.scheduled_date IS NOT NULL AND v.status!='completed'`, ORG_ID).n,
    completed: q(`SELECT COUNT(*) n FROM visits v JOIN properties p ON p.id=v.property_id JOIN accounts a ON a.id=p.account_id
      WHERE a.org_id=? AND v.status='completed'`, ORG_ID).n,
  };
}

// ===========================================================================
// PHASE 3 — Estimates, invoicing & payments
// ===========================================================================
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const currentYear = () => new Date().getFullYear();

export function getServiceType(id) {
  return db.prepare('SELECT * FROM service_types WHERE id=?').get(id);
}
export function getProgram() {
  return db.prepare('SELECT * FROM service_programs WHERE org_id=? ORDER BY id LIMIT 1').get(ORG_ID);
}
export function programRounds(programId) {
  return db.prepare('SELECT * FROM program_rounds WHERE program_id=? ORDER BY seq').all(programId);
}
// Program price = sum of its rounds priced against the property's turf
export function priceProgram(programId, turf) {
  const rounds = programRounds(programId);
  let total = 0; const lines = [];
  for (const r of rounds) {
    const st = getServiceType(r.service_type_id);
    const p = st ? priceService(st, turf) : 0;
    total += p; lines.push({ name: r.name, price: p });
  }
  return { total: round2(total), lines };
}

// ---- Estimates -------------------------------------------------------------
function estimateSelect(where) {
  return `SELECT e.*, p.address, p.city, p.turf_sqft, p.account_id,
      a.name AS account_name, a.status AS account_status
    FROM estimates e
    JOIN properties p ON p.id=e.property_id
    JOIN accounts a ON a.id=p.account_id
    WHERE a.org_id=@org ${where}`;
}
export function listEstimates(status = null) {
  if (status) return db.prepare(estimateSelect('AND e.status=@status') + ' ORDER BY e.created_at DESC').all({ org: ORG_ID, status });
  return db.prepare(estimateSelect('') + ' ORDER BY e.created_at DESC').all({ org: ORG_ID });
}
export function getEstimate(id) {
  return db.prepare(estimateSelect('AND e.id=@id')).get({ org: ORG_ID, id });
}
export function getEstimateByToken(tok) {
  return db.prepare(estimateSelect('AND e.token=@t')).get({ org: ORG_ID, t: tok });
}
export function estimateLines(id) {
  return db.prepare('SELECT * FROM estimate_lines WHERE estimate_id=? ORDER BY id').all(id);
}
export function openEstimateForProperty(propertyId) {
  return db.prepare("SELECT * FROM estimates WHERE property_id=? AND status IN ('draft','sent') ORDER BY created_at DESC LIMIT 1").get(propertyId);
}
export function estimateStats() {
  const q = (s) => db.prepare(s).get(ORG_ID).n;
  const base = `SELECT COUNT(*) n FROM estimates e JOIN properties p ON p.id=e.property_id JOIN accounts a ON a.id=p.account_id WHERE a.org_id=?`;
  return {
    draft: q(base + " AND e.status='draft'"),
    sent: q(base + " AND e.status='sent'"),
    approved: q(base + " AND e.status='approved'"),
  };
}

export function createEstimate(propertyId, { program = false, serviceTypeIds = [] }) {
  const prop = getProperty(propertyId);
  if (!prop) return null;
  const turf = prop.turf_sqft || 0;
  const estId = Number(db.prepare("INSERT INTO estimates (property_id,status,subtotal,token) VALUES (?,?,?,?)")
    .run(propertyId, 'draft', 0, mkToken()).lastInsertRowid);
  let subtotal = 0;
  if (program) {
    const prog = getProgram();
    const pp = priceProgram(prog.id, turf);
    db.prepare('INSERT INTO estimate_lines (estimate_id,program_id,description,sqft,price) VALUES (?,?,?,?,?)')
      .run(estId, prog.id, prog.name, turf, pp.total);
    subtotal += pp.total;
  }
  for (const stId of serviceTypeIds) {
    const st = getServiceType(Number(stId));
    if (!st) continue;
    const p = priceService(st, turf);
    db.prepare('INSERT INTO estimate_lines (estimate_id,service_type_id,description,sqft,price) VALUES (?,?,?,?,?)')
      .run(estId, st.id, st.name, turf, p);
    subtotal += p;
  }
  db.prepare('UPDATE estimates SET subtotal=? WHERE id=?').run(round2(subtotal), estId);
  return estId;
}

export function sendEstimate(id) {
  const e = getEstimate(id);
  if (!e) return;
  db.prepare("UPDATE estimates SET status='sent', token=COALESCE(token,?) WHERE id=?").run(mkToken(), id);
  notify('estimate_sent', { accountId: e.account_id, channel: 'email',
    title: `Estimate sent to ${e.account_name}`, body: `${usd(e.subtotal)} estimate emailed with an approval link.` });
}
export function declineEstimate(id) {
  db.prepare("UPDATE estimates SET status='declined' WHERE id=?").run(id);
}

// Approve → convert lines into subscriptions (program) and visits (one-time)
export function approveEstimate(id) {
  const e = getEstimate(id);
  if (!e || e.status === 'approved') return;
  db.prepare("UPDATE estimates SET status='approved' WHERE id=?").run(id);
  db.prepare("UPDATE accounts SET status='active' WHERE id=? AND status='prospect'").run(e.account_id);
  notify('estimate_approved', { accountId: e.account_id, channel: 'internal',
    title: `${e.account_name} approved estimate #${id}`, body: `${usd(e.subtotal)} — converted to a subscription and scheduled.` });
  const prop = getProperty(e.property_id);
  for (const l of estimateLines(id)) {
    if (l.program_id) {
      const subId = Number(db.prepare(`INSERT INTO subscriptions (property_id,program_id,status,auto_renew,season_year,price)
        VALUES (?,?,?,?,?,?)`).run(e.property_id, l.program_id, 'active', 1, currentYear(), l.price).lastInsertRowid);
      materializeVisits(subId);
    } else if (l.service_type_id) {
      db.prepare(`INSERT INTO visits (property_id,service_type_id,name,status,price) VALUES (?,?,?,?,?)`)
        .run(e.property_id, l.service_type_id, l.description, 'scheduled', l.price);
    }
  }
}

// Create the season's visits for a subscription (unscheduled → needs scheduling)
export function materializeVisits(subscriptionId) {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id=?').get(subscriptionId);
  if (!sub) return;
  const prop = getProperty(sub.property_id);
  const turf = prop?.turf_sqft || 0;
  const yr = sub.season_year || currentYear();
  for (const r of programRounds(sub.program_id)) {
    const st = getServiceType(r.service_type_id);
    const price = st ? priceService(st, turf) : 0;
    db.prepare(`INSERT INTO visits (property_id,subscription_id,service_type_id,name,status,window_start,window_end,price)
      VALUES (?,?,?,?,?,?,?,?)`).run(sub.property_id, subscriptionId, r.service_type_id, r.name, 'scheduled',
        `${yr}-${r.window_start}`, `${yr}-${r.window_end}`, price);
  }
}

// ---- Invoicing -------------------------------------------------------------
export function refreshOverdue() {
  db.prepare("UPDATE invoices SET status='overdue' WHERE status='open' AND due_date < ?").run(todayISO());
}

function invoiceSelect(where) {
  return `SELECT i.*, a.name AS account_name, a.terms AS account_terms,
      (i.subtotal - i.amount_paid) AS balance
    FROM invoices i JOIN accounts a ON a.id=i.account_id
    WHERE a.org_id=@org ${where}`;
}
export function listInvoices(status = null) {
  refreshOverdue();
  if (status) return db.prepare(invoiceSelect('AND i.status=@status') + ' ORDER BY i.created_at DESC, i.id DESC').all({ org: ORG_ID, status });
  return db.prepare(invoiceSelect('') + ' ORDER BY i.created_at DESC, i.id DESC').all({ org: ORG_ID });
}
export function getInvoice(id) {
  return db.prepare(invoiceSelect('AND i.id=@id')).get({ org: ORG_ID, id });
}
export function getInvoiceByToken(tok) {
  return db.prepare(invoiceSelect('AND i.token=@t')).get({ org: ORG_ID, t: tok });
}
export function invoiceLines(id) {
  return db.prepare('SELECT * FROM invoice_lines WHERE invoice_id=? ORDER BY id').all(id);
}

// Generate invoices from completed, not-yet-billed visits (bundled per account)
export function generateInvoices() {
  const rows = db.prepare(`SELECT v.id, v.name, v.price, v.completed_at, p.account_id, p.address
    FROM visits v JOIN properties p ON p.id=v.property_id JOIN accounts a ON a.id=p.account_id
    WHERE a.org_id=? AND v.status='completed' AND v.invoice_id IS NULL AND v.price > 0`).all(ORG_ID);
  const byAcct = new Map();
  for (const r of rows) { if (!byAcct.has(r.account_id)) byAcct.set(r.account_id, []); byAcct.get(r.account_id).push(r); }
  let created = 0;
  const issued = todayISO(), due = addDays(issued, 15);
  for (const [acctId, visits] of byAcct) {
    const acct = getAccount(acctId);
    const subtotal = round2(visits.reduce((s, v) => s + v.price, 0));
    const invId = Number(db.prepare(`INSERT INTO invoices (account_id,status,subtotal,amount_paid,terms,token,issued_date,due_date)
      VALUES (?,?,?,?,?,?,?,?)`).run(acctId, 'open', subtotal, 0, acct.terms, mkToken(), issued, due).lastInsertRowid);
    for (const v of visits) {
      db.prepare('INSERT INTO invoice_lines (invoice_id,visit_id,description,amount) VALUES (?,?,?,?)')
        .run(invId, v.id, `${v.name} — ${v.address}`, v.price);
      db.prepare("UPDATE visits SET invoice_id=? WHERE id=?").run(invId, v.id);
    }
    updateAccountBalance(acctId);
    notify('invoice_sent', { accountId: acctId, channel: 'email',
      title: `Invoice #${invId} sent to ${acct.name}`, body: `${usd(subtotal)} due ${due}.` });
    created++;
  }
  return created;
}

export function recordPayment(invoiceId, { amount, method = 'card' } = {}) {
  const inv = getInvoice(invoiceId);
  if (!inv) return;
  const bal = inv.subtotal - inv.amount_paid;
  const amt = amount ? Math.min(parseFloat(amount), bal) : bal;
  if (!(amt > 0)) return;
  db.prepare('INSERT INTO payments (account_id,amount,method) VALUES (?,?,?)').run(inv.account_id, amt, method);
  const paid = round2(inv.amount_paid + amt);
  const status = paid + 1e-6 >= inv.subtotal ? 'paid' : 'open';
  db.prepare('UPDATE invoices SET amount_paid=?, status=? WHERE id=?').run(paid, status, invoiceId);
  updateAccountBalance(inv.account_id);
  notify('payment_received', { accountId: inv.account_id, channel: 'email',
    title: `Payment received — ${inv.account_name}`, body: `${usd(amt)} applied to invoice #${invoiceId} (${method}).` });
}

export function updateAccountBalance(accountId) {
  const bal = db.prepare(`SELECT COALESCE(SUM(subtotal-amount_paid),0) b FROM invoices
    WHERE account_id=? AND status IN ('open','overdue')`).get(accountId).b;
  db.prepare('UPDATE accounts SET balance=? WHERE id=?').run(round2(bal), accountId);
}

// Autopay: charge open/overdue invoices for accounts with an autopay method
export function runAutopay() {
  refreshOverdue();
  const rows = db.prepare(`SELECT DISTINCT i.id FROM invoices i
    JOIN accounts a ON a.id=i.account_id
    JOIN payment_methods pm ON pm.account_id=a.id AND pm.autopay=1
    WHERE a.org_id=? AND i.status IN ('open','overdue')`).all(ORG_ID);
  let n = 0, total = 0;
  for (const r of rows) {
    const inv = getInvoice(r.id);
    const bal = inv.subtotal - inv.amount_paid;
    if (bal > 0) { recordPayment(r.id, { amount: bal, method: 'autopay' }); n++; total += bal; }
  }
  return { count: n, total: round2(total) };
}

export function invoiceStats() {
  refreshOverdue();
  const q = (s) => db.prepare(s).get(ORG_ID);
  const b = `FROM invoices i JOIN accounts a ON a.id=i.account_id WHERE a.org_id=?`;
  return {
    ar: round2(q(`SELECT COALESCE(SUM(subtotal-amount_paid),0) v ${b} AND i.status IN ('open','overdue')`).v),
    open: q(`SELECT COUNT(*) n ${b} AND i.status='open'`).n,
    overdue: q(`SELECT COUNT(*) n ${b} AND i.status='overdue'`).n,
    collected: round2(q(`SELECT COALESCE(SUM(amount),0) v FROM payments pay JOIN accounts a ON a.id=pay.account_id WHERE a.org_id=?`).v),
  };
}

// Aging buckets across unpaid invoices
export function receivablesAging() {
  refreshOverdue();
  const rows = db.prepare(`SELECT i.*, (i.subtotal-i.amount_paid) balance, a.name account_name
    FROM invoices i JOIN accounts a ON a.id=i.account_id
    WHERE a.org_id=? AND i.status IN ('open','overdue') ORDER BY i.due_date`).all(ORG_ID);
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
  const today = todayISO();
  for (const r of rows) {
    const daysLate = Math.floor((new Date(today) - new Date(r.due_date)) / 86400000);
    if (daysLate <= 0) buckets.current += r.balance;
    else if (daysLate <= 30) buckets.d30 += r.balance;
    else if (daysLate <= 60) buckets.d60 += r.balance;
    else buckets.d90 += r.balance;
  }
  for (const k in buckets) buckets[k] = round2(buckets[k]);
  return { buckets, invoices: rows };
}

export function listPaymentMethods(accountId) {
  return db.prepare('SELECT * FROM payment_methods WHERE account_id=?').all(accountId);
}

// All properties with their account (for the estimate picker)
export function listAllProperties() {
  return db.prepare(`SELECT p.*, a.name AS account_name FROM properties p
    JOIN accounts a ON a.id=p.account_id WHERE a.org_id=? ORDER BY a.name, p.address`).all(ORG_ID);
}

// ===========================================================================
// PHASE 4 — Owner dashboard & notifications
// ===========================================================================
const usd = (n) => '$' + Number(n || 0).toFixed(2);

// A notification stands in for a real email/SMS send. In production the same
// hook would call an email/SMS provider; here it is logged to the activity feed.
export function notify(type, { accountId = null, channel = 'email', title, body = null } = {}) {
  db.prepare('INSERT INTO notifications (org_id,account_id,type,channel,title,body) VALUES (?,?,?,?,?,?)')
    .run(ORG_ID, accountId, type, channel, title, body);
}
export function listNotifications(limit = 100) {
  return db.prepare(`SELECT n.*, a.name AS account_name FROM notifications n
    LEFT JOIN accounts a ON a.id=n.account_id WHERE n.org_id=?
    ORDER BY n.created_at DESC, n.id DESC LIMIT ?`).all(ORG_ID, limit);
}
export function notificationStats() {
  const q = (s) => db.prepare(s).get(ORG_ID).n;
  const b = 'FROM notifications WHERE org_id=?';
  return {
    total: q(`SELECT COUNT(*) n ${b}`),
    email: q(`SELECT COUNT(*) n ${b} AND channel='email'`),
    sms: q(`SELECT COUNT(*) n ${b} AND channel='sms'`),
    internal: q(`SELECT COUNT(*) n ${b} AND channel='internal'`),
  };
}

export function revenueByMonth(year) {
  const y = String(year);
  const rows = (col, tbl, join) => db.prepare(`SELECT CAST(strftime('%m', ${col}) AS INTEGER) m, COALESCE(SUM(${tbl}),0) v
    ${join} WHERE a.org_id=? AND strftime('%Y', ${col})=? GROUP BY m`).all(ORG_ID, y);
  const paid = rows('applied_at', 'amount', 'FROM payments pay JOIN accounts a ON a.id=pay.account_id');
  const bill = rows('issued_date', 'subtotal', 'FROM invoices i JOIN accounts a ON a.id=i.account_id');
  const pm = new Map(paid.map(r => [r.m, r.v])), bm = new Map(bill.map(r => [r.m, r.v]));
  const out = [];
  for (let m = 1; m <= 12; m++) out.push({ month: m, collected: round2(pm.get(m) || 0), billed: round2(bm.get(m) || 0) });
  return out;
}

export function ownerMetrics() {
  refreshOverdue();
  const yr = String(currentYear());
  const g = (s, ...p) => db.prepare(s).get(...p);
  const acc = 'FROM accounts WHERE org_id=?';
  const inv = invoiceStats(), est = estimateStats(), sched = scheduleStats();
  return {
    collected: round2(g(`SELECT COALESCE(SUM(amount),0) v FROM payments pay JOIN accounts a ON a.id=pay.account_id WHERE a.org_id=? AND strftime('%Y',applied_at)=?`, ORG_ID, yr).v),
    billed: round2(g(`SELECT COALESCE(SUM(subtotal),0) v FROM invoices i JOIN accounts a ON a.id=i.account_id WHERE a.org_id=? AND strftime('%Y',issued_date)=?`, ORG_ID, yr).v),
    ar: inv.ar, overdue: inv.overdue,
    active: g(`SELECT COUNT(*) n ${acc} AND status='active'`, ORG_ID).n,
    prospects: g(`SELECT COUNT(*) n ${acc} AND status='prospect'`, ORG_ID).n,
    cancelled: g(`SELECT COUNT(*) n ${acc} AND status='cancelled'`, ORG_ID).n,
    activeSubs: g(`SELECT COUNT(*) n FROM subscriptions s JOIN properties p ON p.id=s.property_id JOIN accounts a ON a.id=p.account_id WHERE a.org_id=? AND s.status='active'`, ORG_ID).n,
    renewals: g(`SELECT COUNT(*) n FROM subscriptions s JOIN properties p ON p.id=s.property_id JOIN accounts a ON a.id=p.account_id WHERE a.org_id=? AND s.status='active' AND s.auto_renew=1`, ORG_ID).n,
    estSent: est.sent,
    estValue: round2(g(`SELECT COALESCE(SUM(e.subtotal),0) v FROM estimates e JOIN properties p ON p.id=e.property_id JOIN accounts a ON a.id=p.account_id WHERE a.org_id=? AND e.status='sent'`, ORG_ID).v),
    completed: sched.completed,
    upcoming: g(`SELECT COUNT(*) n FROM visits v JOIN properties p ON p.id=v.property_id JOIN accounts a ON a.id=p.account_id WHERE a.org_id=? AND v.scheduled_date >= ? AND v.status!='completed'`, ORG_ID, todayISO()).n,
    needs: sched.needs,
  };
}

export function topReceivables(limit = 5) {
  refreshOverdue();
  return db.prepare(`SELECT id, name, balance FROM accounts WHERE org_id=? AND balance>0 ORDER BY balance DESC LIMIT ?`).all(ORG_ID, limit);
}

// ---- Customer-focused dashboard data --------------------------------------
export function customerStats() {
  const q = (s, ...p) => db.prepare(s).get(...p);
  const acc = 'FROM accounts WHERE org_id=?';
  return {
    active: q(`SELECT COUNT(*) n ${acc} AND status='active'`, ORG_ID).n,
    prospects: q(`SELECT COUNT(*) n ${acc} AND status='prospect'`, ORG_ID).n,
    hold: q(`SELECT COUNT(*) n ${acc} AND status='hold'`, ORG_ID).n,
    total: q(`SELECT COUNT(*) n ${acc}`, ORG_ID).n,
    properties: q(`SELECT COUNT(*) n FROM properties p JOIN accounts a ON a.id=p.account_id WHERE a.org_id=?`, ORG_ID).n,
    followUps: q(`SELECT COUNT(*) n FROM call_logs c JOIN accounts a ON a.id=c.account_id
      WHERE a.org_id=? AND c.follow_up_at IS NOT NULL AND date(c.follow_up_at) >= date('now')`, ORG_ID).n,
    estimatesSent: q(`SELECT COUNT(*) n FROM estimates e JOIN properties p ON p.id=e.property_id JOIN accounts a ON a.id=p.account_id
      WHERE a.org_id=? AND e.status='sent'`, ORG_ID).n,
  };
}

export function recentAccounts(limit = 6) {
  return db.prepare(`SELECT a.*,
      (SELECT COUNT(*) FROM properties p WHERE p.account_id=a.id) AS property_count,
      (SELECT phone FROM contacts c WHERE c.account_id=a.id ORDER BY is_primary DESC LIMIT 1) AS phone
    FROM accounts a WHERE a.org_id=? ORDER BY a.id DESC LIMIT ?`).all(ORG_ID, limit);
}

export function listFollowUps(limit = 8) {
  return db.prepare(`SELECT c.*, a.name AS account_name FROM call_logs c
    JOIN accounts a ON a.id=c.account_id
    WHERE a.org_id=? AND c.follow_up_at IS NOT NULL AND date(c.follow_up_at) >= date('now')
    ORDER BY c.follow_up_at LIMIT ?`).all(ORG_ID, limit);
}

export function upcomingVisits(limit = 8) {
  return db.prepare(`SELECT v.*, p.address, p.city, a.name AS account_name, a.id AS account_id,
      cr.name AS crew_name, cr.color AS crew_color
    FROM visits v JOIN properties p ON p.id=v.property_id JOIN accounts a ON a.id=p.account_id
    LEFT JOIN crews cr ON cr.id=v.crew_id
    WHERE a.org_id=? AND v.scheduled_date >= date('now') AND v.status != 'completed'
    ORDER BY v.scheduled_date, COALESCE(v.seq, 999) LIMIT ?`).all(ORG_ID, limit);
}

// Crews with their ordered stops for a given day (for the office "who's where" view)
export function dayRoutes(date) {
  const rows = db.prepare(`SELECT v.id, v.name, v.status, v.seq, v.scheduled_date,
      p.address, p.city, a.name AS account_name, a.id AS account_id,
      cr.id AS crew_id, cr.name AS crew_name, cr.color AS crew_color
    FROM visits v JOIN properties p ON p.id=v.property_id JOIN accounts a ON a.id=p.account_id
    JOIN crews cr ON cr.id=v.crew_id
    WHERE a.org_id=? AND v.scheduled_date=? ORDER BY cr.name, COALESCE(v.seq, 999)`).all(ORG_ID, date);
  const byCrew = new Map();
  for (const r of rows) {
    if (!byCrew.has(r.crew_id)) byCrew.set(r.crew_id, { id: r.crew_id, name: r.crew_name, color: r.crew_color, date, stops: [] });
    byCrew.get(r.crew_id).stops.push(r);
  }
  return [...byCrew.values()];
}

// The most relevant route day: today if it has routes, else the next upcoming,
// else the most recent past day — so the dashboard panel is never empty.
export function relevantRouteDate() {
  const today = todayISO();
  const base = `FROM visits v JOIN properties p ON p.id=v.property_id JOIN accounts a ON a.id=p.account_id
    WHERE a.org_id=? AND v.crew_id IS NOT NULL AND v.scheduled_date`;
  const up = db.prepare(`SELECT MIN(v.scheduled_date) d ${base} >= ?`).get(ORG_ID, today).d;
  if (up) return up;
  const past = db.prepare(`SELECT MAX(v.scheduled_date) d ${base} < ?`).get(ORG_ID, today).d;
  return past || today;
}

export function todaysRoutes() {
  const today = todayISO();
  const todayCrews = dayRoutes(today);
  if (todayCrews.length) return { date: today, isToday: true, crews: todayCrews };
  const date = relevantRouteDate();
  return { date, isToday: date === today, crews: dayRoutes(date) };
}
