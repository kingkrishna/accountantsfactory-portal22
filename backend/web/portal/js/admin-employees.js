// Admin → Employees + Employee Updates sections.
// Reads global lastEmployees (declared in admin-dashboard.js).
//
// Historical note: the original admin-dashboard.js had TWO definitions of
// loadEmployees — a minimal one and a monkey-patched fuller one that added
// action buttons. The patched version always won (CommonJS-style overwrite
// after definition). Only the patched version is preserved here.

async function loadEmployees() {
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
      const displayRole = emp.role === 'sub_admin' ? 'Franchise/Sub-Admin' : 'Employee';
      const displayBranch = emp.referral_code || '-';
      tr.innerHTML = `
        <td>${escapeHtml(emp.email)}</td>
        <td><span class="badge badge-info">${escapeHtml(displayRole)}</span></td>
        <td><span class="badge badge-secondary">${escapeHtml(displayBranch)}</span></td>
        <td><span class="status-badge status-${statusClass}">${safeStatus}</span></td>
        <td>${formatDate(emp.created_at || emp.createdAt)}</td>
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
}

async function createEmployee() {
  const email = document.getElementById('employee-email').value;
  const password = document.getElementById('employee-password').value;
  const role = document.getElementById('employee-role').value;
  const branchCode = document.getElementById('employee-branch').value;

  if (!email || !password) {
    alert('Email and password are required');
    return;
  }

  try {
    await api.createEmployee(email, password, role, branchCode);
    alert('Employee created successfully!');
    $('#create-employee-modal').modal('hide');
    document.getElementById('create-employee-form').reset();
    document.getElementById('employee-branch-group').style.display = 'none';
    loadEmployees();
  } catch (error) {
    console.error('Create employee failed:', error);
    const msg = (error && error.message) ? error.message : 'Please try again.';
    alert('Failed to create employee:\n\n' + msg);
  }
}

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

// ===========================================================================
// Employee Updates: tabbed view — one employee at a time.
// Top bar shows a paginated row of employee chip-buttons (6 per page).
// Clicking a chip shows ONLY that employee's tasks below.
// Pre-existing search box still filters by client/employee text within the
// current employee's task list.
// ===========================================================================

const EMP_UPDATES_PER_PAGE = 7;       // chips per pager page
const EMP_UPDATES_TASKS_PER_PAGE = 10; // tasks per page inside the selected employee's card
var _empUpdatesData = [];             // all employees-with-tasks from the API
var _empUpdatesPagerPage = 0;         // current chip-pager page index
var _empUpdatesSelectedId = null;     // currently-selected employee id (or null)
var _empUpdatesTaskPage = 0;          // current task pager page for the selected employee
var _empUpdatesStatusFilter = 'all';  // 'all' | 'pending' | 'in_progress' | 'completed'
var _empUpdatesSearchQuery = '';      // search box query (matches against allTasks before pagination)

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
    // Single server-side join — avoids paginated-getAllOrders truncation that
    // previously hid newly-assigned tasks.
    const res = await api.getEmployeeUpdates();
    loadingDiv.style.display = 'none';

    const all = (res && res.employees) || [];
    // Only employees that actually have at least one task get a tab.
    _empUpdatesData = all.filter(emp => (emp.orders || []).length > 0);

    if (_empUpdatesData.length === 0) {
      emptyEl.style.display = 'block';
      container.style.display = 'block';
      return;
    }

    // Default selection: keep prior selection if still present, else first.
    const stillExists = _empUpdatesSelectedId && _empUpdatesData.some(e => String(e.employee_id) === String(_empUpdatesSelectedId));
    if (!stillExists) {
      _empUpdatesSelectedId = _empUpdatesData[0].employee_id;
      _empUpdatesPagerPage = 0;
    }

    // Sync search state from the input (the user may have typed before the
    // initial load completed). renderEmpUpdatesContent will pick it up.
    var empSearchEl = document.getElementById('emp-updates-search');
    _empUpdatesSearchQuery = (empSearchEl && empSearchEl.value) ? empSearchEl.value.trim() : '';

    renderEmpUpdatesTabs();
    renderEmpUpdatesContent();

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

// Renders the paginated chip-bar of employee names at the top of the section.
function renderEmpUpdatesTabs() {
  const listEl = document.getElementById('emp-updates-list');
  if (!listEl) return;

  const total = _empUpdatesData.length;
  const perPage = EMP_UPDATES_PER_PAGE;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  if (_empUpdatesPagerPage >= pageCount) _empUpdatesPagerPage = pageCount - 1;
  if (_empUpdatesPagerPage < 0) _empUpdatesPagerPage = 0;

  const start = _empUpdatesPagerPage * perPage;
  const pageEmployees = _empUpdatesData.slice(start, start + perPage);

  const chipsHtml = pageEmployees.map(emp => {
    const id = String(emp.employee_id);
    const active = id === String(_empUpdatesSelectedId);
    const c = emp.counters || { total: (emp.orders || []).length };
    const label = (emp.employee_email || '').split('@')[0] || emp.employee_email || 'unknown';
    return `
      <button type="button"
              class="btn btn-sm emp-tab-chip ${active ? 'btn-primary' : 'btn-outline-secondary'}"
              data-employee-id="${escapeHtml(id)}"
              title="${escapeHtml(emp.employee_email || '')}">
        <i class="fas fa-user-tie"></i>
        <span class="emp-tab-chip-label">${escapeHtml(label)}</span>
        <span class="badge badge-light ml-1">${c.total != null ? c.total : (emp.orders || []).length}</span>
      </button>`;
  }).join('');

  const pagerHtml = pageCount > 1 ? `
    <div class="emp-updates-pager d-flex align-items-center gap-2 ml-auto">
      <button type="button" class="btn btn-sm btn-light" id="emp-tabs-prev" ${_empUpdatesPagerPage === 0 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
      </button>
      <small class="text-muted">Page ${_empUpdatesPagerPage + 1} / ${pageCount} &middot; ${total} employees</small>
      <button type="button" class="btn btn-sm btn-light" id="emp-tabs-next" ${_empUpdatesPagerPage >= pageCount - 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>` : `<small class="text-muted ml-auto">${total} employee${total === 1 ? '' : 's'}</small>`;

  // Build (or refresh) the tabs bar above the task content area.
  let tabsBar = document.getElementById('emp-updates-tabs');
  if (!tabsBar) {
    listEl.innerHTML = `
      <div id="emp-updates-tabs" class="emp-updates-tabs d-flex align-items-center flex-wrap mb-3" style="gap:8px;"></div>
      <div id="emp-updates-content"></div>`;
    tabsBar = document.getElementById('emp-updates-tabs');
  }
  tabsBar.innerHTML = `<div class="d-flex flex-wrap" style="gap:8px;">${chipsHtml}</div>${pagerHtml}`;

  tabsBar.querySelectorAll('.emp-tab-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _empUpdatesSelectedId = btn.getAttribute('data-employee-id');
      _empUpdatesTaskPage = 0;          // reset to first task page on employee switch
      _empUpdatesStatusFilter = 'all';  // reset filter on employee switch
      _empUpdatesSearchQuery = '';      // reset search box on employee switch
      var s = document.getElementById('emp-updates-search');
      if (s) s.value = '';
      renderEmpUpdatesTabs();
      renderEmpUpdatesContent();
    });
  });
  const prev = document.getElementById('emp-tabs-prev');
  const next = document.getElementById('emp-tabs-next');
  if (prev) prev.addEventListener('click', () => { _empUpdatesPagerPage--; renderEmpUpdatesTabs(); });
  if (next) next.addEventListener('click', () => { _empUpdatesPagerPage++; renderEmpUpdatesTabs(); });
}

// Renders only the currently-selected employee's tasks into #emp-updates-content.
// Includes a status filter chip row (All / Pending / In Progress / Completed)
// and paginates tasks at EMP_UPDATES_TASKS_PER_PAGE per page.
function renderEmpUpdatesContent() {
  const contentEl = document.getElementById('emp-updates-content');
  if (!contentEl) return;

  const emp = _empUpdatesData.find(e => String(e.employee_id) === String(_empUpdatesSelectedId));
  if (!emp) {
    contentEl.innerHTML = '<div class="text-muted text-center py-4">No employee selected.</div>';
    return;
  }

  const allTasks = emp.orders || [];
  const c = emp.counters || { pending: 0, in_progress: 0, completed: 0, total: allTasks.length };
  const statusMap = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
  const statusClassMap = { pending: 'warning', in_progress: 'info', completed: 'success' };

  // Apply status filter, then search filter — both run against ALL tasks of
  // the selected employee so search reaches tasks on other pages (pagination
  // happens after).
  const q = (_empUpdatesSearchQuery || '').trim().toLowerCase();
  let filteredTasks = _empUpdatesStatusFilter === 'all'
    ? allTasks
    : allTasks.filter(t => (t.order_status || '') === _empUpdatesStatusFilter);
  if (q) {
    filteredTasks = filteredTasks.filter(t =>
      (t.client_email || '').toLowerCase().indexOf(q) !== -1 ||
      (t.service_name || '').toLowerCase().indexOf(q) !== -1 ||
      (t.period || '').toLowerCase().indexOf(q) !== -1
    );
  }

  // Paginate filtered tasks.
  const perPage = EMP_UPDATES_TASKS_PER_PAGE;
  const taskPageCount = Math.max(1, Math.ceil(filteredTasks.length / perPage));
  if (_empUpdatesTaskPage >= taskPageCount) _empUpdatesTaskPage = taskPageCount - 1;
  if (_empUpdatesTaskPage < 0) _empUpdatesTaskPage = 0;
  const taskStart = _empUpdatesTaskPage * perPage;
  const pageTasks = filteredTasks.slice(taskStart, taskStart + perPage);

  // Status filter chips with counts.
  const filterChip = (key, label, count, badgeClass) => {
    const active = _empUpdatesStatusFilter === key;
    return `
      <button type="button"
              class="btn btn-sm emp-filter-chip ${active ? 'btn-' + badgeClass : 'btn-outline-' + badgeClass}"
              data-filter="${key}">
        ${escapeHtml(label)} <span class="badge badge-light ml-1">${count}</span>
      </button>`;
  };
  const filtersHtml = `
    <div class="emp-filter-row d-flex flex-wrap mb-2" style="gap:6px;">
      ${filterChip('all', 'All', c.total, 'primary')}
      ${filterChip('pending', 'Pending', c.pending, 'warning')}
      ${filterChip('in_progress', 'In Progress', c.in_progress, 'info')}
      ${filterChip('completed', 'Completed', c.completed, 'success')}
    </div>`;

  // Task rows for the current page only.
  const taskRows = pageTasks.map(t => {
    const cls = statusClassMap[t.order_status] || 'secondary';
    const label = statusMap[t.order_status] || (t.order_status || 'N/A');
    return `
      <div class="list-group-item emp-task-item"
           data-client="${escapeHtml((t.client_email || '').toLowerCase())}"
           data-employee="${escapeHtml((emp.employee_email || '').toLowerCase())}">
        <div class="row no-gutters align-items-center">
          <div class="col-md-6">
            <h6 class="mb-1"><strong>${escapeHtml(t.service_name || 'N/A')}</strong></h6>
            <small class="text-muted">Client: ${escapeHtml(t.client_email || 'N/A')}</small><br>
            <small class="text-muted">Period: ${escapeHtml(t.period || 'N/A')}</small>
          </div>
          <div class="col-md-3 text-center">
            <span class="badge badge-${cls}">${escapeHtml(label)}</span>
          </div>
          <div class="col-md-3 text-right">
            <small class="text-muted">${formatDate(t.created_at)}</small><br>
            <button class="btn btn-sm btn-outline-primary mt-1 view-task-progress-btn"
                    data-order-id="${escapeHtml(t.order_id)}" title="View work progress">
              <i class="fas fa-chart-line"></i> Progress
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Task pager (only if more than one page of filtered tasks).
  const taskPagerHtml = taskPageCount > 1 ? `
    <div class="emp-task-pager d-flex justify-content-between align-items-center px-3 py-2 border-top" style="gap:8px;">
      <small class="text-muted">
        Showing ${filteredTasks.length === 0 ? 0 : (taskStart + 1)}–${Math.min(taskStart + perPage, filteredTasks.length)} of ${filteredTasks.length}
      </small>
      <div class="d-flex align-items-center" style="gap:8px;">
        <button type="button" class="btn btn-sm btn-light" id="emp-task-prev" ${_empUpdatesTaskPage === 0 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i> Prev
        </button>
        <small class="text-muted">Page ${_empUpdatesTaskPage + 1} / ${taskPageCount}</small>
        <button type="button" class="btn btn-sm btn-light" id="emp-task-next" ${_empUpdatesTaskPage >= taskPageCount - 1 ? 'disabled' : ''}>
          Next <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>` : '';

  contentEl.innerHTML = `
    <div class="card mb-3 emp-update-card">
      <div class="card-header bg-light">
        <div class="d-flex justify-content-between align-items-center flex-wrap">
          <h5 class="mb-0">
            <i class="fas fa-user-tie text-primary"></i> ${escapeHtml(emp.employee_email || '')}
          </h5>
          <div class="emp-task-counters d-flex gap-2 flex-wrap">
            <span class="badge badge-warning"><i class="fas fa-clock"></i> Pending: ${c.pending}</span>
            <span class="badge badge-info"><i class="fas fa-spinner"></i> In Progress: ${c.in_progress}</span>
            <span class="badge badge-success"><i class="fas fa-check"></i> Completed: ${c.completed}</span>
            <span class="badge badge-primary">Total: ${c.total}</span>
          </div>
        </div>
        ${filtersHtml}
      </div>
      <div class="card-body p-0">
        <div class="list-group list-group-flush">${taskRows || '<div class="text-muted text-center py-3">No tasks match this filter.</div>'}</div>
      </div>
      ${taskPagerHtml}
    </div>`;

  // Wire filter chips.
  contentEl.querySelectorAll('.emp-filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _empUpdatesStatusFilter = btn.getAttribute('data-filter') || 'all';
      _empUpdatesTaskPage = 0; // reset to first page when filter changes
      renderEmpUpdatesContent();
    });
  });

  // Wire task pager. Scroll the employee card to the top of the viewport
  // after page change so the new rows are immediately visible (otherwise
  // a long page leaves the user mid-scroll on the old rows).
  const scrollCardToTop = () => {
    const card = contentEl.querySelector('.emp-update-card');
    if (card && typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const prevBtn = document.getElementById('emp-task-prev');
  const nextBtn = document.getElementById('emp-task-next');
  if (prevBtn) prevBtn.addEventListener('click', () => { _empUpdatesTaskPage--; renderEmpUpdatesContent(); scrollCardToTop(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { _empUpdatesTaskPage++; renderEmpUpdatesContent(); scrollCardToTop(); });

  // Progress buttons defer to admin-orders.js for the modal logic.
  contentEl.querySelectorAll('.view-task-progress-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      if (typeof openOrderProgressModal === 'function') {
        openOrderProgressModal(this.getAttribute('data-order-id'));
      }
    });
  });
}

// Search box handler. Drives _empUpdatesSearchQuery and re-renders the
// selected employee's task list. Search now hits ALL of an employee's tasks
// (not just rows currently in the DOM), because pagination would otherwise
// hide matches on other pages.
function filterEmployeeUpdates(query) {
  _empUpdatesSearchQuery = (query || '').trim();
  _empUpdatesTaskPage = 0; // jump back to first page so matches are visible
  renderEmpUpdatesContent();
}
