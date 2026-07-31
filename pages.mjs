// Bladewise — page views. Each function returns an HTML string.
import * as M from './models.mjs';
import { esc, money, num, fmtDate, badge, label, layout, publicLayout, pageHeader, card, stat, flash } from './render.mjs';

// Public base URL for shareable customer links. Auto-detected on Render;
// override with BASE_URL. Falls back to localhost for local runs.
const BASE = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

const org = () => M.getOrg();

// ---- Dashboard (owner cockpit) --------------------------------------------
const NOTIF_ICON = {
  estimate_sent: '✉', estimate_approved: '✓', service_complete: '✔',
  invoice_sent: '🧾', payment_received: '＄', appointment: '📅',
};
const kfmt = (n) => { const v = Number(n || 0); return v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'k' : '$' + Math.round(v); };

function activityRow(n) {
  return `<div class="feed__item">
    <span class="feed__icon feed__icon--${esc(n.type)}">${NOTIF_ICON[n.type] || '•'}</span>
    <div class="feed__body">
      <div class="feed__title">${esc(n.title)}</div>
      ${n.body ? `<div class="feed__sub">${esc(n.body)}</div>` : ''}
    </div>
    <div class="feed__meta"><span class="chan chan--${esc(n.channel)}">${esc(n.channel)}</span><span class="feed__time">${fmtDate((n.created_at || '').slice(0, 10))}</span></div>
  </div>`;
}

export function dashboard() {
  const s = M.customerStats();
  const recent = M.recentAccounts(6);
  const followUps = M.listFollowUps(6);
  const feed = M.listNotifications(6);
  const sentEstimates = M.listEstimates('sent');
  const routes = M.todaysRoutes();
  const prospects = M.listAccounts({ status: 'prospect' }).slice(0, 6);

  const recentRows = recent.map(a => `<tr onclick="location='/accounts/${a.id}'">
      <td class="td-strong">${esc(a.name)}</td>
      <td>${badge(a.status)}</td>
      <td>${esc(a.phone || '—')}</td>
      <td class="ta-r">${num(a.property_count)}</td>
    </tr>`).join('');

  const followRows = followUps.map(f => `<div class="feed__item">
      <span class="feed__icon feed__icon--service_complete">☎</span>
      <div class="feed__body">
        <div class="feed__title"><a class="link" href="/accounts/${f.account_id}">${esc(f.account_name)}</a></div>
        <div class="feed__sub">${esc(f.note)}</div>
      </div>
      <div class="feed__meta"><span class="chan chan--sms">follow up</span><span class="feed__time">${fmtDate(f.follow_up_at)}</span></div>
    </div>`).join('');
  const estRows = sentEstimates.map(e => `<div class="feed__item">
      <span class="feed__icon feed__icon--estimate_sent">✉</span>
      <div class="feed__body">
        <div class="feed__title"><a class="link" href="/estimates/${e.id}">${esc(e.account_name)} — Estimate #${e.id}</a></div>
        <div class="feed__sub">Awaiting customer approval · ${money(e.subtotal)}</div>
      </div>
      <div class="feed__meta"><span class="feed__time">${fmtDate(e.created_at)}</span></div>
    </div>`).join('');
  const todoBlock = (followRows + estRows) || '<p class="muted">Nothing needs attention right now. 🎉</p>';

  const routeCols = routes.crews.length ? routes.crews.map(c => `
    <div class="routecol" style="--c:${esc(c.color || '#2f855a')}">
      <div class="routecol__head">
        <span class="routecol__name"><span class="dot" style="background:${esc(c.color || '#2f855a')}"></span>${esc(c.name)}</span>
        <span class="routecol__meta">${c.stops.length} stop${c.stops.length === 1 ? '' : 's'} · <a class="link" href="/field?crew=${c.id}&date=${routes.date}">Field ›</a></span>
      </div>
      <ol class="routecol__stops">
        ${c.stops.map(st => `<li>
          <span class="rseq">${st.seq ?? '•'}</span>
          <span class="rstop"><a class="link" href="/accounts/${st.account_id}">${esc(st.account_name)}</a>
            <span class="sub">${esc(st.address)}${st.city ? ', ' + esc(st.city) : ''}</span></span>
          ${st.status === 'completed' ? '<span class="badge badge--paid">done</span>' : ''}
        </li>`).join('')}
      </ol>
    </div>`).join('') : '<p class="muted">No routes scheduled. Assign visits to a crew on the <a class="link" href="/schedule">Schedule</a> board.</p>';
  const routeTitle = routes.isToday ? "Today's routes" : `Routes · ${fmtDate(routes.date)}`;
  const routeMeta = routes.crews.length ? `${routes.crews.length} crew${routes.crews.length === 1 ? '' : 's'} out` : '';

  const prospectRows = prospects.length ? prospects.map(p => `<tr onclick="location='/accounts/${p.id}'">
      <td class="td-strong">${esc(p.name)}</td>
      <td>${esc(p.phone || '—')}</td>
      <td>${esc(p.source || '—')}</td>
    </tr>`).join('') : '<tr><td colspan="3" class="empty">No prospects right now.</td></tr>';

  const body = `
    ${pageHeader('Dashboard', `${esc(org()?.name || '')} · customers at a glance`)}
    <div class="grid grid--stats">
      ${stat('Active customers', num(s.active), `${num(s.total)} total · ${num(s.properties)} properties`)}
      ${stat('Prospects', num(s.prospects), 'to convert')}
      ${stat('Follow-ups due', num(s.followUps), 'from the call log')}
      ${stat('Estimates out', num(s.estimatesSent), 'awaiting approval')}
    </div>

    ${card(`<div class="card__head"><h2>${routeTitle}</h2><span class="muted">${routeMeta}</span></div>
      <div class="routeboard">${routeCols}</div>`)}

    <div class="grid grid--wide">
      ${card(`<div class="card__head"><h2>Recent customers</h2><a class="link" href="/accounts">All customers ›</a></div>
        <table class="table table--hover"><thead><tr><th>Name</th><th>Status</th><th>Phone</th><th class="ta-r">Properties</th></tr></thead>
        <tbody>${recentRows}</tbody></table>`)}
      ${card(`<div class="card__head"><h2>Recent activity</h2><a class="link" href="/notifications">View all</a></div>
        <div class="feed">${feed.length ? feed.map(activityRow).join('') : '<p class="muted">No activity yet.</p>'}</div>`)}
    </div>

    <div class="grid grid--2">
      ${card(`<div class="card__head"><h2>Follow-ups &amp; to-dos</h2></div>
        <div class="feed">${todoBlock}</div>`)}
      ${card(`<div class="card__head"><h2>Prospects to convert</h2><a class="link" href="/accounts?status=prospect">View all ›</a></div>
        <table class="table table--hover"><thead><tr><th>Name</th><th>Phone</th><th>Source</th></tr></thead>
        <tbody>${prospectRows}</tbody></table>`)}
    </div>

    <p class="muted dash-foot">Revenue, collections and receivables live in <a class="link" href="/reports">Reports</a>.</p>`;
  return layout({ title: 'Dashboard', active: 'dashboard', org: org(), body });
}

