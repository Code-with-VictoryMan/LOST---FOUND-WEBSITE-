// State Management
let currentItems = [];
let currentUser = JSON.parse(localStorage.getItem('sai_portal_user')) || null;
let authToken = localStorage.getItem('sai_portal_token') || null;
let isRegisterMode = false;
let searchDebounceTimer = null;

// DOM Elements
const itemsGrid = document.getElementById('itemsGrid');
const resultsCount = document.getElementById('resultsCount');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const filterCategory = document.getElementById('filterCategory');
const filterBuilding = document.getElementById('filterBuilding');
const filterSort = document.getElementById('filterSort');

// Modals & Drawers
const menuBlurDrawer = document.getElementById('menuBlurDrawer');
const reportModal = document.getElementById('reportModal');
const claimModal = document.getElementById('claimModal');
const authModal = document.getElementById('authModal');
const toastEl = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  fetchItems();
  setupEventListeners();
  const dateInput = document.getElementById('reportDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
});

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 3500);
}

function setupNavbar() {
  const authActions = document.getElementById('authActions');
  const userBadge = document.getElementById('userBadge');
  const navDashboard = document.getElementById('navDashboard');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const floatingUserLabel = document.getElementById('floatingUserLabel');
  const drawerAuthText = document.getElementById('drawerAuthText');

  if (authToken && currentUser) {
    if (authActions) authActions.classList.add('hidden');
    if (userBadge) userBadge.classList.remove('hidden');
    if (navDashboard) navDashboard.classList.remove('hidden');
    const firstName = currentUser.name.split(' ')[0];
    if (userNameDisplay) userNameDisplay.textContent = firstName + (currentUser.role === 'admin' ? ' (Admin)' : '');
    if (floatingUserLabel) floatingUserLabel.textContent = `${firstName} (${currentUser.role})`;
    if (drawerAuthText) drawerAuthText.textContent = `Sign Out (${firstName})`;
  } else {
    if (authActions) authActions.classList.remove('hidden');
    if (userBadge) userBadge.classList.add('hidden');
    if (navDashboard) navDashboard.classList.add('hidden');
    if (floatingUserLabel) floatingUserLabel.textContent = 'Sign In';
    if (drawerAuthText) drawerAuthText.textContent = 'Sign In / Register';
  }
}

// Fetch Items with Query Parameters
async function fetchItems() {
  try {
    const query = new URLSearchParams({
      search: searchInput.value.trim(),
      type: filterType.value,
      category: filterCategory.value,
      building: filterBuilding.value,
      sort: filterSort.value
    });

    resultsCount.textContent = 'Searching...';
    const res = await fetch(`/api/items?${query}`);
    const data = await res.json();

    if (data.success) {
      currentItems = data.data;
      renderItems(currentItems);
      resultsCount.textContent = `${currentItems.length} active listings`;
    }
  } catch (error) {
    console.error('Failed to retrieve items:', error);
    resultsCount.textContent = 'Error loading listings';
  }
}

