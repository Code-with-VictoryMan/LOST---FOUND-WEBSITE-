// State Management
let currentItems = [];
let currentUser = JSON.parse(localStorage.getItem('sai_portal_user')) || null;
let authToken = localStorage.getItem('sai_portal_token') || null;
let isRegisterMode = false;
let searchDebounceTimer = null;
let cameraStream = null;
let scannedPhotoData = null;

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
const scanModal = document.getElementById('scanModal');
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

// Scanner Functions
window.openScannerModal = function() {
  if (scanModal) {
    scanModal.classList.remove('hidden');
    resetScannerState();
  }
};

window.closeScannerModal = function() {
  if (scanModal) {
    scanModal.classList.add('hidden');
    stopCamera();
  }
};

function resetScannerState() {
  const scanVideo = document.getElementById('scanVideo');
  const scanPreviewImg = document.getElementById('scanPreviewImg');
  const scanPlaceholder = document.getElementById('scanPlaceholder');
  const btnCapturePhoto = document.getElementById('btnCapturePhoto');
  const btnToggleCamera = document.getElementById('btnToggleCamera');
  const scanResultsArea = document.getElementById('scanResultsArea');

  if (scanVideo) scanVideo.classList.add('hidden');
  if (scanPreviewImg) { scanPreviewImg.classList.add('hidden'); scanPreviewImg.src = ''; }
  if (scanPlaceholder) scanPlaceholder.classList.remove('hidden');
  if (btnCapturePhoto) btnCapturePhoto.classList.add('hidden');
  if (btnToggleCamera) btnToggleCamera.textContent = '📹 Start Camera';
  if (scanResultsArea) { scanResultsArea.classList.add('hidden'); scanResultsArea.innerHTML = ''; }
  scannedPhotoData = null;
}

async function toggleCamera() {
  const scanVideo = document.getElementById('scanVideo');
  const scanPlaceholder = document.getElementById('scanPlaceholder');
  const scanPreviewImg = document.getElementById('scanPreviewImg');
  const btnCapturePhoto = document.getElementById('btnCapturePhoto');
  const btnToggleCamera = document.getElementById('btnToggleCamera');

  if (cameraStream) {
    stopCamera();
    btnToggleCamera.textContent = '📹 Start Camera';
    btnCapturePhoto.classList.add('hidden');
    scanVideo.classList.add('hidden');
    scanPlaceholder.classList.remove('hidden');
  } else {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      scanVideo.srcObject = cameraStream;
      scanVideo.classList.remove('hidden');
      scanPlaceholder.classList.add('hidden');
      scanPreviewImg.classList.add('hidden');
      btnCapturePhoto.classList.remove('hidden');
      btnToggleCamera.textContent = '⏹️ Stop Camera';
    } catch (err) {
      console.warn('Camera access denied or unavailable, using photo upload instead:', err);
      showToast('Camera not available. You can upload a photo of the item.');
    }
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

function capturePhoto() {
  const scanVideo = document.getElementById('scanVideo');
  const scanPreviewImg = document.getElementById('scanPreviewImg');
  const btnCapturePhoto = document.getElementById('btnCapturePhoto');
  const btnToggleCamera = document.getElementById('btnToggleCamera');

  if (!scanVideo || !cameraStream) return;

  const canvas = document.createElement('canvas');
  canvas.width = scanVideo.videoWidth || 640;
  canvas.height = scanVideo.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(scanVideo, 0, 0, canvas.width, canvas.height);

  scannedPhotoData = canvas.toDataURL('image/jpeg', 0.85);
  scanPreviewImg.src = scannedPhotoData;
  scanPreviewImg.classList.remove('hidden');
  scanVideo.classList.add('hidden');
  btnCapturePhoto.classList.add('hidden');
  btnToggleCamera.textContent = '📹 Retake Camera Photo';
  stopCamera();
  showToast('Photo captured! Now specify item label to scan database.');
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    scannedPhotoData = evt.target.result;
    const scanPreviewImg = document.getElementById('scanPreviewImg');
    const scanPlaceholder = document.getElementById('scanPlaceholder');
    const scanVideo = document.getElementById('scanVideo');
    stopCamera();

    if (scanVideo) scanVideo.classList.add('hidden');
    if (scanPlaceholder) scanPlaceholder.classList.add('hidden');
    if (scanPreviewImg) {
      scanPreviewImg.src = scannedPhotoData;
      scanPreviewImg.classList.remove('hidden');
    }

    // Auto-populate keywords from file name if helpful
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const keywordsInput = document.getElementById('scanItemKeywords');
    if (keywordsInput && !keywordsInput.value) {
      keywordsInput.value = cleanName;
    }
    showToast('Photo uploaded successfully.');
  };
  reader.readAsDataURL(file);
}

