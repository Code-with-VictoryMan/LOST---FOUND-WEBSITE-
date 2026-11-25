let authToken = localStorage.getItem('sai_portal_token');
let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem('sai_portal_user'));
} catch (e) {
  currentUser = null;
}

document.addEventListener('DOMContentLoaded', () => {
  setupDashboardView();

  const quickLoginAdmin = document.getElementById('quickLoginAdmin');
  if (quickLoginAdmin) {
    quickLoginAdmin.addEventListener('click', () => performQuickLogin('admin@saiuniversity.edu.in', 'AdminPassword123'));
  }

  const quickLoginStudent = document.getElementById('quickLoginStudent');
  if (quickLoginStudent) {
    quickLoginStudent.addEventListener('click', () => performQuickLogin('saisravan@saiuniversity.edu.in', 'StudentPassword123'));
  }

  // Manual Dashboard Auth Form
  const dashDirectAuthForm = document.getElementById('dashDirectAuthForm');
  if (dashDirectAuthForm) {
    dashDirectAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('dashInputEmail')?.value.trim();
      const password = document.getElementById('dashInputPassword')?.value;
      const alertBox = document.getElementById('dashAuthAlert');
      const alertText = document.getElementById('dashAuthAlertText');
      const submitBtn = document.getElementById('btnDashSubmit');

      if (!email || !password) return;
      if (alertBox) alertBox.classList.add('hidden');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="auth-btn-spinner"></span> Authenticating...';
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
          authToken = data.token;
          currentUser = data.user;
          localStorage.setItem('sai_portal_token', data.token);
          localStorage.setItem('sai_portal_user', JSON.stringify(data.user));
          setupDashboardView();
        } else {
          if (alertBox) alertBox.classList.remove('hidden');
          if (alertText) alertText.textContent = data.message || 'Invalid credentials';
        }
      } catch (err) {
        if (alertBox) alertBox.classList.remove('hidden');
        if (alertText) alertText.textContent = 'Server connection error';
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In with Credentials';
        }
      }
    });
  }

  // Dashboard Password Toggle
  const btnToggleDashPassword = document.getElementById('btnToggleDashPassword');
  const dashInputPassword = document.getElementById('dashInputPassword');
  if (btnToggleDashPassword && dashInputPassword) {
    btnToggleDashPassword.addEventListener('click', () => {
      const isPwd = dashInputPassword.type === 'password';
      dashInputPassword.type = isPwd ? 'text' : 'password';
      btnToggleDashPassword.textContent = isPwd ? '🙈' : '👁️';
    });
  }

  const dashLogout = document.getElementById('dashLogout');
  if (dashLogout) {
    dashLogout.addEventListener('click', () => {
      localStorage.clear();
      authToken = null;
      currentUser = null;
      setupDashboardView();
    });
  }

  const btnCloseReview = document.getElementById('btnCloseReview');
  if (btnCloseReview) {
    btnCloseReview.addEventListener('click', () => {
      document.getElementById('reviewClaimsModal').classList.add('hidden');
    });
  }

  // Student Login History Audit Modal Controls
  const btnCloseStudentLoginModal = document.getElementById('btnCloseStudentLoginModal');
  if (btnCloseStudentLoginModal) {
    btnCloseStudentLoginModal.addEventListener('click', () => {
      document.getElementById('studentLoginHistoryModal')?.classList.add('hidden');
    });
  }

  const studentLoginHistoryModal = document.getElementById('studentLoginHistoryModal');
  if (studentLoginHistoryModal) {
    studentLoginHistoryModal.addEventListener('click', (e) => {
      if (e.target === studentLoginHistoryModal) {
        studentLoginHistoryModal.classList.add('hidden');
      }
    });
  }

  const btnRefreshStudentLogins = document.getElementById('btnRefreshStudentLogins');
  if (btnRefreshStudentLogins) {
    btnRefreshStudentLogins.addEventListener('click', () => {
      loadStudentLogins(true);
    });
  }

  const searchStudentLoginsInput = document.getElementById('searchStudentLoginsInput');
  if (searchStudentLoginsInput) {
    searchStudentLoginsInput.addEventListener('input', (e) => {
      filterStudentLogins(e.target.value);
    });
  }
});

async function performQuickLogin(email, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('sai_portal_token', data.token);
      localStorage.setItem('sai_portal_user', JSON.stringify(data.user));
      setupDashboardView();
    } else {
      alert(data.message || 'Login failed');
    }
  } catch (err) {
    alert('Failed to connect to authentication service');
  }
}

