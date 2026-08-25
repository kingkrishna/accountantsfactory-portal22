// Admin → Documents section + the View/Upload modals.
// Called from Service Orders rows too (View Docs button reuses openViewDocumentsModal).

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

    listEl.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        if (!confirm('Delete this document link?')) return;
        try {
          await api.deleteDocumentLink(this.getAttribute('data-doc-id'));
          alert('Document link deleted.');
          openViewDocumentsModal(orderId); // refresh
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

function openUploadDocumentModal(orderId) {
  // Build a hidden file picker on the fly; no DOM markup needed.
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
      if (typeof loadOrders === 'function') loadOrders();
      if (typeof loadDocumentsSection === 'function') loadDocumentsSection();
    } catch (error) {
      console.error('Upload document failed:', error);
      alert('Failed to upload document. Please try again.');
    }
  };

  input.click();
}