// ---- Reports (revenue & financials, moved off the dashboard) ---------------
export function reportsPage() {
  const m = M.ownerMetrics();
  const chart = buildRevenueChart(M.revenueByMonth(2026));
  const ag = M.receivablesAging();
  const topAR = M.topReceivables(6);
  const collectRate = m.billed > 0 ? Math.round(m.collected / m.billed * 100) : 0;
  const body = `
    ${pageHeader('Reports', `${esc(org()?.name || '')} · 2026 season`)}
    <div class="grid grid--stats">
      ${stat('Collected', money(m.collected), `${collectRate}% of billed`)}
      ${stat('Billed', money(m.billed))}
      ${stat('Accounts receivable', money(m.ar), `${num(m.overdue)} overdue`)}
      ${stat('Active programs', num(m.activeSubs), `${num(m.renewals)} auto-renew`)}
    </div>
    ${card(`<div class="card__head"><h2>Revenue — 2026</h2><span class="legend">
        <span class="legend__item"><span class="dot" style="background:var(--green-500)"></span>Collected</span>
        <span class="legend__item"><span class="dot" style="background:#cfe0d6"></span>Billed</span></span></div>
      ${chart}`)}
    <div class="grid grid--2">
      ${card(`<div class="card__head"><h2>Receivables aging</h2><a class="link" href="/invoices">Invoices ›</a></div>
        <div class="aging">
          ${agingTile('Current', ag.buckets.current)}
          ${agingTile('1–30 days', ag.buckets.d30)}
          ${agingTile('31–60 days', ag.buckets.d60)}
          ${agingTile('60+ days', ag.buckets.d90, true)}
        </div>`)}
      ${card(`<div class="card__head"><h2>Top balances</h2></div>
        ${topAR.length ? `<table class="table table--hover"><thead><tr><th>Customer</th><th class="ta-r">Balance</th></tr></thead>
          <tbody>${topAR.map(a => `<tr onclick="location='/accounts/${a.id}'"><td class="td-strong">${esc(a.name)}</td><td class="ta-r owe">${money(a.balance)}</td></tr>`).join('')}</tbody></table>`
          : '<p class="muted">Nothing outstanding.</p>'}`)}
    </div>`;
  return layout({ title: 'Reports', active: 'reports', org: org(), body });
}

function miniKpi(labelText, value, sub, href) {
  return `<a class="minikpi" href="${href}">
    <div class="minikpi__val">${value}</div>
    <div class="minikpi__label">${esc(labelText)}</div>
    <div class="minikpi__sub">${esc(sub)}</div>
  </a>`;
}

