// Login activity banner — shows after login if a previous login exists.
// Reads previous_login_at from the user object set during login.
// Self-dismisses after 12 seconds. Persists per session so it shows once per login.

(function () {
  function fmtTime(iso) {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now - d;
      const mins = Math.floor(diffMs / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + ' minute' + (mins === 1 ? '' : 's') + ' ago';
      if (hrs < 24)  return hrs + ' hour' + (hrs === 1 ? '' : 's') + ' ago';
      if (days < 30) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
      return d.toLocaleDateString();
    } catch (e) { return null; }
  }

  function show() {
    if (sessionStorage.getItem('login_activity_shown')) return;
    sessionStorage.setItem('login_activity_shown', '1');

    if (!window.clientAuth || typeof clientAuth.getUser !== 'function') return;
    const u = clientAuth.getUser();
    if (!u || !u.previous_login_at) return;

    const when = fmtTime(u.previous_login_at);
    const ip = u.previous_login_ip || 'unknown IP';
    if (!when) return;

    const banner = document.createElement('div');
    banner.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px', 'z-index:9999',
      'background:#fff', 'border:1px solid #d4edda', 'border-left:4px solid #0c9782',
      'box-shadow:0 4px 16px rgba(0,0,0,.1)', 'border-radius:8px',
      'padding:14px 18px 14px 16px', 'max-width:340px',
      'font-family:-apple-system,Arial,sans-serif', 'font-size:13px', 'line-height:1.5',
      'color:#333', 'animation:slidein .3s ease'
    ].join(';');
    banner.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:10px;">' +
      '  <div style="font-size:20px;">🔐</div>' +
      '  <div style="flex:1;">' +
      '    <strong style="color:#0c9782;">Last login: ' + when + '</strong>' +
      '    <div style="color:#666;font-size:12px;margin-top:3px;">From IP: ' + escapeHtmlSafe(ip) + '</div>' +
      '    <div style="color:#888;font-size:11px;margin-top:4px;">Not you? <a href="#" id="la-logout-all" style="color:#dc3545;text-decoration:underline;">Logout all devices</a></div>' +
      '  </div>' +
      '  <button type="button" id="la-close" aria-label="Close" style="background:none;border:none;font-size:18px;color:#999;cursor:pointer;line-height:1;padding:0;">&times;</button>' +
      '</div>';
    document.body.appendChild(banner);

    const close = () => banner.remove();
    document.getElementById('la-close').addEventListener('click', close);
    document.getElementById('la-logout-all').addEventListener('click', function (e) {
      e.preventDefault();
      if (confirm('Log out from all devices? You will need to login again.')) {
        if (typeof clientAuth.logout === 'function') clientAuth.logout();
      }
    });
    setTimeout(close, 12000);
  }

  function escapeHtmlSafe(s) {
    return String(s == null ? '' : s).replace(/[<>"'&]/g, c => ({
      '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'
    }[c]));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
})();
