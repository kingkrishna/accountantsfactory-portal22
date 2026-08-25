// Admin → Referrals section. Self-contained: no module-scope state, no
// dependencies on other admin-* files beyond global api / clientAuth / utils.

async function loadReferrals() {
  const loadingDiv = document.getElementById('referrals-loading');
  const tableContainer = document.getElementById('referrals-table-container');
  const tbody = document.getElementById('referrals-tbody');

  loadingDiv.style.display = 'block';
  tableContainer.style.display = 'none';

  if (clientAuth.getUser() && clientAuth.getUser().demo) {
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No referrals (demo account)</td></tr>';
    return;
  }

  try {
    const response = await api.getAllReferrals();
    loadingDiv.style.display = 'none';
    tableContainer.style.display = 'block';

    tbody.innerHTML = '';

    if (!response.referrals || response.referrals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No referrals found</td></tr>';
      return;
    }

    response.referrals.forEach(referral => {
      const row = document.createElement('tr');
      let statusClass = 'status-pending';
      if (referral.status === 'approved') statusClass = 'status-completed';
      if (referral.status === 'rejected') statusClass = 'status-pending';
      const rid = escapeHtml(referral.id);
      const safeStatus = escapeHtml(referral.status || '');
      const safeBonus = escapeHtml(String(referral.bonus_amount ?? '0.00'));
      const fullStatus = referral.status || '';
      const displayStatus = fullStatus.length > 30 ? fullStatus.substring(0, 30) + '…' : fullStatus;
      const fullReferred = referral.referred_name || referral.referred_email || 'N/A';
      const displayReferred = fullReferred.length > 25 ? fullReferred.substring(0, 25) + '…' : fullReferred;
      row.innerHTML = `
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(referral.referrer_email || '')}">${escapeHtml(referral.referrer_email || 'N/A')}</td>
        <td style="max-width:130px;" title="${escapeHtml(fullReferred)}">${escapeHtml(displayReferred)}</td>
        <td>${escapeHtml(referral.service_name || 'N/A')}</td>
        <td><span class="status-badge ${statusClass}" style="max-width:180px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(fullStatus)}">${escapeHtml(displayStatus)}</span></td>
        <td>₹${safeBonus}</td>
        <td style="white-space:nowrap;">${formatDate(referral.created_at)}</td>
        <td>
          <button type="button" class="btn btn-sm btn-primary approve-referral-btn" data-referral-id="${rid}">
            <i class="fas fa-check"></i> Review
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    console.error('Failed to load referrals:', error);
    alert('Failed to load referrals. Please try again.');
  }
}

function openApproveReferralModal(referralId) {
  document.getElementById('referral-id-input').value = referralId;
  $('#approve-referral-modal').modal('show');
}

async function processReferral() {
  const referralId = document.getElementById('referral-id-input').value;
  const decision = document.getElementById('referral-decision').value;
  const reason = document.getElementById('referral-reason').value;
  const bonusAmount = document.getElementById('referral-bonus').value;

  if (!referralId || !decision) {
    alert('Please select a decision');
    return;
  }

  try {
    await api.approveReferral(referralId, decision === 'approved', reason, bonusAmount);
    alert(`Referral ${decision === 'approved' ? 'approved' : 'rejected'} successfully!`);
    $('#approve-referral-modal').modal('hide');
    document.getElementById('approve-referral-form').reset();
    loadReferrals();
  } catch (error) {
    console.error('Process referral failed:', error);
    const msg = (error && error.message) ? error.message : 'Please try again.';
    alert('Failed to process referral: ' + msg);
  }
}
