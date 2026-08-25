// Client Dashboard Functionality
// Utility functions are loaded from utils.js and available globally

document.addEventListener('DOMContentLoaded', async function () {
  // Check authentication
  if (!requireAuth()) return;

  // Verify token
  const isValid = await clientAuth.verifyToken();
  if (!isValid) {
    clientAuth.logout();
    return;
  }

  // Load user data
  const user = clientAuth.getUser();
  if (user) {
    document.getElementById('client-name').textContent = user.email.split('@')[0];
    document.getElementById('client-email').textContent = user.email;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-status').textContent = user.status === 'active' ? 'Active' : 'Inactive';
    document.getElementById('profile-status').className = `status-badge status-${user.status === 'active' ? 'completed' : 'pending'}`;

    if (user.created_at) {
      const date = new Date(user.created_at);
      document.getElementById('profile-created').textContent = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    if (user.referral_code) {
      document.getElementById('referral-code-display').textContent = user.referral_code;
    }
    updateProfile2FA(user);
  }

  document.getElementById('profile-2fa-enable')?.addEventListener('click', open2FASetupModal);
  document.getElementById('profile-2fa-disable')?.addEventListener('click', function () {
    $('#2fa-disable-modal').modal('show');
    document.getElementById('2fa-disable-password').value = '';
    document.getElementById('2fa-disable-code').value = '';
    document.getElementById('2fa-disable-error').style.display = 'none';
  });
  document.getElementById('2fa-setup-verify')?.addEventListener('click', verify2FASetup);
  document.getElementById('2fa-disable-submit')?.addEventListener('click', submit2FADisable);

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

  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-goto-section]');
    if (g) {
      e.preventDefault();
      goToSection(g.getAttribute('data-goto-section'));
    }
  });

  // Load initial section
  showSection('overview');
});

function showSection(section) {
  // Hide all sections
  document.querySelectorAll('.dashboard-section').forEach(sec => {
    sec.style.display = 'none';
  });

  // Show selected section
  const sectionDiv = document.getElementById(`${section}-section`);
  if (sectionDiv) {
    sectionDiv.style.display = 'block';

    // Load section data
    switch (section) {
      case 'overview':
        loadOverview();
        break;
      case 'compliance':
        if (typeof initCompliance === 'function') initCompliance();
        break;
      case 'services':
        loadServices();
        break;
      case 'documents':
        loadDocumentsOverview();
        break;
      case 'referrals':
        loadReferrals();
        break;
      case 'profile':
        updateProfile2FA(clientAuth.getUser());
        break;
      case 'request-service':
        loadAvailableServices();
        break;
    }
  }
}

function goToSection(section) {
  var nav = document.querySelector('.sidebar-nav a[data-section="' + section + '"]');
  if (nav) {
    document.querySelectorAll('.sidebar-nav a').forEach(function (a) { a.classList.remove('active'); });
    nav.classList.add('active');
  }
  showSection(section);
}

async function loadDocumentsOverview() {
  var loadingEl = document.getElementById('documents-overview-loading');
  var emptyEl = document.getElementById('documents-overview-empty');
  var listEl = document.getElementById('documents-overview-list');
  var ul = document.getElementById('documents-overview-ul');
  if (!loadingEl || !emptyEl || !listEl || !ul) return;
  loadingEl.style.display = 'none';
  emptyEl.style.display = 'none';
  listEl.style.display = 'none';
  ul.innerHTML = '';
  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    emptyEl.style.display = 'block';
    return;
  }
  try {
    loadingEl.style.display = 'block';
    var res = await api.getServices();
    loadingEl.style.display = 'none';
    var services = (res && res.services) ? res.services : [];
    var withDocs = services.filter(function (s) { return (s.document_count || 0) > 0; });
    if (withDocs.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    listEl.style.display = 'block';
    withDocs.forEach(function (s) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="doc-service-name">' + (escapeHtml(s.service_name || 'Service')) + '</span> <span class="doc-count">' + (s.document_count || 0) + ' document(s)</span>';
      ul.appendChild(li);
    });
  } catch (e) {
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'block';
  }
}