function setupDashboardView() {
  authToken = localStorage.getItem('sai_portal_token');
  try {
    currentUser = JSON.parse(localStorage.getItem('sai_portal_user'));
  } catch (e) {
    currentUser = null;
  }

  const dashAuthPrompt = document.getElementById('dashAuthPrompt');
  const dashboardContent = document.getElementById('dashboardContent');
  const dashUserDisplay = document.getElementById('dashUserDisplay');
  const adminSection = document.getElementById('adminAnalyticsSection');
  const adminStudentLoginsSection = document.getElementById('adminStudentLoginsSection');

  if (!authToken || !currentUser) {
    if (dashAuthPrompt) dashAuthPrompt.classList.remove('hidden');
    if (dashboardContent) dashboardContent.classList.add('hidden');
    if (dashUserDisplay) dashUserDisplay.textContent = 'Guest (Not Signed In)';
    return;
  }

  if (dashAuthPrompt) dashAuthPrompt.classList.add('hidden');
  if (dashboardContent) dashboardContent.classList.remove('hidden');
  const isAdmin = currentUser.role === 'admin';

  if (dashUserDisplay) {
    dashUserDisplay.innerHTML = `
      <span>${currentUser.name} <span class="badge-tag ${isAdmin ? 'tag-lost' : 'tag-found'}" style="margin-left:0.4rem;font-size:0.75rem;">${isAdmin ? 'ADMIN CONSOLE' : '🎓 STUDENT'}</span></span>
      <a href="login.html" class="btn btn-outline btn-sm" style="margin-left:0.6rem;padding:0.22rem 0.55rem;font-size:0.75rem;border-color:rgba(255,255,255,0.2);color:#fff;text-decoration:none;">Switch Account</a>
    `;
  }

  // Populate Profile Details
  const elProfileName = document.getElementById('profileCardName');
  const elProfileRole = document.getElementById('profileCardRole');
  const elProfileId = document.getElementById('profileStudentId');
  const elProfileDept = document.getElementById('profileDepartment');
  const elProfileEmail = document.getElementById('profileEmail');
  const elProfilePhone = document.getElementById('profilePhone');

  if (elProfileName) elProfileName.textContent = currentUser.name;
  if (elProfileEmail) elProfileEmail.textContent = currentUser.email;
  if (elProfilePhone) elProfilePhone.textContent = currentUser.phone || 'N/A';

  const elProfileLastLogin = document.getElementById('profileLastLogin');
  if (elProfileLastLogin) {
    if (currentUser.lastLogin) {
      elProfileLastLogin.textContent = new Date(currentUser.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    } else {
      elProfileLastLogin.textContent = 'Active Now';
    }
  }

  // Fetch updated persistent login stats from MongoDB
  fetch('/api/auth/login-history', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  })
    .then(r => r.json())
    .then(d => {
      if (d.success && d.lastLogin && elProfileLastLogin) {
        elProfileLastLogin.textContent = new Date(d.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
        if (d.loginCount) {
          elProfileLastLogin.title = `Total Logins Recorded in MongoDB: ${d.loginCount}`;
        }
      }
    })
    .catch(() => {});

  // Segregate Dashboard Presentation: Admin View vs Student View based on credentials
  const btnExportItemsCsv = document.getElementById('btnExportItemsCsv');
  if (isAdmin) {
    if (adminSection) adminSection.classList.remove('hidden');
    if (adminStudentLoginsSection) adminStudentLoginsSection.classList.remove('hidden');
    if (btnExportItemsCsv) btnExportItemsCsv.classList.remove('hidden');
    loadAdminStats();
    loadStudentLogins();
    if (elProfileRole) elProfileRole.innerHTML = `Campus Security Administrator &bull; Sai University Administration`;
    if (elProfileId) elProfileId.textContent = currentUser.studentId || 'SAIU-ADMIN-01';
    if (elProfileDept) elProfileDept.textContent = currentUser.department || 'Campus Administration & Security';

    const auditAdminName = document.getElementById('auditAdminName');
    if (auditAdminName) auditAdminName.textContent = currentUser.name;

    const reportsHeader = document.querySelector('#myItemsTableContainer')?.previousElementSibling?.querySelector('h3');
    if (reportsHeader) reportsHeader.textContent = 'Campus-Wide Reported Items (Admin Fleet Control)';
    const reportsDesc = document.querySelector('#myItemsTableContainer')?.previousElementSibling?.querySelector('p');
    if (reportsDesc) reportsDesc.textContent = 'Full administrative control across all lost and found listings and owner records on Sai University campus.';
  } else {
    if (adminSection) adminSection.classList.add('hidden');
    if (adminStudentLoginsSection) adminStudentLoginsSection.classList.add('hidden');
    if (btnExportItemsCsv) btnExportItemsCsv.classList.add('hidden');
    if (elProfileRole) elProfileRole.innerHTML = `🎓 Verified Student Account &bull; Sai University Academic Profile`;
    if (elProfileId) elProfileId.textContent = currentUser.studentId || 'SAIU2024CS001';
    if (elProfileDept) elProfileDept.textContent = currentUser.department || 'School of Computing & Data Science';

    const reportsHeader = document.querySelector('#myItemsTableContainer')?.previousElementSibling?.querySelector('h3');
    if (reportsHeader) reportsHeader.textContent = 'My Reported Items';
    const reportsDesc = document.querySelector('#myItemsTableContainer')?.previousElementSibling?.querySelector('p');
    if (reportsDesc) reportsDesc.textContent = 'Manage items you reported and inspect incoming ownership verification claims.';
  }

  loadMyReportedItems();
  loadMyClaims();
}

async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      const { stats, categoryStats, buildingStats } = data;
      const elTotal = document.getElementById('statTotalItems');
      const elLost = document.getElementById('statLostItems');
      const elFound = document.getElementById('statFoundItems');
      const elRec = document.getElementById('statRecoveryRate');

      if (elTotal) elTotal.textContent = stats.totalItems;
      if (elLost) elLost.textContent = stats.lostItems;
      if (elFound) elFound.textContent = stats.foundItems;
      if (elRec) elRec.textContent = `${stats.recoveryRate}%`;

      renderBuildingChart(buildingStats);
      renderCategoryChart(categoryStats);
    }
  } catch (err) {
    console.error('Error fetching admin stats:', err);
  }
}

