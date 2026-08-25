// Admin → Service Orders section + all order-related modals (Update Status,
// Assign Employee, Add Order, Order Progress, Add Document Link submit).
// Reads globals: lastOrders, lastClients, downloadCsv, filterTableRows.

// ─── Add Order modal state ─────────────────────────────────────────────
const ADD_ORDER_CACHE_TTL_MS = 2 * 60 * 1000; // refresh dropdowns every 2 min
const ADD_ORDER_MAX_VISIBLE_MATCHES = 50;
const ADD_ORDER_SEARCH_DEBOUNCE_MS = 120;
var _addOrderCache = { clients: null, services: null, fetchedAt: 0 };
var _addOrderAllClients = [];

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
            <button type="button" class="btn btn-sm btn-secondary comments-btn" data-order-id="${oid}" data-client-email="${escapeHtml(order.client_email || '')}">
              <i class="fas fa-comments"></i> Comments
            </button>
            <button type="button" class="btn btn-sm btn-danger delete-order-btn" data-order-id="${oid}" data-client-email="${escapeHtml(order.client_email || '')}" data-service-name="${escapeHtml(order.service_name || '')}">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Re-apply current search (empty query => all rows visible)
    var ordersSearchEl = document.getElementById('orders-search');
    filterTableRows('orders-tbody', ordersSearchEl ? ordersSearchEl.value : '', [0, 1]);

    // Wire Delete Order buttons
    tbody.querySelectorAll('.delete-order-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const ordId = this.getAttribute('data-order-id');
        const client = this.getAttribute('data-client-email');
        const service = this.getAttribute('data-service-name');
        const confirmed = confirm(
          'Delete this service order?\n\n' +
          'Client: ' + client + '\n' +
          'Service: ' + service + '\n\n' +
          'This will permanently remove the order and all its documents, comments, and work updates. This cannot be undone.'
        );
        if (!confirmed) return;
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
          const resp = await api.deleteServiceOrder(ordId);
          if (resp && resp.success) {
            alert('Service order deleted.');
            loadOrders();
          } else {
            alert('Failed: ' + (resp && resp.message || 'unknown error'));
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-trash"></i> Delete';
          }
        } catch (err) {
          alert('Failed to delete order: ' + (err.message || err));
          this.disabled = false;
          this.innerHTML = '<i class="fas fa-trash"></i> Delete';
        }
      });
    });

    // Wire Add Link buttons — open Add Document Link modal
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

    // Wire View Docs buttons (defined in admin-documents.js)
    tbody.querySelectorAll('.view-docs-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        openViewDocumentsModal(this.getAttribute('data-order-id'));
      });
    });

    // Wire Progress buttons
    tbody.querySelectorAll('.progress-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        openOrderProgressModal(this.getAttribute('data-order-id'));
      });
    });

    // Wire Comments buttons — shared comments widget (loaded separately)
    tbody.querySelectorAll('.comments-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const ordId = this.getAttribute('data-order-id');
        const clientEmail = this.getAttribute('data-client-email');
        if (window.AfComments) window.AfComments.open(ordId, { title: 'Order Comments — ' + (clientEmail || 'Order #' + ordId) });
      });
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    lastOrders = [];
    console.error('Failed to load orders:', error);
    alert('Failed to load orders. Please try again.');
  }
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

// ─── Update Status modal ─────────────────────────────────────────────
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

