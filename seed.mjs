// Bladewise — seed data (realistic lawn care demo)
import { db, initSchema, tableCount } from './db.mjs';
import { optimizeRoute, routeDays, priceService, createEstimate, sendEstimate, updateAccountBalance } from './models.mjs';
import { randomUUID } from 'node:crypto';

const tok = () => randomUUID().replace(/-/g, '').slice(0, 20);

export function ensureSeed() {
  initSchema();
  if (tableCount('organizations') > 0) return;
  seed();
}

function seed() {
  const insert = (sql, ...p) => Number(db.prepare(sql).run(...p).lastInsertRowid);

  const orgId = insert(
    `INSERT INTO organizations (name,phone,email,address,depot_lat,depot_lng) VALUES (?,?,?,?,?,?)`,
    'Evergreen Lawn & Landscape', '(614) 555-0142', 'office@evergreenlawn.example', '48 Industrial Pkwy, Dublin, OH 43017',
    40.0992, -83.1141);

  // Users
  const owner = insert(`INSERT INTO users (org_id,name,email,role) VALUES (?,?,?,?)`, orgId, 'Dana Reyes', 'dana@evergreenlawn.example', 'owner');
  insert(`INSERT INTO users (org_id,name,email,role) VALUES (?,?,?,?)`, orgId, 'Priya Nair', 'priya@evergreenlawn.example', 'csr');

  // Crews
  const crewA = insert(`INSERT INTO crews (org_id,name,color) VALUES (?,?,?)`, orgId, 'Crew A — North', '#2f855a');
  const crewB = insert(`INSERT INTO crews (org_id,name,color) VALUES (?,?,?)`, orgId, 'Crew B — South', '#2b6cb0');

  // Service types / price book (area-tiered)
  const stFert = insert(`INSERT INTO service_types (org_id,name,kind,rule_type,base_price,base_up_to_sqft,per_unit_price,unit_sqft,min_price)
    VALUES (?,?,?,?,?,?,?,?,?)`, orgId, 'Fertilization + Weed Control', 'program', 'area_tier', 45, 5000, 6, 1000, 45);
  const stGrub = insert(`INSERT INTO service_types (org_id,name,kind,rule_type,base_price,base_up_to_sqft,per_unit_price,unit_sqft,min_price)
    VALUES (?,?,?,?,?,?,?,?,?)`, orgId, 'Grub Control', 'program', 'area_tier', 55, 5000, 7, 1000, 55);
  const stAeration = insert(`INSERT INTO service_types (org_id,name,kind,rule_type,per_unit_price,unit_sqft,min_price)
    VALUES (?,?,?,?,?,?,?)`, orgId, 'Aeration', 'onetime', 'per_unit', 15, 1000, 80);
  insert(`INSERT INTO service_types (org_id,name,kind,rule_type,per_unit_price,unit_sqft,min_price)
    VALUES (?,?,?,?,?,?,?)`, orgId, 'Overseeding', 'onetime', 'per_unit', 18, 1000, 90);
  insert(`INSERT INTO service_types (org_id,name,kind,rule_type,flat_price)
    VALUES (?,?,?,?,?)`, orgId, 'Shrub & Tree Treatment', 'onetime', 'flat', 65);

  // Program + rounds
  const prog = insert(`INSERT INTO service_programs (org_id,name,description) VALUES (?,?,?)`,
    orgId, '7-Round Lawn Care Program', 'Full-season fertilization, weed & grub control — spring through fall.');
  const rounds = [
    ['Round 1 — Early Spring', stFert, '03-01', '04-15', 'Pre-emergent + slow-release N'],
    ['Round 2 — Late Spring', stFert, '04-16', '05-31', 'Fertilizer + broadleaf weed control'],
    ['Round 3 — Grub Control', stGrub, '06-01', '07-15', 'Season-long grub preventer'],
    ['Round 4 — Summer', stFert, '07-16', '08-31', 'Slow-release summer feeding'],
    ['Round 5 — Early Fall', stFert, '09-01', '10-10', 'Fertilizer + weed control'],
    ['Round 6 — Late Fall', stFert, '10-11', '11-20', 'Winterizer'],
    ['Round 7 — Lime', stFert, '11-01', '12-01', 'Soil pH balancing'],
  ];
  rounds.forEach((r, i) => insert(
    `INSERT INTO program_rounds (program_id,seq,name,service_type_id,window_start,window_end,products) VALUES (?,?,?,?,?,?,?)`,
    prog, i + 1, r[0], r[1], r[2], r[3], r[4]));

  // ---- Customers ----------------------------------------------------------
  // Coordinates cluster around Dublin / Powell / Hilliard OH (near the depot)
  // so route optimization and the route map produce meaningful geography.
  const customers = [
    { name: 'John & Mary Smith', status: 'active', terms: 'installment', source: 'Referral', balance: 62.00,
      addr: '124 Maple Avenue', city: 'Dublin', zip: '43017', turf: 6800, lat: 40.0995, lng: -83.1205,
      contact: ['Mary Smith', '(614) 555-0111', 'mary.smith@example.com'], history: [] },
    { name: 'Robert Chen', status: 'active', terms: 'prepay', source: 'Web form', balance: 0,
      addr: '77 Riverside Drive', city: 'Powell', zip: '43065', turf: 11200, lat: 40.1585, lng: -83.0760,
      contact: ['Robert Chen', '(614) 555-0122', 'rchen@example.com'], history: [] },
    { name: 'Elena Petrova', status: 'active', terms: 'per_service', source: 'Neighbor campaign', balance: 148.50,
      addr: '9 Birchwood Court', city: 'Dublin', zip: '43016', turf: 4200, lat: 40.1120, lng: -83.1580,
      contact: ['Elena Petrova', '(614) 555-0133', 'elena.p@example.com'],
      history: [['Aeration', 'Fall aeration', 'Marcus', '2025-09-30']] },
    { name: 'The Garcia Family', status: 'active', terms: 'installment', source: 'Referral', balance: 0,
      addr: '215 Oakhurst Lane', city: 'Hilliard', zip: '43026', turf: 8900, lat: 40.0335, lng: -83.1585,
      contact: ['Luis Garcia', '(614) 555-0144', 'lgarcia@example.com'], history: [] },
    { name: 'Sunset Ridge HOA', status: 'active', terms: 'installment', source: 'Commercial bid', balance: 940.00,
      addr: '1 Sunset Ridge Blvd', city: 'Powell', zip: '43065', turf: 42000, lat: 40.1640, lng: -83.0685,
      contact: ['Property Mgmt Office', '(614) 555-0155', 'mgmt@sunsetridge.example'], history: [] },
    { name: 'Karen Whitfield', status: 'prospect', terms: 'per_service', source: 'Web form', balance: 0,
      addr: '38 Coventry Place', city: 'Dublin', zip: '43017', turf: 5600, lat: 40.1050, lng: -83.1250,
      contact: ['Karen Whitfield', '(614) 555-0166', 'kwhit@example.com'], history: [] },
    { name: 'Tom Delgado', status: 'prospect', terms: 'per_service', source: 'Phone', balance: 0,
      addr: '502 Windmill Road', city: 'Hilliard', zip: '43026', turf: 7300, lat: 40.0290, lng: -83.1660,
      contact: ['Tom Delgado', '(614) 555-0177', 'tdelgado@example.com'], history: [] },
    { name: 'Nguyen Residence', status: 'active', terms: 'prepay', source: 'Referral', balance: 0,
      addr: '61 Cedar Hollow', city: 'Powell', zip: '43065', turf: 9800, lat: 40.1520, lng: -83.0840,
      contact: ['Kim Nguyen', '(614) 555-0188', 'knguyen@example.com'],
      history: [['Overseeding', 'Fall overseeding', 'Aisha', '2025-10-05']] },
    { name: 'Frank & Susan Boyle', status: 'hold', terms: 'per_service', source: 'Referral', balance: 30.00,
      addr: '140 Pinecrest Way', city: 'Dublin', zip: '43016', turf: 5100, lat: 40.1180, lng: -83.1520,
      contact: ['Susan Boyle', '(614) 555-0199', 'sboyle@example.com'], history: [] },
  ];

  const propByName = {};
  for (const c of customers) {
    const acctId = insert(`INSERT INTO accounts (org_id,name,status,billing_address,terms,source,balance)
      VALUES (?,?,?,?,?,?,?)`, orgId, c.name, c.status, `${c.addr}, ${c.city}, OH ${c.zip}`, c.terms, c.source, c.balance);
    const propId = insert(`INSERT INTO properties (account_id,address,city,state,zip,lat,lng,turf_sqft,bed_sqft,lot_sqft,measure_method,measured_at,has_pets)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, acctId, c.addr, c.city, 'OH', c.zip, c.lat, c.lng, c.turf,
      Math.round(c.turf * 0.12), Math.round(c.turf * 1.6), 'map_draw', '2026-03-01', c.name.includes('Garcia') ? 1 : 0);
    insert(`INSERT INTO contacts (account_id,property_id,name,phone,email,is_primary,contact_pref)
      VALUES (?,?,?,?,?,?,?)`, acctId, propId, c.contact[0], c.contact[1], c.contact[2], 1, 'phone');
    c.propId = propId;
    propByName[c.name] = propId;

    // Active-program customers get a subscription + priced enrollment
    if (c.status === 'active' && c.turf) {
      const price = priceProgram(c.turf);
      c.subId = insert(`INSERT INTO subscriptions (property_id,program_id,status,auto_renew,season_year,price)
        VALUES (?,?,?,?,?,?)`, propId, prog, 'active', 1, 2026, price);
    }
    for (const h of c.history) {
      insert(`INSERT INTO service_history (property_id,service_date,service_name,technician,products)
        VALUES (?,?,?,?,?)`, propId, h[3], `${h[0]} — ${h[1]}`, h[2], '');
    }
  }

  // ---- Materialize the season schedule (visits) from subscriptions --------
  // Each active property gets a series of visits from the program rounds:
  //   Rounds 1–3 → completed (with service history)
  //   Round 4    → scheduled onto a shared route day (awaiting optimization)
  //   Round 5    → unscheduled, surfaces in the "needs scheduling" panel
  const roundRows = db.prepare('SELECT * FROM program_rounds WHERE program_id=? ORDER BY seq').all(prog);
  const stName = new Map([[stFert, 'Fertilization + Weed Control'], [stGrub, 'Grub Control']]);
  const stRows = new Map(db.prepare('SELECT * FROM service_types WHERE org_id=?').all(orgId).map(s => [s.id, s]));
  const priceRound = (stId, turf) => { const st = stRows.get(stId); return st ? priceService(st, turf) : 0; };
  const crewByCity = (city) => (city === 'Hilliard' ? crewB : crewA);
  const techByCrew = (id) => (id === crewB ? 'Aisha' : 'Marcus');
  const completedDate = { 1: '2026-03-20', 2: '2026-05-06', 3: '2026-06-25' };
  const dueAfter = (d, n) => { const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
  const ROUTE_DAY = isoInDays(0); // today — so the dashboard's "Today's routes" is populated

  for (const c of customers.filter(x => x.subId)) {
    const crewId = crewByCity(c.city);
    c.completed = [];
    for (const r of roundRows.filter(r => r.seq <= 5)) {
      const svc = stName.get(r.service_type_id) || 'Service';
      const wStart = `2026-${r.window_start}`, wEnd = `2026-${r.window_end}`;
      const price = priceRound(r.service_type_id, c.turf);
      if (r.seq <= 3) {
        const d = completedDate[r.seq];
        const vId = insert(`INSERT INTO visits (property_id,subscription_id,service_type_id,name,status,scheduled_date,window_start,window_end,crew_id,completed_at,price)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`, c.propId, c.subId, r.service_type_id, r.name, 'completed', d, wStart, wEnd, crewId, d, price);
        insert(`INSERT INTO service_history (property_id,visit_id,service_date,service_name,technician,products)
          VALUES (?,?,?,?,?,?)`, c.propId, vId, d, `${svc} — ${r.name}`, techByCrew(crewId), r.products);
        c.completed.push({ seq: r.seq, vId, price, date: d, name: r.name });
      } else if (r.seq === 4) {
        insert(`INSERT INTO visits (property_id,subscription_id,service_type_id,name,status,scheduled_date,window_start,window_end,crew_id,price)
          VALUES (?,?,?,?,?,?,?,?,?,?)`, c.propId, c.subId, r.service_type_id, r.name, 'scheduled', ROUTE_DAY, wStart, wEnd, crewId, price);
      } else {
        insert(`INSERT INTO visits (property_id,subscription_id,service_type_id,name,status,window_start,window_end,price)
          VALUES (?,?,?,?,?,?,?,?)`, c.propId, c.subId, r.service_type_id, r.name, 'scheduled', wStart, wEnd, price);
      }
    }
  }

  // ---- Invoices generated from completed visits (paid history + open AR) ----
  // Rounds 1 & 2 are paid; round 3 is left open/overdue for some accounts.
  const mkInvoice = (acctId, terms, visits, { paid }) => {
    const subtotal = Math.round(visits.reduce((s, v) => s + v.price, 0) * 100) / 100;
    const issued = visits[0].date, due = dueAfter(issued, 15);
    const status = paid ? 'paid' : (due < '2026-07-30' ? 'overdue' : 'open');
    const invId = insert(`INSERT INTO invoices (account_id,status,subtotal,amount_paid,terms,token,issued_date,due_date)
      VALUES (?,?,?,?,?,?,?,?)`, acctId, status, subtotal, paid ? subtotal : 0, terms, tok(), issued, due);
    for (const v of visits) {
      insert(`INSERT INTO invoice_lines (invoice_id,visit_id,description,amount) VALUES (?,?,?,?)`, invId, v.vId, v.name, v.price);
      db.prepare('UPDATE visits SET invoice_id=? WHERE id=?').run(invId, v.vId);
    }
    if (paid) insert(`INSERT INTO payments (account_id,amount,method,applied_at) VALUES (?,?,?,?)`, acctId, subtotal, 'card', dueAfter(issued, 5));
    return invId;
  };

  let idx = 0;
  for (const c of customers.filter(x => x.subId)) {
    const acctId = db.prepare('SELECT account_id FROM properties WHERE id=?').get(c.propId).account_id;
    const r1 = c.completed.find(v => v.seq === 1), r2 = c.completed.find(v => v.seq === 2), r3 = c.completed.find(v => v.seq === 3);
    if (r1) mkInvoice(acctId, c.terms, [r1], { paid: true });
    if (r2) mkInvoice(acctId, c.terms, [r2], { paid: true });
    if (r3) mkInvoice(acctId, c.terms, [r3], { paid: idx % 2 === 1 }); // alternate: some open/overdue
    idx++;
  }
  // Recompute every account's balance from its invoices (consistency)
  for (const row of db.prepare('SELECT id FROM accounts WHERE org_id=?').all(orgId)) updateAccountBalance(row.id);

  // Payment methods on file for prepay / installment customers (autopay on)
  for (const c of customers.filter(x => x.subId && (x.terms === 'prepay' || x.terms === 'installment'))) {
    const acctId = db.prepare('SELECT account_id FROM properties WHERE id=?').get(c.propId).account_id;
    insert(`INSERT INTO payment_methods (account_id,brand,last4,token,autopay) VALUES (?,?,?,?,?)`,
      acctId, 'Visa', String(4000 + (acctId * 7) % 6000).slice(-4), tok(), 1);
  }

  // Sample estimates: one sent (awaiting approval), one draft
  const est1 = createEstimate(propByName['Karen Whitfield'], { program: true });
  if (est1) sendEstimate(est1);
  createEstimate(propByName['Tom Delgado'], { program: true, serviceTypeIds: [stAeration] });

  // A couple of call-log entries with a follow-up
  const smith = db.prepare("SELECT id FROM accounts WHERE name LIKE 'John & Mary%'").get().id;
  const karen = db.prepare("SELECT id FROM accounts WHERE name LIKE 'Karen%'").get().id;
  insert(`INSERT INTO call_logs (account_id,user_id,note,follow_up_at) VALUES (?,?,?,?)`,
    smith, owner, 'Mary called to add grub control to this year’s program. Confirmed pricing, will update subscription.', null);
  insert(`INSERT INTO call_logs (account_id,user_id,note,follow_up_at) VALUES (?,?,?,?)`,
    karen, owner, 'Requested an estimate for the full 7-round program. Sent — awaiting approval.', isoInDays(3));

  // ---- Activity feed: backdated notifications from historical events -------
  const notif = (acctId, type, channel, title, body, at) => insert(
    `INSERT INTO notifications (org_id,account_id,type,channel,title,body,created_at) VALUES (?,?,?,?,?,?,?)`,
    orgId, acctId, type, channel, title, body, at);
  for (const p of db.prepare(`SELECT pay.amount, pay.applied_at, a.id acct, a.name FROM payments pay
      JOIN accounts a ON a.id=pay.account_id WHERE a.org_id=?`).all(orgId)) {
    notif(p.acct, 'payment_received', 'email', `Payment received — ${p.name}`, `$${p.amount.toFixed(2)} paid by card.`, p.applied_at + ' 09:12:00');
  }
  for (const c of db.prepare(`SELECT v.name, v.completed_at, a.id acct, a.name aname, pr.address FROM visits v
      JOIN properties pr ON pr.id=v.property_id JOIN accounts a ON a.id=pr.account_id
      WHERE a.org_id=? AND v.status='completed' AND v.completed_at >= '2026-06-01'`).all(orgId)) {
    notif(c.acct, 'service_complete', 'sms', `Service completed — ${c.aname}`, `${c.name} at ${c.address}. Customer texted.`, c.completed_at + ' 14:30:00');
  }

  // Pre-optimize the seeded route days so the map & board look polished on first run
  for (const rd of routeDays()) optimizeRoute(rd.crew_id, rd.date);

  console.log('Seeded demo data: Evergreen Lawn & Landscape with', customers.length, 'customers.');
}

// Program price = sum of the recurring rounds priced against turf
function priceProgram(turf) {
  // 6 fertilization rounds + 1 grub round, area-tiered — approximate the engine
  const fert = 45 + Math.max(0, Math.ceil((turf - 5000) / 1000)) * 6;
  const grub = 55 + Math.max(0, Math.ceil((turf - 5000) / 1000)) * 7;
  return Math.round((fert * 6 + grub) * 100) / 100;
}

function isoInDays(d) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

// CLI: `node src/seed.mjs [--reset]`
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--reset')) {
    const tables = ['call_logs', 'payment_methods', 'payments', 'invoice_lines', 'invoices', 'service_history',
      'visits', 'estimate_lines', 'estimates', 'subscriptions', 'program_rounds', 'service_programs',
      'service_types', 'measurements', 'contacts', 'properties', 'accounts', 'crews', 'users', 'organizations'];
    initSchema();
    for (const t of tables) { try { db.exec(`DELETE FROM ${t}`); } catch {} }
    console.log('Cleared existing data.');
  }
  ensureSeed();
  console.log('Done.');
}
