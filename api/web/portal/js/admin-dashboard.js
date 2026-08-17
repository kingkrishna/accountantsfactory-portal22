// Admin Dashboard — boot file.
//
// Each section now lives in its own admin-<section>.js file. This file owns:
//   - Shared mutable state (lastClients, lastOrders, lastEmployees)
//   - The DOMContentLoaded boot block that wires every modal + sidebar
//   - showSection (the router that dispatches to per-section loaders)
//   - loadOverview (the dashboard landing tiles)
//   - Cross-section utilities: downloadCsv, filterTableRows, updateProfile2FA
//   - 2FA modal handlers (open/verify/disable)
//
// HTML script load order (defined in admin/dashboard.html):
//   cache-buster, utils, api, admin-dashboard-utils, then the 6 admin-* section
//   files, then THIS file last so DOMContentLoaded fires after all section
//   functions are defined.

var lastClients = [];
var lastOrders = [];
var lastEmployees = [];

document.addEventListener('DOMContentLoaded', async function () {
  if (!requireAdmin()) return;

  // Token verify runs in background so it doesn't gate UI rendering.
  // Failure logs out asynchronously.
  clientAuth.verifyToken().then(isValid => {
    if (!isValid) clientAuth.logout();
  }).catch(err => {
    console.warn('[admin] verifyToken background check failed (non-blocking):', err);
  });

  loadOverview();
  updateProfile2FA(clientAuth.getUser());

  // Sidebar nav. Links without data-section (e.g. "Document Generator" with
  // target=_blank) keep their default navigation.
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', function (e) {
      const section = this.getAttribute('data-section');
      if (!section) return;
      e.preventDefault();
      showSection(section);
      document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
      this.classList.add('active');
    });
  });

  loadServicesForClientCreation();

  // Delegated handlers for dynamic rows
  const clientsSection = document.getElementById('clients-section');
  if (clientsSection) clientsSection.addEventListener('click', async function (e) {
    const toggleBtn = e.target.closest('.toggle-status-btn');
    if (toggleBtn) {
      e.preventDefault();
      await toggleClientStatus(toggleBtn.getAttribute('data-user-id'), toggleBtn.getAttribute('data-status'));
    }
  });

  const documentsSection = document.getElementById('documents-section');
  if (documentsSection) documentsSection.addEventListener('click', async function (e) {
    const viewBtn = e.target.closest('.view-docs-btn');
    const uploadBtn = e.target.closest('.upload-doc-btn');
    if (viewBtn) {
      e.preventDefault();
      openViewDocumentsModal(viewBtn.getAttribute('data-order-id'));
    } else if (uploadBtn) {
      e.preventDefault();
      openUploadDocumentModal(uploadBtn.getAttribute('data-order-id'));
    }
  });

  const servicesSection = document.getElementById('services-section');
  if (servicesSection) servicesSection.addEventListener('click', async function (e) {
    const updateBtn = e.target.closest('.update-status-btn');
    const uploadBtn = e.target.closest('.upload-doc-order-btn');
    const assignBtn = e.target.closest('.assign-employee-btn');
    if (updateBtn) {
      e.preventDefault();
      openUpdateStatusModal(updateBtn.getAttribute('data-order-id'));
    } else if (uploadBtn) {
      e.preventDefault();
      openUploadDocumentModal(uploadBtn.getAttribute('data-order-id'));
    } else if (assignBtn) {
      e.preventDefault();
      openAssignEmployeeModal(
        assignBtn.getAttribute('data-order-id'),
        assignBtn.getAttribute('data-client-email'),
        assignBtn.getAttribute('data-employee-id')
      );
    }
  });

  const referralsSection = document.getElementById('referrals-section');
  if (referralsSection) referralsSection.addEventListener('click', async function (e) {
    const reviewBtn = e.target.closest('.approve-referral-btn');
    if (reviewBtn) {
      e.preventDefault();
      openApproveReferralModal(reviewBtn.getAttribute('data-referral-id'));
    }
  });

  // Legacy Assign Service modal (only present on some dashboards)
  var legacyAssignBtn = document.getElementById('assign-service-submit');
  if (legacyAssignBtn) legacyAssignBtn.addEventListener('click', assignServiceSubmit);

  // Bulk Import modal submit
  const bulkImportBtn = document.getElementById('bulk-import-submit');
  if (bulkImportBtn) {
    bulkImportBtn.addEventListener('click', async function () {
      const textArea = document.getElementById('bulk-import-text').value.trim();
      if (!textArea) {
        alert('Please enter client data');
        return;
      }

      const clients = [];
      const lines = textArea.split('\n');
      for (const line of lines) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2 && !line.includes('---') && !line.includes('Email')) {
          const email = parts[0];
          const password = parts[1];
          if (email && password && email.includes('@')) {
            clients.push({ email, password });
          }
        }
      }

      if (clients.length === 0) {
        alert('No valid client data found. Please check the format.');
        return;
      }

      const progressDiv = document.getElementById('bulk-import-progress');
      const resultDiv = document.getElementById('bulk-import-result');
      progressDiv.style.display = 'block';
      resultDiv.style.display = 'none';
      bulkImportBtn.disabled = true;

      try {
        const response = await api.bulkImportClients(clients);

        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.className = 'alert alert-info mt-3';

        const summary = response.summary || {};
        document.getElementById('bulk-import-summary').innerHTML = `
          <strong>Total:</strong> ${summary.total} |
          <strong>Created:</strong> ${summary.created} |
          <strong>Skipped:</strong> ${summary.skipped} |
          <strong>Failed:</strong> ${summary.failed}
        `;

        if ((response.errors || []).length > 0) {
          const errorList = document.getElementById('bulk-import-error-list');
          errorList.innerHTML = '';
          (response.errors || []).slice(0, 10).forEach(err => {
            const li = document.createElement('li');
            li.textContent = err;
            errorList.appendChild(li);
          });
          document.getElementById('bulk-import-errors').style.display = 'block';
        }

        setTimeout(() => {
          loadClients();
          alert('Import completed! Check results below.');
        }, 500);
      } catch (err) {
        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.className = 'alert alert-danger mt-3';
        document.getElementById('bulk-import-summary').textContent = 'Error: ' + (err.message || 'Import failed');
      } finally {
        bulkImportBtn.disabled = false;
      }
    });
  }

  var assignServiceSubmitBtn = document.getElementById('assign-service-submit');
  if (assignServiceSubmitBtn) {
    assignServiceSubmitBtn.addEventListener('click', assignServiceSubmit);
  }

  var clientsSearch = document.getElementById('clients-search');
  if (clientsSearch) {
    clientsSearch.addEventListener('input', function () {
      // Typing in search resets the letter filter — admin searching for
      // 'naveen' while filtered to letter M would otherwise see an empty
      // table. Search wins; letter goes back to ALL.
      if (this.value.trim().length > 0 && typeof _clientsLetter !== 'undefined') {
        _clientsLetter = 'ALL';
      }
      _clientsPage = 1;
      renderClientsPage();
    });
  }
  var ordersSearch = document.getElementById('orders-search');
  if (ordersSearch) {
    ordersSearch.addEventListener('input', function () {
      filterTableRows('orders-tbody', this.value.trim(), [0, 1]);
    });
  }
  var empUpdatesSearch = document.getElementById('emp-updates-search');
  if (empUpdatesSearch) {
    empUpdatesSearch.addEventListener('input', function () {
      filterEmployeeUpdates(this.value.trim());
    });
  }
  var exportClientsBtn = document.getElementById('export-clients-btn');
  if (exportClientsBtn) exportClientsBtn.addEventListener('click', exportClientsCsv);

  var importFromFileBtn = document.getElementById('import-from-file-btn');
  if (importFromFileBtn) {
    importFromFileBtn.addEventListener('click', async function () {
      if (!confirm('This will import all clients from the credentials file. Continue?')) return;

      const btn = this;
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';

      try {
        const result = await api.importClientsFromFile();
        const msg = `Import complete!\nCreated: ${result.summary.created}\nSkipped: ${result.summary.skipped}\nFailed: ${result.summary.failed}`;
        alert(msg);
        loadClients();
      } catch (err) {
        alert('Import failed: ' + (err.message || 'Please try again.'));
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }
  var exportOrdersBtn = document.getElementById('export-orders-btn');
  if (exportOrdersBtn) exportOrdersBtn.addEventListener('click', exportOrdersCsv);

  // Add Order — pre-populate dropdowns now so the modal opens instantly.
  // Also re-populate on every button click in case data changed.
  populateAddOrderDropdowns();

  var addOrderBtn = document.getElementById('add-order-btn');
  if (addOrderBtn) {
    addOrderBtn.addEventListener('click', function () {
      console.log('[AddOrder] button clicked — refreshing dropdowns');
      populateAddOrderDropdowns();
    });
  }

  // Bootstrap modal show event — safety net for browsers where the click
  // doesn't fire (e.g. screen-reader-driven open).
  if (window.jQuery && window.jQuery.fn && window.jQuery.fn.modal) {
    try {
      window.jQuery('#add-order-modal').on('shown.bs.modal', populateAddOrderDropdowns);
    } catch (e) { console.warn('[AddOrder] could not bind shown.bs.modal:', e); }
  }

  var addOrderSubmit = document.getElementById('add-order-submit');
  if (addOrderSubmit) addOrderSubmit.addEventListener('click', submitAddOrder);

  var loadServicesBtn = document.getElementById('load-services-btn');
  if (loadServicesBtn) loadServicesBtn.addEventListener('click', loadAllServices);

  var testEmailBtn = document.getElementById('test-email-btn');
  if (testEmailBtn) testEmailBtn.addEventListener('click', async function () {
    const btn = this;
    const resultEl = document.getElementById('test-email-result');
    btn.disabled = true;
    resultEl.textContent = '';
    resultEl.className = 'ml-2 small';
    try {
      const res = await api.testEmail();
      resultEl.textContent = (res.success ? '✓ ' : '✗ ') + (res.message || 'Check config');
      resultEl.classList.add(res.success ? 'text-success' : 'text-danger');
    } catch (e) {
      console.error('Test email failed:', e);
      resultEl.textContent = '✗ Request failed';
      resultEl.classList.add('text-danger');
    } finally {
      btn.disabled = false;
    }
  });

  // 2FA (admin)
  document.getElementById('profile-2fa-enable')?.addEventListener('click', open2FASetupModal);
  document.getElementById('profile-2fa-disable')?.addEventListener('click', function () {
    $('#2fa-disable-modal').modal('show');
    document.getElementById('2fa-disable-password').value = '';
    document.getElementById('2fa-disable-code').value = '';
    var errEl = document.getElementById('2fa-disable-error');
    if (errEl) errEl.style.display = 'none';
  });
  document.getElementById('2fa-setup-verify')?.addEventListener('click', verify2FASetup);
  document.getElementById('2fa-disable-submit')?.addEventListener('click', submit2FADisable);
});

// ─── Section router ─────────────────────────────────────────────
function showSection(section) {
  document.querySelectorAll('.dashboard-section').forEach(sec => {
    sec.style.display = 'none';
  });

  const sectionDiv = document.getElementById(`${section}-section`);
  if (!sectionDiv) return;
  sectionDiv.style.display = 'block';

  switch (section) {
    case 'overview':         loadOverview(); break;
    case 'analytics':        if (typeof loadAnalytics === 'function') loadAnalytics(); break;
    case 'franchise-apps':   if (typeof loadFranchiseApps === 'function') loadFranchiseApps(); break;
    case 'clients':          loadClients(); break;
    case 'employees':        loadEmployees(); break;
    case 'services':         loadOrders(); break;            // "Service Orders" sidebar entry
    case 'manage-services':  loadServiceCatalog(); break;
    case 'referrals':        loadReferrals(); break;
    case 'employee-updates': loadEmployeeUpdates(); break;
    case 'documents':        loadDocumentsSection(); break;
    case 'compliance-mgmt':
      if (typeof loadComplianceSection === 'function') loadComplianceSection();
      break;
    case 'flip-portal':
      // No auto-load needed, user searches first
      break;
  }
}

// ─── Overview tile ─────────────────────────────────────────────
async function loadOverview() {
  const user = clientAuth.getUser();

  // Feature D: franchise banner for sub_admin. Populated below with the same
  // data we fetch for the KPI tiles — no extra API calls. Hidden for
  // full admin (they see the whole-company aggregate tiles instead).
  renderFranchiseBanner(user);

  if (user && user.demo) {
    document.getElementById('total-clients').textContent = '0';
    document.getElementById('total-orders').textContent = '0';
    document.getElementById('pending-referrals').textContent = '0';
    showRecentActivity([]);
    return;
  }
  try {
    const [clientsRes, ordersRes, referralsRes, employeesRes] = await Promise.all([
      api.getAllClients(),
      api.getAllOrders(),
      api.getAllReferrals().catch(() => ({ referrals: [] })),
      // Only sub_admin needs the employee count for the banner. Full admin
      // will still get 200 but we skip the request cost.
      user && user.role === 'sub_admin'
        ? api.getAllEmployees().catch(() => ({ employees: [] }))
        : Promise.resolve({ employees: [] })
    ]);

    document.getElementById('total-clients').textContent = clientsRes.pagination?.total || clientsRes.clients?.length || 0;

    const activeOrders = ordersRes.orders?.filter(o => o.status !== 'completed').length || 0;
    document.getElementById('total-orders').textContent = activeOrders;

    const pendingReferrals = referralsRes.referrals?.filter(r => r.status === 'pending').length || 0;
    document.getElementById('pending-referrals').textContent = pendingReferrals;

    // Sub_admin banner metrics (all pre-scoped by the server).
    if (user && user.role === 'sub_admin') {
      setText('franchise-my-clients', clientsRes.pagination?.total || clientsRes.clients?.length || 0);
      setText('franchise-my-orders', ordersRes.pagination?.total || (ordersRes.orders || []).length);
      setText('franchise-my-employees', (employeesRes.employees || []).length);
      setText('franchise-my-referrals', (referralsRes.referrals || []).length);
    }

    const recent = (ordersRes.orders || []).slice(0, 5);
    showRecentActivity(recent);
  } catch (error) {
    console.error('Failed to load overview:', error);
    showRecentActivity([]);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val);
}

// Feature D: paint the franchise banner + hide admin-only sidebar links
// when the caller is a sub_admin.
function renderFranchiseBanner(user) {
  const banner = document.getElementById('franchise-banner');
  if (!banner || !user) return;

  if (user.role !== 'sub_admin') {
    banner.style.display = 'none';
    return;
  }

  setText('franchise-banner-code', user.referral_code || user.franchise_code || '—');
  setText('franchise-banner-email', user.email || '—');
  banner.style.display = 'block';

  // Hide sidebar entries a franchise sub_admin has no permission to use.
  // (Manage Services + Document Generator are full-admin-only writes.)
  const hideForSubAdmin = ['manage-services'];
  document.querySelectorAll('.sidebar-nav li').forEach(li => {
    const link = li.querySelector('a');
    if (!link) return;
    const section = link.getAttribute('data-section');
    if (section && hideForSubAdmin.indexOf(section) !== -1) li.style.display = 'none';
    // Also hide any external-doc-gen link on the sidebar for sub_admin.
    const href = link.getAttribute('href') || '';
    if (href.indexOf('docgen/') !== -1) li.style.display = 'none';
  });
}

function showRecentActivity(orders) {
  const loadingEl = document.getElementById('recent-activity-loading');
  const emptyEl = document.getElementById('recent-activity-empty');
  const listEl = document.getElementById('recent-activity-list');
  const tbody = document.getElementById('recent-activity-tbody');
  if (!loadingEl || !emptyEl || !listEl || !tbody) return;
  loadingEl.style.display = 'none';
  if (!orders || orders.length === 0) {
    emptyEl.style.display = 'block';
    listEl.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  listEl.style.display = 'block';
  tbody.innerHTML = '';
  orders.forEach(function (o) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + escapeHtml(o.client_email || '—') + '</td><td>' + escapeHtml(o.service_name || '—') + '</td><td>' + formatDate(o.created_at) + '</td>';
    tbody.appendChild(tr);
  });
}

// ─── Cross-section utilities ─────────────────────────────────────────────

// Filter table rows by search query. Empty query => all rows visible.
function filterTableRows(tbodyId, q, colIndexes) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var rows = tbody.querySelectorAll('tr');
  var lower = (q || '').trim().toLowerCase();
  rows.forEach(function (tr) {
    if (tr.querySelector('td[colspan]')) {
      tr.style.display = lower ? 'none' : '';
      return;
    }
    var cells = tr.querySelectorAll('td');
    var match = !lower || colIndexes.some(function (i) {
      var c = cells[i];
      return c && (c.textContent || '').toLowerCase().indexOf(lower) !== -1;
    });
    tr.style.display = match ? '' : 'none';
  });
}

