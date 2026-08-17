// Admin → Clients section. Carved out of admin-dashboard.js for size.
// Globals it relies on (declared in admin-dashboard.js): lastClients, downloadCsv.
// Globals it owns: CLIENTS_PER_PAGE, _clientsPage.

var CLIENTS_PER_PAGE = 15;
var _clientsPage = 1;
var _clientsLetter = 'ALL'; // 'ALL' | 'A'..'Z' | '#' (non-alpha) — alphabetical group filter

async function loadClients() {
  const loadingDiv = document.getElementById('clients-loading');
  const tableContainer = document.getElementById('clients-table-container');
  const tbody = document.getElementById('clients-tbody');

  loadingDiv.style.display = 'block';
  tableContainer.style.display = 'none';

  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No clients (demo account)</td></tr>';
    return;
  }

  try {
    const response = await api.getAllClients();
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';

    tbody.innerHTML = '';

    if (!response.clients || response.clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No clients found</td></tr>';
      lastClients = [];
      return;
    }

    lastClients = response.clients;
    _clientsPage = 1;
    // Don't reset _clientsLetter on every reload — admin may have toggled a
    // status while filtered to a letter and expects to stay there. But if
    // the current letter now has zero clients (e.g. last one in the group
    // was deleted), drop back to ALL so the table isn't silently empty.
    if (_clientsLetter !== 'ALL') {
      var L = _clientsLetter.toUpperCase();
      var hasAny = lastClients.some(function (c) {
        var f = ((c.email || '').charAt(0) || '').toUpperCase();
        if (L === '#') return !/[A-Z]/.test(f);
        return f === L;
      });
      if (!hasAny) _clientsLetter = 'ALL';
    }
    renderClientsPage();
  } catch (error) {
    loadingDiv.style.display = 'none';
    lastClients = [];
    console.error('Failed to load clients:', error);
    alert('Failed to load clients. Please try again.');
  }
}

// Filter the in-memory client list by the search box value AND the active
// alphabetical-group tab. Letter tab matches the first character of the
// client's email (lowercased). '#' matches any non-alpha first char.
function getFilteredClients() {
  var searchEl = document.getElementById('clients-search');
  var q = (searchEl ? searchEl.value : '').trim().toLowerCase();
  var letter = (_clientsLetter || 'ALL').toUpperCase();

  return lastClients.filter(function (c) {
    if (q) {
      var matchQ = (c.email || '').toLowerCase().indexOf(q) !== -1 ||
                   (c.referral_code || '').toLowerCase().indexOf(q) !== -1;
      if (!matchQ) return false;
    }
    if (letter === 'ALL') return true;
    var first = ((c.email || '').charAt(0) || '').toUpperCase();
    if (letter === '#') return !/[A-Z]/.test(first);
    return first === letter;
  });
}

// A-Z chip bar above the clients table. Injected into #clients-alpha-tabs
// container that we create lazily on first render — no HTML change needed.
function renderClientsAlphaTabs() {
  var section = document.getElementById('clients-section');
  if (!section) return;
  var card = section.querySelector('.dashboard-card');
  if (!card) return;

  var bar = document.getElementById('clients-alpha-tabs');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'clients-alpha-tabs';
    bar.className = 'clients-alpha-tabs d-flex flex-wrap mb-3';
    bar.style.gap = '4px';
    var tableC = document.getElementById('clients-table-container');
    if (tableC && tableC.parentNode) tableC.parentNode.insertBefore(bar, tableC);
    else card.appendChild(bar);
  }

  // Per-letter counts (from full lastClients — letter chips ignore the search
  // box so the admin can always see distribution across groups).
  var counts = { ALL: lastClients.length, '#': 0 };
  for (var i = 0; i < 26; i++) counts[String.fromCharCode(65 + i)] = 0;
  lastClients.forEach(function (c) {
    var f = ((c.email || '').charAt(0) || '').toUpperCase();
    if (/[A-Z]/.test(f)) counts[f]++;
    else counts['#']++;
  });

  var letters = ['ALL'];
  for (var j = 0; j < 26; j++) letters.push(String.fromCharCode(65 + j));
  letters.push('#');

  bar.innerHTML = letters.map(function (L) {
    var active = (_clientsLetter || 'ALL').toUpperCase() === L;
    var disabled = counts[L] === 0 && L !== 'ALL';
    return '<button type="button"' +
      ' class="btn btn-sm clients-alpha-chip ' + (active ? 'btn-primary' : 'btn-outline-secondary') + '"' +
      ' data-letter="' + L + '"' + (disabled ? ' disabled' : '') + '>' +
      L + ' <span class="badge badge-light ml-1">' + counts[L] + '</span>' +
      '</button>';
  }).join('');

  bar.querySelectorAll('.clients-alpha-chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      _clientsLetter = btn.getAttribute('data-letter') || 'ALL';
      _clientsPage = 1; // reset to first page on letter change
      renderClientsPage();
    });
  });
}

