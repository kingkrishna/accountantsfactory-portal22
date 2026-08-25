// Feature E: Admin Franchise Applications queue.
//
// Endpoints (full admin only):
//   GET  /api/admin/franchise-applications
//   POST /api/admin/franchise-applications/:id/approve  { branchCode }
//
// The list also serves as the sidebar badge count on load.

var _franchiseApps = [];

async function loadFranchiseApps() {
  const loading = document.getElementById('franchise-apps-loading');
  const empty = document.getElementById('franchise-apps-empty');
  const list = document.getElementById('franchise-apps-list');
  if (!loading || !list) return;

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.style.display = 'none';
  list.innerHTML = '';

  try {
    const res = await fetch(getApiUrl('/admin/franchise-applications'), {
      headers: { Authorization: 'Bearer ' + clientAuth.getToken() }
    });
    if (res.status === 403) {
      loading.style.display = 'none';
      empty.textContent = 'Full admin access required.';
      empty.style.display = 'block';
      return;
    }
    const data = await res.json().catch(() => ({}));
    _franchiseApps = data.applications || [];

    loading.style.display = 'none';
    // Split into pending vs already-processed (message contains [APPROVED ...])
    const pending = _franchiseApps.filter(a => !/\[APPROVED /.test(a.message || ''));
    const processed = _franchiseApps.filter(a => /\[APPROVED /.test(a.message || ''));

    updateFranchiseAppsBadge(pending.length);

    if (_franchiseApps.length === 0) {
      empty.style.display = 'block';
      return;
    }

    list.style.display = 'block';
    list.innerHTML = renderAppSection('Pending', pending, true) +
                     renderAppSection('Processed', processed, false);

    // Wire approve buttons
    list.querySelectorAll('.franchise-approve-btn').forEach(btn => {
      btn.addEventListener('click', () => approveFranchiseApp(btn.getAttribute('data-id')));
    });
  } catch (e) {
    console.error('Franchise apps load failed:', e);
    loading.style.display = 'none';
    empty.textContent = 'Failed to load applications.';
    empty.style.display = 'block';
  }
}

function renderAppSection(title, items, showApprove) {
  if (items.length === 0) return '';
  return `
    <h5 class="mt-3 mb-2 franchise-apps-sec-title">${title} <small class="text-muted">(${items.length})</small></h5>
    <div class="franchise-apps-grid">
      ${items.map(a => renderAppCard(a, showApprove)).join('')}
    </div>
  `;
}

function renderAppCard(a, showApprove) {
  const name = escapeHtml(a.name || '');
  const email = escapeHtml(a.email || '');
  const mobile = escapeHtml(a.mobile || '');
  const msg = escapeHtml(a.message || '');
  const cityMatch = /City:\s*(.+)/.exec(a.message || '');
  const city = cityMatch ? escapeHtml(cityMatch[1].split('\n')[0]) : '';
  const codeMatch = /Suggested branch code:\s*([A-Z0-9_-]+)/.exec(a.message || '');
  const suggestedCode = codeMatch ? codeMatch[1] : '';
  const processed = /\[APPROVED /.test(a.message || '');
  const created = formatDate(a.created_at || a.createdAt);
  const ticket = escapeHtml(a.ticket_id || '');

  return `
    <div class="franchise-app-card ${processed ? 'processed' : ''}">
      <div class="franchise-app-head">
        <div class="franchise-app-name">${name}</div>
        <div class="franchise-app-when">${created}</div>
      </div>
      <div class="franchise-app-body">
        <div><i class="fas fa-envelope"></i> ${email}</div>
        <div><i class="fas fa-phone"></i> ${mobile}</div>
        ${city ? `<div><i class="fas fa-city"></i> ${city}</div>` : ''}
        ${suggestedCode ? `<div><i class="fas fa-tag"></i> Suggested: <code>${suggestedCode}</code></div>` : ''}
        <div class="franchise-app-ticket">${ticket}</div>
      </div>
      ${msg ? `<details class="franchise-app-msg"><summary>Full message</summary><pre>${msg}</pre></details>` : ''}
      ${showApprove ? `
        <div class="franchise-app-actions">
          <input type="text" class="form-control form-control-sm franchise-app-code" placeholder="Branch code" value="${suggestedCode}" maxlength="40">
          <button type="button" class="btn btn-sm btn-primary franchise-approve-btn" data-id="${escapeHtml(a.id)}"><i class="fas fa-check"></i> Approve &amp; Provision</button>
        </div>
      ` : ''}
    </div>
  `;
}

async function approveFranchiseApp(id) {
  const card = document.querySelector(`.franchise-approve-btn[data-id="${id}"]`)?.closest('.franchise-app-card');
  const codeInput = card?.querySelector('.franchise-app-code');
  const code = (codeInput?.value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!code) { alert('Enter a branch code before approving.'); return; }
  if (!confirm(`Approve this application and create sub_admin for branch ${code}?`)) return;

  const btn = card?.querySelector('.franchise-approve-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Provisioning...'; }

  try {
    const res = await fetch(getApiUrl('/admin/franchise-applications/' + encodeURIComponent(id) + '/approve'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + clientAuth.getToken()
      },
      body: JSON.stringify({ branchCode: code })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      alert(
        `Franchise approved.\n\n` +
        `Sub-admin: ${data.subAdmin?.email}\n` +
        `Branch: ${data.branchCode}\n\n` +
        `Temporary password (share out-of-band): ${data.temporaryPassword}\n\n` +
        `A welcome email has been queued (if SMTP is configured).`
      );
      loadFranchiseApps();
    } else {
      alert('Approval failed: ' + (data.message || 'Unknown error'));
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Approve & Provision'; }
    }
  } catch (e) {
    alert('Network error. Please try again.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Approve & Provision'; }
  }
}

function updateFranchiseAppsBadge(pending) {
  const badge = document.getElementById('franchise-apps-badge');
  if (!badge) return;
  if (pending > 0) {
    badge.textContent = pending > 99 ? '99+' : String(pending);
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// Show the sidebar link for full admin only; hidden for sub_admin.
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(() => {
    const user = (typeof clientAuth !== 'undefined') ? clientAuth.getUser() : null;
    if (!user || user.role !== 'admin') return;
    const li = document.getElementById('nav-franchise-apps');
    if (li) li.style.display = '';
    // Prime badge count silently
    loadFranchiseAppsBadgeOnly();
  }, 300);

  const refreshBtn = document.getElementById('franchise-apps-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', loadFranchiseApps);
});

async function loadFranchiseAppsBadgeOnly() {
  try {
    const res = await fetch(getApiUrl('/admin/franchise-applications'), {
      headers: { Authorization: 'Bearer ' + clientAuth.getToken() }
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    const apps = data.applications || [];
    const pending = apps.filter(a => !/\[APPROVED /.test(a.message || '')).length;
    updateFranchiseAppsBadge(pending);
  } catch (_) {}
}
