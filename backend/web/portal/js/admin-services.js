// Admin → Manage Services section (the service catalog).
// Calls loadServicesForClientCreation (lives in admin-clients.js) after any
// catalog change so the create-client form's dropdown reflects new state.

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
    if (typeof loadServicesForClientCreation === 'function') loadServicesForClientCreation();
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
    if (typeof loadServicesForClientCreation === 'function') loadServicesForClientCreation();
  } catch (e) {
    console.error('Toggle service failed:', e);
    alert('Failed to toggle service: ' + (e.message || 'Please try again.'));
  }
}

// Seed all 17 default services in one click.
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
    if (typeof loadServicesForClientCreation === 'function') loadServicesForClientCreation();
  } catch (err) {
    console.error('Load services failed:', err);
    alert('Failed to load services: ' + (err.message || 'Please try again.'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Delegated click handler for the dynamic "Deactivate/Activate" buttons in the
// service catalog table. (Was a top-level document listener in the original
// admin-dashboard.js; preserved here in the section file.)
document.addEventListener('click', function (e) {
  const toggleSvcBtn = e.target.closest('.toggle-svc-btn');
  if (toggleSvcBtn) {
    e.preventDefault();
    toggleServiceCatalog(toggleSvcBtn.getAttribute('data-id'));
  }
});
