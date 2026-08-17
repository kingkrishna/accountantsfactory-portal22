// Attach a real-time password strength meter to #new-password if present.
(function () {
  function score(pw) {
    if (!pw) return { level: 0, label: '', color: '#eee' };
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[a-z]/.test(pw)) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[@$!%*?&]/.test(pw)) s++;
    if (/[^A-Za-z0-9@$!%*?&]/.test(pw)) s++;
    if (s <= 2) return { level: 1, label: 'Weak',       color: '#dc3545', pct: 25 };
    if (s <= 4) return { level: 2, label: 'Fair',       color: '#fd7e14', pct: 50 };
    if (s <= 5) return { level: 3, label: 'Strong',     color: '#0c9782', pct: 75 };
    return            { level: 4, label: 'Very Strong', color: '#198754', pct: 100 };
  }

  function init() {
    const input = document.getElementById('new-password');
    const meter = document.getElementById('password-strength-meter');
    const bar   = document.getElementById('strength-bar');
    const label = document.getElementById('strength-label');
    if (!input || !meter || !bar || !label) return;

    input.addEventListener('input', function () {
      const val = input.value;
      if (!val) { meter.style.display = 'none'; return; }
      const r = score(val);
      meter.style.display = 'block';
      bar.style.width = r.pct + '%';
      bar.style.background = r.color;
      label.textContent = r.label;
      label.style.color = r.color;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
