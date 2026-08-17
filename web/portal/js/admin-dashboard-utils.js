/**
 * Admin Dashboard Utilities
 * Extracted common functions to reduce code duplication
 */

/**
 * Show/hide loading and table container states
 */
function setTableLoadingState(loadingDiv, tableContainer, isLoading = true) {
  if (loadingDiv) loadingDiv.style.display = isLoading ? 'block' : 'none';
  if (tableContainer) tableContainer.style.display = isLoading ? 'none' : 'block';
}

/**
 * Render empty table message
 */
function renderEmptyTableRow(tbody, colSpan, message = 'No data found') {
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center">${escapeHtml(message)}</td></tr>`;
}

/**
 * Create a safe HTML cell with proper escaping
 */
function createCell(content, allowHtml = false) {
  const cell = document.createElement('td');
  if (allowHtml) {
    cell.innerHTML = content;
  } else {
    cell.textContent = content || '—';
  }
  return cell;
}

/**
 * Create a row with cells safely
 */
function createRow(cellsContent) {
  const tr = document.createElement('tr');
  cellsContent.forEach(content => {
    const td = createCell(content);
    tr.appendChild(td);
  });
  return tr;
}

/**
 * Show toast-like feedback message (better than alert)
 */
function showFeedback(message, type = 'info', duration = 3000) {
  // Try to use Bootstrap alert if available
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.zIndex = '9999';
  alertDiv.style.minWidth = '300px';
  alertDiv.innerHTML = `
    ${escapeHtml(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);

  if (duration > 0) {
    setTimeout(() => {
      alertDiv.remove();
    }, duration);
  }

  return alertDiv;
}

/**
 * Generic table row filter function
 */
function filterTableRows(tbodyId, query, colIndexes = [0]) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  const lowerQuery = (query || '').toLowerCase();

  let visibleCount = 0;
  rows.forEach(function (tr) {
    // Skip colspan rows (empty states)
    if (tr.querySelector('td[colspan]')) {
      tr.style.display = lowerQuery ? 'none' : '';
      return;
    }

    const cells = tr.querySelectorAll('td');
    const isMatch = !lowerQuery || colIndexes.some(i => {
      const cell = cells[i];
      return cell && (cell.textContent || '').toLowerCase().indexOf(lowerQuery) !== -1;
    });

    tr.style.display = isMatch ? '' : 'none';
    if (isMatch) visibleCount++;
  });

  return visibleCount;
}

/**
 * Safe export to CSV
 */
function exportToCSV(filename, headers, rows) {
  const escapeCsvCell = (value) => {
    const str = String(value == null ? '' : value);
    if (/[",\n\r]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
  const csv = headerLine + '\n' + bodyLines;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Safe HTML escaping
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format date safely
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch (e) {
    return 'N/A';
  }
}

/**
 * Handle API request with error feedback
 */
async function handleApiRequest(apiCall, successMessage = 'Operation successful', errorPrefix = 'Error') {
  try {
    const result = await apiCall();
    if (successMessage) {
      showFeedback(successMessage, 'success');
    }
    return result;
  } catch (error) {
    const errorMsg = error.message || 'Unknown error occurred';
    showFeedback(`${errorPrefix}: ${errorMsg}`, 'danger');
    throw error;
  }
}

/**
 * Toggle button loading state
 */
function setButtonLoading(button, isLoading = true, originalText = null) {
  if (!button) return;
  if (isLoading) {
    button._originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  } else {
    button.disabled = false;
    button.innerHTML = originalText || button._originalText || 'Submit';
  }
}
