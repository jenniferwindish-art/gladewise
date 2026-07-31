// Bladewise — server-side HTML rendering (no framework, no deps)

export function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function money(n) {
  const v = Number(n || 0);
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function num(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('en-US');
}

export function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  if (isNaN(d)) return esc(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_LABELS = {
  active: 'Active', prospect: 'Prospect', hold: 'On hold', cancelled: 'Cancelled',
  open: 'Open', paid: 'Paid', overdue: 'Overdue', void: 'Void',
  per_service: 'Per service', prepay: 'Prepay', installment: 'Installment',
  draft: 'Draft', sent: 'Sent', approved: 'Approved', declined: 'Declined',
};
export function label(v) { return STATUS_LABELS[v] || v || '—'; }

export function badge(status) {
  return `<span class="badge badge--${esc(status)}">${esc(label(status))}</span>`;
}

const NAV = [
  { href: '/', key: 'dashboard', icon: '▤', label: 'Dashboard' },
  { href: '/accounts', key: 'accounts', icon: '◍', label: 'Customers' },
  { href: '/schedule', key: 'schedule', icon: '▦', label: 'Schedule' },
  { href: '/routes', key: 'routes', icon: '⇢', label: 'Routes' },
  { href: '/field', key: 'field', icon: '◎', label: 'Field app' },
  { href: '/estimates', key: 'estimates', icon: '▧', label: 'Estimates' },
  { href: '/invoices', key: 'invoices', icon: '▨', label: 'Invoices' },
  { href: '/notifications', key: 'notifications', icon: '◔', label: 'Activity' },
  { href: '/reports', key: 'reports', icon: '▥', label: 'Reports' },
  { href: '/pricebook', key: 'pricebook', icon: '☰', label: 'Price book' },
];

export function layout({ title, active, body, org }) {
  const nav = NAV.map(n => `
    <a class="nav__item ${n.key === active ? 'is-active' : ''} ${n.soon ? 'is-soon' : ''}" href="${n.href}">
      <span class="nav__icon">${n.icon}</span><span>${n.label}</span>
      ${n.soon ? '<span class="nav__soon">soon</span>' : ''}
    </a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Bladewise</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand"><span class="brand__mark">✦</span> Bladewise</div>
    <nav class="nav">${nav}</nav>
    <div class="sidebar__foot">
      <div class="org">${esc(org?.name || 'Your Company')}</div>
      <div class="org__sub">Full platform</div>
    </div>
  </aside>
  <main class="main">
    <header class="topbar">
      <form class="search" action="/search" method="get" autocomplete="off">
        <input type="search" name="q" placeholder="Search customers, addresses, phone…" aria-label="Search">
      </form>
      <a class="btn btn--primary" href="/accounts/new">+ New customer</a>
    </header>
    <div class="content">${body}</div>
  </main>
</div>
<script src="/app.js" defer></script>
</body>
</html>`;
}

export function pageHeader(title, sub, actions = '') {
  return `<div class="pagehead">
    <div><h1>${esc(title)}</h1>${sub ? `<p class="pagehead__sub">${sub}</p>` : ''}</div>
    <div class="pagehead__actions">${actions}</div>
  </div>`;
}

export function card(inner, cls = '') {
  return `<section class="card ${cls}">${inner}</section>`;
}

export function stat(labelText, value, sub = '') {
  return `<div class="stat">
    <div class="stat__label">${esc(labelText)}</div>
    <div class="stat__value">${value}</div>
    ${sub ? `<div class="stat__sub">${sub}</div>` : ''}
  </div>`;
}

export function flash(msg, type = 'success') {
  if (!msg) return '';
  return `<div class="flash flash--${esc(type)}">${esc(msg)}</div>`;
}

// Minimal, sidebar-less layout for customer-facing (hosted) pages
export function publicLayout({ title, body, org }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><link rel="stylesheet" href="/styles.css">
</head>
<body class="public">
  <div class="pubwrap">
    <div class="pubbrand"><span class="brand__mark">✦</span> ${esc(org?.name || 'Bladewise')}</div>
    ${body}
    <div class="pubfoot">Powered by <strong>Bladewise</strong></div>
  </div>
</body></html>`;
}
