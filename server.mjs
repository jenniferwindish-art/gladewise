// Bladewise — HTTP server & router. Node standard library only.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { initSchema, tableCount } from './src/db.mjs';
import { ensureSeed } from './src/seed.mjs';
import * as P from './src/pages.mjs';
import * as M from './src/models.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

initSchema();
if (tableCount('organizations') === 0) ensureSeed();

const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// Small helpers -------------------------------------------------------------
function send(res, status, body, type = 'text/html; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}
function redirect(res, location) {
  res.writeHead(303, { Location: location });
  res.end();
}
function notFound(res) {
  send(res, 404, P.comingSoon ? renderNotFound() : 'Not found');
}
function renderNotFound() {
  return `<!doctype html><meta charset=utf-8><title>Not found</title>
  <link rel=stylesheet href=/public/styles.css>
  <div style="padding:60px;text-align:center;font-family:system-ui">
  <h1>404</h1><p>That page doesn't exist.</p><a class="btn btn--primary" href="/">Back to dashboard</a></div>`;
}
async function parseBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  const params = new URLSearchParams(raw);
  const obj = {};
  for (const [k, v] of params) obj[k] = v;
  return obj;
}

// Router --------------------------------------------------------------------
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;
    const query = Object.fromEntries(url.searchParams);

    // Static assets
    if (path.startsWith('/public/')) return serveStatic(res, path);
    if (path === '/favicon.ico') return send(res, 204, '');

    // ---- GET routes ----
    if (req.method === 'GET') {
      if (path === '/') return send(res, 200, P.dashboard());
      if (path === '/accounts') return send(res, 200, P.accountsList(query));
      if (path === '/accounts/new') return send(res, 200, P.accountForm());
      if (path === '/search') return send(res, 200, P.searchResults(query.q));
      if (path === '/pricebook') return send(res, 200, P.pricebook());
      if (path === '/notifications') return send(res, 200, P.notificationsPage());
      if (path === '/schedule') return send(res, 200, P.schedulePage(query));
      if (path === '/routes') return send(res, 200, P.routePage(query));
      if (path === '/field') return send(res, 200, P.fieldPage(query));
      if (path === '/estimates') return send(res, 200, P.estimatesIndex(query));
      if (path === '/estimates/new') return send(res, 200, P.estimatePicker());
      if (path === '/invoices') return send(res, 200, P.invoicesIndex(query));

      let m;
      if ((m = path.match(/^\/estimates\/(\d+)$/))) {
        const html = P.estimateDetail(+m[1], query); return html ? send(res, 200, html) : notFound(res);
      }
      if ((m = path.match(/^\/properties\/(\d+)\/estimate$/))) {
        const html = P.estimateBuilder(+m[1]); return html ? send(res, 200, html) : notFound(res);
      }
      if ((m = path.match(/^\/invoices\/(\d+)$/))) {
        const html = P.invoiceDetail(+m[1], query); return html ? send(res, 200, html) : notFound(res);
      }
      if ((m = path.match(/^\/e\/([a-z0-9]+)$/))) {
        const html = P.publicEstimate(m[1]); return html ? send(res, 200, html) : notFound(res);
      }
      if ((m = path.match(/^\/i\/([a-z0-9]+)$/))) {
        const html = P.publicInvoice(m[1]); return html ? send(res, 200, html) : notFound(res);
      }
      if ((m = path.match(/^\/accounts\/(\d+)$/))) {
        const html = P.accountDetail(+m[1], query); return html ? send(res, 200, html) : notFound(res);
      }
      if ((m = path.match(/^\/accounts\/(\d+)\/edit$/))) {
        const a = M.getAccount(+m[1]); return a ? send(res, 200, P.accountForm(a)) : notFound(res);
      }
      if ((m = path.match(/^\/accounts\/(\d+)\/contacts\/new$/))) {
        const html = P.contactForm(+m[1]); return html ? send(res, 200, html) : notFound(res);
      }
      if ((m = path.match(/^\/accounts\/(\d+)\/properties\/new$/))) {
        const html = P.propertyForm(+m[1]); return html ? send(res, 200, html) : notFound(res);
      }
      if ((m = path.match(/^\/properties\/(\d+)$/))) {
        const html = P.propertyDetail(+m[1], query); return html ? send(res, 200, html) : notFound(res);
      }
      return notFound(res);
    }

    // ---- POST routes ----
    if (req.method === 'POST') {
      const data = await parseBody(req);
      let m;
      if (path === '/accounts/new') {
        const id = M.createAccount(data); return redirect(res, `/accounts/${id}?flash=Customer+created`);
      }
      if ((m = path.match(/^\/accounts\/(\d+)\/edit$/))) {
        M.updateAccount(+m[1], data); return redirect(res, `/accounts/${m[1]}?flash=Changes+saved`);
      }
      if ((m = path.match(/^\/accounts\/(\d+)\/contacts\/new$/))) {
        M.createContact(+m[1], data); return redirect(res, `/accounts/${m[1]}?flash=Contact+added`);
      }
      if ((m = path.match(/^\/accounts\/(\d+)\/properties\/new$/))) {
        const pid = M.createProperty(+m[1], data); return redirect(res, `/properties/${pid}?flash=Property+added`);
      }
      if ((m = path.match(/^\/accounts\/(\d+)\/calls\/new$/))) {
        M.createCall(+m[1], data); return redirect(res, `/accounts/${m[1]}?flash=Call+logged`);
      }
      if ((m = path.match(/^\/properties\/(\d+)\/measure$/))) {
        M.updateMeasurement(+m[1], data); return redirect(res, `/properties/${m[1]}?flash=Measurement+updated`);
      }
      // ---- Scheduling & routing ----
      if ((m = path.match(/^\/visits\/(\d+)\/assign$/))) {
        M.assignVisit(+m[1], data);
        return redirect(res, `/schedule?week=${data.scheduled_date || ''}&flash=Visit+scheduled`);
      }
      if (path === '/routes/optimize') {
        M.optimizeRoute(data.crew, data.date);
        return redirect(res, `/routes?crew=${data.crew}&date=${data.date}&flash=Route+optimized`);
      }
      if ((m = path.match(/^\/visits\/(\d+)\/move$/))) {
        M.moveStop(+m[1], data.dir);
        return redirect(res, `/routes?crew=${data.crew}&date=${data.date}`);
      }
      if ((m = path.match(/^\/visits\/(\d+)\/complete$/))) {
        M.completeVisit(+m[1], data);
        return redirect(res, `/field?crew=${data.crew}&date=${data.date}&flash=Stop+completed`);
      }
      // ---- Estimates ----
      if ((m = path.match(/^\/properties\/(\d+)\/estimate$/))) {
        const svcIds = Object.keys(data).filter(k => k.startsWith('svc_')).map(k => k.slice(4));
        const id = M.createEstimate(+m[1], { program: data.program === '1', serviceTypeIds: svcIds });
        return redirect(res, `/estimates/${id}?flash=Estimate+created`);
      }
      if ((m = path.match(/^\/estimates\/(\d+)\/send$/))) {
        M.sendEstimate(+m[1]); return redirect(res, `/estimates/${m[1]}?flash=Estimate+sent`);
      }
      if ((m = path.match(/^\/estimates\/(\d+)\/approve$/))) {
        M.approveEstimate(+m[1]); return redirect(res, `/estimates/${m[1]}?flash=Estimate+approved`);
      }
      if ((m = path.match(/^\/estimates\/(\d+)\/decline$/))) {
        M.declineEstimate(+m[1]); return redirect(res, `/estimates/${m[1]}?flash=Estimate+declined`);
      }
      if ((m = path.match(/^\/e\/([a-z0-9]+)\/approve$/))) {
        const e = M.getEstimateByToken(m[1]); if (e) M.approveEstimate(e.id);
        return redirect(res, `/e/${m[1]}`);
      }
      if ((m = path.match(/^\/e\/([a-z0-9]+)\/decline$/))) {
        const e = M.getEstimateByToken(m[1]); if (e) M.declineEstimate(e.id);
        return redirect(res, `/e/${m[1]}`);
      }
      // ---- Invoices & payments ----
      if (path === '/invoices/generate') {
        const n = M.generateInvoices(); return redirect(res, `/invoices?flash=Generated+${n}+invoice(s)`);
      }
      if (path === '/invoices/autopay') {
        const r = M.runAutopay(); return redirect(res, `/invoices?flash=Autopay+charged+${r.count}+invoice(s)`);
      }
      if ((m = path.match(/^\/invoices\/(\d+)\/pay$/))) {
        M.recordPayment(+m[1], data); return redirect(res, `/invoices/${m[1]}?flash=Payment+recorded`);
      }
      if ((m = path.match(/^\/i\/([a-z0-9]+)\/pay$/))) {
        const inv = M.getInvoiceByToken(m[1]); if (inv) M.recordPayment(inv.id, {});
        return redirect(res, `/i/${m[1]}`);
      }
      return notFound(res);
    }

    return notFound(res);
  } catch (err) {
    console.error(err);
    send(res, 500, `<pre style="padding:2rem;font-family:monospace">Server error:\n${err.stack}</pre>`);
  }
});

async function serveStatic(res, path) {
  try {
    const file = join(__dirname, path);
    if (!file.startsWith(join(__dirname, 'public'))) return notFound(res);
    const data = await readFile(file);
    send(res, 200, data, MIME[extname(file)] || 'application/octet-stream');
  } catch {
    notFound(res);
  }
}

server.listen(PORT, () => {
  console.log(`\n  Bladewise running →  http://localhost:${PORT}\n`);
});
