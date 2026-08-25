// Renders user's initials avatar in dashboard headers.
// Looks for elements with class .user-avatar and fills them with the first letter
// of name (or email). Color is deterministically derived from the email so the
// same user always gets the same color.

(function () {
  const COLORS = ['#0c9782', '#0a7f6f', '#1976d2', '#7b1fa2', '#c62828', '#ef6c00', '#f57c00', '#388e3c', '#5d4037', '#455a64'];

  function colorFor(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return COLORS[Math.abs(h) % COLORS.length];
  }

  function init() {
    if (!window.clientAuth || typeof clientAuth.getUser !== 'function') return;
    const u = clientAuth.getUser();
    if (!u) return;
    const name = (u.name || '').trim();
    const email = (u.email || '').trim();
    const letter = (name || email || '?').charAt(0).toUpperCase();
    const bg = colorFor(email || name || 'x');

    document.querySelectorAll('.user-avatar').forEach(el => {
      el.style.cssText += ';display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:' + bg + ';color:#fff;font-weight:700;font-size:15px;letter-spacing:.5px;flex-shrink:0;';
      el.textContent = letter;
      el.title = name || email;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
