// Source of the in-browser sync agent. Served (with placeholders filled) by
// /api/agent and executed on the logged-in Userpilot tab via the bookmarklet.
// It uses the live token from localStorage, never exposing it to our server —
// only the aggregated raw rows (customer names + public metrics) are posted.

const COMPANIES: { name: string; products: string[]; search?: string }[] = [
  { name: "HEINEKEN", products: ["iContract", "iSource"] },
  { name: "Public Transport Authority of Western Australia", products: ["iContract"] },
  { name: "The Dow Chemical Company", products: ["iContract"] },
  { name: "Ahold Delhaize", products: ["iContract"] },
  { name: "Danone", products: ["iContract", "iSource"] },
  { name: "PwC US", products: ["iContract"] },
  { name: "CBRE", products: ["iContract", "iSource"] },
  { name: "Department of Transport", products: ["iContract"] },
  { name: "Delta Air Lines", products: ["iContract", "iSource"] },
  { name: "BDO Unibank Group", products: ["iContract", "iSource"] },
  { name: "Idaho Power Company", products: ["iContract"] },
  { name: "Maybank", products: ["iContract", "iSource"] },
  { name: "TM Group", products: ["iContract"] },
  { name: "Department of Justice and Community Safety", products: ["iContract"] },
  { name: "Daiichi Sankyo Inc", products: ["iContract"] },
  { name: "QBE", products: ["iContract"] },
  { name: "Gap", products: ["iContract"] },
  { name: "Air Liquide", products: ["iContract"] },
  { name: "CCI", products: ["iContract", "iSource"] },
  { name: "Graphic Packaging International", products: ["iContract"] },
  { name: "Arizona Public Service", products: ["iContract"] },
  { name: "Insignia Financial", products: ["iContract"] },
  { name: "Gavi", products: ["iContract"] },
  { name: "DRBHICOM", products: ["iSource"] },
  { name: "Panasonic", products: ["iContract"] },
  { name: "CHEP", products: ["iContract"] },
  { name: "Keysight", products: ["iContract"] },
  { name: "Clarios", products: ["iContract", "iSource"] },
  { name: "Nissan", products: ["iContract", "iSource"] },
  { name: "American Regent", products: ["iContract"] },
  { name: "Aurizon", products: ["iContract"] },
  { name: "Sibelco", products: ["iContract"] },
  { name: "Evergy", products: ["iContract", "iSource"] },
  { name: "Shimizu", products: ["iContract", "iSource"] },
  { name: "AAMC", products: ["iContract", "iSource"] },
  { name: "The Home Depot", products: ["iContract"] },
  { name: "GEHA", products: ["iContract"] },
  { name: "SM GROUP", products: ["iSource"] },
  { name: "Swissport", products: ["iContract", "iSource"] },
  { name: "T L", products: ["iContract"], search: "T&L" },
  { name: "Abdul Latif Jameel", products: ["iContract"] },
  { name: "City of Melbourne", products: ["iSource"] },
  { name: "Frontier Communications", products: ["iContract"] },
  { name: "Bank of Cyprus", products: ["iContract"] },
  { name: "Porsche", products: ["iContract"] },
  { name: "Kerzner", products: ["iContract"] },
  { name: "SPIE", products: ["iContract"] },
  { name: "Louisville Gas and Electric and Kentucky Utilities", products: ["iContract", "iSource"] },
  { name: "Melbourne Water Corporation", products: ["iSource"] },
  { name: "V Line Corporation", products: ["iSource"], search: "V/Line" },
  { name: "H M", products: ["iSource"], search: "H&M" },
  { name: "Nissan Australia", products: ["iSource"] },
  { name: "Telekom Malaysia", products: ["iContract"] },
  { name: "Broadridge Financial Solutions Inc", products: ["iSource"], search: "Broadridge" },
  { name: "Monash Health", products: ["iSource"] },
  { name: "Belden Inc", products: ["iSource"] },
  { name: "SeaWorld Parks Entertainment", products: ["iSource"], search: "SeaWorld" },
  { name: "Zycus Supplier Network", products: ["iContract"] },
];