async function executeScanMatch() {
  const keywordsInput = document.getElementById('scanItemKeywords');
  const queryText = keywordsInput ? keywordsInput.value.trim() : '';
  const building = document.getElementById('scanBuilding').value;
  const category = document.getElementById('scanCategory').value;
  const resultsArea = document.getElementById('scanResultsArea');

  if (!queryText) {
    alert('Please enter or scan the item name / markings (e.g. calculator, Dell, AirPods, lanyard)');
    return;
  }

  resultsArea.classList.remove('hidden');
  resultsArea.innerHTML = `
    <div style="text-align:center;padding:1.5rem;color:var(--accent-cyan);">
      <div style="font-size:1.8rem;animation:pulse 1.2s infinite;">📡</div>
      <p style="margin-top:0.5rem;font-weight:600;">Searching active Sai University lost reports...</p>
      <small style="color:var(--text-muted);">Comparing location: ${building} | Keywords: ${escapeHtml(queryText)}</small>
    </div>
  `;

  try {
    const res = await fetch('/api/items/scan-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryText, category, building })
    });
    const data = await res.json();

    if (data.success && data.matchFound && data.bestMatch) {
      const match = data.bestMatch;
      const owner = match.reportedBy || {};

      resultsArea.innerHTML = `
        <div class="scan-match-banner">
          <div class="scan-match-header">
            <div>
              <span style="font-size:1.1rem;font-weight:800;color:#6ee7b7;">🎯 Match Found in Campus Database!</span>
              <p style="font-size:0.78rem;color:var(--text-secondary);">An active lost report matches your found item description.</p>
            </div>
            <span class="match-confidence-pill">${match.matchScore || 90}% Match Confidence</span>
          </div>

          <!-- Matched Item Summary -->
          <div style="display:flex;gap:1rem;background:rgba(10,13,19,0.7);padding:0.9rem;border-radius:10px;border:1px solid var(--border-subtle);align-items:center;">
            <img src="${match.imageUrl}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;" onerror="this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80'">
            <div>
              <strong style="font-size:1.05rem;color:#fff;">${escapeHtml(match.title)}</strong><br>
              <span style="font-size:0.8rem;color:var(--accent-cyan);font-weight:600;">${match.category}</span> • 
              <span style="font-size:0.8rem;color:var(--text-muted);">${match.building} (${escapeHtml(match.specificLocation)})</span><br>
              <small style="font-size:0.75rem;color:var(--text-secondary);">Lost Date: ${new Date(match.dateOccurred).toLocaleDateString()}</small>
            </div>
          </div>

          <!-- OWNER DETAILS BOX -->
          <div class="owner-details-card">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-subtle);padding-bottom:0.5rem;">
              <strong style="color:var(--accent-cyan);font-size:0.85rem;letter-spacing:1px;text-transform:uppercase;">Owner Contact Details</strong>
              <span style="font-size:0.72rem;background:rgba(56,189,248,0.15);color:#7dd3fc;padding:0.2rem 0.5rem;border-radius:4px;border:1px solid rgba(56,189,248,0.3);">Verified Campus Reporter</span>
            </div>

            <div class="owner-info-row">
              <span style="color:var(--text-muted);">Owner Name:</span>
              <strong style="color:#fff;">${escapeHtml(owner.name || 'Anonymous Student')}</strong>
            </div>

            <div class="owner-info-row">
              <span style="color:var(--text-muted);">Department / Role:</span>
              <span style="color:#cbd5e1;text-transform:capitalize;">${escapeHtml(owner.role || 'Student')}</span>
            </div>

            <div class="owner-info-row">
              <span style="color:var(--text-muted);">Sai University Email:</span>
              <a href="mailto:${owner.email}?subject=Found Item: ${encodeURIComponent(match.title)}" style="color:var(--accent-cyan);text-decoration:none;font-weight:600;">${escapeHtml(owner.email || 'N/A')}</a>
            </div>

            <div class="owner-info-row">
              <span style="color:var(--text-muted);">Contact Phone:</span>
              <a href="tel:${owner.phone}" style="color:#34d399;text-decoration:none;font-weight:600;">${escapeHtml(owner.phone || 'N/A')}</a>
            </div>

            <div class="owner-actions-row">
              <a href="mailto:${owner.email}?subject=Found Your Lost Item: ${encodeURIComponent(match.title)}&body=Hello ${encodeURIComponent(owner.name || 'Student')}, I found your item on campus at ${encodeURIComponent(building)}. Please get in touch to collect it!" class="btn btn-primary btn-sm" style="flex:1;">
                ✉️ Email Owner Directly
              </a>
              ${owner.phone && owner.phone !== 'N/A' ? `
                <a href="tel:${owner.phone}" class="btn btn-secondary btn-sm" style="flex:1;">
                  📞 Call Owner
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    } else {
      resultsArea.innerHTML = `
        <div class="no-match-box">
          <span style="font-size:2rem;">🔍</span>
          <strong style="color:#ffffff;">No Matching Lost Reports Found</strong>
          <p style="font-size:0.85rem;color:var(--text-secondary);max-width:440px;">
            The student who lost this has not reported it yet. You can list it as a <strong>Found Item</strong> right now so they can discover and claim it!
          </p>
          <button type="button" class="btn btn-primary btn-sm" onclick="prefillFoundReport('${escapeHtml(queryText)}', '${building}', '${category}')">
            ✨ List as Found Item in 1-Click
          </button>
        </div>
      `;
    }
  } catch (err) {
    resultsArea.innerHTML = `<p style="color:var(--danger);text-align:center;">Error communicating with server during scan.</p>`;
  }
}