function downloadCsv(filename, headers, rows) {
  var escapeCsv = function (v) {
    var s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  var line = headers.map(escapeCsv).join(',');
  var body = rows.map(function (r) { return r.map(escapeCsv).join(','); }).join('\n');
  var csv = line + '\n' + body;
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── 2FA modal handlers ─────────────────────────────────────────────
function updateProfile2FA(user) {
  const statusEl = document.getElementById('profile-2fa-status');
  const enableBtn = document.getElementById('profile-2fa-enable');
  const disableBtn = document.getElementById('profile-2fa-disable');
  if (!statusEl || !enableBtn || !disableBtn) return;
  const enabled = !!(user && user.totp_enabled);
  statusEl.textContent = enabled ? '2FA is enabled.' : '2FA is disabled.';
  enableBtn.style.display = enabled ? 'none' : 'inline-block';
  disableBtn.style.display = enabled ? 'inline-block' : 'none';
}

async function open2FASetupModal() {
  const qrImg = document.getElementById('2fa-qr-img');
  const codeInput = document.getElementById('2fa-setup-code');
  const errEl = document.getElementById('2fa-setup-error');
  if (!qrImg || !codeInput || !errEl) return;
  errEl.style.display = 'none';
  codeInput.value = '';
  try {
    const res = await api.twoFaSetup();
    qrImg.src = res.qrUrl || '';
    $('#2fa-setup-modal').modal('show');
  } catch (e) {
    console.error('2FA setup failed:', e);
    alert('Failed to start 2FA setup. Please try again.');
  }
}

async function verify2FASetup() {
  const codeInput = document.getElementById('2fa-setup-code');
  const errEl = document.getElementById('2fa-setup-error');
  const code = (codeInput && codeInput.value || '').trim();
  if (!code) {
    if (errEl) { errEl.textContent = 'Please enter the 6-digit code.'; errEl.style.display = 'block'; }
    return;
  }
  try {
    await api.twoFaVerifySetup(code);
    $('#2fa-setup-modal').modal('hide');
    const isValid = await clientAuth.verifyToken();
    if (isValid) updateProfile2FA(clientAuth.getUser());
    alert('2FA enabled successfully.');
  } catch (e) {
    console.error('2FA verify setup failed:', e);
    if (errEl) { errEl.textContent = 'Invalid code. Please try again.'; errEl.style.display = 'block'; }
  }
}

async function submit2FADisable() {
  const pw = document.getElementById('2fa-disable-password');
  const code = document.getElementById('2fa-disable-code');
  const errEl = document.getElementById('2fa-disable-error');
  const password = (pw && pw.value || '').trim();
  const codeVal = (code && code.value || '').trim();
  if (!password || !codeVal) {
    if (errEl) { errEl.textContent = 'Please enter password and authenticator code.'; errEl.style.display = 'block'; }
    return;
  }
  try {
    await api.twoFaDisable(password, codeVal);
    $('#2fa-disable-modal').modal('hide');
    const isValid = await clientAuth.verifyToken();
    if (isValid) updateProfile2FA(clientAuth.getUser());
    alert('2FA disabled successfully.');
  } catch (e) {
    console.error('2FA disable failed:', e);
    if (errEl) { errEl.textContent = 'Invalid password or code. Please try again.'; errEl.style.display = 'block'; }
  }
}
