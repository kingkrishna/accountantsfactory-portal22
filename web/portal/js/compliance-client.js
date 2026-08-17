// ========== CLIENT COMPLIANCE TRACKER ==========
// Phase 2: Compliance tracking dashboard for clients
// Shows company info, applicable service types, filing statuses, and year filtering

const SERVICE_TYPE_LABELS = {
  GST: { name: 'GST (Goods & Services Tax)', icon: 'fa-receipt', color: '#e74c3c' },
  INCOME_TAX: { name: 'Income Tax', icon: 'fa-file-invoice-dollar', color: '#3498db' },
  MCA: { name: 'MCA (Ministry of Corporate Affairs)', icon: 'fa-landmark', color: '#9b59b6' },
  PT: { name: 'Professional Tax', icon: 'fa-user-tie', color: '#e67e22' },
  PF: { name: 'Provident Fund', icon: 'fa-piggy-bank', color: '#27ae60' },
  ESI: { name: 'ESI (Employee State Insurance)', icon: 'fa-hospital', color: '#1abc9c' }
};

let _complianceData = null;

// Generate financial year options (current FY ± 3 years)
function getFinancialYears() {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();
  // FY starts in April: if month >= 3 (April), FY is currentYear-currentYear+1
  const currentFY = currentMonth >= 3 ? currentYear : currentYear - 1;
  const years = [];
  for (let y = currentFY + 1; y >= currentFY - 3; y--) {
    years.push(`${y}-${String(y + 1).slice(2)}`);
  }
  return years;
}

function getCurrentFinancialYear() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const fy = currentMonth >= 3 ? currentYear : currentYear - 1;
  return `${fy}-${String(fy + 1).slice(2)}`;
}

function initComplianceYearSelector() {
  const select = document.getElementById('compliance-year-select');
  if (!select) return;
  select.innerHTML = '';
  const years = getFinancialYears();
  const currentFY = getCurrentFinancialYear();
  years.forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = 'FY ' + yr;
    if (yr === currentFY) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => loadComplianceData(select.value));
}