window.prefillFoundReport = function(title, building, category) {
  closeScannerModal();
  if (!authToken) {
    showToast('Please sign in to list this found item.');
    openAuthModal();
    return;
  }

  // Pre-fill report form
  document.getElementById('reportType').value = 'found';
  document.getElementById('reportTitle').value = title;
  if (category && category !== 'all') document.getElementById('reportCategory').value = category;
  if (building && building !== 'all') document.getElementById('reportBuilding').value = building;
  
  if (scannedPhotoData) {
    document.getElementById('reportImage').value = scannedPhotoData;
  }

  reportModal.classList.remove('hidden');
  showToast('Form pre-filled with scanned item details!');
};

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

  // Scanner Modal Triggers
  const btnOpenScannerHero = document.getElementById('btnOpenScannerHero');
  const btnOpenScannerNav = document.getElementById('btnOpenScannerNav');
  const btnBottomScan = document.getElementById('btnBottomScan');
  const drawerScanLink = document.getElementById('drawerScanLink');
  const btnCloseScanner = document.getElementById('btnCloseScanner');

  if (btnOpenScannerHero) btnOpenScannerHero.addEventListener('click', openScannerModal);
  if (btnOpenScannerNav) btnOpenScannerNav.addEventListener('click', openScannerModal);
  if (btnBottomScan) btnBottomScan.addEventListener('click', openScannerModal);
  if (drawerScanLink) {
    drawerScanLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
      openScannerModal();
    });
  }
  if (btnCloseScanner) btnCloseScanner.addEventListener('click', closeScannerModal);

  // Scanner Actions
  const btnToggleCamera = document.getElementById('btnToggleCamera');
  const btnCapturePhoto = document.getElementById('btnCapturePhoto');
  const scanFileInput = document.getElementById('scanFileInput');
  const btnExecuteScan = document.getElementById('btnExecuteScan');

  if (btnToggleCamera) btnToggleCamera.addEventListener('click', toggleCamera);
  if (btnCapturePhoto) btnCapturePhoto.addEventListener('click', capturePhoto);
  if (scanFileInput) scanFileInput.addEventListener('change', handleFileUpload);
  if (btnExecuteScan) btnExecuteScan.addEventListener('click', executeScanMatch);

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
