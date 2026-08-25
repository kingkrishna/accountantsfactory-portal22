// Employee Dashboard Functionality
var _allOrders = [];       // cached task list
var _allEODUpdates = [];   // cached flattened EOD updates across tasks

document.addEventListener('DOMContentLoaded', async function () {
    if (!requireEmployee()) return;

    const isValid = await clientAuth.verifyToken();
    if (!isValid) { clientAuth.logout(); return; }

    // Populate user info
    const user = clientAuth.getUser();
    if (user) {
        document.getElementById('employee-email').textContent = user.email;
        document.getElementById('profile-email').textContent = user.email;
        const safeStatus = escapeHtml(user.status || 'inactive');
        const statusClass = safeStatus === 'active' ? 'completed' : 'pending';
        const profileStatEl = document.getElementById('profile-status');
        if (profileStatEl) {
            profileStatEl.textContent = safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
            profileStatEl.className = `status-badge status-${statusClass}`;
        }
    }

    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', function (e) {
            if (this.classList.contains('sidebar-link-back')) return;
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Quick action links in Overview
    document.querySelectorAll('[data-section-link]').forEach(el => {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section-link');
            const navLink = document.querySelector('.sidebar-nav a[data-section="' + section + '"]');
            if (navLink) navLink.click();
        });
    });

    // Delegated clicks: EOD Submit button, View Details button
    document.addEventListener('click', function (e) {
        const eodBtn = e.target.closest('.eod-update-btn');
        if (eodBtn) {
            e.preventDefault();
            const orderId = eodBtn.getAttribute('data-order-id');
            const serviceName = eodBtn.getAttribute('data-service');
            const clientEmail = eodBtn.getAttribute('data-client');
            document.getElementById('eod-order-id').value = orderId;
            document.getElementById('eod-order-context').textContent = `Updating: ${serviceName} / Client: ${(clientEmail || '').split('@')[0]}`;
            document.getElementById('eod-comments').value = '';
            document.getElementById('eod-status').value = 'pending';
            $('#eod-update-modal').modal('show');
            return;
        }
        const detailsBtn = e.target.closest('.task-details-btn');
        if (detailsBtn) {
            e.preventDefault();
            openTaskDetails(detailsBtn.getAttribute('data-order-id'));
            return;
        }
        const cmtBtn = e.target.closest('.task-comments-btn');
        if (cmtBtn) {
            e.preventDefault();
            const orderId = cmtBtn.getAttribute('data-order-id');
            const clientEmail = cmtBtn.getAttribute('data-client') || '';
            if (window.AfComments) window.AfComments.open(orderId, { title: 'Task Comments — ' + clientEmail });
        }
    });

    document.getElementById('eod-submit-btn')?.addEventListener('click', submitEODUpdate);

    // Task search + filter
    const tasksSearch = document.getElementById('tasks-search');
    const tasksFilter = document.getElementById('tasks-filter-status');
    if (tasksSearch) tasksSearch.addEventListener('input', renderTasksTable);
    if (tasksFilter) tasksFilter.addEventListener('change', renderTasksTable);

    // EOD history search
    const eodHistSearch = document.getElementById('eod-history-search');
    if (eodHistSearch) eodHistSearch.addEventListener('input', renderEODHistory);

    // Change password
    document.getElementById('change-password-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) { alert('New passwords do not match'); return; }
        if (newPassword.length < 8) { alert('Password must be at least 8 characters long'); return; }

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';
        try {
            await api.changePassword(currentPassword, newPassword);
            alert('Password changed successfully!');
            this.reset();
        } catch (error) {
            console.error('Password change failed:', error);
            alert('Failed to change password: ' + (error.message || 'Please verify current password.'));
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Change Password';
        }
    });

    showSection('overview');

    // Auto-refresh so newly-assigned tasks appear without manual refresh.
    // Single source of truth: one function, one in-flight guard, one timer
    // that pauses while the tab is hidden, plus a focus-on-return fire.
    const REFRESHABLE_SECTIONS = new Set(['overview', 'tasks', 'eod-history']);
    const REFRESH_INTERVAL_MS = 30000;
    let _refreshing = false;
    async function autoRefresh() {
        if (_refreshing) return;
        if (document.visibilityState !== 'visible') return;
        const active = document.querySelector('.sidebar-nav a.active');
        const section = active ? active.getAttribute('data-section') : 'overview';
        if (!REFRESHABLE_SECTIONS.has(section)) return;
        _refreshing = true;
        try { await loadDashboardData(section); }
        finally { _refreshing = false; }
    }
    let _refreshTimer = setInterval(autoRefresh, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', autoRefresh);
    // Tear down on tab close / logout
    window.addEventListener('pagehide', function () {
        if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
    });
});