let buildingChartInstance = null;
let categoryChartInstance = null;

function renderBuildingChart(buildingStats) {
  const canvas = document.getElementById('buildingChart');
  if (!canvas || !window.Chart) return;
  const ctx = canvas.getContext('2d');
  if (buildingChartInstance) buildingChartInstance.destroy();

  buildingChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: buildingStats.map(b =>
        b._id
          .replace('Academic Block ', 'Block ')
          .replace('Student Dining & ', '')
          .replace('Computer Science Labs', 'CS Labs')
          .replace('Sports Complex & Gymnasium', 'Sports Complex')
          .replace('Campus Grounds / Lawn', 'Campus Grounds')
      ),
      datasets: [{
        label: 'Items Reported',
        data: buildingStats.map(b => b.count),
        backgroundColor: '#38bdf8',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { left: 10, right: 10, top: 5, bottom: 5 }
      },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: { color: '#94a3b8', stepSize: 1 },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

function renderCategoryChart(categoryStats) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas || !window.Chart) return;
  const ctx = canvas.getContext('2d');
  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categoryStats.map(c => c._id),
      datasets: [{
        data: categoryStats.map(c => c.count),
        backgroundColor: ['#38bdf8', '#818cf8', '#fbbf24', '#34d399', '#f87171', '#c084fc', '#f472b6', '#94a3b8'],
        borderWidth: 2,
        borderColor: '#0a0d13'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#cbd5e1', boxWidth: 12, padding: 12 }
        }
      }
    }
  });
}

let allReportedItemsCache = [];

async function loadMyReportedItems() {
  const tbody = document.getElementById('myItemsBody');
  if (!tbody) return;
  const token = localStorage.getItem('sai_portal_token') || authToken;
  const elProfileItemsCount = document.getElementById('profileItemsCount');

  try {
    const endpoint = currentUser.role === 'admin' ? '/api/admin/all-items' : '/api/items/my-items';
    const res = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    const items = data.data || [];
    allReportedItemsCache = items;
    if (elProfileItemsCount) elProfileItemsCount.textContent = items.length;

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="text-align:center;color:var(--text-muted);padding:2.5rem 1rem;">
        <span style="font-size:2rem; display:block; margin-bottom:0.5rem;">📋</span>
        <p style="margin-bottom:0.5rem;">You have not reported any items yet.</p>
        <a href="index.html" class="btn btn-primary btn-sm">➕ Report Lost or Found Item</a>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const owner = item.ownerDetails || {};
      const ownerName = owner.name || item.reportedBy?.name || 'Sai University Member';
      const ownerEmail = (owner.email && owner.email !== 'N/A' ? owner.email : item.reportedBy?.email) || 'N/A';
      const ownerPhone = (owner.phone && owner.phone !== 'N/A' ? owner.phone : item.reportedBy?.phone) || 'N/A';
      const ownerId = owner.studentId || item.reportedBy?.studentId || 'N/A';
      const refCode = item.referenceCode || ('SAIU-LF-' + String(item._id).slice(-4).toUpperCase());

      return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80'}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80';" alt="" style="width:40px; height:40px; border-radius:8px; object-fit:cover; border:1px solid rgba(255,255,255,0.1);">
            <div>
              <strong>${item.title}</strong><br>
              <small style="color:var(--accent-cyan); font-weight:500;">${item.category}</small> &bull; <code style="font-size:0.72rem; color:#fbbf24;">${refCode}</code> &bull; <small style="color:var(--text-muted);">👁️ ${item.viewCount || 0}</small>
            </div>
          </div>
        </td>
        <td><span class="badge-tag tag-${item.type}">${item.type.toUpperCase()}</span></td>
        <td style="font-size:0.82rem;">
          <strong style="color:#fff;">${ownerName}</strong> <code style="font-size:0.72rem; color:var(--accent-cyan);">${ownerId}</code><br>
          <small style="color:var(--text-secondary);">${ownerEmail}</small><br>
          <small style="color:var(--text-muted);">${ownerPhone}</small>
        </td>
        <td>${item.building}<br><small style="color:var(--text-muted);">${item.specificLocation || ''}</small></td>
        <td>${new Date(item.dateOccurred).toLocaleDateString()}</td>
        <td><span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span></td>
        <td>
          <div style="display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center;">
            <button class="btn btn-outline btn-sm" onclick="reviewClaims('${item._id}', '${item.title.replace(/'/g, "\\'")}')" title="Review incoming claims" style="padding:0.35rem 0.65rem; font-size:0.8rem;">
              🔍 Claims
            </button>
            <button class="btn btn-outline btn-sm" onclick="toggleItemStatus('${item._id}', '${item.status}')" style="padding:0.35rem 0.65rem; font-size:0.8rem; color:${item.status === 'resolved' ? '#f59e0b' : 'var(--accent-cyan)'}; border-color:${item.status === 'resolved' ? 'rgba(245,158,11,0.4)' : 'rgba(56,189,248,0.4)'};">
              ${item.status === 'resolved' ? '🔄 Reopen' : '✅ Resolve'}
            </button>
            <button class="btn btn-outline btn-sm" onclick="deleteItemFromDashboard('${item._id}', '${item.title.replace(/'/g, "\\'")}')" style="padding:0.35rem 0.5rem; font-size:0.8rem; color:#f87171; border-color:rgba(248,113,113,0.3);" title="Delete listing">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load reports.</td></tr>`;
  }
}

