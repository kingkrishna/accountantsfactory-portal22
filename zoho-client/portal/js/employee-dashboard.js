// Employee Dashboard Functionality

document.addEventListener('DOMContentLoaded', async function () {
    // Authentication bypass / safety
    if (!requireEmployee()) return;

    const isValid = await clientAuth.verifyToken();
    if (!isValid) {
        clientAuth.logout();
        return;
    }

    // Populate basic user info
    const user = clientAuth.getUser();
    if (user) {
        document.getElementById('employee-email').textContent = user.email;
        document.getElementById('profile-email').textContent = user.email;

        // Status badges
        const safeStatus = escapeHtml(user.status || 'inactive');
        const statusClass = safeStatus === 'active' ? 'completed' : 'pending';
        const profileStatEl = document.getElementById('profile-status');
        if (profileStatEl) {
            profileStatEl.textContent = safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
            profileStatEl.className = `status-badge status-${statusClass}`;
        }
    }

    // Sidebar Hooks
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

    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.eod-update-btn');
        if (btn) {
            e.preventDefault();
            const orderId = btn.getAttribute('data-order-id');
            const serviceName = btn.getAttribute('data-service');
            const clientEmail = btn.getAttribute('data-client');

            document.getElementById('eod-order-id').value = orderId;
            document.getElementById('eod-order-context').textContent = `Updating: ${serviceName} / Client: ${clientEmail.split('@')[0]}`;
            document.getElementById('eod-comments').value = '';
            document.getElementById('eod-status').value = 'pending';
            $('#eod-update-modal').modal('show');
        }
    });

    // Modal Submit Hook
    document.getElementById('eod-submit-btn')?.addEventListener('click', submitEODUpdate);

    // Profile hook
    document.getElementById('change-password-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters long');
            return;
        }

        try {
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';

            await api.changePassword(currentPassword, newPassword);
            alert('Password changed successfully!');
            this.reset();

            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Change Password';
        } catch (error) {
            console.error('Password change failed:', error);
            alert('Failed to change password. Please verify current password.');
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Change Password';
        }
    });

    // Init Data Load
    showSection('overview');
});

// Routing
function showSection(section) {
    document.querySelectorAll('.dashboard-section').forEach(sec => {
        sec.style.display = 'none';
    });

    const sectionDiv = document.getElementById(`${section}-section`);
    if (sectionDiv) {
        sectionDiv.style.display = 'block';
        if (section === 'overview' || section === 'tasks') {
            loadDashboardData(section === 'overview');
        }
    }
}

async function loadDashboardData(isOverview) {
    const loadingDiv = document.getElementById('tasks-loading');
    const emptyDiv = document.getElementById('tasks-empty');
    const tableContainer = document.getElementById('tasks-table-container');
    const tbody = document.getElementById('tasks-tbody');
    const updatesLoading = document.getElementById('recent-updates-loading');
    const updatesEmpty = document.getElementById('recent-updates-empty');
    const updatesList = document.getElementById('recent-updates-list');

    // Show loaders based on context
    if (!isOverview) {
        loadingDiv.style.display = 'block';
        tableContainer.style.display = 'none';
        emptyDiv.style.display = 'none';
    } else {
        updatesLoading.style.display = 'block';
        updatesList.innerHTML = '';
    }

    try {
        const res = await api.getEmployeeDashboard();

        // Overview processing
        if (isOverview) {
            document.getElementById('emp-stat-tasks').textContent = res.active_tasks || 0;
            document.getElementById('emp-stat-completed').textContent = res.completed_tasks || 0;

            updatesLoading.style.display = 'none';

            let foundUpdates = false;
            if (res.orders && res.orders.length > 0) {
                // Re-map internal orders array to extract the latest WorkUpdates globally
                let allUpdates = [];
                res.orders.forEach(o => {
                    if (o.work_updates && o.work_updates.length > 0) {
                        o.work_updates.forEach(u => {
                            allUpdates.push({ ...u, service_name: o.service_name, client_email: o.client_email });
                        });
                    }
                });

                // Sort by date DESC
                allUpdates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                if (allUpdates.length > 0) {
                    foundUpdates = true;
                    updatesEmpty.style.display = 'none';
                    // Slice top 5
                    allUpdates.slice(0, 5).forEach(update => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item px-0';
                        const safeDate = formatDate(update.created_at);
                        const safeStat = escapeHtml(update.status);
                        const safeServ = escapeHtml(update.service_name);
                        const safeClient = escapeHtml(update.client_email);
                        const safeComm = escapeHtml(update.comments);

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
            }

            if (!foundUpdates) {
                updatesEmpty.style.display = 'block';
            }

        } else {
            // Table View Processing
            loadingDiv.style.display = 'none';
            if (!res.orders || res.orders.length === 0) {
                emptyDiv.style.display = 'block';
                return;
            }

            tableContainer.style.display = 'block';
            tbody.innerHTML = '';

            res.orders.forEach(order => {
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
                    <button type="button" class="btn btn-sm btn-info eod-update-btn" 
                        data-order-id="${orderId}" 
                        data-service="${serv}" 
                        data-client="${client}">
                        <i class="fas fa-clipboard-check"></i> Submit EOD
                    </button>
                </td>
            `;
                tbody.appendChild(row);
            });
        }

    } catch (error) {
        if (!isOverview) loadingDiv.style.display = 'none';
        else updatesLoading.style.display = 'none';
        console.error('Failed to load employee dashboard data:', error);
    }
}

async function submitEODUpdate() {
    const orderId = document.getElementById('eod-order-id').value;
    const status = document.getElementById('eod-status').value;
    const comments = document.getElementById('eod-comments').value.trim();

    if (!orderId || !status || !comments) {
        alert("Missing required fields. Comments are mandatory.");
        return;
    }

    const btn = document.getElementById('eod-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        await api.submitEODUpdate(orderId, status, comments);
        $('#eod-update-modal').modal('hide');

        // Reload both overview and tasks so state syncs
        loadDashboardData(false);
        alert('EOD Update submitted successfully!');
    } catch (error) {
        console.error("EOD Submission failed:", error);
        alert("Failed to submit update. Please try again.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Submit Update';
    }
}