function showSection(section) {
    document.querySelectorAll('.dashboard-section').forEach(sec => sec.style.display = 'none');
    const sectionDiv = document.getElementById(`${section}-section`);
    if (!sectionDiv) return;
    sectionDiv.style.display = 'block';
    if (section === 'overview' || section === 'tasks' || section === 'eod-history') {
        loadDashboardData(section);
    }
}

async function loadDashboardData(section) {
    const loadingDiv = document.getElementById('tasks-loading');
    const emptyDiv = document.getElementById('tasks-empty');
    const tableContainer = document.getElementById('tasks-table-container');
    const updatesLoading = document.getElementById('recent-updates-loading');
    const eodLoading = document.getElementById('eod-history-loading');

    if (section === 'overview') updatesLoading.style.display = 'block';
    if (section === 'tasks') { loadingDiv.style.display = 'block'; tableContainer.style.display = 'none'; emptyDiv.style.display = 'none'; }
    if (section === 'eod-history') eodLoading.style.display = 'block';

    try {
        const res = await api.getEmployeeDashboard();
        _allOrders = res.orders || [];

        // Flatten all EOD updates across tasks for the history view
        _allEODUpdates = [];
        _allOrders.forEach(o => {
            (o.work_updates || []).forEach(u => {
                _allEODUpdates.push({ ...u, service_name: o.service_name, client_email: o.client_email, order_id: o.id });
            });
        });
        _allEODUpdates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Compute stats by status
        const pending     = _allOrders.filter(o => (o.status || '').toLowerCase() === 'pending').length;
        const inProgress  = _allOrders.filter(o => (o.status || '').toLowerCase() === 'in_progress').length;
        const completed   = _allOrders.filter(o => (o.status || '').toLowerCase() === 'completed').length;

        document.getElementById('emp-stat-tasks').textContent      = _allOrders.length;
        document.getElementById('emp-stat-pending').textContent    = pending;
        document.getElementById('emp-stat-inprogress').textContent = inProgress;
        document.getElementById('emp-stat-completed').textContent  = completed;

        // Overview: recent updates
        if (section === 'overview') {
            updatesLoading.style.display = 'none';
            renderRecentUpdates();
        }

        // Tasks table
        if (section === 'tasks') {
            loadingDiv.style.display = 'none';
            renderTasksTable();
        }

        // EOD history
        if (section === 'eod-history') {
            eodLoading.style.display = 'none';
            renderEODHistory();
        }

    } catch (error) {
        console.error('Failed to load employee dashboard data:', error);
        if (section === 'tasks') loadingDiv.style.display = 'none';
        if (section === 'overview') updatesLoading.style.display = 'none';
        if (section === 'eod-history') eodLoading.style.display = 'none';
    }
}