document.getElementById('btnExportItemsCsv')?.addEventListener('click', () => {
  if (!allReportedItemsCache || allReportedItemsCache.length === 0) {
    alert('No reported items available to export.');
    return;
  }
  const headers = ['Reference Code', 'Title', 'Type', 'Category', 'Building', 'Location', 'Status', 'Views', 'Date', 'Owner Name', 'Owner Email', 'Owner Phone', 'Student ID', 'Department'];
  const csvEsc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = allReportedItemsCache.map(item => {
    const owner = item.ownerDetails || {};
    return [
      item.referenceCode || ('SAIU-LF-' + String(item._id).slice(-4).toUpperCase()),
      item.title,
      item.type,
      item.category,
      item.building,
      item.specificLocation,
      item.status,
      item.viewCount || 0,
      new Date(item.dateOccurred).toLocaleDateString(),
      owner.name || item.reportedBy?.name || 'N/A',
      owner.email || item.reportedBy?.email || 'N/A',
      owner.phone || item.reportedBy?.phone || 'N/A',
      owner.studentId || item.reportedBy?.studentId || 'N/A',
      owner.department || item.reportedBy?.department || 'N/A'
    ].map(csvEsc).join(',');
  });
  const csvContent = [headers.map(csvEsc).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `saiu_lost_found_items_owners_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

async function loadMyClaims() {
  const tbody = document.getElementById('myClaimsBody');
  if (!tbody) return;
  const token = localStorage.getItem('sai_portal_token') || authToken;
  try {
    const res = await fetch('/api/claims/my-claims', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="text-align:center;color:var(--text-muted);padding:2.5rem 1rem;">
        <span style="font-size:2rem; display:block; margin-bottom:0.5rem;">🔍</span>
        <p style="margin-bottom:0.5rem;">You have not submitted any claims yet.</p>
        <a href="index.html" class="btn btn-outline btn-sm" style="color:var(--accent-cyan); border-color:var(--accent-cyan);">Browse Lost & Found Feed</a>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = data.data.map(claim => {
      const item = claim.item;
      const reporter = item?.reportedBy;
      const reporterPhone = reporter?.phone;
      const reporterEmail = reporter?.email;
      const reporterName = reporter?.name || 'Sai University Reporter';

      return `
        <tr>
          <td>
            <strong>${item ? item.title : 'Item Removed'}</strong>
            ${item ? `<br><small style="color:var(--accent-cyan); font-weight:500;">${item.building} &bull; ${item.category}</small>` : ''}
          </td>
          <td style="max-width:240px; font-size:0.88rem; line-height:1.4;">${claim.proofDescription}</td>
          <td>${new Date(claim.createdAt).toLocaleDateString()}</td>
          <td><span class="status-badge status-${claim.status}">${claim.status.toUpperCase()}</span></td>
          <td>
            <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.4rem;">
              ${claim.reviewNotes || (claim.status === 'approved' ? 'Handover approved by reporter!' : 'Under verification by reporter / security')}
            </div>
            ${claim.status === 'approved' && (reporterPhone || reporterEmail) ? `
              <div style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.4rem;">
                ${reporterPhone ? `
                  <a href="https://wa.me/${reporterPhone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(reporterName)},%20my%20claim%20for%20${encodeURIComponent(item?.title || 'item')}%20was%20approved!%20When%20can%20we%20meet%20for%20handover?" target="_blank" rel="noopener" class="contact-btn contact-btn-wa" style="font-size:0.75rem; padding:0.25rem 0.5rem;">
                    💬 WhatsApp Handover
                  </a>
                  <a href="tel:${reporterPhone.replace(/\s+/g, '')}" class="contact-btn contact-btn-tel" style="font-size:0.75rem; padding:0.25rem 0.5rem;">
                    📞 Call
                  </a>
                ` : ''}
                ${reporterEmail ? `
                  <a href="mailto:${reporterEmail}?subject=Handover%20Arrangement:%20${encodeURIComponent(item?.title || 'Item')}" class="contact-btn contact-btn-mail" style="font-size:0.75rem; padding:0.25rem 0.5rem;">
                    ✉️ Email
                  </a>
                ` : ''}
              </div>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="text-align:center;color:var(--text-muted);padding:2rem;">Failed to load claims.</td></tr>`;
  }
}

window.toggleItemStatus = async function(itemId, currentStatus) {
  const token = localStorage.getItem('sai_portal_token') || authToken;
  const newStatus = currentStatus === 'resolved' ? 'open' : 'resolved';
  const actionLabel = newStatus === 'resolved' ? 'mark this item as resolved / handed over' : 'reopen this listing';

  if (!confirm(`Are you sure you want to ${actionLabel}?`)) return;

  try {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Item successfully ${newStatus === 'resolved' ? 'marked as resolved' : 'reopened'}!`);
      loadMyReportedItems();
      if (currentUser?.role === 'admin') loadAdminStats();
    } else {
      alert(data.message || 'Failed to update status');
    }
  } catch (err) {
    alert('Server connection error while updating item');
  }
};

window.deleteItemFromDashboard = async function(itemId, title) {
  const token = localStorage.getItem('sai_portal_token') || authToken;
  if (!confirm(`Permanently delete listing "${title}" from the campus database?`)) return;

  try {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (data.success) {
      alert('Listing removed from campus database.');
      loadMyReportedItems();
      if (currentUser?.role === 'admin') loadAdminStats();
    } else {
      alert(data.message || 'Failed to delete listing');
    }
  } catch (err) {
    alert('Server connection error while deleting listing');
  }
};

window.reviewClaims = async function(itemId, itemTitle) {
  const modal = document.getElementById('reviewClaimsModal');
  const container = document.getElementById('claimsReviewContent');
  if (!modal || !container) return;

  modal.classList.remove('hidden');
  const token = localStorage.getItem('sai_portal_token') || authToken;

  container.innerHTML = `
    <div style="text-align:center; padding:2.5rem 1rem; color:var(--text-secondary);">
      <div class="auth-btn-spinner" style="margin:0 auto 1rem auto; width:32px; height:32px; border-width:3px;"></div>
      <p style="font-size:0.95rem;">Loading submitted claims for <strong>${itemTitle || 'this item'}</strong>...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/claims/item/${itemId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      container.innerHTML = `
        <div style="padding:2.5rem 1rem; text-align:center;">
          <span style="font-size:2.5rem; display:block; margin-bottom:0.8rem;">🔒</span>
          <h4 style="color:#fff; margin-bottom:0.4rem;">Access Restricted</h4>
          <p style="color:var(--text-muted); font-size:0.9rem;">${data.message || 'Only the person who reported this item or a campus admin can review claims.'}</p>
        </div>
      `;
      return;
    }

    if (!data.data || data.data.length === 0) {
      container.innerHTML = `
        <div style="padding:2.5rem 1rem; text-align:center; color:var(--text-secondary);">
          <span style="font-size:2.5rem; display:block; margin-bottom:0.8rem;">📭</span>
          <h4 style="color:#fff; margin-bottom:0.4rem;">No Claims Submitted Yet</h4>
          <p style="font-size:0.9rem; color:var(--text-muted);">No students have submitted verification claims for this listing yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.data.map(claim => {
      const c = claim.claimant || {};
      const cPhone = claim.contactPhone || c.phone || '';
      const cEmail = c.email || '';
      const cName = c.name || 'Anonymous Student';
      const cDept = c.department || 'Sai University';
      const cId = c.studentId || '';

      return `
        <div class="claim-review-card" style="border:1px solid rgba(255,255,255,0.12); padding:1.25rem; border-radius:14px; margin-bottom:1rem; background:rgba(18,22,31,0.85); box-shadow:0 8px 24px rgba(0,0,0,0.3);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.8rem; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:0.7rem;">
            <div>
              <h4 style="color:#fff; font-size:1.05rem; margin-bottom:0.2rem;">👤 ${cName} ${cId ? `<span style="font-size:0.8rem; color:var(--accent-cyan); font-weight:normal;">(${cId})</span>` : ''}</h4>
              <p style="color:var(--text-muted); font-size:0.8rem; margin:0;">${cDept}</p>
            </div>
            <span class="status-badge status-${claim.status}">${claim.status.toUpperCase()}</span>
          </div>

          <div style="margin-bottom:0.8rem; font-size:0.9rem;">
            <p style="margin-bottom:0.4rem;"><strong style="color:var(--text-secondary);">Proof of Ownership Description:</strong></p>
            <div style="background:rgba(255,255,255,0.04); border-left:3px solid var(--accent-cyan); padding:0.6rem 0.8rem; border-radius:6px; color:#e2e8f0; font-style:italic;">
              "${claim.proofDescription}"
            </div>
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:0.6rem; align-items:center; margin-top:0.8rem; padding-top:0.6rem; border-top:1px solid rgba(255,255,255,0.06);">
            ${cPhone ? `
              <a href="tel:${cPhone.replace(/\s+/g, '')}" class="contact-btn contact-btn-tel" style="font-size:0.8rem; padding:0.35rem 0.75rem;">
                📞 Call (${cPhone})
              </a>
              <a href="https://wa.me/${cPhone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(cName)},%20I%20reviewed%20your%20claim%20for%20the%20lost%20item%20at%20Sai%20University." target="_blank" rel="noopener" class="contact-btn contact-btn-wa" style="font-size:0.8rem; padding:0.35rem 0.75rem;">
                💬 WhatsApp
              </a>
            ` : ''}
            ${cEmail ? `
              <a href="mailto:${cEmail}?subject=Sai%20University%20Lost%20and%20Found%20Claim" class="contact-btn contact-btn-mail" style="font-size:0.8rem; padding:0.35rem 0.75rem;">
                ✉️ Email (${cEmail})
              </a>
            ` : ''}
          </div>

          ${claim.status === 'pending' ? `
            <div style="display:flex; gap:0.6rem; margin-top:1rem; border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.8rem;">
              <button class="btn btn-primary btn-sm" style="background:#22c55e; border-color:#22c55e; color:#fff;" onclick="decideClaim('${claim._id}', 'approved')">
                ✅ Approve &amp; Handover
              </button>
              <button class="btn btn-outline btn-sm" style="color:#f87171; border-color:rgba(248,113,113,0.4);" onclick="decideClaim('${claim._id}', 'rejected')">
                ❌ Reject Claim
              </button>
            </div>
          ` : `
            <div style="margin-top:0.8rem; padding:0.5rem 0.75rem; background:rgba(255,255,255,0.03); border-radius:6px; font-size:0.82rem; color:var(--text-muted);">
              <strong>Verification Result:</strong> ${claim.reviewNotes || (claim.status === 'approved' ? 'Claim verified and item returned' : 'Proof insufficient')}
            </div>
          `}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `
      <div style="padding:1.5rem; text-align:center;">
        <p style="color:var(--danger);">Error retrieving claims from server.</p>
      </div>
    `;
  }
};

window.decideClaim = async function(claimId, status) {
  const token = localStorage.getItem('sai_portal_token') || authToken;
  const reviewNotes = prompt(`Enter note for claimant (${status}):`, status === 'approved' ? 'Ownership verified and handed over' : 'Insufficient verification evidence');
  if (reviewNotes === null) return; // user cancelled prompt

  try {
    const res = await fetch(`/api/claims/${claimId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, reviewNotes })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Claim marked as ${status}!`);
      document.getElementById('reviewClaimsModal').classList.add('hidden');
      loadMyReportedItems();
      if (currentUser?.role === 'admin') loadAdminStats();
    } else {
      alert(data.message || 'Error updating claim status');
    }
  } catch (err) {
    alert('Error updating claim status');
  }
};

// --- ADMIN: Student Database & Login Records Audit ---
let allStudentLoginsCache = [];

async function loadStudentLogins(showRefreshToast = false) {
  const tableBody = document.getElementById('studentLoginsTableBody');
  const auditTotalStudents = document.getElementById('auditTotalStudents');
  const auditTotalLogins = document.getElementById('auditTotalLogins');
  const auditDbBadge = document.getElementById('auditDbBadge');
  const btnRefresh = document.getElementById('btnRefreshStudentLogins');

  if (btnRefresh) {
    btnRefresh.disabled = true;
    btnRefresh.innerHTML = '<span>⏳</span> Querying MongoDB...';
  }

  try {
    const res = await fetch('/api/admin/student-logins', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await res.json();
    if (!data.success) {
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:2rem;">Failed to load student records: ${data.message}</td></tr>`;
      }
      return;
    }

    allStudentLoginsCache = data.students || [];

    if (auditTotalStudents) auditTotalStudents.textContent = data.summary?.totalStudents || allStudentLoginsCache.filter(u => u.role === 'student').length;
    if (auditTotalLogins) auditTotalLogins.textContent = data.summary?.totalLogins || 0;
    const isMongo = data.source === 'mongodb';
    if (auditDbBadge) {
      auditDbBadge.textContent = isMongo ? 'MongoDB: Live Cloud' : 'Resilient In-Memory DB';
      auditDbBadge.style.color = isMongo ? '#4ade80' : '#fbbf24';
    }
    const dbSyncStatus = document.getElementById('dbSyncStatus');
    if (dbSyncStatus) {
      dbSyncStatus.textContent = isMongo ? 'MongoDB Connected • Live DB Active' : 'Resilient In-Memory Store Active';
    }

    renderStudentLoginsTable(allStudentLoginsCache);

    if (showRefreshToast) {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = `✅ Queried ${allStudentLoginsCache.length} student profiles and session logs from MongoDB!`;
        toast.className = 'toast toast-success';
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
      }
    }
  } catch (err) {
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:2rem;">Connection error querying student logins database.</td></tr>`;
    }
  } finally {
    if (btnRefresh) {
      btnRefresh.disabled = false;
      btnRefresh.innerHTML = '<span>🔄</span> Refresh Database';
    }
  }
}