async function loadOverview() {
  var servicesEl = document.getElementById('client-stat-services');
  var referralsEl = document.getElementById('client-stat-referrals');
  if (!servicesEl || !referralsEl) return;
  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    servicesEl.textContent = '0';
    referralsEl.textContent = '0';
    return;
  }
  try {
    var res = await api.getDashboard();
    servicesEl.textContent = (res.dashboard && res.dashboard.totalServices != null) ? res.dashboard.totalServices : '0';
    referralsEl.textContent = (res.dashboard && res.dashboard.pendingReferrals != null) ? res.dashboard.pendingReferrals : '0';
  } catch (e) {
    servicesEl.textContent = '0';
    referralsEl.textContent = '0';
  }
}

async function loadServices() {
  const tbody = document.getElementById('services-tbody');
  const loadingDiv = document.getElementById('services-loading');
  const emptyDiv = document.getElementById('services-empty');
  const listDiv = document.getElementById('services-list');

  loadingDiv.style.display = 'block';
  emptyDiv.style.display = 'none';
  listDiv.style.display = 'none';

  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    loadingDiv.style.display = 'none';
    emptyDiv.style.display = 'block';
    return;
  }

  try {
    const response = await api.getServices();
    loadingDiv.style.display = 'none';

    if (!response.services || response.services.length === 0) {
      emptyDiv.style.display = 'block';
      return;
    }

    listDiv.style.display = 'block';
    tbody.innerHTML = '';

    response.services.forEach(service => {
      // Create row safely to prevent XSS
      const row = document.createElement('tr');

      // Service name
      const td1 = document.createElement('td');
      td1.textContent = service.service_name || 'N/A';
      row.appendChild(td1);

      // Period
      const td2 = document.createElement('td');
      td2.textContent = service.period || 'N/A';
      row.appendChild(td2);

      // Date
      const td3 = document.createElement('td');
      td3.textContent = formatDate(service.created_at);
      row.appendChild(td3);

      // Status - format nicely
      const td4 = document.createElement('td');
      const statusBadge = document.createElement('span');
      const status = service.status || '';
      const statusLabelMap = { 'pending': 'Pending', 'in_progress': 'In Progress', 'completed': 'Completed', 'active': 'Active', 'inactive': 'Inactive' };
      const statusClassMap = { 'pending': 'pending', 'in_progress': 'in-progress', 'completed': 'completed', 'active': 'completed', 'inactive': 'pending' };
      const statusClass = statusClassMap[status.toLowerCase()] || 'pending';
      const statusLabel = statusLabelMap[status.toLowerCase()] || status;
      statusBadge.className = `status-badge status-${statusClass}`;
      statusBadge.textContent = statusLabel;
      td4.appendChild(statusBadge);
      row.appendChild(td4);

      // Accountant Assigned
      const tdEmp = document.createElement('td');
      tdEmp.innerHTML = service.employee_email ? `<span class="text-info"><i class="fas fa-user-tie"></i> ${escapeHtml(service.employee_email)}</span>` : '<span class="text-muted small">Pending Allocation</span>';
      row.appendChild(tdEmp);

      // Documents
      const td5 = document.createElement('td');
      const docCount = service.document_count || 0;
      const downloadBtn = document.createElement('button');
      downloadBtn.className = docCount > 0 ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-secondary';
      if (service.id) {
        downloadBtn.onclick = () => viewDocuments(service.id);
      }
      downloadBtn.innerHTML = docCount > 0
        ? `<i class="fas fa-file-download"></i> Documents (${docCount})`
        : `<i class="fas fa-folder-open"></i> Documents`;
      td5.appendChild(downloadBtn);
      row.appendChild(td5);

      // Actions
      const td6 = document.createElement('td');
      td6.style.cssText = 'white-space:nowrap;';
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn btn-sm btn-outline-primary mr-1 mb-1';
      if (service.id) {
        viewBtn.onclick = () => viewServiceDetails(service.id);
      } else {
        viewBtn.disabled = true;
      }
      viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
      td6.appendChild(viewBtn);

      const commentBtn = document.createElement('button');
      commentBtn.className = 'btn btn-sm btn-outline-secondary mb-1';
      if (service.id) {
        commentBtn.onclick = () => viewComments(service.id);
      } else {
        commentBtn.disabled = true;
      }
      commentBtn.innerHTML = '<i class="fas fa-comments"></i> Comments';
      td6.appendChild(commentBtn);

      // Feature B: Timeline button (opens modal handled by client-notifications.js)
      if (service.id) {
        const timelineBtn = document.createElement('button');
        timelineBtn.className = 'btn btn-sm btn-outline-info mb-1 ml-1 client-timeline-btn';
        timelineBtn.setAttribute('data-order-id', service.id);
        timelineBtn.setAttribute('data-service', service.service_name || '');
        timelineBtn.setAttribute('data-status', service.status || 'pending');
        timelineBtn.setAttribute('data-period', service.period || '');
        timelineBtn.setAttribute('data-assigned', service.created_at || '');
        timelineBtn.innerHTML = '<i class="fas fa-stream"></i> Timeline';
        td6.appendChild(timelineBtn);
      }

      row.appendChild(td6);
      tbody.appendChild(row);
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    console.error('Failed to load services:', error);
    alert('Failed to load services. Please try again.');
  }
}

async function loadReferrals() {
  const loadingDiv = document.getElementById('referrals-loading');
  const emptyDiv = document.getElementById('referrals-empty');
  const contentDiv = document.getElementById('referrals-content');

  loadingDiv.style.display = 'block';
  emptyDiv.style.display = 'none';
  contentDiv.innerHTML = '';

  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    loadingDiv.style.display = 'none';
    emptyDiv.style.display = 'block';
    return;
  }

  try {
    const response = await api.getReferrals();
    loadingDiv.style.display = 'none';

    if (!response.referrals || response.referrals.length === 0) {
      emptyDiv.style.display = 'block';
      return;
    }

    response.referrals.forEach(referral => {
      const item = document.createElement('div');
      item.className = 'referral-status-item';
      let statusClass = 'status-pending';
      if (referral.status === 'approved') statusClass = 'status-completed';
      if (referral.status === 'rejected') statusClass = 'status-pending';
      const safeStatus = escapeHtml(referral.status || '');
      const safeBonus = referral.bonus_amount != null ? escapeHtml(String(referral.bonus_amount)) : '';
      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${escapeHtml(referral.referred_name || 'N/A')}</strong>
            <br>
            <small class="text-muted">Service: ${escapeHtml(referral.service_name || 'N/A')}</small>
            <br>
            <small class="text-muted">Date: ${formatDate(referral.created_at)}</small>
          </div>
          <div class="text-right">
            <span class="status-badge ${statusClass}">${safeStatus}</span>
            ${safeBonus ? `<br><strong class="text-success">₹${safeBonus}</strong>` : ''}
            ${referral.reason ? `<br><small class="text-muted">${escapeHtml(referral.reason)}</small>` : ''}
          </div>
        </div>
      `;
      contentDiv.appendChild(item);
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    console.error('Failed to load referrals:', error);
    alert('Failed to load referrals. Please try again.');
  }
}

async function loadAvailableServices() {
  const select = document.getElementById('service-select');
  select.innerHTML = '<option value="">Loading services...</option>';

  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    select.innerHTML = '<option value="">Choose a service...</option>';
    return;
  }

  try {
    const response = await api.getAvailableServices();
    select.innerHTML = '<option value="">Choose a service...</option>';

    response.services.forEach(service => {
      const option = document.createElement('option');
      option.value = service.id;
      option.textContent = service.name;
      select.appendChild(option);
    });
  } catch (error) {
    select.innerHTML = '<option value="">Error loading services</option>';
    console.error('Failed to load services:', error);
  }
}

// Request Service Form
document.getElementById('request-service-form')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const serviceId = document.getElementById('service-select').value;
  const period = document.getElementById('service-period').value;
  const notes = document.getElementById('service-notes').value;

  if (!serviceId) {
    alert('Please select a service');
    return;
  }

  try {
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    await api.requestService(serviceId, period, notes);
    alert('Service request submitted successfully! We will process it soon.');
    this.reset();

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
  } catch (error) {
    console.error('Submit request failed:', error);
    alert('Failed to submit request. Please try again.');
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
  }
});

// Change Password Form
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
    console.error('Change password failed:', error);
    alert('Failed to change password. Please try again.');
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Change Password';
  }
});

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

// Helper functions
function copyReferralCode() {
  const code = document.getElementById('referral-code-display').textContent;
  navigator.clipboard.writeText(code).then(() => {
    alert('Referral code copied to clipboard!');
  }).catch(() => {
    alert('Failed to copy to clipboard.');
  });
}

function viewDocuments(serviceOrderId) {
  // Load documents for this service
  loadDocuments(serviceOrderId);
}

async function loadDocuments(serviceOrderId) {
  try {
    const response = await api.getDocuments(serviceOrderId);

    if (!response.documents || response.documents.length === 0) {
      alert('No documents available for this service yet.');
      return;
    }

    // Check if any doc has embed code - show in a modal
    const hasEmbed = response.documents.some(d => d.embed_code);
    if (hasEmbed) {
      // Build modal-like overlay to show embedded docs
      let overlay = document.getElementById('doc-preview-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'doc-preview-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;overflow-y:auto;padding:20px;';
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = '';
      overlay.style.display = 'block';

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Close';
      closeBtn.style.cssText = 'position:fixed;top:15px;right:20px;z-index:10000;background:#dc3545;color:#fff;border:none;padding:8px 18px;border-radius:5px;font-size:16px;cursor:pointer;';
      closeBtn.onclick = () => { overlay.style.display = 'none'; overlay.innerHTML = ''; };
      overlay.appendChild(closeBtn);

      response.documents.forEach(doc => {
        const card = document.createElement('div');
        card.style.cssText = 'background:#fff;border-radius:10px;margin:15px auto;max-width:900px;padding:20px;';

        let embedHtml = '';
        if (doc.embed_code) {
          // Render the Zoho embed code (iframe) — sanitize to only allow workdrive.zoho iframes
          if (doc.embed_code.includes('workdrive.zoho') || doc.embed_code.includes('workdrive.zohopublic')) {
            embedHtml = `<div style="margin-top:15px;border:1px solid #dee2e6;border-radius:6px;overflow:hidden;">${doc.embed_code}</div>`;
          }
        }

        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div>
              <strong style="font-size:16px;">${escapeHtml(doc.file_name)}</strong>
              <small style="color:#888;margin-left:10px;">${formatDate(doc.uploaded_at)}</small>
            </div>
            <a href="${escapeHtml(doc.download_url)}" target="_blank" rel="noopener" style="background:#007bff;color:#fff;padding:8px 16px;border-radius:5px;text-decoration:none;font-size:14px;">
              <i class="fas fa-download"></i> Download
            </a>
          </div>
          ${embedHtml}
        `;
        overlay.appendChild(card);
      });
    } else {
      // No embed code — just open download links
      response.documents.forEach(doc => {
        if (doc.download_url) {
          window.open(doc.download_url, '_blank');
        }
      });
      if (response.documents.length > 1) {
        alert(`Opening ${response.documents.length} documents in new tabs.`);
      }
    }
  } catch (error) {
    console.error('Failed to load documents:', error);
    alert('Failed to load documents. Please try again.');
  }
}

function viewServiceDetails(serviceOrderId) {
  // Implement service details modal
  alert('Service details view - to be implemented');
}

function viewComments(serviceOrderId) {
  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    alert('Comments are disabled for the demo account.');
    return;
  }
  if (window.AfComments) window.AfComments.open(serviceOrderId, { title: 'Service Comments' });
}

// formatDate and escapeHtml are now in utils.js
// They are available globally after utils.js is loaded
