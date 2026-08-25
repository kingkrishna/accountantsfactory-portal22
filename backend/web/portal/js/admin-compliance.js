// ========== ADMIN COMPLIANCE MANAGEMENT ==========
// Admin-side compliance tracking: Company profiles, compliance config, and filing management

const COMPLIANCE_SERVICE_TYPES = [
  { key: 'GST', label: 'GST', icon: 'fa-receipt', color: '#e74c3c' },
  { key: 'INCOME_TAX', label: 'Income Tax', icon: 'fa-file-invoice-dollar', color: '#3498db' },
  { key: 'MCA', label: 'MCA', icon: 'fa-landmark', color: '#9b59b6' },
  { key: 'PT', label: 'Professional Tax', icon: 'fa-user-tie', color: '#e67e22' },
  { key: 'PF', label: 'Provident Fund', icon: 'fa-piggy-bank', color: '#27ae60' },
  { key: 'ESI', label: 'ESI', icon: 'fa-hospital', color: '#1abc9c' }
];

const COMPANY_CATEGORIES = ['Private Limited', 'LLP', 'Individual', 'Partnership', 'OPC', 'Trust', 'Society', 'HUF', 'Other'];

let _selectedComplianceClientId = null;
let _selectedComplianceClientEmail = null;

// ─── Client Selector for Compliance ──────────────────────

async function loadComplianceSection() {
  const container = document.getElementById('compliance-management-content');
  if (!container) return;

  // Load overview stats
  try {
    const res = await api.getComplianceOverview();
    const statsEl = document.getElementById('compliance-overview-stats');
    if (statsEl && res) {
      const overview = res.overview || res;
      const totalClients = overview.totalClients || overview.totalClientsWithConfig || 0;
      const overdueCount = overview.overdueCount || 0;
      const byCounts = overview.countByServiceType || overview.byServiceType || {};
      let html = `
        <div class="row mb-3">
          <div class="col-md-4">
            <div class="dashboard-card stat-card text-center py-3">
              <h3 class="mb-1">${totalClients}</h3>
              <small class="text-muted">Clients with Compliance</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="dashboard-card stat-card text-center py-3" style="border-left: 3px solid #e74c3c;">
              <h3 class="mb-1 text-danger">${overdueCount}</h3>
              <small class="text-muted">Overdue Filings</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="dashboard-card stat-card text-center py-3">
              <div class="d-flex justify-content-center flex-wrap" style="gap:6px;">
                ${Object.entries(byCounts).filter(([,v]) => v > 0).map(([k, v]) => `<span class="badge badge-light">${k}: ${v}</span>`).join('')}
              </div>
              <small class="text-muted mt-1 d-block">By Service Type</small>
            </div>
          </div>
        </div>`;
      statsEl.innerHTML = html;
    }
  } catch (e) { console.error('Compliance overview error:', e); }

  // Show client selector
  document.getElementById('compliance-client-selector').style.display = 'block';
  document.getElementById('compliance-client-detail').style.display = 'none';
}

// Search clients for compliance
let _complianceSearchTimeout = null;
function onComplianceClientSearch(e) {
  const q = (e.target.value || '').trim().toLowerCase();
  clearTimeout(_complianceSearchTimeout);
  _complianceSearchTimeout = setTimeout(async () => {
    const listEl = document.getElementById('compliance-client-results');
    if (!q || q.length < 2) { listEl.innerHTML = '<p class="text-muted small">Type at least 2 characters to search...</p>'; return; }
    listEl.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> Searching...';
    try {
      const res = await api.getAllClients();
      const clients = (res.clients || res.data || [])
        .filter(c => c.role === 'client' && (
          (c.email || '').toLowerCase().includes(q) ||
          (c.name || '').toLowerCase().includes(q)
        ))
        .slice(0, 20);
      if (clients.length === 0) { listEl.innerHTML = '<p class="text-muted">No clients found.</p>'; return; }
      listEl.innerHTML = clients.map(c => `
        <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
           onclick="selectComplianceClient('${c.id}', '${escapeHtml(c.email)}'); return false;">
          <div>
            <strong>${escapeHtml(c.name || c.email)}</strong>
            <small class="text-muted d-block">${escapeHtml(c.email)}</small>
          </div>
          <i class="fas fa-chevron-right text-muted"></i>
        </a>`).join('');
    } catch (err) {
      listEl.innerHTML = '<p class="text-danger">Error searching clients.</p>';
    }
  }, 300);
}