function renderStudentLoginsTable(users) {
  const tableBody = document.getElementById('studentLoginsTableBody');
  if (!tableBody) return;

  if (!users || users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">No student records found matching the query.</td></tr>`;
    return;
  }

  tableBody.innerHTML = users.map(user => {
    const isAdmin = user.role === 'admin';
    const initials = (user.name || 'Student').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const formattedLastLogin = user.lastLogin 
      ? new Date(user.lastLogin).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Never';

    const loginSessionsCount = (user.loginHistory && user.loginHistory.length) || (user.loginCount || 0);

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
        <td style="padding:1rem; cursor:pointer;" onclick="viewStudentProfileAndItems('${user._id}', 'items')" title="Click to view profile & items listed by ${user.name}">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:36px; height:36px; border-radius:50%; background:${isAdmin ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)'}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.85rem; color:#fff; box-shadow:0 0 10px rgba(0,0,0,0.3); flex-shrink:0;">
              ${initials}
            </div>
            <div>
              <div style="font-weight:700; color:#fff; display:flex; align-items:center; gap:0.4rem;">
                <span style="text-decoration:underline; text-decoration-color:rgba(56,189,248,0.45); text-underline-offset:3px;">${user.name}</span>
                ${isAdmin ? '<span class="badge-tag tag-lost" style="font-size:0.68rem; padding:0.1rem 0.4rem;">ADMIN</span>' : '<span class="badge-tag tag-found" style="font-size:0.68rem; padding:0.1rem 0.4rem;">STUDENT</span>'}
              </div>
              <small style="color:var(--accent-cyan); font-size:0.75rem;">Click profile to view listed items &bull; Joined ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}</small>
            </div>
          </div>
        </td>
        <td style="padding:1rem; font-family:monospace; font-size:0.85rem; color:var(--text-secondary);">
          <span style="user-select:all;">${user.email}</span>
        </td>
        <td style="padding:1rem;">
          <code style="background:rgba(255,255,255,0.06); padding:0.2rem 0.45rem; border-radius:6px; font-size:0.82rem; color:var(--accent-cyan);">${user.studentId || 'N/A'}</code>
        </td>
        <td style="padding:1rem; font-size:0.85rem; color:#fff;">
          <div>${user.department || 'General Academic'}</div>
          <small style="color:var(--text-muted); font-size:0.75rem;">${user.yearOfStudy || ''}</small>
        </td>
        <td style="padding:1rem; text-align:center;">
          <span style="display:inline-block; padding:0.25rem 0.7rem; border-radius:999px; background:rgba(168,85,247,0.15); border:1px solid rgba(168,85,247,0.3); color:#c084fc; font-weight:700; font-size:0.82rem; white-space:nowrap;">
            ${user.loginCount || 0} ${(user.loginCount || 0) === 1 ? 'login' : 'logins'}
          </span>
        </td>
        <td style="padding:1rem; font-size:0.85rem; color:#38bdf8;">
          <div>${formattedLastLogin}</div>
          <small style="color:var(--text-muted); font-size:0.75rem;">IP: ${user.loginHistory && user.loginHistory[0] ? user.loginHistory[0].ipAddress : '127.0.0.1'}</small>
        </td>
        <td style="padding:1rem;">
          <button class="btn btn-outline btn-sm" style="font-size:0.78rem; padding:0.35rem 0.65rem; border-color:rgba(255,255,255,0.2); color:#fff; display:inline-flex; align-items:center; gap:0.35rem;" onclick="viewStudentProfileAndItems('${user._id}', 'sessions')">
            <span>👁️</span> Audit Sessions (${loginSessionsCount})
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterStudentLogins(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderStudentLoginsTable(allStudentLoginsCache);
    return;
  }
  const filtered = allStudentLoginsCache.filter(u => {
    return (u.name && u.name.toLowerCase().includes(q)) ||
           (u.email && u.email.toLowerCase().includes(q)) ||
           (u.studentId && u.studentId.toLowerCase().includes(q)) ||
           (u.department && u.department.toLowerCase().includes(q));
  });
  renderStudentLoginsTable(filtered);
}

window.viewStudentProfileAndItems = async function(userId, activeTab = 'items') {
  const user = allStudentLoginsCache.find(u => u._id.toString() === userId.toString());
  if (!user) return;

  const modal = document.getElementById('studentLoginHistoryModal');
  const modalName = document.getElementById('modalStudentName');
  const modalEmail = document.getElementById('modalStudentEmail');
  const modalBody = document.getElementById('modalStudentLoginBody');

  if (modalName) modalName.textContent = `${user.name} — Profile & Activity`;
  if (modalEmail) modalEmail.innerHTML = `<strong>${user.email}</strong> &bull; Roll No: <code>${user.studentId || 'N/A'}</code> &bull; ${user.department || 'Sai University'} &bull; ${user.phone || 'N/A'}`;
  if (modalBody) modalBody.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">Loading listed items &amp; sessions...</div>`;
  if (modal) modal.classList.remove('hidden');

  let userItems = [];
  try {
    const res = await fetch(`/api/items/user/${userId}`);
    const data = await res.json();
    if (data.success) userItems = data.data || [];
  } catch (e) {
    userItems = (allReportedItemsCache || []).filter(i => {
      const repId = i.reportedBy?._id ? String(i.reportedBy._id) : String(i.reportedBy || '');
      return repId === String(userId);
    });
  }

  const renderModalContent = (tab) => {
    const sessionsHtml = (!user.loginHistory || user.loginHistory.length === 0)
      ? `<div style="text-align:center; padding:2rem; color:var(--text-muted);">
           <span style="font-size:2.2rem; display:block; margin-bottom:0.5rem;">🔒</span>
           <p>No historical session snapshots stored yet for this profile.</p>
           <p style="font-size:0.8rem;">Total Recorded Login Counter: <strong>${user.loginCount || 0}</strong></p>
         </div>`
      : `<div style="margin-bottom:1rem; padding:0.75rem 1rem; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
           <span style="color:#93c5fd; font-size:0.85rem;"><strong>Session History:</strong> Capped at last 20 verified sessions</span>
           <span style="color:#fff; font-weight:700; font-size:0.85rem;">Total Logins: ${user.loginCount || user.loginHistory.length}</span>
         </div>
         <div style="display:flex; flex-direction:column; gap:0.75rem;">
           ${user.loginHistory.map((s, idx) => `
             <div style="padding:0.9rem 1.1rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
               <div>
                 <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                   <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e;"></span>
                   <strong style="color:#fff; font-size:0.9rem;">Session #${user.loginHistory.length - idx}</strong>
                   <span style="font-size:0.75rem; color:var(--accent-cyan); font-family:monospace;">IP: ${s.ipAddress || '127.0.0.1'}</span>
                 </div>
                 <div style="font-size:0.78rem; color:var(--text-muted); max-width:440px; word-break:break-all;">
                   Device / Client: ${s.userAgent || 'Web Browser'}
                 </div>
               </div>
               <div style="text-align:right;">
                 <span style="font-size:0.85rem; color:#38bdf8; font-weight:600;">
                   ${new Date(s.timestamp).toLocaleString()}
                 </span>
               </div>
             </div>
           `).join('')}
         </div>`;

    const itemsHtml = userItems.length === 0
      ? `<div style="text-align:center; padding:2rem; color:var(--text-muted);">
           <span style="font-size:2.2rem; display:block; margin-bottom:0.5rem;">📦</span>
           <p>No items listed by <strong>${user.name}</strong> yet.</p>
         </div>`
      : `<div style="display:flex; flex-direction:column; gap:0.75rem;">
           ${userItems.map(item => {
             const refCode = item.referenceCode || ('SAIU-LF-' + String(item._id).slice(-4).toUpperCase());
             return `
               <div style="padding:0.9rem 1rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; display:flex; align-items:center; justify-content:space-between; gap:0.9rem; flex-wrap:wrap;">
                 <div style="display:flex; align-items:center; gap:0.8rem; min-width:220px; flex:1;">
                   <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80'}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80';" alt="" style="width:48px; height:48px; border-radius:10px; object-fit:cover; border:1px solid rgba(255,255,255,0.12); flex-shrink:0;">
                   <div>
                     <div style="font-weight:700; color:#fff; font-size:0.95rem;">${item.title}</div>
                     <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:2px;">
                       <span class="badge-tag tag-${item.type}" style="font-size:0.65rem; padding:0.1rem 0.45rem;">${item.type.toUpperCase()}</span>
                       <span class="status-badge status-${item.status}" style="font-size:0.65rem; padding:0.1rem 0.45rem; margin-left:4px;">${item.status.toUpperCase()}</span>
                       <code style="margin-left:6px; color:#fbbf24; font-size:0.72rem;">${refCode}</code>
                     </div>
                     <div style="font-size:0.76rem; color:var(--text-muted); margin-top:4px;">
                       🏛️ ${item.building} (${item.specificLocation || ''}) &bull; 📅 ${new Date(item.dateOccurred).toLocaleDateString()} &bull; 👁️ ${item.viewCount || 0}
                     </div>
                   </div>
                 </div>
                 <button class="btn btn-outline btn-sm" style="font-size:0.76rem; padding:0.35rem 0.65rem;" onclick="document.getElementById('studentLoginHistoryModal').classList.add('hidden'); reviewClaims('${item._id}', '${item.title.replace(/'/g, "\\'")}')">
                   🔍 Claims
                 </button>
               </div>
             `;
           }).join('')}
         </div>`;

    modalBody.innerHTML = `
      <div style="display:flex; gap:0.5rem; margin-bottom:1.15rem; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.75rem;">
        <button id="tabBtnUserItems" class="btn btn-sm ${tab === 'items' ? 'btn-primary' : 'btn-outline'}" style="font-size:0.8rem; padding:0.4rem 0.85rem;">
          📦 Listed Items (${userItems.length})
        </button>
        <button id="tabBtnUserSessions" class="btn btn-sm ${tab === 'sessions' ? 'btn-primary' : 'btn-outline'}" style="font-size:0.8rem; padding:0.4rem 0.85rem;">
          🔐 Login Sessions (${(user.loginHistory && user.loginHistory.length) || 0})
        </button>
      </div>
      ${tab === 'items' ? itemsHtml : sessionsHtml}
    `;

    document.getElementById('tabBtnUserItems')?.addEventListener('click', () => renderModalContent('items'));
    document.getElementById('tabBtnUserSessions')?.addEventListener('click', () => renderModalContent('sessions'));
  };

  renderModalContent(activeTab);
};

window.viewStudentLoginSessions = function(userId) {
  window.viewStudentProfileAndItems(userId, 'sessions');
};