function renderRecentUpdates() {
    const updatesEmpty = document.getElementById('recent-updates-empty');
    const updatesList = document.getElementById('recent-updates-list');
    updatesList.innerHTML = '';
    const top5 = _allEODUpdates.slice(0, 5);
    if (top5.length === 0) { updatesEmpty.style.display = 'block'; return; }
    updatesEmpty.style.display = 'none';
    top5.forEach(update => {
        const li = document.createElement('li');
        li.className = 'list-group-item px-0';
        const safeDate = formatDate(update.created_at);
        const safeStat = escapeHtml(update.status || '');
        const safeServ = escapeHtml(update.service_name || '');
        const safeClient = escapeHtml(update.client_email || '');
        const safeComm = escapeHtml(update.comments || '');
        li.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${safeServ} <small>(${safeClient.split('@')[0]})</small></h6>
                <small class="text-muted"><i class="fas fa-calendar-alt"></i> ${safeDate}</small>
            </div>
            <p class="mb-1 small text-dark">${safeComm}</p>
            <small>Status logged: <strong>${safeStat.toUpperCase()}</strong></small>
        `;
        updatesList.appendChild(li);
    });
}

function renderTasksTable() {
    const emptyDiv = document.getElementById('tasks-empty');
    const tableContainer = document.getElementById('tasks-table-container');
    const tbody = document.getElementById('tasks-tbody');
    const search = (document.getElementById('tasks-search')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('tasks-filter-status')?.value || '';

    const filtered = _allOrders.filter(o => {
        if (statusFilter && (o.status || '').toLowerCase() !== statusFilter) return false;
        if (!search) return true;
        const hay = ((o.client_email || '') + ' ' + (o.service_name || '') + ' ' + (o.period || '')).toLowerCase();
        return hay.indexOf(search) !== -1;
    });

    if (filtered.length === 0) {
        tableContainer.style.display = 'none';
        emptyDiv.style.display = 'block';
        return;
    }
    emptyDiv.style.display = 'none';
    tableContainer.style.display = 'block';
    tbody.innerHTML = '';

    filtered.forEach(order => {
        const row = document.createElement('tr');
        const safeStatus = escapeHtml(order.status || '');
        const safeOrderDate = formatDate(order.created_at);
        const statusClassMap = { 'pending': 'pending', 'in_progress': 'in-progress', 'completed': 'completed' };
        const statusClass = statusClassMap[(order.status || '').toLowerCase()] || 'pending';
        const client = escapeHtml(order.client_email || 'N/A');
        const serv = escapeHtml(order.service_name || 'N/A');
        const period = escapeHtml(order.period || 'N/A');
        const orderId = escapeHtml(order.id);

        row.innerHTML = `
            <td><strong>${client}</strong></td>
            <td>${serv}</td>
            <td>${period}</td>
            <td><span class="status-badge status-${statusClass}">${safeStatus}</span></td>
            <td>${safeOrderDate}</td>
            <td>
                <div class="action-btns">
                    <button type="button" class="btn btn-sm btn-outline-secondary task-details-btn" data-order-id="${orderId}">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                    <button type="button" class="btn btn-sm btn-info eod-update-btn"
                        data-order-id="${orderId}" data-service="${serv}" data-client="${client}">
                        <i class="fas fa-clipboard-check"></i> Submit EOD
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary task-comments-btn"
                        data-order-id="${orderId}" data-client="${client}">
                        <i class="fas fa-comments"></i> Comments
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Feature C: also refresh the kanban board (works whether it's the
    // currently-visible view or not — cheap to always keep in sync).
    if (typeof renderTasksKanban === 'function') renderTasksKanban();
}

// ─── Feature C: Kanban view of the same filtered task list ────────────
function renderTasksKanban() {
    const search = (document.getElementById('tasks-search')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('tasks-filter-status')?.value || '';
    const filtered = _allOrders.filter(o => {
        if (statusFilter && (o.status || '').toLowerCase() !== statusFilter) return false;
        if (!search) return true;
        const hay = ((o.client_email || '') + ' ' + (o.service_name || '') + ' ' + (o.period || '')).toLowerCase();
        return hay.indexOf(search) !== -1;
    });

    const bodies = {
        pending: document.getElementById('kanban-body-pending'),
        in_progress: document.getElementById('kanban-body-in_progress'),
        completed: document.getElementById('kanban-body-completed')
    };
    const counts = { pending: 0, in_progress: 0, completed: 0 };
    Object.values(bodies).forEach(b => { if (b) b.innerHTML = ''; });

    filtered.forEach(order => {
        const status = (order.status || 'pending').toLowerCase();
        if (!bodies[status]) return;
        counts[status]++;
        const client = escapeHtml(order.client_email || 'N/A');
        const serv = escapeHtml(order.service_name || 'N/A');
        const period = escapeHtml(order.period || '');
        const orderId = escapeHtml(order.id);
        const daysOld = daysSince(order.created_at);
        const ageBadge = daysOld > 7 ? `<span class="kanban-age-badge overdue" title="Older than 7 days">${daysOld}d</span>`
                       : daysOld > 3 ? `<span class="kanban-age-badge warn" title="${daysOld} days old">${daysOld}d</span>`
                       : `<span class="kanban-age-badge fresh">${daysOld}d</span>`;

        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.innerHTML = `
            <div class="kanban-card-top">
                <div class="kanban-card-service">${serv}</div>
                ${ageBadge}
            </div>
            <div class="kanban-card-client"><i class="fas fa-user"></i> ${client}</div>
            ${period ? `<div class="kanban-card-period"><i class="fas fa-calendar"></i> ${period}</div>` : ''}
            <div class="kanban-card-actions">
                <button type="button" class="btn btn-sm btn-outline-secondary task-details-btn" data-order-id="${orderId}" title="Details"><i class="fas fa-info-circle"></i></button>
                <button type="button" class="btn btn-sm btn-info eod-update-btn" data-order-id="${orderId}" data-service="${serv}" data-client="${client}" title="Submit EOD"><i class="fas fa-clipboard-check"></i></button>
                <button type="button" class="btn btn-sm btn-secondary task-comments-btn" data-order-id="${orderId}" data-client="${client}" title="Comments"><i class="fas fa-comments"></i></button>
            </div>
        `;
        bodies[status].appendChild(card);
    });

    // Update counts + empty-state per column
    Object.keys(counts).forEach(k => {
        const cnt = document.getElementById('kanban-count-' + k);
        if (cnt) cnt.textContent = counts[k];
        if (counts[k] === 0 && bodies[k]) {
            bodies[k].innerHTML = '<div class="kanban-empty">No tasks</div>';
        }
    });
}

function daysSince(iso) {
    if (!iso) return 0;
    const ms = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(ms / 86400000));
}

// Wire the view toggle (Feature C).
document.addEventListener('DOMContentLoaded', function () {
    const btnTable = document.getElementById('tasks-view-table');
    const btnKanban = document.getElementById('tasks-view-kanban');
    const tableContainer = document.getElementById('tasks-table-container');
    const kanbanContainer = document.getElementById('tasks-kanban-container');
    const emptyDiv = document.getElementById('tasks-empty');
    if (!btnTable || !btnKanban || !tableContainer || !kanbanContainer) return;

    function setView(mode) {
        if (mode === 'kanban') {
            btnTable.classList.remove('active');
            btnKanban.classList.add('active');
            tableContainer.style.display = 'none';
            if (emptyDiv) emptyDiv.style.display = 'none';
            kanbanContainer.style.display = 'block';
            renderTasksKanban();
        } else {
            btnKanban.classList.remove('active');
            btnTable.classList.add('active');
            kanbanContainer.style.display = 'none';
            renderTasksTable();
        }
        try { localStorage.setItem('af_emp_tasks_view', mode); } catch (_) {}
    }

    btnTable.addEventListener('click', () => setView('table'));
    btnKanban.addEventListener('click', () => setView('kanban'));

    // Restore previous view choice
    try {
        const saved = localStorage.getItem('af_emp_tasks_view');
        if (saved === 'kanban') setView('kanban');
    } catch (_) {}
});

function renderEODHistory() {
    const emptyDiv = document.getElementById('eod-history-empty');
    const list = document.getElementById('eod-history-list');
    const search = (document.getElementById('eod-history-search')?.value || '').trim().toLowerCase();
    list.innerHTML = '';

    const filtered = _allEODUpdates.filter(u => {
        if (!search) return true;
        const hay = ((u.service_name || '') + ' ' + (u.client_email || '') + ' ' + (u.comments || '') + ' ' + (u.status || '')).toLowerCase();
        return hay.indexOf(search) !== -1;
    });

    if (filtered.length === 0) { emptyDiv.style.display = 'block'; return; }
    emptyDiv.style.display = 'none';

    filtered.forEach(update => {
        const li = document.createElement('li');
        li.className = 'list-group-item px-0';
        const safeDate = formatDate(update.created_at);
        const safeStat = escapeHtml(update.status || '');
        const safeServ = escapeHtml(update.service_name || '');
        const safeClient = escapeHtml(update.client_email || '');
        const safeComm = escapeHtml(update.comments || '');
        const statusClassMap = { 'pending': 'pending', 'ongoing': 'in-progress', 'in_progress': 'in-progress', 'completed': 'completed' };
        const statusClass = statusClassMap[safeStat.toLowerCase()] || 'pending';
        li.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${safeServ} <small class="text-muted">(${safeClient.split('@')[0]})</small></h6>
                <small class="text-muted"><i class="fas fa-calendar-alt"></i> ${safeDate}</small>
            </div>
            <p class="mb-1 small text-dark">${safeComm}</p>
            <small>Status: <span class="status-badge status-${statusClass}">${safeStat.toUpperCase()}</span></small>
        `;
        list.appendChild(li);
    });
}

function openTaskDetails(orderId) {
    const body = document.getElementById('task-details-body');
    body.innerHTML = '<div class="loading-spinner"><div class="spinner-border" role="status"></div></div>';
    $('#task-details-modal').modal('show');

    const order = _allOrders.find(o => o.id === orderId);
    if (!order) {
        body.innerHTML = '<p class="text-danger">Task not found.</p>';
        return;
    }
    const updates = (order.work_updates || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const docs = order.documents || [];

    const safe = (s) => escapeHtml(s || '');
    const statusClassMap = { 'pending': 'pending', 'in_progress': 'in-progress', 'completed': 'completed' };
    const statusClass = statusClassMap[(order.status || '').toLowerCase()] || 'pending';

    body.innerHTML = `
        <h5 class="mb-3"><i class="fas fa-briefcase"></i> ${safe(order.service_name)}</h5>
        <div class="row mb-3">
            <div class="col-md-6"><strong>Client:</strong> ${safe(order.client_email)}</div>
            <div class="col-md-6"><strong>Period:</strong> ${safe(order.period) || '—'}</div>
            <div class="col-md-6 mt-2"><strong>Status:</strong> <span class="status-badge status-${statusClass}">${safe(order.status)}</span></div>
            <div class="col-md-6 mt-2"><strong>Assigned:</strong> ${formatDate(order.created_at)}</div>
        </div>
        <hr>
        <h6><i class="fas fa-history"></i> EOD History (${updates.length})</h6>
        ${updates.length === 0
            ? '<p class="text-muted small">No EOD updates for this task yet.</p>'
            : '<ul class="list-group list-group-flush">' + updates.map(u => `
                <li class="list-group-item px-0">
                    <div class="d-flex w-100 justify-content-between">
                        <strong>${safe(u.status).toUpperCase()}</strong>
                        <small class="text-muted">${formatDate(u.created_at)}</small>
                    </div>
                    <p class="mb-0 small">${safe(u.comments)}</p>
                </li>`).join('') + '</ul>'
        }
        <hr>
        <h6><i class="fas fa-file"></i> Documents (${docs.length})</h6>
        ${docs.length === 0
            ? '<p class="text-muted small">No documents attached yet.</p>'
            : '<ul class="list-unstyled small">' + docs.map(d => `
                <li class="mb-1"><i class="fas fa-file-alt"></i> ${safe(d.file_name || 'Document')}
                ${d.download_url ? `<a href="${escapeHtml(d.download_url)}" target="_blank" rel="noopener" class="ml-2 small">Open</a>` : ''}
                </li>`).join('') + '</ul>'
        }
    `;
}

async function submitEODUpdate() {
    const orderId = document.getElementById('eod-order-id').value;
    const status = document.getElementById('eod-status').value;
    const comments = document.getElementById('eod-comments').value.trim();

    if (!orderId || !status || !comments) { alert("Missing required fields. Comments are mandatory."); return; }

    const btn = document.getElementById('eod-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    try {
        await api.submitEODUpdate(orderId, status, comments);
        $('#eod-update-modal').modal('hide');
        // Refresh data so stats, task table, and history all update
        await loadDashboardData('tasks');
        alert('EOD Update submitted successfully!');
    } catch (error) {
        console.error("EOD Submission failed:", error);
        alert("Failed to submit update: " + (error.message || "Please try again."));
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Submit Update';
    }
}