// Render Item Cards
function renderItems(items) {
  if (items.length === 0) {
    itemsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: #64748b;">
        <h3 style="color:#ffffff;margin-bottom:0.5rem;font-weight:700;">No matching items found</h3>
        <p>Try modifying your search criteria or report a new lost/found item.</p>
      </div>`;
    return;
  }

  itemsGrid.innerHTML = items.map(item => `
    <div class="item-card">
      <div class="item-img-wrap">
        <img src="${item.imageUrl}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80'">
        <span class="badge-tag tag-${item.type}">${item.type}</span>
        <span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span>
      </div>
      <div class="item-body">
        <span class="item-category">${item.category}</span>
        <h4 class="item-title">${escapeHtml(item.title)}</h4>
        <p class="item-desc">${escapeHtml(item.description)}</p>
        <div class="item-meta">
          <span>🏛️ <strong>Building:</strong> ${item.building} (${escapeHtml(item.specificLocation)})</span>
          <span>📅 <strong>Date:</strong> ${new Date(item.dateOccurred).toLocaleDateString()}</span>
          <span>👤 <strong>Reported by:</strong> ${item.reportedBy ? escapeHtml(item.reportedBy.name) : 'Anonymous'}</span>
        </div>
        <div class="item-actions">
          ${item.status === 'open' ? `
            <button class="btn btn-primary btn-sm" onclick="openClaimModal('${item._id}')" style="width: 100%;">
              Claim This Item
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" disabled style="width: 100%;opacity:0.65;">
              ${item.status === 'claimed' ? 'Verification In Progress' : 'Resolved & Returned'}
            </button>
          `}
        </div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// Custom Feature: Check Duplicate Items Before Submitting
async function checkForDuplicates() {
  const title = document.getElementById('reportTitle').value.trim();
  const category = document.getElementById('reportCategory').value;
  const building = document.getElementById('reportBuilding').value;
  const alertBox = document.getElementById('duplicateAlertBox');

  if (title.length > 3) {
    try {
      const res = await fetch(`/api/items/check-duplicate?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}&building=${encodeURIComponent(building)}`);
      const data = await res.json();
      if (data.success && data.duplicates.length > 0) {
        alertBox.innerHTML = `⚠️ <strong>Duplicate Warning:</strong> ${data.duplicates.length} similar item(s) already reported in <em>${building}</em>: <br>• ${data.duplicates.map(d => `${d.title} (${d.type})`).join('<br>• ')}`;
        alertBox.classList.remove('hidden');
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }
  alertBox.classList.add('hidden');
}

// Menu Open Blur Transition Controls
window.openMenu = function() {
  if (menuBlurDrawer) menuBlurDrawer.classList.add('open');
};

window.closeMenu = function() {
  if (menuBlurDrawer) menuBlurDrawer.classList.remove('open');
};

// Event Listeners
function setupEventListeners() {
  // Menu Open Blur Button (メニュー)
  const btnOpenMenu = document.getElementById('btnOpenMenu');
  const btnCloseMenu = document.getElementById('btnCloseMenu');
  if (btnOpenMenu) btnOpenMenu.addEventListener('click', openMenu);
  if (btnCloseMenu) btnCloseMenu.addEventListener('click', closeMenu);

  // Drawer Action Shortcuts
  const drawerReportLink = document.getElementById('drawerReportLink');
  if (drawerReportLink) {
    drawerReportLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
      if (!authToken) {
        showToast('Please sign in to report a lost or found item.');
        openAuthModal();
        return;
      }
      reportModal.classList.remove('hidden');
    });
  }

  const drawerAuthLink = document.getElementById('drawerAuthLink');
  if (drawerAuthLink) {
    drawerAuthLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
      if (authToken) {
        handleLogout();
      } else {
        openAuthModal();
      }
    });
  }

  // Floating Corner User Widget
  const floatingUserWidget = document.getElementById('floatingUserWidget');
  if (floatingUserWidget) {
    floatingUserWidget.addEventListener('click', () => {
      if (authToken) {
        window.location.href = 'dashboard.html';
      } else {
        openAuthModal();
      }
    });
  }

  // Search and Filters
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(fetchItems, 300);
  });
  filterType.addEventListener('change', fetchItems);
  filterCategory.addEventListener('change', fetchItems);
  filterBuilding.addEventListener('change', fetchItems);
  filterSort.addEventListener('change', fetchItems);

  // Duplicate Check Event triggers
  document.getElementById('reportTitle').addEventListener('blur', checkForDuplicates);
  document.getElementById('reportBuilding').addEventListener('change', checkForDuplicates);

  // Modal Open/Close Controls
  const btnOpenReport = document.getElementById('btnOpenReport');
  if (btnOpenReport) {
    btnOpenReport.addEventListener('click', () => {
      if (!authToken) {
        showToast('Please sign in to report a lost or found item.');
        openAuthModal();
        return;
      }
      reportModal.classList.remove('hidden');
    });
  }

  document.getElementById('btnCloseReport').addEventListener('click', () => reportModal.classList.add('hidden'));
  document.getElementById('btnCancelReport').addEventListener('click', () => reportModal.classList.add('hidden'));

  document.getElementById('btnCloseClaim').addEventListener('click', () => claimModal.classList.add('hidden'));
  document.getElementById('btnCancelClaim').addEventListener('click', () => claimModal.classList.add('hidden'));

  const btnOpenAuth = document.getElementById('btnOpenAuth');
  if (btnOpenAuth) btnOpenAuth.addEventListener('click', openAuthModal);
  document.getElementById('btnCloseAuth').addEventListener('click', () => authModal.classList.add('hidden'));

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);

  function handleLogout() {
    localStorage.removeItem('sai_portal_token');
    localStorage.removeItem('sai_portal_user');
    authToken = null;
    currentUser = null;
    setupNavbar();
    showToast('Logged out successfully.');
  }

  // Toggle Auth Register/Login
  document.getElementById('authToggleLink').addEventListener('click', (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    const registerFields = document.getElementById('registerFields');
    const authModalTitle = document.getElementById('authModalTitle');
    const btnAuthSubmit = document.getElementById('btnAuthSubmit');
    const authTogglePrompt = document.getElementById('authTogglePrompt');
    const authToggleLink = document.getElementById('authToggleLink');

    if (isRegisterMode) {
      registerFields.classList.remove('hidden');
      authModalTitle.textContent = 'Create Student Account';
      btnAuthSubmit.textContent = 'Register Account';
      authTogglePrompt.textContent = 'Already registered?';
      authToggleLink.textContent = 'Sign In';
    } else {
      registerFields.classList.add('hidden');
      authModalTitle.textContent = 'Sign In';
      btnAuthSubmit.textContent = 'Sign In';
      authTogglePrompt.textContent = 'New here?';
      authToggleLink.textContent = 'Create an account';
    }
  });

  // Submit Report Form
  document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('reportTitle').value.trim(),
      type: document.getElementById('reportType').value,
      category: document.getElementById('reportCategory').value,
      building: document.getElementById('reportBuilding').value,
      specificLocation: document.getElementById('reportLocation').value.trim(),
      dateOccurred: document.getElementById('reportDate').value,
      description: document.getElementById('reportDescription').value.trim(),
      imageUrl: document.getElementById('reportImage').value.trim()
    };

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Report submitted to campus portal!');
        reportModal.classList.add('hidden');
        document.getElementById('reportForm').reset();
        fetchItems();
      } else {
        alert(data.message || 'Submission error');
      }
    } catch (err) {
      alert('Error contacting server');
    }
  });

  // Submit Claim Form
  document.getElementById('claimForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      itemId: document.getElementById('claimItemId').value,
      proofDescription: document.getElementById('claimProof').value.trim(),
      contactPhone: document.getElementById('claimPhone').value.trim()
    };

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Ownership claim submitted for verification!');
        claimModal.classList.add('hidden');
        document.getElementById('claimForm').reset();
        fetchItems();
      } else {
        alert(data.message || 'Claim error');
      }
    } catch (err) {
      alert('Error submitting claim');
    }
  });

  // Auth Form Submit
  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const payload = { email, password };

    if (isRegisterMode) {
      payload.name = document.getElementById('authName').value.trim();
      payload.role = document.getElementById('authRole').value;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('sai_portal_token', authToken);
        localStorage.setItem('sai_portal_user', JSON.stringify(currentUser));
        setupNavbar();
        authModal.classList.add('hidden');
        showToast(`Welcome, ${currentUser.name}!`);
      } else {
        alert(data.message || 'Authentication failed');
      }
    } catch (err) {
      alert('Network error during authentication');
    }
  });
}

function openAuthModal() {
  authModal.classList.remove('hidden');
}

window.openClaimModal = function(itemId) {
  if (!authToken) {
    showToast('Please sign in first to submit a claim.');
    openAuthModal();
    return;
  }
  const item = currentItems.find(i => i._id === itemId);
  if (!item) return;

  document.getElementById('claimItemId').value = item._id;
  document.getElementById('claimItemSummary').innerHTML = `
    <strong>Claiming:</strong> ${escapeHtml(item.title)} (${item.category})<br>
    <small style="color:var(--text-secondary);">Reported at: ${item.building} — ${escapeHtml(item.specificLocation)}</small>
  `;
  claimModal.classList.remove('hidden');
};