async function loadComplianceData(year) {
  const loadingEl = document.getElementById('compliance-loading');
  const emptyEl = document.getElementById('compliance-empty');
  const gridEl = document.getElementById('compliance-grid');
  const companyCard = document.getElementById('company-info-card');

  if (loadingEl) loadingEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  if (gridEl) { gridEl.style.display = 'none'; gridEl.innerHTML = ''; }

  try {
    const fy = year || document.getElementById('compliance-year-select')?.value || getCurrentFinancialYear();
    const res = await api.getClientCompliance(fy);
    if (loadingEl) loadingEl.style.display = 'none';

    _complianceData = res;

    // Populate company info
    const profile = res.companyProfile || {};
    setText('compliance-company-name', profile.company_name || (res.user?.name || res.user?.email || '—'));
    setText('compliance-pan', profile.pan_number || '—');
    setText('compliance-category', profile.company_category || '—');
    setText('compliance-group-code', profile.group_code || '—');

    // Filter only applicable configs
    const configs = (res.complianceConfigs || []).filter(c => c.is_applicable);
    const filings = res.filings || [];

    if (configs.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (gridEl) gridEl.style.display = 'block';
    renderComplianceGrid(configs, filings);

    // Show KYC / Drive section
    const driveSection = document.getElementById('compliance-drive-section');
    if (driveSection) {
      const driveLinks = document.getElementById('compliance-drive-links');
      const driveUrl = profile.drive_link || profile.zoho_drive_link || '';
      let driveHtml = '';
      if (driveUrl) {
        driveHtml += `<a href="${escapeHtml(driveUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm mr-2">
          <i class="fas fa-cloud"></i> Open Cloud Drive Folder
        </a>`;
      }
      driveHtml += '<div class="mt-2" id="compliance-kyc-docs"><small class="text-muted">Loading KYC documents...</small></div>';
      driveLinks.innerHTML = driveHtml;
      driveSection.style.display = 'block';

      // Load KYC documents from existing documents API
      try {
        const docsRes = await api.getDocuments();
        const docs = docsRes.documents || docsRes.data || [];
        const kycEl = document.getElementById('compliance-kyc-docs');
        if (docs.length > 0) {
          kycEl.innerHTML = '<h6 class="mb-2"><i class="fas fa-id-card"></i> KYC Documents</h6>' +
            docs.slice(0, 10).map(d => `
              <div class="d-flex align-items-center mb-1" style="gap:8px;">
                <i class="fas fa-file text-muted"></i>
                <a href="${escapeHtml(d.download_url || '#')}" target="_blank" class="small">${escapeHtml(d.file_name || 'Document')}</a>
              </div>`).join('');
        } else {
          kycEl.innerHTML = '<small class="text-muted"><i class="fas fa-info-circle"></i> No KYC documents uploaded yet.</small>';
        }
      } catch (e) {
        const kycEl = document.getElementById('compliance-kyc-docs');
        if (kycEl) kycEl.innerHTML = '<small class="text-muted">Could not load KYC documents.</small>';
      }
    }

  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    console.error('Failed to load compliance data:', err);
    if (emptyEl) {
      emptyEl.innerHTML = '<i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i><h4>Failed to Load</h4><p class="text-muted">' + escapeHtml(err.message || 'Please try again later.') + '</p>';
      emptyEl.style.display = 'block';
    }
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderComplianceGrid(configs, filings) {
  const gridEl = document.getElementById('compliance-grid');
  if (!gridEl) return;
  gridEl.innerHTML = '';

  configs.forEach(config => {
    const typeInfo = SERVICE_TYPE_LABELS[config.service_type] || {
      name: config.service_type,
      icon: 'fa-clipboard',
      color: '#7f8c8d'
    };

    const typeFilings = filings.filter(f => f.service_type === config.service_type);

    const card = document.createElement('div');
    card.className = 'dashboard-card glass-effect mb-3 compliance-service-card';
    card.style.borderLeft = `4px solid ${typeInfo.color}`;

    let headerHtml = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 style="margin-bottom:2px;">
            <i class="fas ${typeInfo.icon}" style="color:${typeInfo.color}"></i>
            ${escapeHtml(typeInfo.name)}
          </h4>
          <small class="text-muted">
            ${config.is_registered
              ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Registered</span>'
              : '<span class="badge badge-secondary"><i class="fas fa-times-circle"></i> Not Registered</span>'}
            ${config.registration_number
              ? ' &nbsp; Reg #: <strong>' + escapeHtml(config.registration_number) + '</strong>'
              : ''}
          </small>
        </div>
        <div>
          ${getComplianceSummaryBadge(typeFilings)}
        </div>
      </div>`;

    let tableHtml = '';
    if (typeFilings.length > 0) {
      tableHtml = `
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0 compliance-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Due Date</th>
                <th>Filing Status</th>
                <th>Filing Date</th>
                <th>Payment</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${typeFilings.map(f => renderFilingRow(f)).join('')}
            </tbody>
          </table>
        </div>`;
    } else {
      tableHtml = '<p class="text-muted small mb-0"><i class="fas fa-info-circle"></i> No filing records for this period.</p>';
    }

    card.innerHTML = headerHtml + tableHtml;
    gridEl.appendChild(card);
  });
}

function renderFilingRow(filing) {
  const now = new Date();
  const dueDate = filing.due_date ? new Date(filing.due_date) : null;
  const isOverdue = dueDate && dueDate < now && filing.filing_status === 'pending';

  const dueDateStr = dueDate
    ? dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const filingDateStr = filing.filing_date
    ? new Date(filing.filing_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  // Filing status badge
  let filingBadge = '';
  switch (filing.filing_status) {
    case 'completed':
      filingBadge = '<span class="badge badge-success"><i class="fas fa-check"></i> Filed</span>';
      break;
    case 'nil_filed':
      filingBadge = '<span class="badge badge-info"><i class="fas fa-minus-circle"></i> Nil Filed</span>';
      break;
    default:
      filingBadge = isOverdue
        ? '<span class="badge badge-danger"><i class="fas fa-exclamation-triangle"></i> Overdue</span>'
        : '<span class="badge badge-warning"><i class="fas fa-clock"></i> Pending</span>';
  }

  // Payment status
  let paymentBadge = '';
  switch (filing.payment_status) {
    case 'completed':
      paymentBadge = '<span class="badge badge-success"><i class="fas fa-check"></i> Paid</span>';
      break;
    default:
      paymentBadge = '<span class="badge badge-warning"><i class="fas fa-clock"></i> Pending</span>';
  }

  return `
    <tr class="${isOverdue ? 'table-danger' : ''}">
      <td><strong>${escapeHtml(filing.period || '—')}</strong></td>
      <td class="${isOverdue ? 'text-danger font-weight-bold' : ''}">${dueDateStr}</td>
      <td>${filingBadge}</td>
      <td>${filingDateStr}</td>
      <td>${paymentBadge}</td>
      <td class="small text-muted">${escapeHtml(filing.notes || '—')}</td>
    </tr>`;
}

function getComplianceSummaryBadge(filings) {
  if (filings.length === 0) return '';
  const completed = filings.filter(f => f.filing_status === 'completed' || f.filing_status === 'nil_filed').length;
  const pending = filings.filter(f => f.filing_status === 'pending').length;
  const overdue = filings.filter(f => {
    if (f.filing_status !== 'pending') return false;
    const dd = f.due_date ? new Date(f.due_date) : null;
    return dd && dd < new Date();
  }).length;

  let html = '<div class="d-flex align-items-center" style="gap:8px;">';
  if (overdue > 0) html += `<span class="badge badge-danger">${overdue} Overdue</span>`;
  if (pending > 0) html += `<span class="badge badge-warning">${pending} Pending</span>`;
  html += `<span class="badge badge-success">${completed}/${filings.length} Done</span>`;
  html += '</div>';
  return html;
}

// Initialize compliance when section is shown
function initCompliance() {
  initComplianceYearSelector();
  loadComplianceData();
}
