// Reusable order-comments widget.
// Usage: window.AfComments.open(orderId, { title: 'Order #42 Comments' })
// Mounts a Bootstrap-styled modal with auto-polling (every 8s while open).

(function () {
  const POLL_MS = 8000;
  let modal = null;
  let pollTimer = null;
  let currentOrderId = null;

  function getRole() {
    if (!window.clientAuth || typeof clientAuth.getUser !== 'function') return null;
    const u = clientAuth.getUser();
    return u && u.role;
  }
  function getUserId() {
    const u = window.clientAuth && clientAuth.getUser ? clientAuth.getUser() : null;
    return u && u.id;
  }
  function authHeader() {
    const t = (window.clientAuth && clientAuth.getToken && clientAuth.getToken()) || localStorage.getItem('authToken') || '';
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }
  function endpointBase() {
    const role = getRole();
    if (!role) return null;
    if (role === 'client') {
      return null; // client uses different endpoint
    }
    return '/api/' + role + '/orders/';
  }
  function listUrl(orderId) {
    const role = getRole();
    if (role === 'client') return '/api/client/service/' + orderId + '/comments';
    return endpointBase() + orderId + '/comments';
  }
  function addUrl(orderId) {
    const role = getRole();
    if (role === 'client') return '/api/client/service/comment';
    return endpointBase() + orderId + '/comments';
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[<>"'&]/g, c => ({
      '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;'
    }[c]));
  }
  function unescapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }
  function timeAgo(t) {
    const ts = new Date(t).getTime();
    if (!Number.isFinite(ts)) return '';
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
  function colorForRole(role) {
    if (role === 'admin') return '#dc3545';
    if (role === 'employee') return '#1976d2';
    if (role === 'client') return '#0c9782';
    return '#666';
  }

  function buildModal() {
    if (modal) return;
    const wrap = document.createElement('div');
    wrap.id = 'af-comments-modal';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10001;display:none;align-items:center;justify-content:center;font-family:-apple-system,Arial,sans-serif;padding:16px;';
    wrap.innerHTML =
      '<div style="background:#fff;border-radius:12px;width:600px;max-width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.25);">' +
      '  <div style="padding:14px 18px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">' +
      '    <strong id="af-comments-title" style="color:#333;font-size:15px;"><i class="fas fa-comments" style="color:#0c9782;margin-right:6px;"></i>Order Comments</strong>' +
      '    <button type="button" id="af-comments-close" style="background:none;border:none;font-size:22px;color:#999;cursor:pointer;line-height:1;padding:0 4px;">&times;</button>' +
      '  </div>' +
      '  <div id="af-comments-list" style="flex:1;overflow-y:auto;padding:12px 18px;background:#fafafa;min-height:200px;"></div>' +
      '  <div style="padding:12px 18px;border-top:1px solid #eee;background:#fff;border-radius:0 0 12px 12px;">' +
      '    <div style="display:flex;gap:8px;">' +
      '      <textarea id="af-comments-input" rows="2" placeholder="Type a comment…" style="flex:1;border:1px solid #ddd;border-radius:6px;padding:8px 10px;resize:vertical;font-family:inherit;font-size:13px;"></textarea>' +
      '      <button type="button" id="af-comments-send" style="background:#0c9782;color:#fff;border:none;border-radius:6px;padding:0 16px;font-weight:600;font-size:13px;cursor:pointer;">Send</button>' +
      '    </div>' +
      '    <div id="af-comments-error" style="color:#dc3545;font-size:12px;margin-top:6px;display:none;"></div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(wrap);
    modal = wrap;

    document.getElementById('af-comments-close').addEventListener('click', close);
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    document.getElementById('af-comments-send').addEventListener('click', send);
    document.getElementById('af-comments-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
    });
  }

  async function fetchAndRender() {
    if (!currentOrderId) return;
    try {
      const url = listUrl(currentOrderId);
      const res = await fetch(url, { headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()) });
      if (!res.ok) return;
      const data = await res.json();
      render(Array.isArray(data.comments) ? data.comments : []);
    } catch (_) {}
  }

  function render(comments) {
    const list = document.getElementById('af-comments-list');
    if (!list) return;
    if (!comments.length) {
      list.innerHTML = '<div style="text-align:center;color:#888;padding:40px 0;font-size:13px;">No comments yet. Start the conversation below.</div>';
      return;
    }
    const me = getUserId();
    let html = '';
    for (const c of comments) {
      const isMe = String(c.user_id) === String(me);
      const role = c.user_role || (isMe ? getRole() : '');
      const name = c.user_name || c.user_email || 'User';
      const color = colorForRole(role);
      html +=
        '<div style="display:flex;justify-content:' + (isMe ? 'flex-end' : 'flex-start') + ';margin-bottom:10px;">' +
        '  <div style="max-width:75%;background:' + (isMe ? '#0c9782' : '#fff') + ';color:' + (isMe ? '#fff' : '#333') + ';border:1px solid ' + (isMe ? '#0c9782' : '#e0e0e0') + ';border-radius:10px;padding:8px 12px;box-shadow:0 1px 2px rgba(0,0,0,.04);">' +
        '    <div style="font-size:11px;font-weight:600;color:' + (isMe ? 'rgba(255,255,255,.85)' : color) + ';margin-bottom:3px;">' + escapeHtml(name) + (role ? ' · ' + escapeHtml(role) : '') + '</div>' +
        '    <div style="font-size:13px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;">' + escapeHtml(unescapeHtml(c.comment || '')) + '</div>' +
        '    <div style="font-size:10px;color:' + (isMe ? 'rgba(255,255,255,.7)' : '#999') + ';margin-top:4px;text-align:right;">' + timeAgo(c.created_at) + '</div>' +
        '  </div>' +
        '</div>';
    }
    list.innerHTML = html;
    list.scrollTop = list.scrollHeight;
  }

  async function send() {
    const input = document.getElementById('af-comments-input');
    const errEl = document.getElementById('af-comments-error');
    const sendBtn = document.getElementById('af-comments-send');
    if (!input || !currentOrderId) return;
    const text = (input.value || '').trim();
    if (!text) return;
    sendBtn.disabled = true;
    sendBtn.textContent = '…';
    errEl.style.display = 'none';
    try {
      const role = getRole();
      const url = addUrl(currentOrderId);
      const body = role === 'client'
        ? { serviceOrderId: currentOrderId, comment: text }
        : { comment: text };
      const res = await fetch(url, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()),
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        errEl.textContent = (data && data.message) || 'Failed to send comment';
        errEl.style.display = '';
      } else {
        input.value = '';
        await fetchAndRender();
      }
    } catch (e) {
      errEl.textContent = 'Network error';
      errEl.style.display = '';
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    }
  }

  function open(orderId, opts) {
    if (!orderId) return;
    buildModal();
    currentOrderId = orderId;
    if (opts && opts.title) {
      const t = document.getElementById('af-comments-title');
      if (t) t.innerHTML = '<i class="fas fa-comments" style="color:#0c9782;margin-right:6px;"></i>' + escapeHtml(opts.title);
    }
    document.getElementById('af-comments-list').innerHTML = '<div style="text-align:center;color:#888;padding:40px 0;font-size:13px;">Loading…</div>';
    document.getElementById('af-comments-input').value = '';
    document.getElementById('af-comments-error').style.display = 'none';
    modal.style.display = 'flex';
    fetchAndRender();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(fetchAndRender, POLL_MS);
    setTimeout(() => { const i = document.getElementById('af-comments-input'); if (i) i.focus(); }, 100);
  }

  function close() {
    if (modal) modal.style.display = 'none';
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    currentOrderId = null;
  }

  window.AfComments = { open: open, close: close };
})();
