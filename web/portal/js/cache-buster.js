// Cache-buster: forces fresh asset loading whenever the deployed version changes.
//
// HOW IT WORKS:
//   1. On every page load, fetch /api/version to get current server version
//   2. If localStorage's stored version is older, FORCE a hard cleanup:
//      - Unregister all service workers
//      - Delete all caches (Cache API)
//      - Clear sessionStorage of cached assets
//   3. Update stored version
//
// This runs BEFORE other scripts (head of HTML), so subsequent script loads
// in the same page already use fresh assets after the cleanup.

(function () {
  if (window.__afCacheBusted) return;
  window.__afCacheBusted = true;

  function getApiBase() {
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000/api';
    return 'https://accountantsfactory-api-50040008732.development.catalystappsail.in/api';
  }

  function clearAllCaches() {
    // 1. Unregister all service workers
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) { r.unregister(); });
      }).catch(function () {});
    }
    // 2. Delete all Cache Storage entries
    if (window.caches && caches.keys) {
      caches.keys().then(function (names) {
        return Promise.all(names.map(function (n) { return caches.delete(n); }));
      }).catch(function () {});
    }
    // 3. Clear any cached app data in sessionStorage (preserve auth token)
    try {
      var authToken = sessionStorage.getItem('authToken');
      var keys = Object.keys(sessionStorage);
      keys.forEach(function (k) {
        if (k.indexOf('_cache_') === 0 || k.indexOf('_etag_') === 0) {
          sessionStorage.removeItem(k);
        }
      });
    } catch (_) {}
  }

  function checkAndBust() {
    var STORED_KEY = 'af_client_version';
    var storedVersion = parseInt(localStorage.getItem(STORED_KEY) || '0', 10);

    fetch(getApiBase() + '/version', { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || typeof data.version !== 'number') return;
        var serverVersion = data.version;

        if (serverVersion > storedVersion) {
          // Version bumped — nuke caches and reload once with fresh query string
          clearAllCaches();
          localStorage.setItem(STORED_KEY, String(serverVersion));

          // Only reload once per version to prevent loops.
          var reloadKey = 'af_reloaded_v' + serverVersion;
          if (!sessionStorage.getItem(reloadKey)) {
            sessionStorage.setItem(reloadKey, '1');
            var url = new URL(window.location.href);
            url.searchParams.set('_v', serverVersion);
            url.searchParams.set('_t', Date.now()); // also bust intermediary proxies
            window.location.replace(url.toString());
          }
        } else if (!storedVersion) {
          // First visit — just record the version, don't reload
          localStorage.setItem(STORED_KEY, String(serverVersion));
        }
      })
      .catch(function () { /* offline or API down — don't disrupt user */ });
  }

  // Run immediately (before DOMContentLoaded)
  checkAndBust();

  // Re-check every 5 minutes WHILE THE TAB IS VISIBLE. Polling 30s forever for
  // every open tab (especially anonymous public homepage traffic) was wasted
  // load. 5 minutes is plenty for catching deploys; we also fire immediately
  // on tab focus so users coming back see the new version straight away.
  var POLL_MS = 5 * 60 * 1000;
  var _pollTimer = null;
  function startPolling() {
    if (_pollTimer) return;
    _pollTimer = setInterval(function () {
      if (document.visibilityState === 'visible') checkAndBust();
    }, POLL_MS);
  }
  function stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }
  if (document.visibilityState === 'visible') startPolling();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      checkAndBust();
      startPolling();
    } else {
      stopPolling();
    }
  });
  window.addEventListener('pagehide', stopPolling);
})();
