/* Bladewise — UI styles */
:root{
  --green-900:#14401f; --green-700:#1f6b39; --green-600:#2f855a; --green-500:#38a169;
  --green-50:#edf7f0; --ink:#1a2b22; --ink-2:#4a5d53; --muted:#8a998f;
  --line:#e4ebe6; --bg:#f6f9f7; --card:#ffffff; --amber:#b7791f; --amber-bg:#fff7e6;
  --blue:#2b6cb0; --red:#c53030; --shadow:0 1px 2px rgba(20,64,31,.06),0 4px 16px rgba(20,64,31,.05);
  --radius:14px;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  background:var(--bg);color:var(--ink);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}

.app{display:grid;grid-template-columns:236px 1fr;min-height:100vh}

/* Sidebar */
.sidebar{background:linear-gradient(180deg,var(--green-900),var(--green-700));color:#dff0e6;
  display:flex;flex-direction:column;padding:20px 14px;position:sticky;top:0;height:100vh}
.brand{font-size:20px;font-weight:700;color:#fff;padding:6px 10px 20px;letter-spacing:-.02em;display:flex;align-items:center;gap:8px}
.brand__mark{color:#9ae6b4}
.nav{display:flex;flex-direction:column;gap:2px;flex:1}
.nav__item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;color:#cfe6d8;font-weight:500;position:relative}
.nav__item:hover{background:rgba(255,255,255,.08);color:#fff}
.nav__item.is-active{background:rgba(255,255,255,.16);color:#fff}
.nav__icon{width:18px;text-align:center;opacity:.9}
.nav__item.is-soon{opacity:.6}
.nav__soon{margin-left:auto;font-size:10px;text-transform:uppercase;letter-spacing:.04em;background:rgba(255,255,255,.15);padding:2px 6px;border-radius:6px}
.sidebar__foot{padding:14px 10px 4px;border-top:1px solid rgba(255,255,255,.12);margin-top:10px}
.org{font-weight:600;color:#fff;font-size:14px}
.org__sub{font-size:12px;color:#a9ccb7}

/* Main */
.main{display:flex;flex-direction:column;min-width:0}
.topbar{display:flex;align-items:center;gap:16px;padding:14px 28px;background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.search{flex:1;max-width:520px}
.search input{width:100%;padding:9px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);font-size:14px}
.search input:focus{outline:none;border-color:var(--green-500);background:#fff}
.content{padding:28px;max-width:1120px;width:100%}

/* Page header */
.pagehead{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:22px}
.pagehead h1{font-size:26px;margin:0;letter-spacing:-.02em}
.pagehead__sub{margin:4px 0 0;color:var(--ink-2)}
.crumb{color:var(--muted);font-size:13px;margin-bottom:10px}
.crumb a{color:var(--green-600)}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 15px;border-radius:10px;border:1px solid var(--line);
  background:#fff;color:var(--ink);font-weight:600;font-size:14px;cursor:pointer;transition:.12s}
.btn:hover{border-color:var(--green-500)}
.btn--primary{background:var(--green-600);border-color:var(--green-600);color:#fff}
.btn--primary:hover{background:var(--green-700);border-color:var(--green-700)}
.btn--sm{padding:6px 11px;font-size:13px}
.link{color:var(--green-600);font-weight:600;font-size:14px}
.link:hover{text-decoration:underline}

/* Cards & grid */
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow);margin-bottom:20px}
.card__head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.card__head h2{font-size:16px;margin:0}
.grid{display:grid;gap:20px}
.grid--2{grid-template-columns:1fr 1fr;align-items:start}
.grid--stats{grid-template-columns:repeat(4,1fr);margin-bottom:20px}
.stack{display:flex;flex-direction:column}
.stack .card:last-child{margin-bottom:20px}

/* Stats */
.stat{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow)}
.stat__label{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.stat__value{font-size:26px;font-weight:700;margin-top:6px;letter-spacing:-.02em}
.stat__sub{font-size:13px;color:var(--ink-2);margin-top:2px}

/* Tables */
.table{width:100%;border-collapse:collapse}
.table th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);font-weight:600;padding:8px 10px;border-bottom:1px solid var(--line)}
.table td{padding:11px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.table tr:last-child td{border-bottom:none}
.table--hover tbody tr{cursor:pointer}
.table--hover tbody tr:hover{background:var(--green-50)}
.td-strong{font-weight:600}
.td-strong .sub,.sub{display:block;font-size:12px;color:var(--muted);font-weight:400}
.ta-r{text-align:right}
.empty{color:var(--muted);text-align:center;padding:22px}
.muted{color:var(--muted)}

/* Badges */
.badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:12px;font-weight:600}
.badge--active{background:var(--green-50);color:var(--green-700)}
.badge--prospect{background:#eef4fb;color:var(--blue)}
.badge--hold{background:var(--amber-bg);color:var(--amber)}
.badge--cancelled{background:#f4f4f5;color:#71717a}
.badge--open{background:#eef4fb;color:var(--blue)}
.badge--overdue{background:#fdecec;color:var(--red)}
.badge--paid{background:var(--green-50);color:var(--green-700)}
.tag{display:inline-block;font-size:11px;background:var(--green-50);color:var(--green-700);padding:2px 7px;border-radius:6px;font-weight:600;vertical-align:middle}
.tag--warn{background:var(--amber-bg);color:var(--amber)}

/* Chips (filters) */
.chips{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.chip{padding:6px 13px;border-radius:20px;border:1px solid var(--line);background:#fff;font-size:13px;font-weight:600;color:var(--ink-2)}
.chip:hover{border-color:var(--green-500)}
.chip.is-on{background:var(--green-600);border-color:var(--green-600);color:#fff}

/* Forms */
.form{display:flex;flex-direction:column;gap:16px;max-width:680px}
.form__row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.form__row--3{grid-template-columns:1fr 1fr 1fr}
.form label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--ink-2)}
.form input,.form select,.form textarea{padding:9px 12px;border:1px solid var(--line);border-radius:9px;font-size:14px;font-family:inherit;color:var(--ink);background:#fff}
.form input:focus,.form select:focus,.form textarea:focus{outline:none;border-color:var(--green-500);box-shadow:0 0 0 3px rgba(56,161,105,.12)}
.form .check{flex-direction:row;align-items:center;gap:8px;font-weight:500}
.form__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
.form__actions--inline{margin:0;align-items:flex-end}
.inlineform{display:flex;gap:8px;margin-bottom:14px}
.inlineform input[name=note]{flex:1}
.inlineform input{padding:8px 11px;border:1px solid var(--line);border-radius:9px;font-size:14px;font-family:inherit}

/* People / log lists */
.person{padding:10px 0;border-bottom:1px solid var(--line)}
.person:last-child{border-bottom:none}
.person__name{font-weight:600}
.person__meta{font-size:13px;color:var(--ink-2)}
.log{display:flex;flex-direction:column}
.logitem{padding:11px 0;border-bottom:1px solid var(--line)}
.logitem:last-child{border-bottom:none}
.logitem__meta{font-size:12px;color:var(--muted);margin-bottom:3px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.rowlink{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}
.rowlink:last-child{border-bottom:none}
.rowlink:hover .td-strong{color:var(--green-600)}

/* Checklist */
.checklist{list-style:none;padding:0;margin:0}
.checklist li{padding:8px 0 8px 28px;position:relative;border-bottom:1px solid var(--line)}
.checklist li:last-child{border-bottom:none}
.checklist li:before{content:"○";position:absolute;left:6px;color:var(--muted)}
.checklist li.done:before{content:"●";color:var(--green-500)}

/* Flash */
.flash{padding:11px 15px;border-radius:10px;margin-bottom:18px;font-weight:600;font-size:14px}
.flash--success{background:var(--green-50);color:var(--green-700);border:1px solid #c6e9d3}

/* Coming soon */
.soon{text-align:center;padding:40px 20px}
.soon__icon{font-size:40px;color:var(--green-500)}
.soon h2{margin:10px 0 6px}
.soon p{max-width:440px;margin:0 auto 18px}

/* ---- Phase 2: scheduling board ---- */
.legend{display:flex;gap:14px;flex-wrap:wrap}
.legend__item{font-size:12px;color:var(--ink-2);display:flex;align-items:center;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.board{display:grid;grid-template-columns:repeat(7,minmax(120px,1fr));gap:8px;overflow-x:auto}
.daycol{background:var(--bg);border:1px solid var(--line);border-radius:10px;min-height:220px;display:flex;flex-direction:column}
.daycol.is-today{border-color:var(--green-500);box-shadow:0 0 0 2px rgba(56,161,105,.15)}
.daycol__head{padding:8px 10px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline}
.daycol__dow{font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);font-weight:600}
.daycol__num{font-size:16px;font-weight:700}
.daycol.is-today .daycol__num{color:var(--green-600)}
.daycol__body{padding:8px;display:flex;flex-direction:column;gap:6px}
.daycol__empty{color:var(--line);text-align:center;padding:8px}
.vchip{display:flex;gap:7px;align-items:center;background:#fff;border:1px solid var(--line);border-left:3px solid var(--c);border-radius:8px;padding:6px 8px}
.vchip:hover{border-color:var(--c);box-shadow:var(--shadow)}
.vchip__seq{background:var(--c);color:#fff;width:18px;height:18px;border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.vchip__body{display:flex;flex-direction:column;min-width:0}
.vchip__acct{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vchip__svc{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Needs-scheduling assign rows */
.assignlist{display:flex;flex-direction:column;gap:8px}
.assignrow{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}
.assignrow__info{flex:1;min-width:0;display:flex;flex-direction:column}
.assignrow input,.assignrow select{padding:7px 10px;border:1px solid var(--line);border-radius:8px;font-size:13px;font-family:inherit;background:#fff}

/* Routes index */
.routegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.routecard{border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px;background:#fff}
.routecard:hover{border-color:var(--green-500);box-shadow:var(--shadow)}
.routecard__date{display:flex;flex-direction:column}
.routecard__date span{font-size:12px;text-transform:uppercase;color:var(--muted);font-weight:600}
.routecard__date strong{font-size:20px}
.routecard__crew{display:flex;align-items:center;gap:7px;font-weight:600;font-size:14px}
.routecard__stops{color:var(--ink-2);font-size:13px}

/* Route map + stops */
.routemap{width:100%;height:auto;border-radius:10px;border:1px solid var(--line);display:block}
.mk__t{fill:#fff;font-size:12px;font-weight:700;font-family:inherit}
.mapph{padding:40px;text-align:center;color:var(--muted);background:var(--bg);border-radius:10px}
.route-note{font-size:12px;margin:10px 0 0}
.seqcell{font-weight:700;color:var(--green-700);width:32px}
.rowtools{display:flex;gap:6px;align-items:center;white-space:nowrap}
.rowtools .i{display:inline}
.rowtools button{width:26px;height:26px;border:1px solid var(--line);background:#fff;border-radius:7px;cursor:pointer;font-size:13px}
.rowtools button:hover:not([disabled]){border-color:var(--green-500)}
.rowtools button[disabled]{opacity:.35;cursor:default}
form.i{display:inline}

/* Field app */
.fieldbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px;flex-wrap:wrap}
.progress{display:flex;align-items:center;gap:10px}
.progress__label{font-size:13px;font-weight:600;color:var(--ink-2)}
.progress__bar{width:140px;height:8px;background:var(--line);border-radius:6px;overflow:hidden}
.progress__bar span{display:block;height:100%;background:var(--green-500)}
.stoplist{display:flex;flex-direction:column;gap:10px;max-width:640px}
.stopcard{display:flex;gap:14px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;box-shadow:var(--shadow)}
.stopcard.is-done{opacity:.62;background:var(--bg)}
.stopcard__seq{width:34px;height:34px;border-radius:50%;background:var(--green-600);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.stopcard.is-done .stopcard__seq{background:var(--muted)}
.stopcard__main{flex:1;min-width:0}
.stopcard__top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.stopcard__svc{font-size:13px;color:var(--ink-2);margin-top:3px}
.stopcard__flags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.flagpill{font-size:11.5px;background:var(--bg);border:1px solid var(--line);border-radius:20px;padding:3px 9px;color:var(--ink-2)}
.stopcard__actions{display:flex;gap:10px;align-items:center;margin-top:12px}

/* ---- Phase 3: estimates & invoicing ---- */
.badge--draft{background:#f4f4f5;color:#71717a}
.badge--sent{background:#eef4fb;color:var(--blue)}
.badge--approved{background:var(--green-50);color:var(--green-700)}
.badge--declined{background:#fdecec;color:var(--red)}
.btn--lg{padding:12px 22px;font-size:15px}
.flash--warn{background:var(--amber-bg);color:var(--amber);border:1px solid #f0dfb8}
.owe{color:var(--red);font-weight:600}
form.i{display:inline}

/* Service pick list (estimate builder) */
.pick{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;cursor:pointer;background:#fff}
.pick + .pick{margin-top:8px}
.pick:hover{border-color:var(--green-500)}
.pick input{width:18px;height:18px}
.pick__name{flex:1;font-weight:600}
.pick__name .sub{font-weight:400}
.pick__price{font-weight:700}
.pick--program{border-color:var(--green-500);background:var(--green-50)}
.picklist{display:flex;flex-direction:column}
.plines{margin-top:10px;padding:0 14px}
.pline{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed var(--line);font-size:13px;color:var(--ink-2)}
.pline:last-child{border-bottom:none}

/* Table footer */
.table tfoot td{padding:11px 10px;border-top:2px solid var(--line);font-size:15px}

/* Link + flash cards */
.linkbox{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px 12px;word-break:break-all;color:var(--ink-2)}
.flashcard{padding:16px 18px;border-radius:10px;font-weight:600}
.flashcard--ok{background:var(--green-50);color:var(--green-700);border:1px solid #c6e9d3}
.flashcard--no{background:#fdecec;color:var(--red);border:1px solid #f3c7c7}

/* Aging */
.aging{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.aging__tile{border:1px solid var(--line);border-radius:10px;padding:14px;background:var(--bg)}
.aging__tile.is-warn{border-color:#f3c7c7;background:#fdf0f0}
.aging__label{font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);font-weight:600}
.aging__val{font-size:20px;font-weight:700;margin-top:4px}

/* Public (hosted) pages */
body.public{background:var(--bg)}
.pubwrap{max-width:560px;margin:0 auto;padding:40px 20px}
.pubbrand{font-size:20px;font-weight:700;color:var(--green-700);margin-bottom:20px;display:flex;align-items:center;gap:8px}
.pubbrand .brand__mark{color:var(--green-500)}
.pubcard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:28px;box-shadow:var(--shadow)}
.pubcard__head h1{margin:0 0 4px;font-size:22px}
.pubactions{display:flex;gap:12px;justify-content:flex-end;margin-top:22px;align-items:center}
.pubnote{font-size:12px;text-align:right;margin:10px 0 0}
.pubfoot{text-align:center;color:var(--muted);font-size:13px;margin-top:22px}

/* ---- Phase 4: dashboard & activity ---- */
.grid--wide{grid-template-columns:1.4fr 1fr;align-items:start}
.chart{width:100%;height:auto;display:block}
.axt{fill:var(--muted);font-size:11px;font-family:inherit}

/* Activity feed */
.feed{display:flex;flex-direction:column}
.feed__item{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.feed__item:last-child{border-bottom:none}
.feed--full .feed__item{padding:12px 0}
.feed__icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;background:var(--green-50);color:var(--green-700)}
.feed__icon--payment_received{background:#e9f6ee;color:var(--green-700)}
.feed__icon--invoice_sent{background:#eef4fb;color:var(--blue)}
.feed__icon--service_complete{background:#e9f6ee;color:var(--green-600)}
.feed__icon--estimate_sent{background:#fff7e6;color:var(--amber)}
.feed__icon--estimate_approved{background:#e9f6ee;color:var(--green-700)}
.feed__body{flex:1;min-width:0}
.feed__title{font-weight:600;font-size:14px}
.feed__sub{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.feed__meta{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0}
.feed__time{font-size:12px;color:var(--muted)}
.chan{font-size:10px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;padding:2px 6px;border-radius:5px;background:var(--bg);color:var(--ink-2)}
.chan--email{background:#eef4fb;color:var(--blue)}
.chan--sms{background:#e9f6ee;color:var(--green-700)}
.chan--internal{background:#f4f4f5;color:#71717a}

/* Mini KPIs */
.kpis{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.minikpi{border:1px solid var(--line);border-radius:10px;padding:14px;display:block;background:#fff}
.minikpi:hover{border-color:var(--green-500)}
.minikpi__val{font-size:24px;font-weight:700;letter-spacing:-.02em}
.minikpi__label{font-weight:600;font-size:13px;margin-top:2px}
.minikpi__sub{font-size:12px;color:var(--muted)}

@media (max-width:860px){
  .app{grid-template-columns:1fr}
  .sidebar{position:static;height:auto;flex-direction:row;align-items:center;padding:10px}
  .nav{flex-direction:row;overflow-x:auto}.nav__soon,.sidebar__foot{display:none}
  .brand{padding:6px 10px}
  .grid--2,.grid--stats,.grid--wide,.form__row,.form__row--3,.aging,.kpis{grid-template-columns:1fr}
  .assignrow{flex-wrap:wrap}
  .pubactions{flex-direction:column-reverse}.pubactions .i,.pubactions .btn{width:100%}
}
