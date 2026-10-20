const authToken = localStorage.getItem('sai_portal_token');
const currentUser = JSON.parse(localStorage.getItem('sai_portal_user'));

if (!authToken || !currentUser) {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const dashUserDisplay = document.getElementById('dashUserDisplay');
  if (dashUserDisplay && currentUser) {
    dashUserDisplay.textContent = `${currentUser.name} (${currentUser.role})`;
  }
  
  const dashLogout = document.getElementById('dashLogout');
  if (dashLogout) {
    dashLogout.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'index.html';
    });
  }

  if (currentUser && currentUser.role === 'admin') {
    const adminSection = document.getElementById('adminAnalyticsSection');
    if (adminSection) adminSection.classList.remove('hidden');
    loadAdminStats();
  }

  loadMyReportedItems();
  loadMyClaims();

  const btnCloseReview = document.getElementById('btnCloseReview');
  if (btnCloseReview) {
    btnCloseReview.addEventListener('click', () => {
      document.getElementById('reviewClaimsModal').classList.add('hidden');
    });
  }
});

async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      const { stats, categoryStats, buildingStats } = data;
      document.getElementById('statTotalItems').textContent = stats.totalItems;
      document.getElementById('statLostItems').textContent = stats.lostItems;
      document.getElementById('statFoundItems').textContent = stats.foundItems;
      document.getElementById('statRecoveryRate').textContent = `${stats.recoveryRate}%`;

      // Render Charts with Chart.js
      renderBuildingChart(buildingStats);
      renderCategoryChart(categoryStats);
    }
  } catch (err) {
    console.error('Error fetching admin stats:', err);
  }
}

function renderBuildingChart(buildingStats) {
  const canvas = document.getElementById('buildingChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: buildingStats.map(b => b._id.replace('Academic Block ', 'Block ').replace('Student Dining & ', '')),
      datasets: [{
        label: 'Items Reported',
        data: buildingStats.map(b => b.count),
        backgroundColor: '#3b82f6'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

function renderCategoryChart(categoryStats) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categoryStats.map(c => c._id),
      datasets: [{
        data: categoryStats.map(c => c.count),
        backgroundColor: ['#1e3a8a', '#3b82f6', '#d97706', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'right' } }
    }
  });
}

async function loadMyReportedItems() {
  const tbody = document.getElementById('myItemsBody');
  if (!tbody) return;
  try {
    const endpoint = currentUser.role === 'admin' ? '/api/admin/all-items' : '/api/items?status=all';
    const res = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    
    // Filter personal listings if standard student
    const items = currentUser.role === 'admin' 
      ? data.data 
      : data.data.filter(item => item.reportedBy && (item.reportedBy._id === currentUser.id || item.reportedBy === currentUser.id));

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">You have not reported any items yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td><strong>${item.title}</strong><br><small>${item.category}</small></td>
        <td><span class="badge-tag tag-${item.type}">${item.type}</span></td>
        <td>${item.building}</td>
        <td>${new Date(item.dateOccurred).toLocaleDateString()}</td>
        <td><span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="reviewClaims('${item._id}')">
            View Claims
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Failed to load reports.</td></tr>`;
  }
}

async function loadMyClaims() {
  const tbody = document.getElementById('myClaimsBody');
  if (!tbody) return;
  try {
    const res = await fetch('/api/claims/my-claims', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">You have not submitted any claims yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.data.map(claim => `
      <tr>
        <td><strong>${claim.item ? claim.item.title : 'Item Removed'}</strong></td>
        <td>${claim.proofDescription}</td>
        <td>${new Date(claim.createdAt).toLocaleDateString()}</td>
        <td><span class="status-badge status-${claim.status}">${claim.status.toUpperCase()}</span></td>
        <td>${claim.reviewNotes || 'Under verification by reporter/security'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">Failed to load claims.</td></tr>`;
  }
}

window.reviewClaims = async function(itemId) {
  const modal = document.getElementById('reviewClaimsModal');
  const container = document.getElementById('claimsReviewContent');
  modal.classList.remove('hidden');
  container.innerHTML = 'Loading submitted claims...';

  try {
    const res = await fetch(`/api/claims/item/${itemId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      container.innerHTML = '<p>No claims have been submitted for this item yet.</p>';
      return;
    }

    container.innerHTML = data.data.map(claim => `
      <div style="border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; margin-bottom: 0.8rem; background: #fafafa;">
        <p><strong>Claimant Name:</strong> ${claim.claimant ? claim.claimant.name : 'Unknown'} (${claim.claimant ? claim.claimant.email : 'N/A'})</p>
        <p><strong>Contact Phone:</strong> ${claim.contactPhone}</p>
        <p><strong>Ownership Proof Description:</strong> ${claim.proofDescription}</p>
        <p><strong>Current Claim Status:</strong> <span class="status-badge status-${claim.status}">${claim.status.toUpperCase()}</span></p>
        ${claim.status === 'pending' ? `
          <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
            <button class="btn btn-success btn-sm" onclick="decideClaim('${claim._id}', 'approved')">Approve & Handover</button>
            <button class="btn btn-danger btn-sm" onclick="decideClaim('${claim._id}', 'rejected')">Reject Claim</button>
          </div>
        ` : `<p><small>Decision finalized: ${claim.reviewNotes}</small></p>`}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p>Error retrieving claims.</p>';
  }
};

window.decideClaim = async function(claimId, status) {
  const reviewNotes = prompt(`Enter note for claimant (${status}):`, status === 'approved' ? 'Ownership verified and handed over' : 'Insufficient verification evidence');
  try {
    const res = await fetch(`/api/claims/${claimId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status, reviewNotes })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Claim marked as ${status}!`);
      document.getElementById('reviewClaimsModal').classList.add('hidden');
      loadMyReportedItems();
    }
  } catch (err) {
    alert('Error updating claim status');
  }
};