// ─── Assign Employee modal ─────────────────────────────────────────────
function openAssignEmployeeModal(orderId, clientEmail, currentEmployeeId) {
  document.getElementById('assign-order-id').value = orderId;
  document.getElementById('assign-order-client').textContent = 'Client: ' + (clientEmail || '');

  loadEmployeesForAssignModal().then(() => {
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
  const employeeId = document.getElementById('assign-employee-select').value || null; // empty string => unassign

  if (!orderId) {
    alert('Missing order ID.');
    return;
  }

  const btn = document.getElementById('assign-employee-submit');
  btn.disabled = true;
  try {
    await api.assignOrderToEmployee(orderId, employeeId);
    $('#assign-employee-modal').modal('hide');
    loadOrders();
    alert('Employee assignment updated successfully!');
  } catch (e) {
    console.error('Assign employee failed:', e);
    alert('Failed to update employee assignment. Please try again.');
  } finally {
    btn.disabled = false;
  }
}

// ─── Order Progress modal (also opened from Employee Updates section) ─────────
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

// ─── Add Order modal ─────────────────────────────────────────────
async function populateAddOrderDropdowns() {
  const clientSel = document.getElementById('add-order-client');
  const serviceSel = document.getElementById('add-order-service');
  const errBox = document.getElementById('add-order-error');
  const okBox = document.getElementById('add-order-success');
  const periodIn = document.getElementById('add-order-period');

  if (errBox) errBox.style.display = 'none';
  if (okBox)  okBox.style.display = 'none';
  if (periodIn && !periodIn.value) periodIn.value = '';

  // Reset client search on every reopen
  const clientSearch = document.getElementById('add-order-client-search');
  if (clientSearch) clientSearch.value = '';

  const now = Date.now();
  if (_addOrderCache.clients && _addOrderCache.services && (now - _addOrderCache.fetchedAt) < ADD_ORDER_CACHE_TTL_MS) {
    renderAddOrderDropdowns(_addOrderCache.clients, _addOrderCache.services);
    return;
  }

  if (clientSel)  clientSel.innerHTML  = '<option value="">Loading clients...</option>';
  if (serviceSel) serviceSel.innerHTML = '<option value="">Loading services...</option>';

  // Fast path: use the lastClients global (populated by admin-clients.js)
  if (typeof lastClients !== 'undefined' && lastClients && lastClients.length) {
    var activeClientsCached = lastClients.filter(function (c) {
      return (c.role || 'client') === 'client' && (c.status === 'active' || !c.status);
    });
    _addOrderAllClients = activeClientsCached.slice();
    renderAddOrderClientOptions('');
    wireAddOrderClientSearch();
  }

  try {
    console.log('[AddOrder] fetching via api.getAllClients/api.getAllServices...');
    const [clientsRes, servicesRes] = await Promise.all([
      api.getAllClients(10000).catch(function (e) { console.error('[AddOrder] clients API err:', e); return null; }),
      api.getAllServices().catch(function (e) { console.error('[AddOrder] services API err:', e); return null; })
    ]);
    console.log('[AddOrder] responses received');

    const clients = (clientsRes && (clientsRes.clients || clientsRes.users || clientsRes.data)) || (typeof lastClients !== 'undefined' ? lastClients : []) || [];
    const services = (servicesRes && (servicesRes.services || servicesRes.data)) || [];

    if (!clients.length && !services.length) {
      throw new Error('Both API calls returned empty. The server may be cold-starting — please try again in 30 seconds.');
    }

    const activeClients = clients.filter(function (c) { return (c.role || 'client') === 'client' && (c.status === 'active' || !c.status); });
    const activeServices = services.filter(function (s) { return s.is_active !== false; });

    _addOrderCache.clients = activeClients;
    _addOrderCache.services = activeServices;
    _addOrderCache.fetchedAt = now;

    renderAddOrderDropdowns(activeClients, activeServices);
    console.log('[AddOrder] dropdowns populated: ' + activeClients.length + ' clients, ' + activeServices.length + ' services');
  } catch (e) {
    console.error('[AddOrder] FAILED:', e);
    if (clientSel && clientSel.innerHTML.indexOf('Loading') !== -1)  clientSel.innerHTML  = '<option value="">Failed — see message below</option>';
    if (serviceSel && serviceSel.innerHTML.indexOf('Loading') !== -1) serviceSel.innerHTML = '<option value="">Failed</option>';
    if (errBox) {
      errBox.innerHTML = '⚠️ <strong>Could not load:</strong> ' + escapeHtml(e.message || e) + ' <a href="#" id="add-order-retry-link" style="margin-left:10px;color:#0c9782;text-decoration:underline;">Retry</a>';
      errBox.style.display = 'block';
      const retry = document.getElementById('add-order-retry-link');
      if (retry) retry.addEventListener('click', function (ev) { ev.preventDefault(); _addOrderCache.fetchedAt = 0; populateAddOrderDropdowns(); });
    }
  }
}

function renderAddOrderDropdowns(activeClients, activeServices) {
  const clientSel = document.getElementById('add-order-client');
  const serviceSel = document.getElementById('add-order-service');
  if (clientSel) {
    _addOrderAllClients = activeClients.slice();
    renderAddOrderClientOptions('');
    wireAddOrderClientSearch();
  }
  if (serviceSel) {
    serviceSel.innerHTML = '<option value="">— Select a service —</option>' + activeServices.map(s =>
      `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`
    ).join('');
  }
}

// Search-first client picker: empty query => placeholder only.
function renderAddOrderClientOptions(query) {
  const sel = document.getElementById('add-order-client');
  if (!sel) return;
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    sel.innerHTML = '<option value="">— Type above to search clients —</option>';
    return;
  }
  const matches = _addOrderAllClients.filter(c =>
    (c.email || '').toLowerCase().indexOf(q) !== -1 ||
    (c.name || '').toLowerCase().indexOf(q) !== -1
  );
  if (matches.length === 0) {
    // Use textContent to avoid HTML-injection paths via the search box
    sel.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No clients match "' + String(query || '').slice(0, 100) + '"';
    sel.appendChild(opt);
    return;
  }
  const visible = matches.slice(0, ADD_ORDER_MAX_VISIBLE_MATCHES);
  let html = visible.map(c =>
    `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name ? c.name + ' — ' : '')}${escapeHtml(c.email)}</option>`
  ).join('');
  if (matches.length > ADD_ORDER_MAX_VISIBLE_MATCHES) {
    html += '<option value="" disabled>… ' + (matches.length - ADD_ORDER_MAX_VISIBLE_MATCHES) + ' more — refine your search</option>';
  }
  sel.innerHTML = html;
}

function wireAddOrderClientSearch() {
  const input = document.getElementById('add-order-client-search');
  if (!input || input._wired) return;
  input._wired = true;
  let debounceTimer = null;
  input.addEventListener('input', function () {
    const v = this.value;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { renderAddOrderClientOptions(v); }, ADD_ORDER_SEARCH_DEBOUNCE_MS);
  });
}