function renderClientsPage() {
  var tbody = document.getElementById('clients-tbody');
  if (!tbody) return;
  renderClientsAlphaTabs();
  var filtered = getFilteredClients();
  var totalPages = Math.max(1, Math.ceil(filtered.length / CLIENTS_PER_PAGE));
  if (_clientsPage > totalPages) _clientsPage = totalPages;
  if (_clientsPage < 1) _clientsPage = 1;

  var start = (_clientsPage - 1) * CLIENTS_PER_PAGE;
  var pageClients = filtered.slice(start, start + CLIENTS_PER_PAGE);

  tbody.innerHTML = '';
  if (pageClients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No clients found</td></tr>';
    renderClientsPagination(0, 1);
    return;
  }

  pageClients.forEach(function (client) {
    var row = document.createElement('tr');
    var safeId = escapeHtml(client.id);
    var safeStatus = escapeHtml(client.status);
    var statusClass = client.status === 'active' ? 'completed' : 'pending';
    var btnLabel = client.status === 'active' ? 'Deactivate' : 'Activate';
    var btnIcon = client.status === 'active' ? 'ban' : 'check';
    row.innerHTML =
      '<td>' + escapeHtml(client.email) + '</td>' +
      '<td><span class="status-badge status-' + statusClass + '">' + safeStatus + '</span></td>' +
      '<td><code>' + escapeHtml(client.referral_code || 'N/A') + '</code></td>' +
      '<td>' + formatDate(client.created_at) + '</td>' +
      '<td><button class="btn btn-sm btn-secondary toggle-status-btn" data-user-id="' + safeId + '" data-status="' + safeStatus + '">' +
        '<i class="fas fa-' + btnIcon + '"></i> ' + btnLabel + '</button></td>';
    tbody.appendChild(row);
  });

  renderClientsPagination(filtered.length, totalPages);
}

// Numbered pagination control below the clients table.
function renderClientsPagination(totalItems, totalPages) {
  var nav = document.getElementById('clients-pagination');
  if (!nav) return;
  if (totalPages <= 1) {
    nav.innerHTML = totalItems
      ? '<span class="text-muted small">Showing all ' + totalItems + ' client(s)</span>'
      : '';
    return;
  }

  var start = (_clientsPage - 1) * CLIENTS_PER_PAGE + 1;
  var end = Math.min(_clientsPage * CLIENTS_PER_PAGE, totalItems);

  // Page-number window: show first, last, current ±2, with ellipses.
  var pages = [];
  for (var p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= _clientsPage - 2 && p <= _clientsPage + 2)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  var html = '<div class="d-flex justify-content-between align-items-center flex-wrap" style="gap:8px;">';
  html += '<span class="text-muted small">Showing ' + start + '–' + end + ' of ' + totalItems + '</span>';
  html += '<ul class="pagination pagination-sm mb-0" style="flex-wrap:wrap;">';
  html += '<li class="page-item' + (_clientsPage === 1 ? ' disabled' : '') + '"><a class="page-link" href="#" data-cpage="' + (_clientsPage - 1) + '">&laquo; Prev</a></li>';
  pages.forEach(function (p) {
    if (p === '...') {
      html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
    } else {
      html += '<li class="page-item' + (p === _clientsPage ? ' active' : '') + '"><a class="page-link" href="#" data-cpage="' + p + '">' + p + '</a></li>';
    }
  });
  html += '<li class="page-item' + (_clientsPage === totalPages ? ' disabled' : '') + '"><a class="page-link" href="#" data-cpage="' + (_clientsPage + 1) + '">Next &raquo;</a></li>';
  html += '</ul></div>';
  nav.innerHTML = html;

  nav.querySelectorAll('a.page-link[data-cpage]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var target = parseInt(this.getAttribute('data-cpage'), 10);
      if (isNaN(target)) return;
      _clientsPage = target;
      renderClientsPage();
      var section = document.getElementById('clients-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

async function toggleClientStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const action = newStatus === 'active' ? 'activate' : 'deactivate';
  if (!confirm(`Are you sure you want to ${action} this client?`)) return;

  try {
    await api.updateClientStatus(userId, newStatus);
    loadClients();
    alert('Client status updated successfully.');
  } catch (e) {
    console.error('Toggle client status failed:', e);
    alert('Failed to update status. Please try again.');
  }
}

async function createClient() {
  const email = document.getElementById('client-email').value;
  const password = document.getElementById('client-password').value;
  const serviceId = document.getElementById('client-service').value;
  const period = document.getElementById('client-period').value;

  if (!email || !password) {
    alert('Email and password are required');
    return;
  }

  try {
    const clientData = {
      email,
      password,
      serviceId: serviceId || null,
      period: period || null
    };

    await api.createClient(clientData);
    alert('Client created successfully!');
    $('#create-client-modal').modal('hide');
    document.getElementById('create-client-form').reset();
    loadClients();
  } catch (error) {
    console.error('Create client failed:', error);
    alert('Failed to create client. Please try again.');
  }
}

// Service dropdown for the create-client modal. (Lives with clients because
// the only call site is the create-client form.)
async function loadServicesForClientCreation() {
  const select = document.getElementById('client-service');
  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    if (select) select.innerHTML = '<option value="">No service assigned</option>';
    return;
  }
  try {
    const response = await api.getAllServices();
    if (select) select.innerHTML = '<option value="">No service assigned</option>';

    response.services?.forEach(service => {
      if (service.is_active) {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = service.name;
        select.appendChild(option);
      }
    });
  } catch (error) {
    console.error('Failed to load services:', error);
  }
}

function exportClientsCsv() {
  if (!lastClients.length) {
    alert('No client data to export. Load Clients first.');
    return;
  }
  var headers = ['Email', 'Status', 'Referral Code', 'Created'];
  var rows = lastClients.map(function (c) {
    return [c.email || '', c.status || '', c.referral_code || '', formatDate(c.created_at) || ''];
  });
  downloadCsv('clients.csv', headers, rows);
}