async function selectComplianceClient(clientId, clientEmail) {
  _selectedComplianceClientId = clientId;
  _selectedComplianceClientEmail = clientEmail;

  document.getElementById('compliance-client-selector').style.display = 'none';
  document.getElementById('compliance-client-detail').style.display = 'block';
  document.getElementById('compliance-selected-client-email').textContent = clientEmail;

  await loadClientCompanyProfile(clientId);
  await loadClientComplianceConfig(clientId);
  await loadClientComplianceFilings(clientId);
}

function backToComplianceSearch() {
  _selectedComplianceClientId = null;
  document.getElementById('compliance-client-selector').style.display = 'block';
  document.getElementById('compliance-client-detail').style.display = 'none';
}

// ─── Company Profile Management ──────────────────────

async function loadClientCompanyProfile(clientId) {
  const container = document.getElementById('company-profile-form-container');
  if (!container) return;
  container.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Loading...';

  try {
    const res = await api.getCompanyProfile(clientId);
    const profile = res.profile || res.data || {};
    container.innerHTML = `
      <form id="company-profile-form" onsubmit="saveCompanyProfile(event)">
        <div class="row">
          <div class="col-md-6 form-group">
            <label>Company / Firm Name</label>
            <input type="text" class="form-control" name="company_name" value="${escapeHtml(profile.company_name || '')}" required maxlength="200">
          </div>
          <div class="col-md-3 form-group">
            <label>PAN Number</label>
            <input type="text" class="form-control" name="pan_number" value="${escapeHtml(profile.pan_number || '')}" maxlength="10" pattern="[A-Z]{5}[0-9]{4}[A-Z]" title="Format: ABCDE1234F" style="text-transform:uppercase;">
          </div>
          <div class="col-md-3 form-group">
            <label>Category</label>
            <select class="form-control" name="company_category">
              <option value="">Select...</option>
              ${COMPANY_CATEGORIES.map(c => `<option value="${c}" ${profile.company_category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="row">
          <div class="col-md-4 form-group">
            <label>Group Code</label>
            <input type="text" class="form-control" name="group_code" value="${escapeHtml(profile.group_code || '')}" placeholder="e.g. FACT00001">
          </div>
          <div class="col-md-4 form-group">
            <label>Franchise Code</label>
            <input type="text" class="form-control" name="franchise_code" value="${escapeHtml(profile.franchise_code || '')}" placeholder="Optional">
          </div>
          <div class="col-md-4 form-group d-flex align-items-end">
            <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-save"></i> Save Profile</button>
          </div>
        </div>
      </form>`;
  } catch (err) {
    container.innerHTML = '<p class="text-danger">Failed to load company profile.</p>';
  }
}

async function saveCompanyProfile(e) {
  e.preventDefault();
  if (!_selectedComplianceClientId) return;
  const form = e.target;
  const data = {
    company_name: form.company_name.value.trim(),
    pan_number: form.pan_number.value.trim().toUpperCase(),
    company_category: form.company_category.value,
    group_code: form.group_code.value.trim(),
    franchise_code: form.franchise_code.value.trim()
  };
  try {
    await api.updateCompanyProfile(_selectedComplianceClientId, data);
    showToast('Company profile saved!', 'success');
  } catch (err) {
    showToast('Failed to save profile: ' + (err.message || ''), 'error');
  }
}

// ─── Compliance Config (Toggle Services) ──────────────────────

async function loadClientComplianceConfig(clientId) {
  const container = document.getElementById('compliance-config-container');
  if (!container) return;
  container.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Loading...';

  try {
    const res = await api.getComplianceConfig(clientId);
    const configs = res.configs || res.data || [];
    const configMap = {};
    configs.forEach(c => { configMap[c.service_type] = c; });

    let html = '<div class="compliance-config-grid">';
    COMPLIANCE_SERVICE_TYPES.forEach(st => {
      const cfg = configMap[st.key] || {};
      const isApplicable = cfg.is_applicable === true;
      const isRegistered = cfg.is_registered === true;
      html += `
        <div class="compliance-config-card ${isApplicable ? 'active' : ''}" id="cfg-card-${st.key}">
          <h5><i class="fas ${st.icon}" style="color:${st.color}"></i> ${st.label}</h5>
          <div class="custom-control custom-switch">
            <input type="checkbox" class="custom-control-input" id="cfg-applicable-${st.key}" ${isApplicable ? 'checked' : ''}
              onchange="toggleComplianceService('${st.key}', this.checked)">
            <label class="custom-control-label" for="cfg-applicable-${st.key}">Applicable</label>
          </div>
          <div class="custom-control custom-switch">
            <input type="checkbox" class="custom-control-input" id="cfg-registered-${st.key}" ${isRegistered ? 'checked' : ''}>
            <label class="custom-control-label" for="cfg-registered-${st.key}">Registered/Live</label>
          </div>
          <div class="form-group mt-2 mb-0">
            <input type="text" class="form-control form-control-sm" id="cfg-regnum-${st.key}"
              value="${escapeHtml(cfg.registration_number || '')}" placeholder="Reg. Number">
          </div>
        </div>`;
    });
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm mt-3" onclick="saveComplianceConfig()"><i class="fas fa-save"></i> Save Configuration</button>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<p class="text-danger">Failed to load compliance config.</p>';
  }
}

function toggleComplianceService(key, checked) {
  const card = document.getElementById('cfg-card-' + key);
  if (card) card.classList.toggle('active', checked);
}

async function saveComplianceConfig() {
  if (!_selectedComplianceClientId) return;
  const configs = COMPLIANCE_SERVICE_TYPES.map(st => ({
    service_type: st.key,
    is_applicable: document.getElementById('cfg-applicable-' + st.key)?.checked || false,
    is_registered: document.getElementById('cfg-registered-' + st.key)?.checked || false,
    registration_number: document.getElementById('cfg-regnum-' + st.key)?.value?.trim() || ''
  }));
  try {
    await api.updateComplianceConfig(_selectedComplianceClientId, configs);
    showToast('Compliance configuration saved!', 'success');
  } catch (err) {
    showToast('Failed to save config: ' + (err.message || ''), 'error');
  }
}

// ─── Compliance Filings ──────────────────────

async function loadClientComplianceFilings(clientId, year, serviceType) {
  const container = document.getElementById('compliance-filings-container');
  if (!container) return;
  container.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Loading filings...';

  try {
    const fy = year || document.getElementById('admin-compliance-year')?.value || '';
    const st = serviceType || document.getElementById('admin-compliance-type-filter')?.value || '';
    const res = await api.getComplianceFilings(clientId, fy, st);
    const filings = res.filings || res.data || [];

    if (filings.length === 0) {
      container.innerHTML = `
        <p class="text-muted">No filing records found. 
          <a href="#" onclick="openAddFilingModal(); return false;">Add first filing →</a>
        </p>`;
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-sm table-hover compliance-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Period</th>
              <th>FY</th>
              <th>Due Date</th>
              <th>Filing</th>
              <th>Payment</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>`;

    filings.forEach(f => {
      const dueDate = f.due_date ? new Date(f.due_date) : null;
      const isOverdue = dueDate && dueDate < new Date() && f.filing_status === 'pending';
      const dueDateStr = dueDate ? dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

      let filingBadge = '';
      switch (f.filing_status) {
        case 'completed': filingBadge = '<span class="badge badge-success">Filed</span>'; break;
        case 'nil_filed': filingBadge = '<span class="badge badge-info">Nil Filed</span>'; break;
        default: filingBadge = isOverdue ? '<span class="badge badge-danger">Overdue</span>' : '<span class="badge badge-warning">Pending</span>';
      }

      const payBadge = f.payment_status === 'completed'
        ? '<span class="badge badge-success">Paid</span>'
        : '<span class="badge badge-warning">Pending</span>';

      html += `
        <tr class="${isOverdue ? 'table-danger' : ''}">
          <td>${escapeHtml(f.service_type || '')}</td>
          <td>${escapeHtml(f.period || '')}</td>
          <td>${escapeHtml(f.financial_year || '')}</td>
          <td class="${isOverdue ? 'text-danger font-weight-bold' : ''}">${dueDateStr}</td>
          <td>${filingBadge}</td>
          <td>${payBadge}</td>
          <td class="small">${escapeHtml(f.notes || '')}</td>
          <td>
            <button class="btn btn-xs btn-outline-primary" onclick="openEditFilingModal('${f.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-xs btn-outline-danger" onclick="deleteFiling('${f.id}')"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<p class="text-danger">Failed to load filings: ' + escapeHtml(err.message || '') + '</p>';
  }
}

function openAddFilingModal() {
  if (!_selectedComplianceClientId) return;
  const modal = document.getElementById('add-filing-modal');
  if (!modal) return;

  // Reset form
  const form = document.getElementById('add-filing-form');
  if (form) form.reset();

  // Populate service type dropdown
  const typeSelect = document.getElementById('filing-service-type');
  if (typeSelect) {
    typeSelect.innerHTML = COMPLIANCE_SERVICE_TYPES.map(st =>
      `<option value="${st.key}">${st.label}</option>`
    ).join('');
  }

  // Set default year
  const now = new Date();
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const yearInput = document.getElementById('filing-financial-year');
  if (yearInput) yearInput.value = `${fy}-${String(fy + 1).slice(2)}`;

  $('#add-filing-modal').modal('show');
}

async function submitAddFiling(e) {
  e.preventDefault();
  if (!_selectedComplianceClientId) return;

  const data = {
    service_type: document.getElementById('filing-service-type').value,
    financial_year: document.getElementById('filing-financial-year').value.trim(),
    period: document.getElementById('filing-period').value.trim(),
    due_date: document.getElementById('filing-due-date').value || null,
    filing_status: document.getElementById('filing-status').value,
    filing_date: document.getElementById('filing-date').value || null,
    payment_status: document.getElementById('filing-payment-status').value,
    payment_date: document.getElementById('filing-payment-date').value || null,
    notes: document.getElementById('filing-notes').value.trim()
  };

  // Convert date strings to timestamps
  if (data.due_date) data.due_date = new Date(data.due_date).getTime();
  if (data.filing_date) data.filing_date = new Date(data.filing_date).getTime();
  if (data.payment_date) data.payment_date = new Date(data.payment_date).getTime();

  try {
    await api.addComplianceFiling(_selectedComplianceClientId, data);
    $('#add-filing-modal').modal('hide');
    showToast('Filing record added!', 'success');
    loadClientComplianceFilings(_selectedComplianceClientId);
  } catch (err) {
    showToast('Failed to add filing: ' + (err.message || ''), 'error');
  }
}

async function deleteFiling(filingId) {
  if (!confirm('Delete this filing record?')) return;
  try {
    await api.deleteComplianceFiling(filingId);
    showToast('Filing deleted.', 'success');
    if (_selectedComplianceClientId) loadClientComplianceFilings(_selectedComplianceClientId);
  } catch (err) {
    showToast('Failed to delete: ' + (err.message || ''), 'error');
  }
}

// Simple toast notification
function showToast(message, type) {
  let toast = document.getElementById('compliance-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'compliance-toast';
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;padding:12px 20px;border-radius:8px;color:#fff;font-size:0.9rem;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;';
    document.body.appendChild(toast);
  }
  toast.style.background = type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db';
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.display = 'block';
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => { toast.style.display = 'none'; }, 300); }, 3000);
}

// ─── Flip the Portal: Admin views client portal ──────────────────────

let _flipPortalSearchTimeout = null;
function onFlipPortalSearch(e) {
  const q = (e.target.value || '').trim().toLowerCase();
  clearTimeout(_flipPortalSearchTimeout);
  _flipPortalSearchTimeout = setTimeout(async () => {
    const listEl = document.getElementById('flip-portal-results');
    if (!q || q.length < 2) { listEl.innerHTML = '<p class="text-muted small">Type at least 2 characters...</p>'; return; }
    listEl.innerHTML = '<div class="spinner-border spinner-border-sm"></div> Searching...';
    try {
      const res = await api.getAllClients();
      const clients = (res.clients || res.data || [])
        .filter(c => c.role === 'client' && (
          (c.email || '').toLowerCase().includes(q) ||
          (c.name || '').toLowerCase().includes(q)
        )).slice(0, 15);
      if (!clients.length) { listEl.innerHTML = '<p class="text-muted">No clients found.</p>'; return; }
      listEl.innerHTML = clients.map(c => `
        <a href="#" class="list-group-item list-group-item-action" onclick="openFlipPortal('${c.id}', '${escapeHtml(c.name || c.email)}'); return false;">
          <strong>${escapeHtml(c.name || c.email)}</strong>
          <small class="text-muted d-block">${escapeHtml(c.email)}</small>
        </a>`).join('');
    } catch (err) { listEl.innerHTML = '<p class="text-danger">Search failed.</p>'; }
  }, 300);
}

async function openFlipPortal(clientId, clientName) {
  document.getElementById('flip-portal-preview').style.display = 'block';
  document.getElementById('flip-portal-client-name').textContent = clientName;
  const contentEl = document.getElementById('flip-portal-content');
  contentEl.innerHTML = '<div class="text-center py-5"><div class="spinner-border"></div><p class="text-muted mt-2">Loading client portal view...</p></div>';

  try {
    // Fetch compliance data using admin endpoints (not client endpoint)
    const [profileRes, configRes, filingsRes] = await Promise.all([
      api.getCompanyProfile(clientId),
      api.getComplianceConfig(clientId),
      api.getComplianceFilings(clientId)
    ]);

    const profile = profileRes.profile || profileRes.data || {};
    const configs = (configRes.configs || configRes.data || []).filter(c => c.is_applicable);
    const filings = filingsRes.filings || filingsRes.data || [];

    const SERVICE_TYPE_LABELS = {
      GST: { name: 'GST (Goods & Services Tax)', icon: 'fa-receipt', color: '#e74c3c' },
      INCOME_TAX: { name: 'Income Tax', icon: 'fa-file-invoice-dollar', color: '#3498db' },
      MCA: { name: 'MCA (Ministry of Corporate Affairs)', icon: 'fa-landmark', color: '#9b59b6' },
      PT: { name: 'Professional Tax', icon: 'fa-user-tie', color: '#e67e22' },
      PF: { name: 'Provident Fund', icon: 'fa-piggy-bank', color: '#27ae60' },
      ESI: { name: 'ESI (Employee State Insurance)', icon: 'fa-hospital', color: '#1abc9c' }
    };

    let html = '';
    // Company header
    html += `<div style="background:linear-gradient(135deg,#f0fdf9,#ecfdf5);border-left:4px solid #0a8574;border-radius:8px;padding:16px;margin-bottom:16px;">`;
    html += `<h4 style="margin-bottom:4px;color:#076b5d;">${escapeHtml(profile.company_name || clientName)}</h4>`;
    html += `<p class="text-muted mb-0"><i class="fas fa-id-card"></i> PAN: <strong>${escapeHtml(profile.pan_number || '—')}</strong>`;
    html += ` &nbsp; <i class="fas fa-building"></i> ${escapeHtml(profile.company_category || '—')}`;
    html += ` &nbsp; <i class="fas fa-folder"></i> ${escapeHtml(profile.group_code || '—')}</p></div>`;

    if (configs.length === 0) {
      html += '<div class="text-center py-4"><i class="fas fa-clipboard-check fa-2x text-muted mb-2"></i><p class="text-muted">No compliance services configured for this client.</p></div>';
    } else {
      configs.forEach(cfg => {
        const info = SERVICE_TYPE_LABELS[cfg.service_type] || { name: cfg.service_type, icon: 'fa-clipboard', color: '#7f8c8d' };
        const typeFilings = filings.filter(f => f.service_type === cfg.service_type);
        html += `<div style="border-left:4px solid ${info.color};border-radius:8px;padding:12px 16px;margin-bottom:12px;background:#fff;">`;
        html += `<h5><i class="fas ${info.icon}" style="color:${info.color}"></i> ${escapeHtml(info.name)} `;
        html += cfg.is_registered ? '<span class="badge badge-success">Registered</span>' : '<span class="badge badge-secondary">Not Registered</span>';
        html += `</h5>`;
        if (typeFilings.length) {
          html += '<table class="table table-sm table-hover mb-0"><thead><tr><th>Period</th><th>Due Date</th><th>Filing</th><th>Payment</th></tr></thead><tbody>';
          typeFilings.forEach(f => {
            const dd = f.due_date ? new Date(f.due_date) : null;
            const overdue = dd && dd < new Date() && f.filing_status === 'pending';
            const ddStr = dd ? dd.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
            const fBadge = f.filing_status === 'completed' ? '<span class="badge badge-success">Filed</span>' : f.filing_status === 'nil_filed' ? '<span class="badge badge-info">Nil</span>' : overdue ? '<span class="badge badge-danger">Overdue</span>' : '<span class="badge badge-warning">Pending</span>';
            const pBadge = f.payment_status === 'completed' ? '<span class="badge badge-success">Paid</span>' : '<span class="badge badge-warning">Pending</span>';
            html += `<tr class="${overdue ? 'table-danger' : ''}"><td>${escapeHtml(f.period||'')}</td><td class="${overdue?'text-danger font-weight-bold':''}">${ddStr}</td><td>${fBadge}</td><td>${pBadge}</td></tr>`;
          });
          html += '</tbody></table>';
        } else {
          html += '<p class="text-muted small mb-0">No filing records.</p>';
        }
        html += '</div>';
      });
    }
    contentEl.innerHTML = html;
  } catch (err) {
    contentEl.innerHTML = '<div class="text-center py-4"><i class="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i><p class="text-danger">Failed to load: ' + escapeHtml(err.message || '') + '</p></div>';
  }
}

function closeFlipPortal() {
  document.getElementById('flip-portal-preview').style.display = 'none';
  document.getElementById('flip-portal-content').innerHTML = '';
}