export function buildAgent(opts: {
  ingestUrl: string;
  statusUrl: string;
  secret: string;
  account: string;
}): string {
  const cfg = JSON.stringify(opts);
  const companies = JSON.stringify(COMPANIES);
  return `(async () => {
  const CFG = ${cfg};
  const COMPANIES = ${companies};
  const BASE = 'https://appex.userpilot.io/api/v1/analytics/' + CFG.account;
  const tok = localStorage.getItem('up_access_token');
  const report = (phase, done, total, label) => { try { fetch(CFG.statusUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ secret: CFG.secret, phase, done, total, label }) }).catch(()=>{}); } catch(e){} };
  // ---- progress overlay ----
  let box = document.getElementById('up-sync-box');
  if (box) box.remove();
  box = document.createElement('div');
  box.id = 'up-sync-box';
  box.style.cssText = 'position:fixed;z-index:2147483647;right:16px;bottom:16px;width:320px;padding:14px 16px;background:#0b1220;color:#e6edf6;font:13px -apple-system,system-ui,sans-serif;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.35);';
  document.body.appendChild(box);
  const say = (h, s) => { box.innerHTML = '<div style="font-weight:600;margin-bottom:4px">'+h+'</div><div style="opacity:.75;font-size:12px">'+(s||'')+'</div>'; };
  say('Syncing dashboard…', 'Starting');
  if (!tok) { say('No Userpilot session', 'Open Userpilot, log in, and click again.'); return; }
  const H = { 'Authorization': 'Bearer ' + tok, 'issuer': 'workos', 'Accept': 'application/json, text/plain, */*' };
  const HP = Object.assign({ 'Content-Type': 'application/json' }, H);
  const today = new Date(), to = today.toISOString().slice(0,10), from = new Date(today - 90*864e5).toISOString().slice(0,10);
  const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const BAD = /stag|stage|\\bdev\\b|test|demo|sandbox|\\bqa\\b|\\buat\\b/i;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function activity(cid, title) {
    try {
      const r = await fetch(BASE + '/events/breakdown', { method:'POST', headers:HP, credentials:'include', body: JSON.stringify({
        source:'any', company_id:cid, environment:'production', from, to, title,
        status:['active','draft','paused','processing'], after_cursor:null,
        sort_by:[{type:'aggregated',order:'desc',metadata:{expression:'unique_users'}}], limit:200 }) });
      const j = await r.json();
      return (j.data||[]).reduce((a,x)=>a+(+x.total_occurred||0),0);
    } catch(e) { return -1; }
  }

  // ---- resolve company ids (cached) ----
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem('up_dash_idmap') || '{}'); } catch(e) {}
  const idmap = {};
  for (let i = 0; i < COMPANIES.length; i++) {
    const c = COMPANIES[i];
    if (cache[c.name]) { idmap[c.name] = cache[c.name]; continue; }
    say('Resolving customers…', (i+1) + '/' + COMPANIES.length + '  ' + c.name);
    report('resolving', i+1, COMPANIES.length, 'Resolving ' + c.name);
    const q = c.search || c.name;
    try {
      const r = await fetch(BASE + '/companies?search=' + encodeURIComponent(q) + '&environment=production&compact=true', { headers:H, credentials:'include' });
      const j = await r.json();
      let cands = (j.companies||[]).filter(x => !BAD.test(x.name||''));
      const exact = cands.filter(x => norm(x.name) === norm(c.name) || norm(x.name) === norm(q));
      const pool = exact.length ? exact : cands;
      let id = null;
      if (pool.length === 1) id = pool[0].id;
      else if (pool.length > 1) {
        let best = null, bestA = -1;
        for (const cand of pool) { const a = await activity(cand.id, c.products[0]); if (a > bestA) { bestA = a; best = cand; } }
        id = best && best.id;
      }
      if (id) idmap[c.name] = id;
    } catch(e) {}
  }
  localStorage.setItem('up_dash_idmap', JSON.stringify(Object.assign({}, cache, idmap)));

  // ---- pull events + pages ----
  async function pull(endpoint, body) {
    const out = []; let cursor = null;
    for (let p = 0; p < 20; p++) {
      const r = await fetch(BASE + endpoint, { method:'POST', headers:HP, credentials:'include', body: JSON.stringify(Object.assign({}, body, { after_cursor: cursor })) });
      if (!r.ok) break;
      const j = await r.json();
      const data = j.data || [];
      out.push(...data);
      cursor = j.metadata && j.metadata.after_cursor;
      if (!cursor || data.length === 0) break;
    }
    return out;
  }

  const rows = [];
  const names = Object.keys(idmap);
  let done = 0;
  for (const c of COMPANIES) {
    const cid = idmap[c.name];
    if (!cid) { done++; continue; }
    // Events: per product (event names carry the product prefix, so the title filter is reliable)
    for (const product of c.products) {
      say('Pulling usage…', (++done > names.length ? names.length : done) + '  ·  ' + c.name + ' / ' + product);
      report('pulling', done, COMPANIES.length, c.name + ' / ' + product);
      try {
        const ev = await pull('/events/breakdown', {
          source:'any', company_id:cid, environment:'production', from, to, title: product,
          status:['active','draft','paused','processing'],
          sort_by:[{type:'aggregated',order:'desc',metadata:{expression:'unique_users'}}], limit:200 });
        for (const r of ev) rows.push(Object.assign({ company: c.name, product, kind: 'Event' }, r));
      } catch(e) {}
      await sleep(60);
    }
    // Pages: pull UNFILTERED once per company, then attribute product by name (iSource page
    // tagging may not carry the product keyword). Avoids the iSource-pages blind spot.
    try {
      const pg = await pull('/tagged_pages/breakdown', {
        company_id:cid, from, to, limit:200, status:'active', environment:'production',
        sort_by:[{type:'aggregated',order:'desc',metadata:{expression:'unique_company_ids'}}] });
      for (const r of pg) {
        const nm = String(r.display_name||'').toLowerCase();
        // Keep ONLY iSource / iContract pages — drop suite-wide pages (Home, eInvoice,
        // iRequest, supplier, etc.) that belong to neither product.
        let product = null;
        if (/isource|sourcing|\brfx\b|scoresheet|\bbid\b|reverse auction/.test(nm)) product = 'iSource';
        else if (/contract|authoring|\bclause|amendment|repository|\bavoc\b|signoff/.test(nm)) product = 'iContract';
        if (product) rows.push(Object.assign({ company: c.name, product, kind: 'Page' }, r));
      }
    } catch(e) {}
    await sleep(60);
  }

  // ---- send to dashboard ----
  say('Saving to dashboard…', rows.length + ' rows');
  report('saving', COMPANIES.length, COMPANIES.length, rows.length + ' rows');
  try {
    const r = await fetch(CFG.ingestUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ secret: CFG.secret, rows }) });
    const j = await r.json();
    if (j.ok) {
      const summary = j.totals ? (j.totals.companies + ' customers · ' + j.totals.totalOccurrences.toLocaleString() + ' interactions') : '';
      say('✓ Synced', summary + ' — refresh the dashboard.');
      report('done', COMPANIES.length, COMPANIES.length, summary);
      setTimeout(() => box.remove(), 9000);
    } else { say('Sync failed', j.error || ('HTTP ' + r.status)); report('error', 0, 0, j.error || ('HTTP ' + r.status)); }
  } catch(e) { say('Sync failed', String(e)); report('error', 0, 0, String(e)); }
})();`;
}
