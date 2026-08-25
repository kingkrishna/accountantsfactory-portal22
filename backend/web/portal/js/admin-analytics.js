// Feature F: Analytics dashboard.
// Pure-SVG native charts — no external chart library, no CSP allowlist
// change needed. Everything renders from the existing /admin/* endpoints.
//
// Charts:
//   1. Client Growth Over Time  (line chart, cumulative)
//   2. Orders by Status         (donut)
//   3. Top Services by Order Count (horizontal bar)
//   4. Franchise Comparison     (grouped bar — admin only; sub_admin sees a note)

const ANALYTICS_PALETTE = {
  brand: '#0a8574',
  brandDim: '#7ec5b8',
  accent: '#e07a3c',
  ok: '#27ae60',
  warn: '#e6a20c',
  bad: '#c0392b',
  neutral: '#8a8a8a',
  grid: 'rgba(0,0,0,0.06)'
};

// Analytics state — held module-level for range-change re-renders.
var _analyticsData = null;
var _analyticsRange = 90;

async function loadAnalytics() {
  const loading = document.getElementById('analytics-loading');
  const content = document.getElementById('analytics-content');
  if (!loading || !content) return;
  loading.style.display = 'block';
  content.style.display = 'none';

  try {
    // Same server-scoped endpoints Overview uses. Sub_admin gets their
    // franchise subset automatically; full admin gets aggregate.
    const [clientsRes, ordersRes, servicesRes, refsRes, empRes] = await Promise.all([
      api.getAllClients().catch(() => ({ clients: [] })),
      api.getAllOrders().catch(() => ({ orders: [] })),
      api.getAllServices().catch(() => ({ services: [] })),
      api.getAllReferrals().catch(() => ({ referrals: [] })),
      api.getAllEmployees().catch(() => ({ employees: [] }))
    ]);

    _analyticsData = {
      clients: clientsRes.clients || [],
      orders: ordersRes.orders || [],
      services: servicesRes.services || [],
      referrals: refsRes.referrals || [],
      employees: empRes.employees || []
    };

    renderAnalytics();
    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (e) {
    console.error('Analytics load failed:', e);
    loading.innerHTML = '<div class="text-danger small">Failed to load analytics. Please try again.</div>';
  }
}

function renderAnalytics() {
  if (!_analyticsData) return;
  const rangeSel = document.getElementById('analytics-range');
  if (rangeSel) _analyticsRange = rangeSel.value === 'all' ? Infinity : parseInt(rangeSel.value, 10);

  const cutoff = _analyticsRange === Infinity ? 0 : Date.now() - _analyticsRange * 86400000;
  const clients = _analyticsData.clients.filter(c => new Date(c.created_at || c.createdAt || 0).getTime() >= cutoff);
  const orders  = _analyticsData.orders.filter(o => new Date(o.created_at || o.createdAt || 0).getTime() >= cutoff);
  const refs    = _analyticsData.referrals;

  // KPI row
  const completed = orders.filter(o => o.status === 'completed').length;
  const pct = orders.length > 0 ? Math.round((completed / orders.length) * 100) : 0;
  setText('an-kpi-clients', clients.length);
  setText('an-kpi-orders', orders.length);
  setText('an-kpi-completed', pct + '%');
  setText('an-kpi-approved-refs', refs.filter(r => r.status === 'approved').length);

  drawClientGrowth('chart-client-growth', clients);
  drawOrdersByStatus('chart-orders-status', orders);
  drawTopServices('chart-top-services', orders, _analyticsData.services);
  drawFranchiseComparison('chart-franchise-compare', clients, orders, _analyticsData.employees);
}

// ─── Chart 1: cumulative client growth line ────────────────────────────
function drawClientGrowth(elId, clients) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (clients.length === 0) { el.innerHTML = emptyState('No clients in this range'); return; }

  // Bucket by day, then cumulative.
  const byDay = new Map();
  clients.forEach(c => {
    const d = new Date(c.created_at || c.createdAt || 0);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + 1);
  });
  const days = [...byDay.keys()].sort();
  let running = 0;
  const points = days.map(d => { running += byDay.get(d); return { d, y: running }; });

  const W = 520, H = 220, PAD = { l: 40, r: 12, t: 16, b: 28 };
  const chartW = W - PAD.l - PAD.r, chartH = H - PAD.t - PAD.b;
  const maxY = Math.max(...points.map(p => p.y), 1);
  const xStep = points.length > 1 ? chartW / (points.length - 1) : 0;

  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + (PAD.l + i * xStep) + ' ' + (PAD.t + chartH - (p.y / maxY) * chartH)).join(' ');
  const area = path + ' L ' + (PAD.l + (points.length - 1) * xStep) + ' ' + (PAD.t + chartH) + ' L ' + PAD.l + ' ' + (PAD.t + chartH) + ' Z';

  // Y-axis labels (0 / max)
  const yAxis = `
    <text x="6" y="${PAD.t + 4}" font-size="10" fill="${ANALYTICS_PALETTE.neutral}">${maxY}</text>
    <text x="6" y="${PAD.t + chartH + 4}" font-size="10" fill="${ANALYTICS_PALETTE.neutral}">0</text>
  `;
  // X-axis labels (first + last date)
  const first = fmtShortDate(points[0].d);
  const last = fmtShortDate(points[points.length - 1].d);
  const xAxis = `
    <text x="${PAD.l}" y="${H - 8}" font-size="10" fill="${ANALYTICS_PALETTE.neutral}">${first}</text>
    <text x="${W - PAD.r}" y="${H - 8}" font-size="10" fill="${ANALYTICS_PALETTE.neutral}" text-anchor="end">${last}</text>
  `;
  const grid = `<line x1="${PAD.l}" y1="${PAD.t + chartH}" x2="${W - PAD.r}" y2="${PAD.t + chartH}" stroke="${ANALYTICS_PALETTE.grid}"/>`;

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">
      ${grid}
      <path d="${area}" fill="${ANALYTICS_PALETTE.brand}" fill-opacity="0.12"/>
      <path d="${path}" fill="none" stroke="${ANALYTICS_PALETTE.brand}" stroke-width="2.5" stroke-linejoin="round"/>
      ${yAxis}${xAxis}
    </svg>
  `;
}

// ─── Chart 2: donut of orders by status ────────────────────────────────
function drawOrdersByStatus(elId, orders) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (orders.length === 0) { el.innerHTML = emptyState('No orders in this range'); return; }

  const buckets = { pending: 0, in_progress: 0, completed: 0 };
  orders.forEach(o => { if (buckets[o.status] != null) buckets[o.status]++; });
  const colors = { pending: ANALYTICS_PALETTE.warn, in_progress: ANALYTICS_PALETTE.brand, completed: ANALYTICS_PALETTE.ok };
  const labels = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };

  const total = orders.length;
  const W = 260, H = 220, cx = 130, cy = 100, r = 68, r2 = 42;
  let a0 = -Math.PI / 2;
  const slices = Object.keys(buckets).map(k => {
    const v = buckets[k];
    if (v === 0) return '';
    const a1 = a0 + (v / total) * Math.PI * 2;
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a1) * r2, y2 = cy + Math.sin(a1) * r2;
    const x3 = cx + Math.cos(a0) * r2, y3 = cy + Math.sin(a0) * r2;
    a0 = a1;
    return `<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 ${large} 0 ${x3} ${y3} Z" fill="${colors[k]}"/>`;
  }).join('');

  const legend = Object.keys(buckets).map(k =>
    `<div class="analytics-legend-item"><span class="analytics-swatch" style="background:${colors[k]}"></span>${labels[k]} <strong>${buckets[k]}</strong></div>`
  ).join('');

  el.innerHTML = `
    <div class="d-flex align-items-center flex-wrap" style="gap:16px;">
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:180px;height:auto;flex-shrink:0;">
        ${slices}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="24" font-weight="700" fill="#1a1a1a">${total}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="${ANALYTICS_PALETTE.neutral}" letter-spacing="1">TOTAL</text>
      </svg>
      <div class="analytics-legend">${legend}</div>
    </div>
  `;
}

