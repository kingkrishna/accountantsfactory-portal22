// Mandatory 2FA prompt for admin users.
// Shows a non-blocking but persistent banner urging admins without 2FA to enable it.
// After 7 days from first warning, the banner becomes a hard modal that only
// dismisses after the admin clicks "Enable Now" or "Remind tomorrow" (max 3 times).

(function () {
  function getStorage(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function setStorage(key, val) { try { localStorage.setItem(key, val); } catch (_) {} }

  function init() {
    if (!window.clientAuth || typeof clientAuth.getUser !== 'function') return;
    const u = clientAuth.getUser();
    if (!u) return;
    if (u.role !== 'admin') return;
    if (u.totp_enabled) return;

    const FIRST_KEY = 'admin_2fa_first_warn_at';
    const SNOOZE_KEY = 'admin_2fa_snooze_until';
    const SNOOZE_COUNT_KEY = 'admin_2fa_snooze_count';

    const now = Date.now();
    let firstWarn = parseInt(getStorage(FIRST_KEY) || '0', 10);
    if (!firstWarn) { firstWarn = now; setStorage(FIRST_KEY, String(now)); }

    const snoozeUntil = parseInt(getStorage(SNOOZE_KEY) || '0', 10);
    if (snoozeUntil && now < snoozeUntil) return;

    const daysSinceFirst = (now - firstWarn) / 86400000;
    const snoozeCount = parseInt(getStorage(SNOOZE_COUNT_KEY) || '0', 10);
    const isHard = daysSinceFirst >= 7 || snoozeCount >= 3;

    show(isHard);
  }

  function show(hard) {
    if (document.getElementById('admin-2fa-nag')) return;

    const overlay = document.createElement('div');
    overlay.id = 'admin-2fa-nag';
    overlay.style.cssText = hard
      ? 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99998;display:flex;align-items:center;justify-content:center;font-family:-apple-system,Arial,sans-serif;'
      : 'position:fixed;top:70px;right:20px;z-index:9998;font-family:-apple-system,Arial,sans-serif;';

    const card = document.createElement('div');
    card.style.cssText = hard
      ? 'background:#fff;border-radius:10px;padding:28px;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,.3);border-top:4px solid #dc3545;'
      : 'background:#fff;border:1px solid #ffc107;border-left:4px solid #ffc107;border-radius:8px;padding:14px 16px;max-width:340px;box-shadow:0 4px 16px rgba(0,0,0,.15);';

    const title = hard ? 'Enable Two-Factor Authentication' : '2FA recommended for your admin account';
    const body = hard
      ? 'You have been an admin for over 7 days without 2FA. Per security policy, please enable two-factor authentication now to continue protecting client data.'
      : 'Your admin account is high-value. Enable 2FA so a stolen password alone cannot compromise the portal.';

    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:12px;">' +
      '  <div style="font-size:' + (hard ? '32px' : '22px') + ';">🔒</div>' +
      '  <div style="flex:1;">' +
      '    <strong style="color:' + (hard ? '#dc3545' : '#856404') + ';font-size:' + (hard ? '17px' : '14px') + ';">' + title + '</strong>' +
      '    <div style="color:#555;font-size:' + (hard ? '14px' : '12px') + ';margin-top:6px;line-height:1.5;">' + body + '</div>' +
      '    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">' +
      '      <button type="button" id="nag-enable" style="background:#0c9782;color:#fff;border:none;border-radius:5px;padding:7px 14px;font-size:13px;cursor:pointer;font-weight:600;">Enable Now</button>' +
      (hard
        ? '      <button type="button" id="nag-snooze" style="background:#f1f1f1;color:#555;border:none;border-radius:5px;padding:7px 14px;font-size:13px;cursor:pointer;">Remind tomorrow</button>'
        : '      <button type="button" id="nag-dismiss" style="background:none;color:#999;border:none;font-size:12px;cursor:pointer;">Dismiss</button>') +
      '    </div>' +
      '  </div>' +
      '</div>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById('nag-enable').addEventListener('click', function () {
      overlay.remove();
      goToProfile2FA();
    });
    const snoozeBtn = document.getElementById('nag-snooze');
    if (snoozeBtn) snoozeBtn.addEventListener('click', function () {
      const tomorrow = Date.now() + 24 * 3600 * 1000;
      try { localStorage.setItem('admin_2fa_snooze_until', String(tomorrow)); } catch (_) {}
      try { localStorage.setItem('admin_2fa_snooze_count', String((parseInt(localStorage.getItem('admin_2fa_snooze_count') || '0', 10) + 1))); } catch (_) {}
      overlay.remove();
    });
    const dismissBtn = document.getElementById('nag-dismiss');
    if (dismissBtn) dismissBtn.addEventListener('click', function () {
      const later = Date.now() + 6 * 3600 * 1000;
      try { localStorage.setItem('admin_2fa_snooze_until', String(later)); } catch (_) {}
      overlay.remove();
    });
  }

  function goToProfile2FA() {
    const link = document.querySelector('[data-section="profile"]');
    if (link) link.click();
    setTimeout(function () {
      const enableBtn = document.getElementById('profile-2fa-enable');
      if (enableBtn) enableBtn.click();
      else {
        const profileSection = document.getElementById('profile-section');
        if (profileSection) profileSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
