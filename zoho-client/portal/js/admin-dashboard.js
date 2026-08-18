// Admin Dashboard Functionality
var lastClients = [];
var lastOrders = [];
var lastEmployees = [];

document.addEventListener('DOMContentLoaded', async function () {
  // Check admin authentication
  if (!requireAdmin()) return;

  // Verify token
  const isValid = await clientAuth.verifyToken();
  if (!isValid) {
    clientAuth.logout();
    return;
  }

  // Load overview statistics
  loadOverview();
  updateProfile2FA(clientAuth.getUser());

  // Sidebar navigation
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const section = this.getAttribute('data-section');
      showSection(section);

      // Update active state
      document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Load available services for client creation
  loadServicesForClientCreation();

  // Delegated handlers for client actions (rows are dynamic)
  const clientsSection = document.getElementById('clients-section');
  if (clientsSection) clientsSection.addEventListener('click', async function (e) {
    const toggleBtn = e.target.closest('.toggle-status-btn');
    if (toggleBtn) {
      e.preventDefault();
      const userId = toggleBtn.getAttribute('data-user-id');
      const currentStatus = toggleBtn.getAttribute('data-status');
      await toggleClientStatus(userId, currentStatus);
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
      const orderId = assignBtn.getAttribute('data-order-id');
      const clientEmail = assignBtn.getAttribute('data-client-email');
      const currentEmployeeId = assignBtn.getAttribute('data-employee-id');
      openAssignEmployeeModal(orderId, clientEmail, currentEmployeeId);
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

  // Assign Service modal submit
  document.getElementById('assign-service-submit').addEventListener('click', assignServiceSubmit);

  // Bulk Import modal submit
  const bulkImportBtn = document.getElementById('bulk-import-submit');
  if (bulkImportBtn) {
    bulkImportBtn.addEventListener('click', async function () {
      const textArea = document.getElementById('bulk-import-text').value.trim();
      if (!textArea) {
        alert('Please enter client data');
        return;
      }

      // Parse the data
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

      // Show progress
      const progressDiv = document.getElementById('bulk-import-progress');
      const resultDiv = document.getElementById('bulk-import-result');
      progressDiv.style.display = 'block';
      resultDiv.style.display = 'none';
      bulkImportBtn.disabled = true;

      try {
        const response = await api.bulkImportClients(clients);

        // Show results
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

        // Reload clients list
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
      filterTableRows('clients-tbody', this.value.trim(), [0]);
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

  // Load all services button
  var loadServicesBtn = document.getElementById('load-services-btn');
  if (loadServicesBtn) loadServicesBtn.addEventListener('click', loadAllServices);

  // Test email config button
  document.getElementById('test-email-btn').addEventListener('click', async function () {
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

  // 2FA (admin account)
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

function showSection(section) {
  document.querySelectorAll('.dashboard-section').forEach(sec => {
    sec.style.display = 'none';
  });

  const sectionDiv = document.getElementById(`${section}-section`);
  if (sectionDiv) {
    sectionDiv.style.display = 'block';
    switch (section) {
      case 'overview':
        loadOverview();
        break;
      case 'clients':
        loadClients();
        break;
      case 'employees':
        loadEmployees();
        break;
      case 'services':
        // Service Orders — all orders placed by clients or admin
        loadOrders();
        break;
      case 'manage-services':
        // Service Catalog — add/toggle available services
        loadServiceCatalog();
        break;
      case 'referrals':
        loadReferrals();
        break;
      case 'employee-updates':
        loadEmployeeUpdates();
        break;
      case 'documents':
        loadDocumentsSection();
        break;
    }
  }
}

async function loadOverview() {
  const user = clientAuth.getUser();
  if (user && user.demo) {
    document.getElementById('total-clients').textContent = '0';
    document.getElementById('total-orders').textContent = '0';
    document.getElementById('pending-referrals').textContent = '0';
    showRecentActivity([]);
    return;
  }
  try {
    const [clientsRes, ordersRes, referralsRes] = await Promise.all([
      api.getAllClients(),
      api.getAllOrders(),
      api.getAllReferrals().catch(() => ({ referrals: [] }))
    ]);

    document.getElementById('total-clients').textContent = clientsRes.clients?.length || 0;

    const activeOrders = ordersRes.orders?.filter(o => o.status !== 'completed').length || 0;
    document.getElementById('total-orders').textContent = activeOrders;

    const pendingReferrals = referralsRes.referrals?.filter(r => r.status === 'pending').length || 0;
    document.getElementById('pending-referrals').textContent = pendingReferrals;

    const recent = (ordersRes.orders || []).slice(0, 5);
    showRecentActivity(recent);
  } catch (error) {
    console.error('Failed to load overview:', error);
    showRecentActivity([]);
  }
}

function filterTableRows(tbodyId, q, colIndexes) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var rows = tbody.querySelectorAll('tr');
  var lower = (q || '').toLowerCase();
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

function exportClientsCsv() {
  if (!lastClients.length) {
    alert('No client data to export. Load Clients first.');
    return;
  }
  var headers = ['Email', 'Status', 'Referral Code', 'Created'];
  var rows = lastClients.map(function (c) {
    return [c.email || '', c.status || '', c.referral_code || '', formatDate(c.created_at) || ''];
  });
  downloadCsv('clients.csv', headers, rows);
}

function exportOrdersCsv() {
  if (!lastOrders.length) {
    alert('No order data to export. Load Service Orders first.');
    return;
  }
  var headers = ['Client Email', 'Service', 'Period', 'Status', 'Date'];
  var rows = lastOrders.map(function (o) {
    return [o.client_email || '', o.service_name || '', o.period || '', o.status || '', formatDate(o.created_at) || ''];
  });
  downloadCsv('orders.csv', headers, rows);
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

async function loadClients() {
  const loadingDiv = document.getElementById('clients-loading');
  const tableContainer = document.getElementById('clients-table-container');
  const tbody = document.getElementById('clients-tbody');

  loadingDiv.style.display = 'block';
  tableContainer.style.display = 'none';

  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No clients (demo account)</td></tr>';
    return;
  }

  try {
    const response = await api.getAllClients();
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';

    tbody.innerHTML = '';

    if (!response.clients || response.clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No clients found</td></tr>';
      lastClients = [];
      return;
    }

    lastClients = response.clients;
    response.clients.forEach(client => {
      const row = document.createElement('tr');
      const safeId = escapeHtml(client.id);
      const safeStatus = escapeHtml(client.status);
      const statusClass = client.status === 'active' ? 'completed' : 'pending';
      const btnLabel = client.status === 'active' ? 'Deactivate' : 'Activate';
      const btnIcon = client.status === 'active' ? 'ban' : 'check';
      row.innerHTML = `
        <td>${escapeHtml(client.email)}</td>
        <td><span class="status-badge status-${statusClass}">${safeStatus}</span></td>
        <td><code>${escapeHtml(client.referral_code || 'N/A')}</code></td>
        <td>${formatDate(client.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-secondary toggle-status-btn" data-user-id="${safeId}" data-status="${safeStatus}">
            <i class="fas fa-${btnIcon}"></i> ${btnLabel}
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    lastClients = [];
    console.error('Failed to load clients:', error);
    alert('Failed to load clients. Please try again.');
  }
}

async function loadOrders() {
  const loadingDiv = document.getElementById('orders-loading');
  const tableContainer = document.getElementById('orders-table-container');
  const tbody = document.getElementById('orders-tbody');

  loadingDiv.style.display = 'block';
  tableContainer.style.display = 'none';

  try {
    const response = await api.getAllOrders();
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';

    tbody.innerHTML = '';

    if (!response.orders || response.orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
      lastOrders = [];
      return;
    }

    lastOrders = response.orders;
    response.orders.forEach(order => {
      const row = document.createElement('tr');
      const oid = escapeHtml(order.id);
      const statusLabelMap = { 'pending': 'Pending', 'in_progress': 'In Progress', 'completed': 'Completed' };
      const statusClassMap = { 'pending': 'pending', 'in_progress': 'in-progress', 'completed': 'completed' };
      const statusClass = statusClassMap[(order.status || '').toLowerCase()] || 'pending';
      const statusLabel = statusLabelMap[(order.status || '').toLowerCase()] || order.status || 'N/A';
      const assignedEmployee = order.employee_email ? escapeHtml(order.employee_email) : '<span class="text-muted">Unassigned</span>';

      row.innerHTML = `
        <td>${escapeHtml(order.client_email || 'N/A')}</td>
        <td>${escapeHtml(order.service_name || 'N/A')}</td>
        <td>${escapeHtml(order.period || 'N/A')}</td>
        <td>${assignedEmployee}</td>
        <td><span class="status-badge status-${statusClass}">${escapeHtml(statusLabel)}</span></td>
        <td>${formatDate(order.created_at)}</td>
        <td>
          <div class="action-btns">
            <button type="button" class="btn btn-sm btn-primary update-status-btn" data-order-id="${oid}">
              <i class="fas fa-edit"></i> Status
            </button>
            <button type="button" class="btn btn-sm btn-info assign-employee-btn" data-order-id="${oid}" data-client-email="${escapeHtml(order.client_email || '')}" data-employee-id="${order.employee_id || ''}">
              <i class="fas fa-user-tag"></i> Assign
            </button>
            <button type="button" class="btn btn-sm btn-warning progress-btn" data-order-id="${oid}">
              <i class="fas fa-tasks"></i> Progress
            </button>
            <button type="button" class="btn btn-sm btn-success add-link-btn" data-order-id="${oid}">
              <i class="fas fa-link"></i> Add Link
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary view-docs-btn" data-order-id="${oid}">
              <i class="fas fa-file"></i> Docs
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Wire Add Link buttons — open proper modal
    tbody.querySelectorAll('.add-link-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const ordId = this.getAttribute('data-order-id');
        document.getElementById('doc-link-order-id').value = ordId;
        document.getElementById('doc-link-name').value = '';
        document.getElementById('doc-link-url').value = '';
        document.getElementById('doc-link-embed').value = '';
        $('#add-doc-link-modal').modal('show');
      });
    });

    // Wire View Docs buttons
    tbody.querySelectorAll('.view-docs-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        openViewDocumentsModal(this.getAttribute('data-order-id'));
      });
    });

    // Wire Progress buttons — view employee EOD work updates
    tbody.querySelectorAll('.progress-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        openOrderProgressModal(this.getAttribute('data-order-id'));
      });
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    lastOrders = [];
    console.error('Failed to load orders:', error);
    alert('Failed to load orders. Please try again.');
  }
}

async function loadReferrals() {
  const loadingDiv = document.getElementById('referrals-loading');
  const tableContainer = document.getElementById('referrals-table-container');
  const tbody = document.getElementById('referrals-tbody');

  loadingDiv.style.display = 'block';
  tableContainer.style.display = 'none';

  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No referrals (demo account)</td></tr>';
    return;
  }

  try {
    const response = await api.getAllReferrals();
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';

    tbody.innerHTML = '';

    if (!response.referrals || response.referrals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No referrals found</td></tr>';
      return;
    }

    response.referrals.forEach(referral => {
      const row = document.createElement('tr');
      let statusClass = 'status-pending';
      if (referral.status === 'approved') statusClass = 'status-completed';
      if (referral.status === 'rejected') statusClass = 'status-pending';
      const rid = escapeHtml(referral.id);
      const safeStatus = escapeHtml(referral.status || '');
      const safeBonus = escapeHtml(String(referral.bonus_amount ?? '0.00'));
      row.innerHTML = `
        <td>${escapeHtml(referral.referrer_email || 'N/A')}</td>
        <td>${escapeHtml(referral.referred_name || referral.referred_email || 'N/A')}</td>
        <td>${escapeHtml(referral.service_name || 'N/A')}</td>
        <td><span class="status-badge ${statusClass}">${safeStatus}</span></td>
        <td>₹${safeBonus}</td>
        <td>${formatDate(referral.created_at)}</td>
        <td>
          <button type="button" class="btn btn-sm btn-primary approve-referral-btn" data-referral-id="${rid}">
            <i class="fas fa-check"></i> Review
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    console.error('Failed to load referrals:', error);
    alert('Failed to load referrals. Please try again.');
  }
}

async function loadDocumentsSection() {
  const loadingDiv = document.getElementById('documents-loading');
  const tableContainer = document.getElementById('documents-table-container');
  const tbody = document.getElementById('documents-tbody');

  loadingDiv.style.display = 'block';
  tableContainer.style.display = 'none';

  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No orders (demo account)</td></tr>';
    return;
  }

  try {
    const response = await api.getAllOrders();
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';
    tbody.innerHTML = '';

    if (!response.orders || response.orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No orders found.</td></tr>';
      return;
    }

    response.orders.forEach(order => {
      const row = document.createElement('tr');
      const safeId = escapeHtml(order.id);
      row.innerHTML = `
        <td>${escapeHtml(order.client_email || 'N/A')}</td>
        <td>${escapeHtml(order.service_name || 'N/A')}</td>
        <td>${escapeHtml(order.period || 'N/A')}</td>
        <td>${formatDate(order.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-info view-docs-btn" data-order-id="${safeId}">
            <i class="fas fa-eye"></i> View
          </button>
          <button class="btn btn-sm btn-success upload-doc-btn" data-order-id="${safeId}">
            <i class="fas fa-upload"></i> Upload
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    console.error('Failed to load documents:', error);
    alert('Failed to load documents. Please try again.');
  }
}

async function openViewDocumentsModal(orderId) {
  const titleEl = document.getElementById('view-documents-title');
  const loadingEl = document.getElementById('view-documents-loading');
  const listEl = document.getElementById('view-documents-list');
  const emptyEl = document.getElementById('view-documents-empty');

  titleEl.textContent = 'Documents';
  loadingEl.style.display = 'block';
  listEl.style.display = 'none';
  listEl.innerHTML = '';
  emptyEl.style.display = 'none';
  $('#view-documents-modal').modal('show');

  try {
    const res = await api.getOrderDocuments(orderId);
    loadingEl.style.display = 'none';

    if (!res.documents || res.documents.length === 0) {
      emptyEl.textContent = 'No documents added yet. Use "Add Link" in Service Orders to share a Zoho link.';
      emptyEl.style.display = 'block';
      return;
    }

    if (res.order) {
      titleEl.textContent = `Documents — ${res.order.client_email || ''} / ${res.order.service_name || ''}`;
    }

    const ul = document.createElement('ul');
    ul.className = 'list-group';
    res.documents.forEach(doc => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      const name = escapeHtml(doc.file_name);
      const date = formatDate(doc.uploaded_at);
      li.innerHTML = `
        <div>
          <strong>${name}</strong> <small class="text-muted">${date}</small><br>
          <a href="${escapeHtml(doc.download_url)}" target="_blank" rel="noopener" class="small text-primary">
            <i class="fas fa-external-link-alt"></i> Open Link
          </a>
        </div>
        <div>
          <a href="${escapeHtml(doc.download_url)}" target="_blank" rel="noopener" class="btn btn-sm btn-primary mr-1">
            <i class="fas fa-download"></i> Download
          </a>
          <button type="button" class="btn btn-sm btn-danger delete-doc-btn" data-doc-id="${escapeHtml(doc.id)}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      ul.appendChild(li);
    });
    listEl.appendChild(ul);
    listEl.style.display = 'block';

    // Wire delete buttons
    listEl.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (!confirm('Delete this document link?')) return;
        try {
          await api.deleteDocumentLink(this.getAttribute('data-doc-id'));
          alert('Document link deleted.');
          openViewDocumentsModal(orderId); // Refresh
        } catch (err) {
          console.error('Delete failed:', err);
          alert('Failed to delete. Please try again.');
        }
      });
    });
  } catch (err) {
    loadingEl.style.display = 'none';
    console.error('Failed to load documents:', err);
    emptyEl.textContent = 'Failed to load documents. Please try again.';
    emptyEl.style.display = 'block';
  }
}


// View Employee EOD Work Updates for an Order
async function openOrderProgressModal(orderId) {
  const titleEl = document.getElementById('order-progress-title');
  const loadingEl = document.getElementById('order-progress-loading');
  const listEl = document.getElementById('order-progress-list');
  const emptyEl = document.getElementById('order-progress-empty');

  titleEl.textContent = 'Employee Work Progress';
  loadingEl.style.display = 'block';
  listEl.style.display = 'none';
  listEl.innerHTML = '';
  emptyEl.style.display = 'none';
  $('#order-progress-modal').modal('show');

  try {
    const res = await api.getOrderWorkUpdates(orderId);
    loadingEl.style.display = 'none';

    if (res.order) {
      titleEl.textContent = `Progress — ${res.order.client_email || ''} / ${res.order.service_name || ''}`;
    }

    if (!res.updates || res.updates.length === 0) {
      emptyEl.textContent = 'No EOD updates submitted for this order yet.';
      emptyEl.style.display = 'block';
      return;
    }

    const statusIconMap = { 'in_progress': 'fa-spinner text-primary', 'completed': 'fa-check-circle text-success', 'blocked': 'fa-exclamation-circle text-danger' };
    const statusLabelMap = { 'in_progress': 'In Progress', 'completed': 'Completed', 'blocked': 'Blocked' };

    const ul = document.createElement('ul');
    ul.className = 'list-group';
    res.updates.forEach(upd => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      const iconClass = statusIconMap[upd.status] || 'fa-circle text-secondary';
      const statusLabel = statusLabelMap[upd.status] || escapeHtml(upd.status || 'Unknown');
      const dateStr = upd.date ? new Date(upd.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      li.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong><i class="fas ${iconClass}"></i> ${statusLabel}</strong>
            <span class="text-muted ml-2 small">by ${escapeHtml(upd.employee_email || 'Unknown')}</span>
            <div class="text-muted small mt-1">${escapeHtml(upd.comments || '—')}</div>
          </div>
          <small class="text-muted text-nowrap ml-3">${dateStr}</small>
        </div>`;
      ul.appendChild(li);
    });
    listEl.appendChild(ul);
    listEl.style.display = 'block';
  } catch (err) {
    loadingEl.style.display = 'none';
    console.error('Failed to load work updates:', err);
    emptyEl.textContent = 'Failed to load progress. Please try again.';
    emptyEl.style.display = 'block';
  }
}

async function loadServicesForClientCreation() {
  const select = document.getElementById('client-service');
  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    if (select) select.innerHTML = '<option value="">No service assigned</option>';
    return;
  }
  try {
    const response = await api.getAllServices();
    if (select) select.innerHTML = '<option value="">No service assigned</option>';

    response.services?.forEach(service => {
      if (service.is_active) {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = service.name;
        select.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Failed to load services:', error);
  }
}

async function createClient() {
  const email = document.getElementById('client-email').value;
  const password = document.getElementById('client-password').value;
  const serviceId = document.getElementById('client-service').value;
  const period = document.getElementById('client-period').value;

  if (!email || !password) {
    alert('Email and password are required');
    return;
  }

  try {
    const clientData = {
      email,
      password,
      serviceId: serviceId || null,
      period: period || null
    };

    await api.createClient(clientData);
    alert('Client created successfully!');
    $('#create-client-modal').modal('hide');
    document.getElementById('create-client-form').reset();
    loadClients();
  } catch (error) {
    console.error('Create client failed:', error);
    alert('Failed to create client. Please try again.');
  }
}

function openUpdateStatusModal(orderId) {
  document.getElementById('status-order-id').value = orderId;
  $('#update-status-modal').modal('show');
}

async function updateServiceStatus() {
  const orderId = document.getElementById('status-order-id').value;
  const status = document.getElementById('status-select').value;

  if (!orderId || !status) {
    alert('Please select a status');
    return;
  }

  try {
    await api.updateStatus(orderId, status);
    alert('Status updated successfully!');
    $('#update-status-modal').modal('hide');
    loadOrders();
  } catch (error) {
    console.error('Update status failed:', error);
    alert('Failed to update status. Please try again.');
  }
}

function openUploadDocumentModal(orderId) {
  // Create a file input dynamically
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';

  input.onchange = async function (e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const fileName = prompt('Enter document name/description:', files[0].name);
    if (!fileName) return;

    try {
      for (const file of files) {
        await api.uploadDocument(orderId, file, fileName);
      }
      alert('Document(s) uploaded successfully!');
      loadOrders();
      if (typeof loadDocumentsSection === 'function') loadDocumentsSection();
    } catch (error) {
      console.error('Upload document failed:', error);
      alert('Failed to upload document. Please try again.');
    }
  };

  input.click();
}

// Employee Management
async function loadEmployees() {
  const loadingDiv = document.getElementById('employees-loading');
  const tableContainer = document.getElementById('employees-table-container');
  const tbody = document.getElementById('employees-tbody');

  loadingDiv.style.display = 'block';
  tableContainer.style.display = 'none';

  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">No employees (demo account)</td></tr>';
    return;
  }

  try {
    const response = await api.getAllEmployees();
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';

    tbody.innerHTML = '';

    if (!response.employees || response.employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center">No employees found</td></tr>';
      lastEmployees = [];
      return;
    }

    lastEmployees = response.employees;
    response.employees.forEach(employee => {
      const row = document.createElement('tr');
      const safeId = escapeHtml(employee.id);
      const safeStatus = escapeHtml(employee.status);
      const statusClass = employee.status === 'active' ? 'completed' : 'pending';

      row.innerHTML = `
        <td>${escapeHtml(employee.email)}</td>
        <td><span class="status-badge status-${statusClass}">${safeStatus}</span></td>
        <td>${formatDate(employee.created_at)}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    lastEmployees = [];
    console.error('Failed to load employees:', error);
    alert('Failed to load employees. Please try again.');
  }
}

async function createEmployee() {
  const email = document.getElementById('employee-email').value;
  const password = document.getElementById('employee-password').value;

  if (!email || !password) {
    alert('Email and password are required');
    return;
  }

  try {
    await api.createEmployee(email, password);
    alert('Employee created successfully!');
    $('#create-employee-modal').modal('hide');
    document.getElementById('create-employee-form').reset();
    loadEmployees();
  } catch (error) {
    console.error('Create employee failed:', error);
    alert('Failed to create employee. Please try again.');
  }
}

// Assignment logic inside Service Orders
function openAssignEmployeeModal(orderId, clientEmail, currentEmployeeId) {
  document.getElementById('assign-order-id').value = orderId;
  document.getElementById('assign-order-client').textContent = 'Client: ' + (clientEmail || '');

  loadEmployeesForAssignModal().then(() => {
    // Attempt to set current selection if one exists
    if (currentEmployeeId && currentEmployeeId !== 'null') {
      document.getElementById('assign-employee-select').value = currentEmployeeId;
    } else {
      document.getElementById('assign-employee-select').value = '';
    }
    $('#assign-employee-modal').modal('show');
  });
}

async function loadEmployeesForAssignModal() {
  const select = document.getElementById('assign-employee-select');
  select.innerHTML = '<option value="">Unassigned</option>';
  if (clientAuth.getUser() && clientAuth.getUser().demo) return;

  try {
    const res = await api.getAllEmployees();
    (res.employees || []).forEach(emp => {
      if (emp.status === 'active') {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.email;
        select.appendChild(opt);
      }
    });
  } catch (e) {
    console.error('Failed to load employees for assignment:', e);
  }
}

async function assignEmployeeSubmit() {
  const orderId = document.getElementById('assign-order-id').value;
  const employeeId = document.getElementById('assign-employee-select').value || null; // empty string becomes null for unassign

  if (!orderId) {
    alert('Missing order ID.');
    return;
  }

  const btn = document.getElementById('assign-employee-submit');
  btn.disabled = true;
  try {
    await api.assignOrderToEmployee(orderId, employeeId);
    $('#assign-employee-modal').modal('hide');
    loadOrders(); // Refresh table
    alert('Employee assignment updated successfully!');
  } catch (e) {
    console.error('Assign employee failed:', e);
    alert('Failed to update employee assignment. Please try again.');
  } finally {
    btn.disabled = false;
  }
}

async function toggleClientStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const action = newStatus === 'active' ? 'activate' : 'deactivate';
  if (!confirm(`Are you sure you want to ${action} this client?`)) return;

  try {
    await api.updateClientStatus(userId, newStatus);
    loadClients();
    alert('Client status updated successfully.');
  } catch (e) {
    console.error('Toggle client status failed:', e);
    alert('Failed to update status. Please try again.');
  }
}

function openApproveReferralModal(referralId) {
  document.getElementById('referral-id-input').value = referralId;
  $('#approve-referral-modal').modal('show');
}

async function processReferral() {
  const referralId = document.getElementById('referral-id-input').value;
  const decision = document.getElementById('referral-decision').value;
  const reason = document.getElementById('referral-reason').value;
  const bonusAmount = document.getElementById('referral-bonus').value;

  if (!referralId || !decision) {
    alert('Please select a decision');
    return;
  }

  try {
    await api.approveReferral(referralId, decision === 'approved', reason, bonusAmount);
    alert(`Referral ${decision === 'approved' ? 'approved' : 'rejected'} successfully!`);
    $('#approve-referral-modal').modal('hide');
    document.getElementById('approve-referral-form').reset();
    loadReferrals();
  } catch (error) {
    console.error('Process referral failed:', error);
    alert('Failed to process referral. Please try again.');
  }
}

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

// ========== SERVICE CATALOG MANAGEMENT ==========
async function loadServiceCatalog() {
  const tbody = document.getElementById('service-catalog-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border spinner-border-sm"></div> Loading...</td></tr>';
  try {
    const res = await api.getAllServices();
    tbody.innerHTML = '';
    if (!res.services || res.services.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">No services yet.</td></tr>';
      return;
    }
    res.services.forEach(svc => {
      const tr = document.createElement('tr');
      const statusLabel = svc.is_active ? '<span class="status-badge status-completed">Active</span>' : '<span class="status-badge status-pending">Inactive</span>';
      tr.innerHTML = `
        <td>${escapeHtml(svc.name)}</td>
        <td>${escapeHtml(svc.description || '—')}</td>
        <td>${statusLabel}</td>
        <td>
          <button class="btn btn-sm btn-warning toggle-svc-btn" data-id="${escapeHtml(svc.id)}" data-active="${svc.is_active}">
            <i class="fas fa-toggle-${svc.is_active ? 'on' : 'off'}"></i> ${svc.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Load service catalog failed:', e);
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Failed to load services.</td></tr>';
  }
}

async function createServiceCatalog() {
  const nameEl = document.getElementById('new-service-name');
  const descEl = document.getElementById('new-service-desc');
  const name = (nameEl && nameEl.value || '').trim();
  const description = (descEl && descEl.value || '').trim();
  if (!name) { alert('Service name is required.'); return; }
  try {
    await api.adminCreateService(name, description);
    alert('Service created successfully!');
    nameEl.value = '';
    if (descEl) descEl.value = '';
    loadServiceCatalog();
    // Also refresh service dropdowns
    loadServicesForClientCreation();
  } catch (e) {
    console.error('Create service failed:', e);
    alert('Failed to create service: ' + (e.message || 'Please try again.'));
  }
}

async function toggleServiceCatalog(serviceId) {
  try {
    const res = await api.toggleService(serviceId);
    alert(res.message || 'Service updated.');
    loadServiceCatalog();
    loadServicesForClientCreation();
  } catch (e) {
    console.error('Toggle service failed:', e);
    alert('Failed to toggle service: ' + (e.message || 'Please try again.'));
  }
}

async function loadAllServices() {
  const btn = document.getElementById('load-services-btn');
  if (!btn) return;

  if (!confirm('This will load all 17 default services (Private Limited Company, LLP, Virtual CFO, GST Filing, etc.). Continue?')) return;

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

  try {
    const result = await api.bulkCreateServices();
    const msg = `Services loaded!\n\nCreated: ${result.summary.created}\nSkipped: ${result.summary.skipped}\n\nServices are now available for client assignment.`;
    alert(msg);
    loadServiceCatalog();
    loadServicesForClientCreation();
  } catch (err) {
    console.error('Load services failed:', err);
    alert('Failed to load services: ' + (err.message || 'Please try again.'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ========== ENHANCED EMPLOYEE MANAGEMENT ==========
async function toggleEmployeeStatusAdmin(employeeId, currentStatus) {
  const action = currentStatus === 'active' ? 'deactivate' : 'activate';
  if (!confirm(`Are you sure you want to ${action} this employee?`)) return;
  try {
    const res = await api.toggleEmployeeStatus(employeeId);
    alert(res.message || 'Employee status updated.');
    loadEmployees();
  } catch (e) {
    console.error('Toggle employee status failed:', e);
    alert('Failed to update employee status. Please try again.');
  }
}

async function deleteEmployeeAdmin(employeeId) {
  if (!confirm('Are you sure you want to PERMANENTLY DELETE this employee? All their service assignments will be unassigned.')) return;
  try {
    await api.deleteEmployee(employeeId);
    alert('Employee deleted successfully.');
    loadEmployees();
  } catch (e) {
    console.error('Delete employee failed:', e);
    alert('Failed to delete employee. Please try again.');
  }
}

// Override loadEmployees to add action buttons for enable/disable/delete
var _origLoadEmployees = loadEmployees;
loadEmployees = async function () {
  const loadingDiv = document.getElementById('employees-loading');
  const tableContainer = document.getElementById('employees-table-container');
  const tbody = document.getElementById('employees-tbody');
  if (!loadingDiv || !tableContainer || !tbody) return;

  loadingDiv.style.display = 'block';
  tableContainer.style.display = 'none';

  try {
    const response = await api.getAllEmployees();
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';
    tbody.innerHTML = '';

    if (!response.employees || response.employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No employees found. Use "Add Employee" to create one.</td></tr>';
      lastEmployees = [];
      return;
    }

    lastEmployees = response.employees;
    response.employees.forEach(emp => {
      const tr = document.createElement('tr');
      const safeId = escapeHtml(emp.id);
      const safeStatus = escapeHtml(emp.status);
      const statusClass = emp.status === 'active' ? 'completed' : 'pending';
      const toggleLabel = emp.status === 'active' ? 'Deactivate' : 'Activate';
      const toggleIcon = emp.status === 'active' ? 'ban' : 'check';
      tr.innerHTML = `
        <td>${escapeHtml(emp.email)}</td>
        <td><span class="status-badge status-${statusClass}">${safeStatus}</span></td>
        <td>${formatDate(emp.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-warning emp-toggle-btn" data-id="${safeId}" data-status="${safeStatus}">
            <i class="fas fa-${toggleIcon}"></i> ${toggleLabel}
          </button>
          <button class="btn btn-sm btn-danger emp-delete-btn" data-id="${safeId}">
            <i class="fas fa-trash"></i> Delete
          </button>
        </td>`;
      tbody.appendChild(tr);
    });

    // Wire up buttons
    tbody.querySelectorAll('.emp-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleEmployeeStatusAdmin(btn.dataset.id, btn.dataset.status));
    });
    tbody.querySelectorAll('.emp-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteEmployeeAdmin(btn.dataset.id));
    });

  } catch (error) {
    loadingDiv.style.display = 'none';
    lastEmployees = [];
    console.error('Failed to load employees:', error);
    alert('Failed to load employees. Please try again.');
  }
};

// Wire service catalog toggle buttons via delegation
document.addEventListener('click', function (e) {
  const toggleSvcBtn = e.target.closest('.toggle-svc-btn');
  if (toggleSvcBtn) {
    e.preventDefault();
    toggleServiceCatalog(toggleSvcBtn.getAttribute('data-id'));
  }
});

// Wire Add Document Link modal submit
document.addEventListener('DOMContentLoaded', function () {
  const docLinkSubmitBtn = document.getElementById('doc-link-submit');
  if (docLinkSubmitBtn) {
    docLinkSubmitBtn.addEventListener('click', async function () {
      const orderId = document.getElementById('doc-link-order-id').value;
      const fileName = (document.getElementById('doc-link-name').value || '').trim();
      const downloadUrl = (document.getElementById('doc-link-url').value || '').trim();
      const embedCode = (document.getElementById('doc-link-embed').value || '').trim();

      if (!fileName) { alert('Document name is required.'); return; }
      if (!downloadUrl) { alert('Download URL is required.'); return; }

      docLinkSubmitBtn.disabled = true;
      docLinkSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
      try {
        await api.addDocumentLink(orderId, fileName, downloadUrl, embedCode || null);
        alert('Document link added! Client can now view and download it.');
        $('#add-doc-link-modal').modal('hide');
      } catch (err) {
        console.error('Add document link failed:', err);
        alert('Failed to add link: ' + (err.message || 'Please try again.'));
      } finally {
        docLinkSubmitBtn.disabled = false;
        docLinkSubmitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Document';
      }
    });
  }
});

// Load Employee Updates with all assigned tasks
async function loadEmployeeUpdates() {
  const loadingDiv = document.getElementById('emp-updates-loading');
  const container = document.getElementById('emp-updates-container');
  const emptyEl = document.getElementById('emp-updates-empty');
  const listEl = document.getElementById('emp-updates-list');

  loadingDiv.style.display = 'block';
  container.style.display = 'none';
  emptyEl.style.display = 'none';
  listEl.style.display = 'none';
  listEl.innerHTML = '';

  try {
    // Get all employees and their assigned orders
    const [employeesRes, ordersRes] = await Promise.all([
      api.getAllEmployees(),
      api.getAllOrders()
    ]);

    loadingDiv.style.display = 'none';

    const employees = employeesRes.employees || [];
    const orders = ordersRes.orders || [];

    if (employees.length === 0) {
      emptyEl.style.display = 'block';
      container.style.display = 'block';
      return;
    }

    // Group orders by employee
    const employeeTasks = {};
    employees.forEach(emp => {
      employeeTasks[emp.id] = {
        employee: emp,
        tasks: orders.filter(o => o.employee_id === emp.id)
      };
    });

    // Build HTML
    const list = document.createElement('div');
    list.className = 'employee-updates-list';
    list.id = 'emp-updates-items';
    let hasAnyTasks = false;

    Object.values(employeeTasks).forEach(data => {
      const emp = data.employee;
      const tasks = data.tasks;
      if (tasks.length > 0) {
        hasAnyTasks = true;
        const empCard = document.createElement('div');
        empCard.className = 'card mb-3 emp-update-card';
        empCard.innerHTML = `
          <div class="card-header bg-light">
            <h5 class="mb-0">
              <i class="fas fa-user-tie text-primary"></i> ${escapeHtml(emp.email)}
              <span class="badge badge-primary float-right">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
            </h5>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
        `;

        tasks.forEach(task => {
          const statusMap = { 'pending': 'Pending', 'in_progress': 'In Progress', 'completed': 'Completed' };
          const statusClassMap = { 'pending': 'warning', 'in_progress': 'info', 'completed': 'success' };
          const statusClass = statusClassMap[task.status] || 'secondary';
          const statusLabel = statusMap[task.status] || escapeHtml(task.status || 'N/A');

          empCard.innerHTML += `
            <div class="list-group-item emp-task-item" data-client="${escapeHtml(task.client_email || '').toLowerCase()}" data-employee="${escapeHtml(emp.email).toLowerCase()}">
              <div class="row no-gutters align-items-center">
                <div class="col-md-6">
                  <h6 class="mb-1"><strong>${escapeHtml(task.service_name || 'N/A')}</strong></h6>
                  <small class="text-muted">Client: ${escapeHtml(task.client_email || 'N/A')}</small><br>
                  <small class="text-muted">Period: ${escapeHtml(task.period || 'N/A')}</small>
                </div>
                <div class="col-md-3 text-center">
                  <span class="badge badge-${statusClass}">${escapeHtml(statusLabel)}</span>
                </div>
                <div class="col-md-3 text-right">
                  <small class="text-muted">${formatDate(task.created_at)}</small><br>
                  <button class="btn btn-sm btn-outline-primary mt-1 view-task-progress-btn" data-order-id="${escapeHtml(task.id)}" title="View work progress">
                    <i class="fas fa-chart-line"></i> Progress
                  </button>
                </div>
              </div>
            </div>
          `;
        });

        empCard.innerHTML += `
            </div>
          </div>
        `;
        list.appendChild(empCard);
      }
    });

    if (!hasAnyTasks) {
      emptyEl.style.display = 'block';
    } else {
      listEl.innerHTML = '';
      listEl.appendChild(list);

      // Wire progress buttons
      listEl.querySelectorAll('.view-task-progress-btn').forEach(btn => {
        btn.addEventListener('click', function () {
          openOrderProgressModal(this.getAttribute('data-order-id'));
        });
      });
    }

    container.style.display = 'block';
    listEl.style.display = 'block';
  } catch (error) {
    loadingDiv.style.display = 'none';
    container.style.display = 'block';
    console.error('Failed to load employee updates:', error);
    emptyEl.textContent = 'Failed to load employee updates. Please try again.';
    emptyEl.style.display = 'block';
  }
}

// Filter employee updates list
function filterEmployeeUpdates(query) {
  const items = document.querySelectorAll('.emp-task-item');
  const lower = (query || '').toLowerCase();

  items.forEach(item => {
    const clientMatch = (item.getAttribute('data-client') || '').includes(lower);
    const employeeMatch = (item.getAttribute('data-employee') || '').includes(lower);
    item.style.display = (clientMatch || employeeMatch || !lower) ? '' : 'none';
  });
}

// formatDate and escapeHtml are now in utils.js