// ─── Chart 3: horizontal bars for top services ─────────────────────────
function drawTopServices(elId, orders, services) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (orders.length === 0) { el.innerHTML = emptyState('No orders in this range'); return; }

  const serviceName = new Map();
  services.forEach(s => serviceName.set(String(s.id), s.name));
  const counts = new Map();
  orders.forEach(o => {
    const id = String(o.service_id || o.serviceId || '');
    if (!id) return;
    counts.set(id, (counts.get(id) || 0) + 1);
  });
  const top = [...counts.entries()]
    .map(([id, count]) => ({ name: serviceName.get(id) || 'Unknown', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (top.length === 0) { el.innerHTML = emptyState('No service data'); return; }

  const max = top[0].count;
  const rowH = 28, gap = 6;
  const W = 640, H = top.length * (rowH + gap) + 8;
  const labelW = 220;
  const barX = labelW + 8;
  const barMaxW = W - barX - 60;

  const rows = top.map((r, i) => {
    const y = i * (rowH + gap);
    const w = Math.max(2, (r.count / max) * barMaxW);
    const name = r.name.length > 30 ? r.name.slice(0, 27) + '…' : r.name;
    return `
      <text x="${labelW}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="12" fill="#333">${escapeXml(name)}</text>
      <rect x="${barX}" y="${y + 4}" width="${w}" height="${rowH - 8}" rx="4" fill="${ANALYTICS_PALETTE.brand}"/>
      <text x="${barX + w + 6}" y="${y + rowH / 2 + 4}" font-size="12" fill="#333" font-weight="600">${r.count}</text>
    `;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">${rows}</svg>`;
}

// ─── Chart 4: franchise comparison (admin only; sub_admin gets a note) ─
function drawFranchiseComparison(elId, clients, orders, employees) {
  const el = document.getElementById(elId);
  const note = document.getElementById('franchise-compare-note');
  if (!el) return;
  const user = clientAuth.getUser();

  if (user && user.role === 'sub_admin') {
    el.innerHTML = emptyState('Franchise comparison is available to full admin only.');
    if (note) note.textContent = '';
    return;
  }

  // Group by referral_code (franchise) on the employees table for sub_admins,
  // then count clients per franchise via a client-referral lookup.
  // Simpler: bucket clients by referral chain when available; if we can't
  // resolve, show buckets by employee franchise code + "unassigned".
  const subs = employees.filter(e => e.role === 'sub_admin');
  if (subs.length === 0) {
    el.innerHTML = emptyState('No franchises yet. Create a sub_admin from the Employees section.');
    if (note) note.textContent = '';
    return;
  }

  // For each franchise: count client rows whose email is in that sub_admin's
  // referral list. We can't cross-reference without a joined endpoint, so
  // approximate by counting clients created after the sub_admin's created_at.
  // Simplest defensible metric: total clients + total orders scoped by
  // whether the client's referral_code starts with the branch prefix. Use a
  // fallback bar of employee count per franchise for now.
  const rows = subs.map(s => ({
    branch: s.referral_code || '—',
    employees: employees.filter(e => (e.referral_code || '') === (s.referral_code || '')).length,
    email: s.email
  }));
  rows.push({ branch: 'HQ (unassigned)', employees: employees.filter(e => !e.referral_code).length, email: '' });

  const max = Math.max(...rows.map(r => r.employees), 1);
  const rowH = 32, gap = 6;
  const W = 300, H = rows.length * (rowH + gap) + 8;
  const labelW = 110;
  const barX = labelW + 8;
  const barMaxW = W - barX - 30;

  const svg = rows.map((r, i) => {
    const y = i * (rowH + gap);
    const w = Math.max(2, (r.employees / max) * barMaxW);
    return `
      <text x="${labelW}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="11" fill="#333" font-weight="600">${escapeXml(r.branch)}</text>
      <rect x="${barX}" y="${y + 4}" width="${w}" height="${rowH - 8}" rx="4" fill="${ANALYTICS_PALETTE.accent}"/>
      <text x="${barX + w + 4}" y="${y + rowH / 2 + 4}" font-size="12" fill="#333" font-weight="600">${r.employees}</text>
    `;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">${svg}</svg>`;
  if (note) note.textContent = 'Bar = team size per franchise. Full client-per-franchise metrics available once compliance reporting is wired.';
}

// ─── helpers ───────────────────────────────────────────────────────────
function emptyState(msg) {
  return `<div class="text-muted small text-center py-4">${escapeXml(msg)}</div>`;
}
function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Wire range selector on first ready.
document.addEventListener('DOMContentLoaded', function () {
  const sel = document.getElementById('analytics-range');
  if (sel) sel.addEventListener('change', renderAnalytics);
});