// Self-contained SVG revenue chart (grouped bars: collected over billed)
function buildRevenueChart(data) {
  const W = 620, H = 240, padL = 44, padB = 28, padT = 12, padR = 12;
  const max = Math.max(1, ...data.map(d => Math.max(d.billed, d.collected)));
  const niceMax = Math.ceil(max / 200) * 200;
  const plotW = W - padL - padR, plotH = H - padB - padT;
  const bw = plotW / data.length;
  const Y = (v) => padT + plotH - (v / niceMax) * plotH;
  const months = 'JFMAMJJASOND';

  const grid = [0, 0.5, 1].map(f => {
    const y = padT + plotH - f * plotH;
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#eef2ef"/>
      <text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="axt">${kfmt(niceMax * f)}</text>`;
  }).join('');

  const bars = data.map((d, i) => {
    const cx = padL + i * bw;
    const billW = bw * 0.62, colW = bw * 0.62;
    const bx = cx + (bw - billW) / 2;
    const billTop = Y(d.billed), colTop = Y(d.collected);
    return `<g>
      <rect x="${bx.toFixed(1)}" y="${billTop.toFixed(1)}" width="${billW.toFixed(1)}" height="${(padT + plotH - billTop).toFixed(1)}" rx="2" fill="#cfe0d6"/>
      <rect x="${bx.toFixed(1)}" y="${colTop.toFixed(1)}" width="${colW.toFixed(1)}" height="${(padT + plotH - colTop).toFixed(1)}" rx="2" fill="#38a169"/>
      <text x="${(cx + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="axt">${months[i]}</text>
    </g>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Monthly revenue">${grid}${bars}</svg>`;
}

// ---- Notifications / activity center --------------------------------------
export function notificationsPage() {
  const items = M.listNotifications(200);
  const s = M.notificationStats();
  const body = `
    ${pageHeader('Activity', 'Automated customer notifications & internal events')}
    <div class="grid grid--stats">
      ${stat('Total events', num(s.total))}
      ${stat('Emails sent', num(s.email))}
      ${stat('Texts sent', num(s.sms))}
      ${stat('Internal', num(s.internal))}
    </div>
    ${card(`<div class="card__head"><h2>Recent activity</h2></div>
      <p class="muted" style="margin-top:-6px">In production each of these fires a real email or SMS. Here they're logged to the activity feed.</p>
      <div class="feed feed--full">${items.length ? items.map(activityRow).join('') : '<p class="muted">No activity yet.</p>'}</div>`)}`;
  return layout({ title: 'Activity', active: 'notifications', org: org(), body });
}

// ---- Accounts list ---------------------------------------------------------
export function accountsList(query = {}) {
  const status = query.status || null;
  const q = query.q || null;
  const accounts = M.listAccounts({ status, q });
  const filters = ['', 'active', 'prospect', 'hold', 'cancelled'].map(st => {
    const on = (st || null) === status;
    const href = st ? `/accounts?status=${st}` : '/accounts';
    return `<a class="chip ${on ? 'is-on' : ''}" href="${href}">${st ? label(st) : 'All'}</a>`;
  }).join('');

  const rows = accounts.map(a => `<tr onclick="location='/accounts/${a.id}'">
      <td class="td-strong">${esc(a.name)}</td>
      <td>${badge(a.status)}</td>
      <td>${esc(a.phone || '—')}</td>
      <td class="ta-r">${num(a.property_count)}</td>
      <td class="ta-r">${money(a.balance)}</td>
      <td>${esc(label(a.terms))}</td>
    </tr>`).join('');

  const body = `
    ${pageHeader('Customers', `${num(accounts.length)} account${accounts.length === 1 ? '' : 's'}`,
      '<a class="btn btn--primary" href="/accounts/new">+ New customer</a>')}
    <div class="chips">${filters}</div>
    ${card(`<table class="table table--hover">
      <thead><tr><th>Name</th><th>Status</th><th>Phone</th><th class="ta-r">Properties</th><th class="ta-r">Balance</th><th>Billing</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6" class="empty">No customers found.</td></tr>`}</tbody>
    </table>`)}`;
  return layout({ title: 'Customers', active: 'accounts', org: org(), body });
}

// ---- New / edit account form ----------------------------------------------
export function accountForm(account = null) {
  const editing = !!account;
  const a = account || {};
  const opt = (v, cur, text) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${text}</option>`;
  const body = `
    ${pageHeader(editing ? `Edit ${a.name}` : 'New customer', editing ? '' : 'Create a customer account')}
    ${card(`<form method="post" action="${editing ? `/accounts/${a.id}/edit` : '/accounts/new'}" class="form">
      <div class="form__row">
        <label>Customer name<input name="name" required value="${esc(a.name || '')}" placeholder="e.g. John &amp; Mary Smith"></label>
        <label>Status<select name="status">
          ${opt('prospect', a.status || 'prospect', 'Prospect')}${opt('active', a.status, 'Active')}
          ${opt('hold', a.status, 'On hold')}${opt('cancelled', a.status, 'Cancelled')}
        </select></label>
      </div>
      <div class="form__row">
        <label>Billing address<input name="billing_address" value="${esc(a.billing_address || '')}" placeholder="Street, City, ST ZIP"></label>
        <label>Billing terms<select name="terms">
          ${opt('per_service', a.terms || 'per_service', 'Per service')}${opt('prepay', a.terms, 'Prepay')}${opt('installment', a.terms, 'Installment')}
        </select></label>
      </div>
      <div class="form__row">
        <label>Lead source<input name="source" value="${esc(a.source || '')}" placeholder="Web form, referral, phone…"></label>
      </div>
      <label>Notes<textarea name="notes" rows="3" placeholder="Anything the office should know">${esc(a.notes || '')}</textarea></label>
      <div class="form__actions">
        <a class="btn" href="${editing ? `/accounts/${a.id}` : '/accounts'}">Cancel</a>
        <button class="btn btn--primary" type="submit">${editing ? 'Save changes' : 'Create customer'}</button>
      </div>
    </form>`)}`;
  return layout({ title: editing ? 'Edit customer' : 'New customer', active: 'accounts', org: org(), body });
}

// ---- Account detail --------------------------------------------------------
export function accountDetail(id, query = {}) {
  const a = M.getAccount(id);
  if (!a) return null;
  const contacts = M.listContacts(id);
  const properties = M.listProperties(id);
  const calls = M.listCalls(id);
  const invoices = M.accountInvoices(id);

  const contactRows = contacts.length ? contacts.map(c => `<div class="person">
      <div class="person__name">${esc(c.name)} ${c.is_primary ? '<span class="tag">primary</span>' : ''}</div>
      <div class="person__meta">${esc(c.phone || '')}${c.phone && c.email ? ' · ' : ''}${esc(c.email || '')}</div>
    </div>`).join('') : '<p class="muted">No contacts yet.</p>';

  const propRows = properties.length ? properties.map(p => `<tr onclick="location='/properties/${p.id}'">
      <td class="td-strong">${esc(p.address)}${p.city ? `<span class="sub">${esc(p.city)}, ${esc(p.state || '')} ${esc(p.zip || '')}</span>` : ''}</td>
      <td class="ta-r">${p.turf_sqft ? num(p.turf_sqft) + ' sq ft' : '<span class="muted">not measured</span>'}</td>
      <td class="ta-r">${num(p.active_subs)}</td>
    </tr>`).join('') : `<tr><td colspan="3" class="empty">No properties. <a class="link" href="/accounts/${id}/properties/new">Add one</a>.</td></tr>`;

  const callRows = calls.length ? calls.map(c => `<div class="logitem">
      <div class="logitem__meta">${fmtDate(c.created_at)}${c.user_name ? ' · ' + esc(c.user_name) : ''}
        ${c.follow_up_at ? `<span class="tag tag--warn">follow up ${fmtDate(c.follow_up_at)}</span>` : ''}</div>
      <div>${esc(c.note)}</div>
    </div>`).join('') : '<p class="muted">No calls logged.</p>';

  const invRows = invoices.length ? `<table class="table"><thead><tr><th>Invoice</th><th>Status</th><th>Due</th><th class="ta-r">Amount</th></tr></thead>
    <tbody>${invoices.map(i => `<tr><td>#${i.id}</td><td>${badge(i.status)}</td><td>${fmtDate(i.due_date)}</td><td class="ta-r">${money(i.subtotal)}</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">No invoices yet.</p>';

  const body = `
    <div class="crumb"><a href="/accounts">Customers</a> › ${esc(a.name)}</div>
    ${flash(query.flash, 'success')}
    ${pageHeader(a.name, `${badge(a.status)} &nbsp; ${esc(label(a.terms))} billing`,
      `<a class="btn" href="/accounts/${id}/edit">Edit</a>`)}

    <div class="grid grid--stats">
      ${stat('Balance', money(a.balance))}
      ${stat('Properties', num(properties.length))}
      ${stat('Contacts', num(contacts.length))}
      ${stat('Source', esc(a.source || '—'))}
    </div>

    <div class="grid grid--2">
      ${card(`<div class="card__head"><h2>Properties</h2><a class="link" href="/accounts/${id}/properties/new">+ Add property</a></div>
        <table class="table table--hover"><thead><tr><th>Address</th><th class="ta-r">Turf</th><th class="ta-r">Programs</th></tr></thead>
        <tbody>${propRows}</tbody></table>`)}
      ${card(`<div class="card__head"><h2>Contacts</h2><a class="link" href="/accounts/${id}/contacts/new">+ Add contact</a></div>
        ${contactRows}`)}
    </div>

    <div class="grid grid--2">
      ${card(`<div class="card__head"><h2>Call log</h2></div>
        <form class="inlineform" method="post" action="/accounts/${id}/calls/new">
          <input name="note" placeholder="Log a call or note…" required>
          <input type="date" name="follow_up_at" title="Follow-up date">
          <button class="btn btn--sm btn--primary">Log</button>
        </form>
        <div class="log">${callRows}</div>`)}
      ${card(`<div class="card__head"><h2>Billing</h2></div>
        ${a.billing_address ? `<p class="muted">${esc(a.billing_address)}</p>` : ''}
        ${invRows}`)}
    </div>

    ${a.notes ? card(`<div class="card__head"><h2>Notes</h2></div><p>${esc(a.notes)}</p>`) : ''}`;
  return layout({ title: a.name, active: 'accounts', org: org(), body });
}

// ---- Contact form ----------------------------------------------------------
export function contactForm(accountId) {
  const a = M.getAccount(accountId);
  if (!a) return null;
  const body = `
    <div class="crumb"><a href="/accounts">Customers</a> › <a href="/accounts/${a.id}">${esc(a.name)}</a> › New contact</div>
    ${pageHeader('New contact', `for ${esc(a.name)}`)}
    ${card(`<form method="post" action="/accounts/${accountId}/contacts/new" class="form">
      <div class="form__row">
        <label>Name<input name="name" required placeholder="Full name"></label>
        <label>Phone<input name="phone" placeholder="(555) 123-4567"></label>
      </div>
      <div class="form__row">
        <label>Email<input name="email" type="email" placeholder="name@example.com"></label>
        <label>Preferred contact<select name="contact_pref">
          <option value="phone">Phone</option><option value="sms">Text</option><option value="email">Email</option>
        </select></label>
      </div>
      <label class="check"><input type="checkbox" name="is_primary" value="1"> Primary contact</label>
      <div class="form__actions">
        <a class="btn" href="/accounts/${accountId}">Cancel</a>
        <button class="btn btn--primary">Add contact</button>
      </div>
    </form>`)}`;
  return layout({ title: 'New contact', active: 'accounts', org: org(), body });
}

// ---- Property form ---------------------------------------------------------
export function propertyForm(accountId) {
  const a = M.getAccount(accountId);
  if (!a) return null;
  const body = `
    <div class="crumb"><a href="/accounts">Customers</a> › <a href="/accounts/${a.id}">${esc(a.name)}</a> › New property</div>
    ${pageHeader('New property', `for ${esc(a.name)}`)}
    ${card(`<form method="post" action="/accounts/${accountId}/properties/new" class="form">
      <label>Service address<input name="address" required placeholder="123 Maple Ave"></label>
      <div class="form__row form__row--3">
        <label>City<input name="city"></label>
        <label>State<input name="state" maxlength="2" placeholder="ST"></label>
        <label>ZIP<input name="zip"></label>
      </div>
      <div class="form__row form__row--3">
        <label>Turf area (sq ft)<input name="turf_sqft" inputmode="numeric" placeholder="e.g. 6500"></label>
        <label>Beds (sq ft)<input name="bed_sqft" inputmode="numeric"></label>
        <label>Lot (sq ft)<input name="lot_sqft" inputmode="numeric"></label>
      </div>
      <div class="form__row">
        <label>Measurement method<select name="measure_method">
          <option value="manual">Manual entry</option><option value="map_draw">Map draw</option><option value="aerial">Aerial</option>
        </select></label>
        <label>Gate code<input name="gate_code"></label>
      </div>
      <label class="check"><input type="checkbox" name="has_pets" value="1"> Pets on property</label>
      <label>Access notes<textarea name="access_notes" rows="2" placeholder="Where to park, gate location, dog in yard…"></textarea></label>
      <div class="form__actions">
        <a class="btn" href="/accounts/${accountId}">Cancel</a>
        <button class="btn btn--primary">Add property</button>
      </div>
    </form>`)}`;
  return layout({ title: 'New property', active: 'accounts', org: org(), body });
}

// ---- Property detail -------------------------------------------------------
export function propertyDetail(id, query = {}) {
  const p = M.getProperty(id);
  if (!p) return null;
  const history = M.propertyHistory(id);
  const subs = M.propertySubscriptions(id);
  const serviceTypes = M.listServiceTypes();

  // Live pricing preview against this property's turf measurement
  const priceRows = serviceTypes.map(st => `<tr>
      <td>${esc(st.name)} <span class="sub">${esc(label(st.kind))}</span></td>
      <td class="ta-r">${p.turf_sqft ? money(M.priceService(st, p.turf_sqft)) : '<span class="muted">—</span>'}</td>
    </tr>`).join('');

  const histRows = history.length ? history.map(h => `<div class="logitem">
      <div class="logitem__meta">${fmtDate(h.service_date)}${h.technician ? ' · ' + esc(h.technician) : ''}</div>
      <div class="td-strong">${esc(h.service_name)}</div>
      ${h.products ? `<div class="sub">${esc(h.products)}</div>` : ''}
      ${h.notes ? `<div class="muted">${esc(h.notes)}</div>` : ''}
    </div>`).join('') : '<p class="muted">No service history yet.</p>';

  const subRows = subs.length ? subs.map(s => `<tr>
      <td class="td-strong">${esc(s.program_name)}</td><td>${badge(s.status)}</td>
      <td>${s.auto_renew ? 'Auto-renews' : 'Manual'}</td><td class="ta-r">${money(s.price)}</td>
    </tr>`).join('') : `<tr><td colspan="4" class="empty">No active programs.</td></tr>`;

  const body = `
    <div class="crumb"><a href="/accounts">Customers</a> › <a href="/accounts/${p.account_id}">${esc(p.account_name)}</a> › Property</div>
    ${flash(query.flash, 'success')}
    ${pageHeader(p.address, `${esc([p.city, p.state, p.zip].filter(Boolean).join(', '))}`,
      `<a class="btn btn--primary" href="/properties/${id}/estimate">+ Create estimate</a>`)}

    <div class="grid grid--stats">
      ${stat('Turf area', p.turf_sqft ? num(p.turf_sqft) + ' sq ft' : '—', p.measured_at ? 'measured ' + fmtDate(p.measured_at) : 'not measured')}
      ${stat('Beds', p.bed_sqft ? num(p.bed_sqft) + ' sq ft' : '—')}
      ${stat('Active programs', num(subs.length))}
      ${stat('Pets', p.has_pets ? 'Yes' : 'No', esc(p.gate_code ? 'Gate ' + p.gate_code : ''))}
    </div>

    <div class="grid grid--2">
      ${card(`<div class="card__head"><h2>Service history</h2></div><div class="log">${histRows}</div>`)}
      <div class="stack">
        ${card(`<div class="card__head"><h2>Programs</h2></div>
          <table class="table"><tbody>${subRows}</tbody></table>`)}
        ${card(`<div class="card__head"><h2>Price preview</h2></div>
          <p class="muted">Auto-priced from this property's turf measurement.</p>
          <table class="table"><tbody>${priceRows}</tbody></table>`)}
      </div>
    </div>

    ${card(`<div class="card__head"><h2>Update measurement</h2></div>
      <form method="post" action="/properties/${id}/measure" class="form">
        <div class="form__row form__row--3">
          <label>Turf (sq ft)<input name="turf_sqft" inputmode="numeric" value="${esc(p.turf_sqft || '')}"></label>
          <label>Beds (sq ft)<input name="bed_sqft" inputmode="numeric" value="${esc(p.bed_sqft || '')}"></label>
          <label>Lot (sq ft)<input name="lot_sqft" inputmode="numeric" value="${esc(p.lot_sqft || '')}"></label>
        </div>
        <div class="form__row">
          <label>Method<select name="measure_method">
            <option value="manual" ${p.measure_method === 'manual' ? 'selected' : ''}>Manual entry</option>
            <option value="map_draw" ${p.measure_method === 'map_draw' ? 'selected' : ''}>Map draw</option>
            <option value="aerial" ${p.measure_method === 'aerial' ? 'selected' : ''}>Aerial</option>
          </select></label>
          <div class="form__actions form__actions--inline"><button class="btn btn--primary">Save measurement</button></div>
        </div>
      </form>`)}

    ${p.access_notes ? card(`<div class="card__head"><h2>Access notes</h2></div><p>${esc(p.access_notes)}</p>`) : ''}`;
  return layout({ title: p.address, active: 'accounts', org: org(), body });
}

// ---- Search results --------------------------------------------------------
export function searchResults(term) {
  const t = (term || '').trim();
  const r = t ? M.search(t) : { accounts: [], properties: [], contacts: [] };
  const section = (title, items, render) => `<div class="card__head"><h2>${title} <span class="muted">(${items.length})</span></h2></div>
    ${items.length ? items.map(render).join('') : '<p class="muted">No matches.</p>'}`;

  const body = `
    ${pageHeader('Search', t ? `Results for “${esc(t)}”` : 'Type a query above')}
    ${card(section('Customers', r.accounts, a => `<a class="rowlink" href="/accounts/${a.id}"><span class="td-strong">${esc(a.name)}</span> ${badge(a.status)}</a>`))}
    ${card(section('Properties', r.properties, p => `<a class="rowlink" href="/properties/${p.id}"><span class="td-strong">${esc(p.address)}</span> <span class="muted">${esc(p.account_name)}</span></a>`))}
    ${card(section('Contacts', r.contacts, c => `<a class="rowlink" href="/accounts/${c.account_id}"><span class="td-strong">${esc(c.name)}</span> <span class="muted">${esc(c.phone || c.email || '')} · ${esc(c.account_name)}</span></a>`))}`;
  return layout({ title: 'Search', active: 'accounts', org: org(), body });
}

// ---- Price book ------------------------------------------------------------
export function pricebook() {
  const types = M.listServiceTypes();
  const programs = M.listPrograms();
  const rule = (st) => {
    if (st.rule_type === 'flat') return `Flat ${money(st.flat_price)}`;
    if (st.rule_type === 'per_unit') return `${money(st.per_unit_price)} / ${num(st.unit_sqft)} sq ft (min ${money(st.min_price)})`;
    return `${money(st.base_price)} up to ${num(st.base_up_to_sqft)} sq ft, +${money(st.per_unit_price)} / ${num(st.unit_sqft)} sq ft`;
  };
  const rows = types.map(st => `<tr>
    <td class="td-strong">${esc(st.name)}</td><td>${esc(label(st.kind))}</td>
    <td>${esc(rule(st))}</td>
    <td class="ta-r">${money(M.priceService(st, 6500))}</td>
  </tr>`).join('');
  const progRows = programs.map(p => `<tr><td class="td-strong">${esc(p.name)}</td><td>${esc(p.description || '')}</td></tr>`).join('');
  const body = `
    ${pageHeader('Price book', 'Area-driven pricing rules that feed estimates')}
    ${card(`<div class="card__head"><h2>Services</h2></div>
      <table class="table"><thead><tr><th>Service</th><th>Type</th><th>Pricing rule</th><th class="ta-r">Example @ 6,500 sq ft</th></tr></thead>
      <tbody>${rows}</tbody></table>`)}
    ${card(`<div class="card__head"><h2>Programs</h2></div>
      <table class="table"><thead><tr><th>Program</th><th>Description</th></tr></thead><tbody>${progRows}</tbody></table>`)}`;
  return layout({ title: 'Price book', active: 'pricebook', org: org(), body });
}

// ===========================================================================
// PHASE 2 — Scheduling, routing & field app
// ===========================================================================
const dow = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
const dayNum = (iso) => new Date(iso + 'T00:00:00').getDate();
const monthShort = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' });

// ---- Scheduling board ------------------------------------------------------
export function schedulePage(query = {}) {
  const wk = M.scheduleWeek(query.week);
  const crews = M.listCrews();
  const s = M.scheduleStats();
  const needs = M.needsScheduling();
  const today = M.todayISO();

  const dayCols = wk.days.map(d => `
    <div class="daycol ${d.date === today ? 'is-today' : ''}">
      <div class="daycol__head">
        <span class="daycol__dow">${dow(d.date)}</span>
        <span class="daycol__num">${dayNum(d.date)}</span>
      </div>
      <div class="daycol__body">
        ${d.visits.map(v => `
          <a class="vchip" style="--c:${esc(v.crew_color || '#8a998f')}"
             href="/routes?crew=${v.crew_id || ''}&date=${d.date}"
             title="${esc(v.account_name)} — ${esc(v.name)} (${esc(v.crew_name || 'Unassigned')})">
            ${v.seq ? `<span class="vchip__seq">${v.seq}</span>` : ''}
            <span class="vchip__body"><span class="vchip__acct">${esc(v.account_name)}</span>
            <span class="vchip__svc">${esc(v.name)}</span></span>
          </a>`).join('') || '<div class="daycol__empty">—</div>'}
      </div>
    </div>`).join('');

  const crewOpts = crews.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const needRows = needs.length ? needs.map(v => `
    <form class="assignrow" method="post" action="/visits/${v.id}/assign">
      <div class="assignrow__info">
        <span class="td-strong">${esc(v.account_name)}</span>
        <span class="sub">${esc(v.name)} · ${esc(v.address)}, ${esc(v.city)}</span>
        <span class="sub">target window ${fmtDate(v.window_start)} – ${fmtDate(v.window_end)}</span>
      </div>
      <input type="date" name="scheduled_date" required aria-label="Date">
      <select name="crew_id" aria-label="Crew">${crewOpts}</select>
      <button class="btn btn--sm btn--primary">Assign</button>
    </form>`).join('') : '<p class="muted">Nothing awaiting a date. 🎉</p>';

  const legend = crews.map(c => `<span class="legend__item"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</span>`).join('');

  const body = `
    ${flash(query.flash, 'success')}
    ${pageHeader('Schedule', `${fmtDate(wk.start)} – ${fmtDate(wk.end)}`,
      `<a class="btn" href="/schedule?week=${wk.prev}">‹ Prev</a>
       <a class="btn" href="/schedule">This week</a>
       <a class="btn" href="/schedule?week=${wk.next}">Next ›</a>`)}

    <div class="grid grid--stats">
      ${stat('Needs scheduling', num(s.needs), 'awaiting a date')}
      ${stat('Scheduled', num(s.scheduled), 'assigned to crews')}
      ${stat('Completed', num(s.completed), 'this season')}
      ${stat('Crews', num(crews.length))}
    </div>

    ${card(`<div class="card__head"><h2>Week board</h2><div class="legend">${legend}</div></div>
      <div class="board">${dayCols}</div>`)}

    ${card(`<div class="card__head"><h2>Needs scheduling</h2><span class="muted">${num(needs.length)} visit${needs.length === 1 ? '' : 's'} coming due</span></div>
      <div class="assignlist">${needRows}</div>`)}`;
  return layout({ title: 'Schedule', active: 'schedule', org: org(), body });
}

// ---- Routes index ----------------------------------------------------------
export function routeIndexPage() {
  const days = M.routeDays();
  const cards = days.length ? days.map(d => `
    <a class="routecard" href="/routes?crew=${d.crew_id}&date=${d.date}">
      <div class="routecard__date"><span>${dow(d.date)}</span><strong>${monthShort(d.date)} ${dayNum(d.date)}</strong></div>
      <div class="routecard__crew"><span class="dot" style="background:${esc(d.crew_color)}"></span>${esc(d.crew_name)}</div>
      <div class="routecard__stops">${num(d.stops)} stop${d.stops === 1 ? '' : 's'}</div>
    </a>`).join('') : '<p class="muted">No routes yet. Assign visits to a crew and date on the Schedule board.</p>';
  const body = `
    ${pageHeader('Routes', 'Optimize a crew’s day and map the run')}
    ${card(`<div class="card__head"><h2>Upcoming crew days</h2></div><div class="routegrid">${cards}</div>`)}`;
  return layout({ title: 'Routes', active: 'routes', org: org(), body });
}

// ---- Route detail (optimize + map) ----------------------------------------
export function routePage(query = {}) {
  const crew = query.crew, date = query.date;
  if (!crew || !date) return routeIndexPage();

  const crewObj = M.getCrew(Number(crew));
  const depot = M.getDepot();
  const stops = M.routeStops(crew, date);
  const stats = M.routeStats(stops, depot);
  const optimized = stops.length > 0 && stops.every(s => s.seq != null);

  const rows = stops.map((s, i) => `
    <tr>
      <td class="seqcell">${s.seq ?? (i + 1)}</td>
      <td class="td-strong">${esc(s.account_name)}<span class="sub">${esc(s.address)}, ${esc(s.city)}</span></td>
      <td class="ta-r">${s.turf_sqft ? num(s.turf_sqft) + ' sq ft' : '—'}</td>
      <td>${esc(s.name)}</td>
      <td class="rowtools">
        <form method="post" action="/visits/${s.id}/move" class="i"><input type="hidden" name="dir" value="up"><input type="hidden" name="crew" value="${crew}"><input type="hidden" name="date" value="${date}"><button ${i === 0 ? 'disabled' : ''} title="Move up">↑</button></form>
        <form method="post" action="/visits/${s.id}/move" class="i"><input type="hidden" name="dir" value="down"><input type="hidden" name="crew" value="${crew}"><input type="hidden" name="date" value="${date}"><button ${i === stops.length - 1 ? 'disabled' : ''} title="Move down">↓</button></form>
        <a class="link" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" target="_blank" rel="noopener">Map ↗</a>
      </td>
    </tr>`).join('');

  const body = `
    <div class="crumb"><a href="/routes">Routes</a> › ${esc(crewObj?.name || 'Crew')} · ${fmtDate(date)}</div>
    ${flash(query.flash, 'success')}
    ${pageHeader(`${esc(crewObj?.name || 'Route')}`, `${fmtDate(date)} · departs & returns to ${esc(depot.name)}`,
      `<a class="btn" href="/field?crew=${crew}&date=${date}">Field view</a>
       <form method="post" action="/routes/optimize" class="i"><input type="hidden" name="crew" value="${crew}"><input type="hidden" name="date" value="${date}"><button class="btn btn--primary">⟳ Optimize route</button></form>`)}

    <div class="grid grid--stats">
      ${stat('Stops', num(stats.stops))}
      ${stat('Drive distance', stats.miles + ' mi', optimized ? 'optimized' : 'not optimized')}
      ${stat('Drive time', stats.driveMin + ' min')}
      ${stat('Total day', Math.floor(stats.totalMin / 60) + 'h ' + (stats.totalMin % 60) + 'm', 'incl. service')}
    </div>

    ${card(`<div class="card__head"><h2>Route map</h2>${optimized ? '' : '<span class="tag tag--warn">optimize to sequence</span>'}</div>
      ${buildRouteSVG(depot, stops)}
      <p class="muted route-note">Straight-line distances from the depot (demo). Production swaps in a road-network distance matrix from a maps provider.</p>`)}

    ${card(`<div class="card__head"><h2>Stops</h2></div>
      <table class="table"><thead><tr><th>#</th><th>Customer</th><th class="ta-r">Turf</th><th>Service</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">No stops assigned to this crew for this day.</td></tr>'}</tbody></table>`)}`;
  return layout({ title: 'Route', active: 'routes', org: org(), body });
}

// Self-contained SVG route map (no external tiles/deps)
function buildRouteSVG(depot, stops) {
  const W = 720, H = 430, pad = 46;
  const geo = stops.filter(s => s.lat != null && s.lng != null);
  const pts = [{ lat: depot.lat, lng: depot.lng, depot: true }, ...geo];
  if (pts.length < 2) return `<div class="mapph">Add located stops to see the route map.</div>`;

  const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = (maxLat - minLat) || 0.01, spanLng = (maxLng - minLng) || 0.01;
  minLat -= spanLat * 0.12; maxLat += spanLat * 0.12;
  minLng -= spanLng * 0.12; maxLng += spanLng * 0.12;
  const X = (lng) => pad + (lng - minLng) / (maxLng - minLng) * (W - 2 * pad);
  const Y = (lat) => pad + (maxLat - lat) / (maxLat - minLat) * (H - 2 * pad);

  const dpx = X(depot.lng), dpy = Y(depot.lat);
  // Path: depot -> stops (in seq order) -> depot
  const ordered = geo.every(s => s.seq != null)
    ? [...geo].sort((a, b) => a.seq - b.seq) : geo;
  const path = [[dpx, dpy], ...ordered.map(s => [X(s.lng), Y(s.lat)]), [dpx, dpy]];
  const poly = path.map(p => p.join(',')).join(' ');

  const stopMarks = ordered.map((s, i) => {
    const x = X(s.lng), y = Y(s.lat);
    return `<g class="mk">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="${esc(s.crew_color || '#2f855a')}"/>
      <text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="mk__t">${s.seq ?? (i + 1)}</text>
      <title>${esc(s.account_name)} — ${esc(s.address)}</title>
    </g>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="routemap" role="img" aria-label="Route map">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#f2f7f3"/>
    <polyline points="${poly}" fill="none" stroke="#9db3a5" stroke-width="2.5" stroke-dasharray="6 5"/>
    <g>
      <rect x="${(dpx - 11).toFixed(1)}" y="${(dpy - 11).toFixed(1)}" width="22" height="22" rx="4" fill="#14401f"/>
      <text x="${dpx.toFixed(1)}" y="${(dpy + 4).toFixed(1)}" text-anchor="middle" class="mk__t">◆</text>
      <title>Depot — ${esc(depot.name)}</title>
    </g>
    ${stopMarks}
  </svg>`;
}

// ---- Technician field app --------------------------------------------------
export function fieldPage(query = {}) {
  let crew = query.crew, date = query.date;
  if (!crew || !date) {
    const first = M.routeDays()[0];
    if (first) { crew = crew || first.crew_id; date = date || first.date; }
  }
  const crews = M.listCrews();
  if (!crew || !date) { crew = crews[0]?.id; date = M.todayISO(); }

  const crewObj = M.getCrew(Number(crew));
  const stops = M.routeStops(crew, date);
  const done = stops.filter(s => s.status === 'completed').length;

  const crewLinks = crews.map(c => `<a class="chip ${String(c.id) === String(crew) ? 'is-on' : ''}" href="/field?crew=${c.id}&date=${date}">${esc(c.name)}</a>`).join('');

  const stopCards = stops.length ? stops.map((s, i) => `
    <div class="stopcard ${s.status === 'completed' ? 'is-done' : ''}">
      <div class="stopcard__seq">${s.seq ?? (i + 1)}</div>
      <div class="stopcard__main">
        <div class="stopcard__top">
          <span class="td-strong">${esc(s.account_name)}</span>
          ${s.status === 'completed' ? '<span class="badge badge--paid">Done</span>' : ''}
        </div>
        <div class="sub">${esc(s.address)}, ${esc(s.city)}</div>
        <div class="stopcard__svc">${esc(s.name)}${s.turf_sqft ? ` · ${num(s.turf_sqft)} sq ft` : ''}</div>
        ${s.has_pets || s.gate_code || s.access_notes ? `<div class="stopcard__flags">
          ${s.has_pets ? '<span class="flagpill">🐾 Pets</span>' : ''}
          ${s.gate_code ? `<span class="flagpill">🔒 Gate ${esc(s.gate_code)}</span>` : ''}
          ${s.access_notes ? `<span class="flagpill">ⓘ ${esc(s.access_notes)}</span>` : ''}
        </div>` : ''}
        <div class="stopcard__actions">
          <a class="btn btn--sm" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" target="_blank" rel="noopener">Navigate</a>
          ${s.status === 'completed'
            ? `<span class="muted">Completed ${fmtDate(s.completed_at)}</span>`
            : `<form method="post" action="/visits/${s.id}/complete" class="i">
                 <input type="hidden" name="crew" value="${crew}"><input type="hidden" name="date" value="${date}">
                 <button class="btn btn--sm btn--primary">✓ Mark complete</button>
               </form>`}
        </div>
      </div>
    </div>`).join('') : '<p class="muted">No stops for this crew on this day.</p>';

  const body = `
    ${flash(query.flash, 'success')}
    ${pageHeader('Field app', `${esc(crewObj?.name || 'Crew')} · ${fmtDate(date)}`,
      `<a class="btn" href="/routes?crew=${crew}&date=${date}">Route &amp; map</a>`)}
    <div class="fieldbar">
      <div class="chips">${crewLinks}</div>
      <div class="progress"><span class="progress__label">${done} / ${stops.length} done</span>
        <span class="progress__bar"><span style="width:${stops.length ? Math.round(done / stops.length * 100) : 0}%"></span></span></div>
    </div>
    <div class="stoplist">${stopCards}</div>`;
  return layout({ title: 'Field app', active: 'field', org: org(), body });
}

// ===========================================================================
// PHASE 3 — Estimates, invoicing & payments
// ===========================================================================

// ---- Estimates index -------------------------------------------------------
export function estimatesIndex(query = {}) {
  const status = query.status || null;
  const ests = M.listEstimates(status);
  const s = M.estimateStats();
  const filters = ['', 'draft', 'sent', 'approved', 'declined'].map(st => {
    const on = (st || null) === status;
    return `<a class="chip ${on ? 'is-on' : ''}" href="${st ? `/estimates?status=${st}` : '/estimates'}">${st ? label(st) : 'All'}</a>`;
  }).join('');
  const rows = ests.map(e => `<tr onclick="location='/estimates/${e.id}'">
      <td>#${e.id}</td>
      <td class="td-strong">${esc(e.account_name)}<span class="sub">${esc(e.address)}</span></td>
      <td>${badge(e.status)}</td>
      <td>${fmtDate(e.created_at)}</td>
      <td class="ta-r td-strong">${money(e.subtotal)}</td>
    </tr>`).join('');
  const body = `
    ${flash(query.flash, 'success')}
    ${pageHeader('Estimates', `${num(ests.length)} estimate${ests.length === 1 ? '' : 's'}`,
      '<a class="btn btn--primary" href="/estimates/new">+ New estimate</a>')}
    <div class="grid grid--stats">
      ${stat('Draft', num(s.draft))}
      ${stat('Sent', num(s.sent), 'awaiting approval')}
      ${stat('Approved', num(s.approved), 'won')}
      ${stat('Total', num(s.draft + s.sent + s.approved))}
    </div>
    <div class="chips">${filters}</div>
    ${card(`<table class="table table--hover">
      <thead><tr><th>#</th><th>Customer</th><th>Status</th><th>Created</th><th class="ta-r">Amount</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">No estimates yet.</td></tr>'}</tbody></table>`)}`;
  return layout({ title: 'Estimates', active: 'estimates', org: org(), body });
}

// ---- New estimate: property picker ----------------------------------------
export function estimatePicker() {
  // Simple picker: list every property with its account
  const rows = M.listAllProperties().map(p =>`<tr onclick="location='/properties/${p.id}/estimate'">
      <td class="td-strong">${esc(p.account_name)}</td>
      <td>${esc(p.address)}, ${esc(p.city || '')}</td>
      <td class="ta-r">${p.turf_sqft ? num(p.turf_sqft) + ' sq ft' : '<span class="muted">not measured</span>'}</td>
      <td class="ta-r"><span class="link">Build estimate ›</span></td>
    </tr>`).join('');
  const body = `
    ${pageHeader('New estimate', 'Choose a property to estimate')}
    ${card(`<table class="table table--hover">
      <thead><tr><th>Customer</th><th>Property</th><th class="ta-r">Turf</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>`)}`;
  return layout({ title: 'New estimate', active: 'estimates', org: org(), body });
}

// ---- Estimate builder ------------------------------------------------------
export function estimateBuilder(propertyId) {
  const p = M.getProperty(propertyId);
  if (!p) return null;
  const turf = p.turf_sqft || 0;
  const prog = M.getProgram();
  const pp = M.priceProgram(prog.id, turf);
  const oneoffs = M.listServiceTypes().filter(s => s.kind === 'onetime');
  const existing = M.openEstimateForProperty(propertyId);

  const roundList = pp.lines.map(l => `<div class="pline"><span>${esc(l.name)}</span><span>${money(l.price)}</span></div>`).join('');
  const oneoffRows = oneoffs.map(st => `
    <label class="pick">
      <input type="checkbox" name="svc_${st.id}" value="1">
      <span class="pick__name">${esc(st.name)}</span>
      <span class="pick__price">${money(M.priceService(st, turf))}</span>
    </label>`).join('');

  const body = `
    <div class="crumb"><a href="/accounts/${p.account_id}">${esc(p.account_name)}</a> › ${esc(p.address)} › Estimate</div>
    ${existing ? flash(`This property already has an open estimate (#${existing.id}). Creating a new one is allowed, but you may want to review it first.`, 'warn') : ''}
    ${pageHeader('Build estimate', `${esc(p.account_name)} · ${esc(p.address)} · ${turf ? num(turf) + ' sq ft turf' : 'not measured'}`)}
    <form method="post" action="/properties/${propertyId}/estimate">
      ${card(`<div class="card__head"><h2>Season program</h2></div>
        <label class="pick pick--program">
          <input type="checkbox" name="program" value="1" checked>
          <span class="pick__name">${esc(prog.name)}<span class="sub">${esc(prog.description || '')}</span></span>
          <span class="pick__price">${money(pp.total)}</span>
        </label>
        <div class="plines">${roundList}</div>`)}
      ${card(`<div class="card__head"><h2>Add-on services</h2></div>
        <div class="picklist">${oneoffRows || '<p class="muted">No one-time services in the price book.</p>'}</div>`)}
      <div class="form__actions">
        <a class="btn" href="/properties/${propertyId}">Cancel</a>
        <button class="btn btn--primary">Create estimate</button>
      </div>
    </form>`;
  return layout({ title: 'Build estimate', active: 'estimates', org: org(), body });
}

// ---- Estimate detail -------------------------------------------------------
export function estimateDetail(id, query = {}) {
  const e = M.getEstimate(id);
  if (!e) return null;
  const lines = M.estimateLines(id);
  const lineRows = lines.map(l => `<tr>
      <td class="td-strong">${esc(l.description)}${l.program_id ? ' <span class="tag">program</span>' : ''}</td>
      <td class="ta-r">${l.sqft ? num(l.sqft) + ' sq ft' : ''}</td>
      <td class="ta-r td-strong">${money(l.price)}</td>
    </tr>`).join('');

  const link = `/e/${e.token}`;
  let actions = '';
  if (e.status === 'draft') {
    actions = `<form method="post" action="/estimates/${id}/send" class="i"><button class="btn btn--primary">Send to customer</button></form>`;
  } else if (e.status === 'sent') {
    actions = `<a class="btn" href="${link}" target="_blank">View as customer ↗</a>
      <form method="post" action="/estimates/${id}/approve" class="i"><button class="btn btn--primary">Mark approved</button></form>`;
  }

  const statusPanel = e.status === 'sent'
    ? card(`<div class="card__head"><h2>Customer approval link</h2></div>
        <p class="muted">Send this hosted link — the customer can approve or decline without logging in.</p>
        <div class="linkbox">${esc(BASE + link)}</div>
        <div class="form__actions"><a class="btn btn--primary" href="${link}" target="_blank">Open approval page ↗</a></div>`)
    : e.status === 'approved'
      ? card(`<div class="flashcard flashcard--ok">✓ Approved — converted into a subscription and visits. <a class="link" href="/schedule">Go to schedule ›</a></div>`)
      : e.status === 'declined'
        ? card(`<div class="flashcard flashcard--no">Declined by customer.</div>`)
        : '';

  const body = `
    <div class="crumb"><a href="/estimates">Estimates</a> › #${id}</div>
    ${flash(query.flash, 'success')}
    ${pageHeader(`Estimate #${id}`, `${esc(e.account_name)} · ${esc(e.address)}`,
      `${badge(e.status)} &nbsp; ${actions}`)}
    ${statusPanel}
    ${card(`<table class="table">
      <thead><tr><th>Service</th><th class="ta-r">Size</th><th class="ta-r">Price</th></tr></thead>
      <tbody>${lineRows}</tbody>
      <tfoot><tr><td colspan="2" class="ta-r td-strong">Total</td><td class="ta-r td-strong">${money(e.subtotal)}</td></tr></tfoot>
    </table>`)}`;
  return layout({ title: `Estimate #${id}`, active: 'estimates', org: org(), body });
}

// ---- Public estimate approval (hosted, no login) --------------------------
export function publicEstimate(tokenStr) {
  const e = M.getEstimateByToken(tokenStr);
  if (!e) return null;
  const lines = M.estimateLines(e.id);
  const lineRows = lines.map(l => `<tr><td>${esc(l.description)}</td><td class="ta-r">${money(l.price)}</td></tr>`).join('');
  const decided = e.status === 'approved' || e.status === 'declined';
  const body = `
    <div class="pubcard">
      <div class="pubcard__head">
        <h1>Your estimate</h1>
        <p class="muted">Prepared for ${esc(e.account_name)} · ${esc(e.address)}</p>
      </div>
      <table class="table">
        <thead><tr><th>Service</th><th class="ta-r">Price</th></tr></thead>
        <tbody>${lineRows}</tbody>
        <tfoot><tr><td class="td-strong ta-r">Total</td><td class="ta-r td-strong">${money(e.subtotal)}</td></tr></tfoot>
      </table>
      ${decided
        ? `<div class="flashcard ${e.status === 'approved' ? 'flashcard--ok' : 'flashcard--no'}">
             You have ${e.status === 'approved' ? 'approved' : 'declined'} this estimate. Thank you.</div>`
        : `<div class="pubactions">
             <form method="post" action="/e/${esc(tokenStr)}/decline" class="i"><button class="btn">Decline</button></form>
             <form method="post" action="/e/${esc(tokenStr)}/approve" class="i"><button class="btn btn--primary btn--lg">✓ Approve &amp; schedule my service</button></form>
           </div>`}
    </div>`;
  return publicLayout({ title: 'Your estimate', org: org(), body });
}

// ---- Invoices index + receivables -----------------------------------------
export function invoicesIndex(query = {}) {
  const status = query.status || null;
  const invs = M.listInvoices(status);
  const s = M.invoiceStats();
  const ag = M.receivablesAging();
  const filters = ['', 'open', 'overdue', 'paid'].map(st => {
    const on = (st || null) === status;
    return `<a class="chip ${on ? 'is-on' : ''}" href="${st ? `/invoices?status=${st}` : '/invoices'}">${st ? label(st) : 'All'}</a>`;
  }).join('');
  const rows = invs.map(i => `<tr onclick="location='/invoices/${i.id}'">
      <td>#${i.id}</td>
      <td class="td-strong">${esc(i.account_name)}</td>
      <td>${badge(i.status)}</td>
      <td>${fmtDate(i.issued_date)}</td>
      <td>${fmtDate(i.due_date)}</td>
      <td class="ta-r">${money(i.subtotal)}</td>
      <td class="ta-r ${i.balance > 0 ? 'owe' : ''}">${money(i.balance)}</td>
    </tr>`).join('');

  const aging = `<div class="aging">
      ${agingTile('Current', ag.buckets.current)}
      ${agingTile('1–30 days', ag.buckets.d30)}
      ${agingTile('31–60 days', ag.buckets.d60)}
      ${agingTile('60+ days', ag.buckets.d90, true)}
    </div>`;

  const body = `
    ${flash(query.flash, 'success')}
    ${pageHeader('Invoices', 'Billing & receivables',
      `<form method="post" action="/invoices/generate" class="i"><button class="btn">⚙ Generate from completed work</button></form>
       <form method="post" action="/invoices/autopay" class="i"><button class="btn btn--primary">⚡ Run autopay</button></form>`)}
    <div class="grid grid--stats">
      ${stat('Accounts receivable', money(s.ar), `${num(s.open + s.overdue)} unpaid`)}
      ${stat('Overdue', num(s.overdue), 'past due date')}
      ${stat('Collected', money(s.collected), 'this season')}
      ${stat('Open', num(s.open))}
    </div>
    ${card(`<div class="card__head"><h2>Receivables aging</h2></div>${aging}`)}
    <div class="chips">${filters}</div>
    ${card(`<table class="table table--hover">
      <thead><tr><th>#</th><th>Customer</th><th>Status</th><th>Issued</th><th>Due</th><th class="ta-r">Total</th><th class="ta-r">Balance</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="empty">No invoices yet. Use “Generate from completed work”.</td></tr>'}</tbody></table>`)}`;
  return layout({ title: 'Invoices', active: 'invoices', org: org(), body });
}
function agingTile(labelText, value, warn = false) {
  return `<div class="aging__tile ${warn && value > 0 ? 'is-warn' : ''}">
    <div class="aging__label">${esc(labelText)}</div><div class="aging__val">${money(value)}</div></div>`;
}

// ---- Invoice detail --------------------------------------------------------
export function invoiceDetail(id, query = {}) {
  const i = M.getInvoice(id);
  if (!i) return null;
  const lines = M.invoiceLines(id);
  const lineRows = lines.map(l => `<tr><td>${esc(l.description)}</td><td class="ta-r td-strong">${money(l.amount)}</td></tr>`).join('');
  const link = `/i/${i.token}`;
  const body = `
    <div class="crumb"><a href="/invoices">Invoices</a> › #${id}</div>
    ${flash(query.flash, 'success')}
    ${pageHeader(`Invoice #${id}`, `<a class="link" href="/accounts/${i.account_id}">${esc(i.account_name)}</a> · ${esc(label(i.terms || i.account_terms))} billing`,
      `${badge(i.status)}`)}
    <div class="grid grid--stats">
      ${stat('Total', money(i.subtotal))}
      ${stat('Paid', money(i.amount_paid))}
      ${stat('Balance', money(i.balance))}
      ${stat('Due', fmtDate(i.due_date))}
    </div>
    ${card(`<table class="table">
      <thead><tr><th>Service</th><th class="ta-r">Amount</th></tr></thead>
      <tbody>${lineRows}</tbody>
      <tfoot><tr><td class="ta-r td-strong">Total</td><td class="ta-r td-strong">${money(i.subtotal)}</td></tr></tfoot>
    </table>`)}
    ${i.balance > 0 ? `<div class="grid grid--2">
      ${card(`<div class="card__head"><h2>Record a payment</h2></div>
        <form method="post" action="/invoices/${id}/pay" class="form">
          <div class="form__row">
            <label>Amount<input name="amount" inputmode="decimal" value="${i.balance.toFixed(2)}"></label>
            <label>Method<select name="method"><option value="card">Card</option><option value="ach">ACH</option><option value="check">Check</option><option value="cash">Cash</option></select></label>
          </div>
          <div class="form__actions"><button class="btn btn--primary">Record payment</button></div>
        </form>`)}
      ${card(`<div class="card__head"><h2>Customer pay link</h2></div>
        <p class="muted">Hosted, tokenized payment page — no login required.</p>
        <div class="linkbox">${esc(BASE + link)}</div>
        <div class="form__actions"><a class="btn" href="${link}" target="_blank">Open pay page ↗</a></div>`)}
    </div>` : card(`<div class="flashcard flashcard--ok">✓ Paid in full.</div>`)}`;
  return layout({ title: `Invoice #${id}`, active: 'invoices', org: org(), body });
}

// ---- Public invoice pay (hosted) ------------------------------------------
export function publicInvoice(tokenStr) {
  const i = M.getInvoiceByToken(tokenStr);
  if (!i) return null;
  const lines = M.invoiceLines(i.id);
  const lineRows = lines.map(l => `<tr><td>${esc(l.description)}</td><td class="ta-r">${money(l.amount)}</td></tr>`).join('');
  const paid = i.balance <= 0;
  const body = `
    <div class="pubcard">
      <div class="pubcard__head"><h1>Invoice #${i.id}</h1>
        <p class="muted">${esc(i.account_name)} · due ${fmtDate(i.due_date)}</p></div>
      <table class="table"><thead><tr><th>Service</th><th class="ta-r">Amount</th></tr></thead>
        <tbody>${lineRows}</tbody>
        <tfoot><tr><td class="td-strong ta-r">Balance due</td><td class="ta-r td-strong">${money(i.balance)}</td></tr></tfoot></table>
      ${paid
        ? `<div class="flashcard flashcard--ok">✓ This invoice is paid in full. Thank you!</div>`
        : `<form method="post" action="/i/${esc(tokenStr)}/pay" class="pubactions">
             <button class="btn btn--primary btn--lg">Pay ${money(i.balance)} now</button>
           </form>
           <p class="muted pubnote">Demo checkout — records the payment instantly (no real card is charged).</p>`}
    </div>`;
  return publicLayout({ title: `Invoice #${i.id}`, org: org(), body });
}

// ---- Placeholder for later phases -----------------------------------------
export function comingSoon(name, key) {
  const body = `${pageHeader(name, 'Planned for an upcoming phase')}
    ${card(`<div class="soon">
      <div class="soon__icon">⧗</div>
      <h2>${esc(name)} is on the roadmap</h2>
      <p class="muted">The database schema and pricing engine for this module are already in place. The interface arrives in the next build phase.</p>
      <a class="btn btn--primary" href="/">Back to dashboard</a>
    </div>`)}`;
  return layout({ title: name, active: key, org: org(), body });
}
