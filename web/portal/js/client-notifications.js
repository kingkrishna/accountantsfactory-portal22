// Feature B: client portal — notifications inbox + order timeline modal.
//
// Backend endpoints used (already existed pre-v85):
//   GET /api/client/notifications
//   GET /api/client/service/:orderId/comments
// No new backend routes; this is purely a frontend surfacing of data that
// was already reachable.

// ─── Notifications inbox ──────────────────────────────────────────────
async function loadClientNotifications() {
  const loading = document.getElementById('client-notif-loading');
  const empty = document.getElementById('client-notif-empty');
  const list = document.getElementById('client-notif-list');
  if (!loading || !list) return;

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.style.display = 'none';
  list.innerHTML = '';

  try {
    const res = await fetch(getApiUrl('/client/notifications'), {
      headers: { Authorization: 'Bearer ' + clientAuth.getToken() }
    });
    const data = await res.json().catch(() => ({}));
    const items = data.notifications || data.data || [];
    _clientNotifs = items;
    renderClientNotifications();
  } catch (e) {
    console.error('Notifications load failed:', e);
    loading.style.display = 'none';
    empty.innerHTML = '<p class="text-danger">Failed to load notifications.</p>';
    empty.style.display = 'block';
  }
}

var _clientNotifs = [];

function renderClientNotifications() {
  const loading = document.getElementById('client-notif-loading');
  const empty = document.getElementById('client-notif-empty');
  const list = document.getElementById('client-notif-list');
  const filter = document.getElementById('client-notif-filter')?.value || 'all';

  loading.style.display = 'none';
  const visible = filter === 'unread'
    ? _clientNotifs.filter(n => !n.read_at && !n.readAt && !n.is_read)
    : _clientNotifs;

  if (visible.length === 0) {
    empty.style.display = 'block';
    list.style.display = 'none';
    updateNotifBadge();
    return;
  }

  empty.style.display = 'none';
  list.style.display = 'block';
  list.innerHTML = visible.map(renderNotifItem).join('');
  updateNotifBadge();
}

function renderNotifItem(n) {
  const title = escapeHtml(n.title || n.subject || n.type || 'Notification');
  const msg = escapeHtml(n.message || n.body || '');
  const when = formatDate(n.created_at || n.createdAt);
  const unread = !(n.read_at || n.readAt || n.is_read);
  return `
    <div class="client-notif-item ${unread ? 'unread' : ''}">
      <div class="client-notif-icon"><i class="fas fa-${notifIcon(n)}"></i></div>
      <div class="client-notif-body">
        <div class="client-notif-title">${title}</div>
        ${msg ? `<div class="client-notif-msg">${msg}</div>` : ''}
        <div class="client-notif-when">${when}</div>
      </div>
      ${unread ? '<span class="client-notif-dot" title="Unread"></span>' : ''}
    </div>`;
}

function notifIcon(n) {
  const t = (n.type || n.category || '').toLowerCase();
  if (t.indexOf('doc') !== -1) return 'file-alt';
  if (t.indexOf('order') !== -1 || t.indexOf('service') !== -1) return 'briefcase';
  if (t.indexOf('referr') !== -1) return 'user-friends';
  if (t.indexOf('paym') !== -1) return 'money-bill-wave';
  if (t.indexOf('compl') !== -1) return 'clipboard-check';
  return 'bell';
}

function updateNotifBadge() {
  const badge = document.getElementById('client-notif-badge');
  if (!badge) return;
  const unread = _clientNotifs.filter(n => !n.read_at && !n.readAt && !n.is_read).length;
  if (unread > 0) {
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ─── Order timeline modal ─────────────────────────────────────────────
async function openClientOrderTimeline(orderId, meta) {
  const loading = document.getElementById('order-timeline-loading');
  const empty = document.getElementById('order-timeline-empty');
  const list = document.getElementById('order-timeline-events');
  const metaEl = document.getElementById('order-timeline-meta');
  if (!loading || !list) return;

  loading.style.display = 'block';
  empty.style.display = 'none';
  list.style.display = 'none';
  list.innerHTML = '';
  metaEl.innerHTML = meta ? `
    <div class="timeline-meta">
      <div><strong>Service:</strong> ${escapeHtml(meta.service || '')}</div>
      <div><strong>Status:</strong> <span class="status-badge status-${escapeHtml((meta.status || 'pending').toLowerCase().replace('_','-'))}">${escapeHtml(meta.status || '')}</span></div>
      ${meta.period ? `<div><strong>Period:</strong> ${escapeHtml(meta.period)}</div>` : ''}
      ${meta.assignedAt ? `<div><strong>Assigned:</strong> ${formatDate(meta.assignedAt)}</div>` : ''}
    </div>` : '';

  if (typeof $ === 'function') $('#order-timeline-modal').modal('show');

  try {
    const res = await fetch(getApiUrl('/client/service/' + encodeURIComponent(orderId) + '/comments'), {
      headers: { Authorization: 'Bearer ' + clientAuth.getToken() }
    });
    const data = await res.json().catch(() => ({}));
    const events = data.comments || data.updates || data.data || [];

    loading.style.display = 'none';
    if (events.length === 0) {
      empty.style.display = 'block';
      return;
    }

    // Newest first
    events.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

    list.innerHTML = `
      <div class="af-timeline">
        ${events.map(ev => `
          <div class="af-timeline-item">
            <div class="af-timeline-dot"></div>
            <div class="af-timeline-content">
              <div class="af-timeline-when">${formatDate(ev.created_at || ev.createdAt)}</div>
              <div class="af-timeline-author">${escapeHtml(ev.author_email || ev.author || 'Team')}</div>
              <div class="af-timeline-body">${escapeHtml(ev.comment || ev.message || ev.text || '')}</div>
            </div>
          </div>
        `).join('')}
      </div>`;
    list.style.display = 'block';
  } catch (e) {
    console.error('Timeline load failed:', e);
    loading.style.display = 'none';
    empty.textContent = 'Failed to load timeline.';
    empty.style.display = 'block';
  }
}

// ─── Wire showSection + filter + service-card Timeline buttons ────────
document.addEventListener('DOMContentLoaded', function () {
  // Extend the existing showSection to route notifications too. We keep the
  // original router intact and just hook via the sidebar click handler.
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    if (link.getAttribute('data-section') === 'notifications') {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
        const sec = document.getElementById('notifications-section');
        if (sec) sec.style.display = 'block';
        document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
        this.classList.add('active');
        loadClientNotifications();
      });
    }
  });

  const filterSel = document.getElementById('client-notif-filter');
  if (filterSel) filterSel.addEventListener('change', renderClientNotifications);

  // Delegated: Timeline button on service order cards. The button is
  // rendered dynamically by client-dashboard.js so we use event delegation
  // on the services section container.
  const svcSection = document.getElementById('services-section');
  if (svcSection) {
    svcSection.addEventListener('click', function (e) {
      const btn = e.target.closest('.client-timeline-btn');
      if (!btn) return;
      e.preventDefault();
      openClientOrderTimeline(btn.getAttribute('data-order-id'), {
        service: btn.getAttribute('data-service'),
        status: btn.getAttribute('data-status'),
        period: btn.getAttribute('data-period'),
        assignedAt: btn.getAttribute('data-assigned')
      });
    });
  }

  // Preload notifications on first load for the sidebar badge count.
  // Fires ~500ms after DOMContentLoaded so it doesn't gate the main render.
  setTimeout(() => {
    if (typeof clientAuth === 'undefined' || !clientAuth.getToken()) return;
    loadClientNotifications();
  }, 500);
});
