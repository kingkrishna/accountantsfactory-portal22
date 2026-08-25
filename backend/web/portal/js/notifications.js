// In-app notifications bell.
// Renders a bell icon (with unread count badge) into elements with class
// .notification-bell. Polls /api/{role}/notifications every 60s.
// Unread is determined by comparing item.ts to localStorage `notif_last_seen_at`.

(function () {
  const POLL_MS = 60000;
  let lastSeen = parseInt(localStorage.getItem('notif_last_seen_at') || '0', 10);
  let items = [];
  let pollTimer = null;
  let panel = null;

  function getRole() {
    if (!window.clientAuth || typeof clientAuth.getUser !== 'function') return null;
    const u = clientAuth.getUser();
    return u && u.role;
  }

  function endpoint() {
    const role = getRole();
    if (!role) return null;
    if (typeof window.getApiUrl === 'function') return window.getApiUrl('/' + role + '/notifications');
    return '/api/' + role + '/notifications';
  }

  function authHeader() {
    const t = (window.clientAuth && clientAuth.getToken && clientAuth.getToken()) || localStorage.getItem('authToken') || '';
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }

  async function fetchNotifications() {
    const url = endpoint();
    if (!url) return;
    try {
      const res = await fetch(url, { headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()) });
      if (!res.ok) return;
      const data = await res.json();
      items = Array.isArray(data.notifications) ? data.notifications : [];
      renderBadges();
      if (panel && panel.style.display !== 'none') renderPanel();
    } catch (_) {}
  }

  function unreadCount() {
    return items.filter(it => it.ts > lastSeen).length;
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    if (d < 30) return d + 'd ago';
    return new Date(ts).toLocaleDateString();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[<>"'&]/g, c => ({
      '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'
    }[c]));
  }

  function renderBadges() {
    const count = unreadCount();
    document.querySelectorAll('.notification-bell').forEach(host => {
      let badge = host.querySelector('.notif-badge');
      if (!badge) {
        host.innerHTML = '<i class="fas fa-bell" style="font-size:18px;color:#0c9782;"></i><span class="notif-badge" style="display:none;"></span>';
        host.style.cssText += ';position:relative;cursor:pointer;display:inline-block;padding:8px;margin-right:6px;vertical-align:middle;';
        badge = host.querySelector('.notif-badge');
        badge.style.cssText = 'position:absolute;top:2px;right:2px;background:#dc3545;color:#fff;font-size:10px;font-weight:700;border-radius:10px;padding:1px 5px;min-width:16px;text-align:center;line-height:1.3;';
        host.addEventListener('click', togglePanel);
      }
      if (count > 0) { badge.textContent = count > 99 ? '99+' : String(count); badge.style.display = ''; }
      else { badge.style.display = 'none'; }
    });
  }

  function togglePanel(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!panel) buildPanel();
    if (panel.style.display === 'none') {
      renderPanel();
      panel.style.display = '';
      lastSeen = Date.now();
      localStorage.setItem('notif_last_seen_at', String(lastSeen));
      setTimeout(renderBadges, 50);
      document.addEventListener('click', closePanelOnOutside, true);
    } else {
      panel.style.display = 'none';
      document.removeEventListener('click', closePanelOnOutside, true);
    }
  }

  function closePanelOnOutside(e) {
    if (!panel) return;
    if (panel.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.notification-bell')) return;
    panel.style.display = 'none';
    document.removeEventListener('click', closePanelOnOutside, true);
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.style.cssText = 'position:fixed;top:64px;right:20px;z-index:10000;width:360px;max-width:calc(100vw - 40px);max-height:480px;overflow:hidden;background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.18);display:none;font-family:-apple-system,Arial,sans-serif;border:1px solid #e0e0e0;';
    document.body.appendChild(panel);
  }

  function renderPanel() {
    if (!panel) return;
    if (!items.length) {
      panel.innerHTML =
        '<div style="padding:14px 16px;border-bottom:1px solid #eee;font-weight:600;color:#333;display:flex;justify-content:space-between;align-items:center;">' +
        '  <span><i class="fas fa-bell" style="margin-right:6px;color:#0c9782;"></i>Notifications</span>' +
        '</div>' +
        '<div style="padding:30px 16px;text-align:center;color:#888;font-size:13px;">No notifications yet</div>';
      return;
    }
    let html =
      '<div style="padding:14px 16px;border-bottom:1px solid #eee;font-weight:600;color:#333;display:flex;justify-content:space-between;align-items:center;">' +
      '  <span><i class="fas fa-bell" style="margin-right:6px;color:#0c9782;"></i>Notifications</span>' +
      '  <button type="button" id="notif-mark-read" style="background:none;border:none;color:#0c9782;font-size:12px;cursor:pointer;">Mark all read</button>' +
      '</div>' +
      '<div style="overflow-y:auto;max-height:420px;">';
    for (const it of items) {
      const unread = it.ts > lastSeen;
      html +=
        '<div class="notif-item" data-link="' + escapeHtml(it.link || '') + '" style="padding:12px 16px;border-bottom:1px solid #f0f0f0;cursor:pointer;background:' + (unread ? '#f7fbfa' : '#fff') + ';transition:background .15s;">' +
        '  <div style="display:flex;align-items:flex-start;gap:10px;">' +
        '    ' + (unread ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0c9782;margin-top:6px;flex-shrink:0;"></span>' : '<span style="display:inline-block;width:8px;flex-shrink:0;"></span>') +
        '    <div style="flex:1;min-width:0;">' +
        '      <div style="font-weight:600;color:#333;font-size:13px;">' + escapeHtml(it.title) + '</div>' +
        '      <div style="color:#666;font-size:12px;margin-top:2px;line-height:1.4;word-break:break-word;">' + escapeHtml(it.body) + '</div>' +
        '      <div style="color:#aaa;font-size:11px;margin-top:4px;">' + timeAgo(it.ts) + '</div>' +
        '    </div>' +
        '  </div>' +
        '</div>';
    }
    html += '</div>';
    panel.innerHTML = html;

    panel.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', function () {
        const link = el.getAttribute('data-link') || '';
        if (link.startsWith('#')) {
          const sec = link.slice(1);
          const navLink = document.querySelector('[data-section="' + sec + '"]');
          if (navLink) navLink.click();
        }
        panel.style.display = 'none';
      });
    });
    const btn = document.getElementById('notif-mark-read');
    if (btn) btn.addEventListener('click', function (e) {
      e.stopPropagation();
      lastSeen = Date.now();
      localStorage.setItem('notif_last_seen_at', String(lastSeen));
      renderBadges();
      renderPanel();
    });
  }

  function init() {
    if (!getRole()) return;
    if (!document.querySelector('.notification-bell')) return;
    fetchNotifications();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(fetchNotifications, POLL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