// Legacy alias kept for any inline onclick that still names it.
async function openAddOrderModal() { return populateAddOrderDropdowns(); }

async function submitAddOrder() {
  const clientId = document.getElementById('add-order-client').value;
  const serviceId = document.getElementById('add-order-service').value;
  const period = (document.getElementById('add-order-period').value || '').trim();
  const errBox = document.getElementById('add-order-error');
  const okBox = document.getElementById('add-order-success');
  errBox.style.display = 'none';
  okBox.style.display = 'none';

  if (!clientId || !serviceId) {
    errBox.textContent = 'Please select both a client and a service.';
    errBox.style.display = 'block';
    return;
  }

  const btn = document.getElementById('add-order-submit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  try {
    const resp = await api.assignService(clientId, serviceId, period || null);
    if (resp && resp.success !== false) {
      okBox.textContent = 'Service order created successfully.';
      okBox.style.display = 'block';
      setTimeout(() => {
        $('#add-order-modal').modal('hide');
        loadOrders();
      }, 800);
    } else {
      errBox.textContent = (resp && resp.message) || 'Failed to create order';
      errBox.style.display = 'block';
    }
  } catch (e) {
    errBox.textContent = 'Failed: ' + (e.message || e);
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Create Order';
  }
}

// Wire Add Document Link modal submit. (Was in admin-dashboard.js inside a
// second DOMContentLoaded; preserved here so add-link belongs with orders.)
document.addEventListener('DOMContentLoaded', function () {
  const docLinkSubmitBtn = document.getElementById('doc-link-submit');
  if (!docLinkSubmitBtn) return;
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
});
