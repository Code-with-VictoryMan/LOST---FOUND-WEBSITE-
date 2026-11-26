// State Management
let currentItems = [];
let currentUser = JSON.parse(localStorage.getItem('sai_portal_user')) || null;
let authToken = localStorage.getItem('sai_portal_token') || null;
let isRegisterMode = false;
let searchDebounceTimer = null;
let cameraStream = null;
let scannedPhotoData = null;
let activeUserFilter = null;

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
  authToken = localStorage.getItem('sai_portal_token') || null;
  try {
    currentUser = JSON.parse(localStorage.getItem('sai_portal_user')) || null;
  } catch (e) {
    currentUser = null;
  }

  const authActions = document.getElementById('authActions');
  const userBadge = document.getElementById('userBadge');
  const navDashboard = document.getElementById('navDashboard');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const floatingUserLabel = document.getElementById('floatingUserLabel');
  const drawerAuthText = document.getElementById('drawerAuthText');
  const chipMyReports = document.getElementById('chipMyReports');

  if (authToken && currentUser) {
    if (authActions) authActions.classList.add('hidden');
    if (userBadge) userBadge.classList.remove('hidden');
    if (navDashboard) navDashboard.classList.remove('hidden');
    const firstName = currentUser.name.split(' ')[0];
    if (userNameDisplay) userNameDisplay.textContent = firstName + (currentUser.role === 'admin' ? ' (Admin)' : '');
    if (floatingUserLabel) floatingUserLabel.textContent = `${firstName} (${currentUser.role})`;
    if (drawerAuthText) drawerAuthText.textContent = `Sign Out (${firstName})`;
    if (chipMyReports) {
      chipMyReports.classList.remove('hidden');
    }
  } else {
    if (authActions) authActions.classList.remove('hidden');
    if (userBadge) userBadge.classList.add('hidden');
    if (navDashboard) navDashboard.classList.add('hidden');
    if (floatingUserLabel) floatingUserLabel.textContent = 'Sign In';
    if (drawerAuthText) drawerAuthText.textContent = 'Sign In / Register';
    if (chipMyReports) {
      chipMyReports.classList.add('hidden');
      if (activeUserFilter === 'me') {
        activeUserFilter = null;
      }
    }
  }
}

// Fetch Items with Query Parameters (supporting MongoDB user filter)
async function fetchItems() {
  try {
    const queryParams = {
      search: searchInput.value.trim(),
      type: filterType.value,
      category: filterCategory.value,
      building: filterBuilding.value,
      sort: filterSort.value
    };

    if (activeUserFilter === 'me' && currentUser) {
      queryParams.user = currentUser.id || currentUser._id;
    }

    const query = new URLSearchParams(queryParams);

    resultsCount.textContent = 'Searching...';
    const res = await fetch(`/api/items?${query}`);
    const data = await res.json();

    if (data.success) {
      currentItems = data.data;
      renderItems(currentItems);
      resultsCount.textContent = activeUserFilter === 'me' 
        ? `${currentItems.length} of your reported items` 
        : `${currentItems.length} active listings`;
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
        <p>${activeUserFilter === 'me' ? 'You have not reported any items matching these criteria yet.' : 'Try modifying your search criteria or report a new lost/found item.'}</p>
        <button class="btn btn-primary btn-sm" onclick="openReportModal()" style="margin-top:1rem;">
          ➕ Report an Item
        </button>
      </div>`;
    return;
  }

  const currentUserId = currentUser ? String(currentUser.id || currentUser._id) : null;

  itemsGrid.innerHTML = items.map(item => {
    const repId = item.reportedBy?._id ? String(item.reportedBy._id) : (item.reportedBy ? String(item.reportedBy) : '');
    const isMyReport = currentUserId && repId && currentUserId === repId;

    return `
      <div class="item-card" onclick="openItemDetails('${item._id}')" title="Click to view complete details, location and contacts" style="${isMyReport ? 'border-color: rgba(245, 158, 11, 0.45); box-shadow: 0 6px 24px rgba(245,158,11,0.12);' : ''}">
        <div class="item-img-wrap">
          <img src="${item.imageUrl}" alt="${item.title}" onerror="this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80'">
          <span class="badge-tag tag-${item.type}">${item.type}</span>
          <span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span>
          ${isMyReport ? `<span class="badge-tag my-report-badge" style="background:linear-gradient(135deg, #f59e0b, #d97706); color:#000; font-weight:700; z-index:3; border:1px solid rgba(255,255,255,0.4); box-shadow:0 2px 8px rgba(0,0,0,0.4);">⭐ Your Report</span>` : ''}
        </div>
        <div class="item-body">
          <span class="item-category">${item.category}</span>
          <h4 class="item-title">${escapeHtml(item.title)}</h4>
          <p class="item-desc">${escapeHtml(item.description)}</p>
          <div class="item-meta">
            <span>🏛️ <strong>Building:</strong> ${item.building} (${escapeHtml(item.specificLocation)})</span>
            <span>📅 <strong>Date:</strong> ${new Date(item.dateOccurred).toLocaleDateString()} &bull; 👁️ ${item.viewCount || 0}</span>
            <span>🔖 <strong>Ref ID:</strong> <code>${item.referenceCode || 'SAIU-LF-' + String(item._id).slice(-4).toUpperCase()}</code></span>
            <span>👤 <strong>Owner / Reporter:</strong> ${isMyReport ? '<strong style="color:var(--accent-amber);">You (Your Account)</strong>' : escapeHtml(item.ownerDetails?.name || item.reportedBy?.name || 'Anonymous')}</span>
          </div>
          <div class="item-actions" onclick="event.stopPropagation()">
            ${isMyReport ? `
              <a href="dashboard.html" class="btn btn-secondary btn-sm" style="width:100%; justify-content:center; border-color:var(--accent-amber); color:var(--accent-amber); text-decoration:none; display:flex; align-items:center; gap:0.4rem;">
                ⚙️ Manage Your Report
              </a>
            ` : (item.status === 'open' ? `
              <button class="btn btn-primary btn-sm" onclick="openClaimModal('${item._id}')" style="width: 100%;">
                Claim This Item
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" disabled style="width: 100%;opacity:0.65;">
                ${item.status === 'claimed' ? 'Verification In Progress' : 'Resolved & Returned'}
              </button>
            `)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// Workable Feature: Rich Item Details Modal Inspection & Quick Contact
window.openItemDetails = function(itemId) {
  const item = currentItems.find(i => String(i._id) === String(itemId));
  if (!item) return;

  const modal = document.getElementById('itemDetailsModal');
  if (!modal) return;

  document.getElementById('modalDetailTitle').textContent = item.title;
  document.getElementById('modalDetailImg').src = item.imageUrl || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80';
  document.getElementById('modalDetailCategory').textContent = item.category;
  document.getElementById('modalDetailBuilding').textContent = item.building;
  document.getElementById('modalDetailLocation').textContent = item.specificLocation;
  document.getElementById('modalDetailDesc').textContent = item.description;
  const refCode = item.referenceCode || ('SAIU-LF-' + String(item._id).slice(-4).toUpperCase());
  const nextViews = (item.viewCount || 0) + 1;
  item.viewCount = nextViews;

  document.getElementById('modalDetailDate').innerHTML = `Reported on ${new Date(item.dateOccurred).toLocaleDateString()} &bull; 👁️ ${nextViews} views &bull; <code style="background:rgba(56,189,248,0.15);color:var(--accent-cyan);padding:0.15rem 0.45rem;border-radius:6px;cursor:pointer;" title="Click to copy Reference ID" onclick="navigator.clipboard?.writeText('${refCode}');showToast('Copied Reference ID: ${refCode}')">📋 ${refCode}</code>`;

  // Increment viewCount in MongoDB asynchronously
  fetch(`/api/items/${itemId}`).catch(() => {});

  const typeTag = document.getElementById('modalDetailTypeTag');
  if (typeTag) {
    typeTag.textContent = item.type.toUpperCase();
    typeTag.className = `badge-tag tag-${item.type}`;
  }

  const statusBadge = document.getElementById('modalDetailStatusBadge');
  if (statusBadge) {
    statusBadge.textContent = item.status.toUpperCase();
    statusBadge.className = `status-badge status-${item.status}`;
  }

  const owner = item.ownerDetails || {};
  const reporterName = owner.name || item.reportedBy?.name || 'Sai University Student';
  const reporterRole = item.reportedBy?.role || 'student';
  const reporterId = owner.studentId || item.reportedBy?.studentId || 'Verified';
  const reporterDept = owner.department || item.reportedBy?.department || 'Sai University';
  const reporterPhone = (owner.phone && owner.phone !== 'N/A' ? owner.phone : item.reportedBy?.phone) || '';
  const reporterEmail = (owner.email && owner.email !== 'N/A' ? owner.email : item.reportedBy?.email) || '';

  document.getElementById('modalDetailReporterName').textContent = reporterName;
  document.getElementById('modalDetailReporterRole').textContent = `${reporterRole.toUpperCase()} • ${reporterId} • ${reporterDept}`;

  const contactLinks = document.getElementById('modalDetailContactLinks');
  if (contactLinks) {
    contactLinks.innerHTML = `
      ${reporterPhone && reporterPhone !== 'N/A' ? `
        <a href="tel:${reporterPhone.replace(/\s+/g, '')}" class="contact-btn contact-btn-tel">
          📞 Call (${reporterPhone})
        </a>
        <a href="https://wa.me/${reporterPhone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(reporterName)},%20I%20am%20contacting%20you%20regarding%20the%20lost%20and%20found%20listing:%20${encodeURIComponent(item.title)}" target="_blank" rel="noopener" class="contact-btn contact-btn-wa">
          💬 WhatsApp
        </a>
      ` : ''}
      ${reporterEmail ? `
        <a href="mailto:${reporterEmail}?subject=Regarding%20Sai%20University%20Lost%20and%20Found:%20${encodeURIComponent(item.title)}" class="contact-btn contact-btn-mail">
          ✉️ Email (${reporterEmail})
        </a>
      ` : ''}
    `;
  }

  const actionButtons = document.getElementById('modalDetailActionButtons');
  const repId = item.reportedBy?._id ? String(item.reportedBy._id) : (item.reportedBy ? String(item.reportedBy) : '');
  const curId = currentUser ? String(currentUser.id || currentUser._id) : '';
  const isReporter = Boolean(curId && repId && curId === repId);
  const isAdmin = currentUser && currentUser.role === 'admin';

  if (actionButtons) {
    if (isReporter) {
      actionButtons.innerHTML = `
        <div style="background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:0.6rem 0.8rem; margin-bottom:0.75rem; color:#fde68a; font-size:0.85rem; width:100%;">
          ⭐ <strong>You reported this item.</strong> You can review claims, update status, or manage it in your Student Dashboard.
        </div>
        <div style="display:flex; flex-direction:column; gap:0.5rem; width:100%;">
          <a href="dashboard.html" class="btn btn-primary" style="justify-content:center; text-decoration:none; background:linear-gradient(135deg, #f59e0b, #d97706); color:#000; font-weight:700;">
            📊 Open Student Dashboard
          </a>
          <div style="display:flex; gap:0.5rem; width:100%;">
            ${item.status !== 'resolved' ? `
              <button class="btn btn-success btn-sm" onclick="markItemResolvedFromModal('${item._id}')" style="flex:1; justify-content:center;">
                ✓ Mark Resolved
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" disabled style="flex:1; opacity:0.7; justify-content:center;">
                ✓ Resolved
              </button>
            `}
            <button class="btn btn-danger btn-sm" onclick="deleteItemFromModal('${item._id}')" style="flex:1; justify-content:center;">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    } else if (isAdmin) {
      actionButtons.innerHTML = `
        <div style="display:flex; gap:0.5rem; width:100%;">
          ${item.status !== 'resolved' ? `
            <button class="btn btn-success btn-sm" onclick="markItemResolvedFromModal('${item._id}')" style="flex:1; justify-content:center;">
              ✓ Mark Resolved (Admin)
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" disabled style="flex:1; opacity:0.7; justify-content:center;">
              ✓ Resolved & Handed Over
            </button>
          `}
          <button class="btn btn-danger btn-sm" onclick="deleteItemFromModal('${item._id}')" style="flex:1; justify-content:center;">
            🗑️ Delete Listing
          </button>
        </div>
      `;
    } else {
      actionButtons.innerHTML = `
        ${item.status === 'open' ? `
          <button class="btn btn-primary" onclick="closeItemDetails(); openClaimModal('${item._id}')" style="width:100%;justify-content:center;">
            ✋ Submit Ownership Claim
          </button>
        ` : `
          <button class="btn btn-secondary" disabled style="width:100%;justify-content:center;opacity:0.7;">
            ${item.status === 'claimed' ? 'Verification In Progress' : 'Resolved & Returned to Owner'}
          </button>
        `}
      `;
    }
  }

  modal.classList.remove('hidden');
};

window.closeItemDetails = function() {
  const modal = document.getElementById('itemDetailsModal');
  if (modal) modal.classList.add('hidden');
};

window.markItemResolvedFromModal = async function(itemId) {
  if (!confirm('Mark this listing as resolved and handed over?')) return;
  try {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'resolved' })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Item marked as resolved in MongoDB!');
      closeItemDetails();
      fetchItems();
    }
  } catch (err) {
    alert('Failed to update status');
  }
};

window.deleteItemFromModal = async function(itemId) {
  if (!confirm('Are you sure you want to permanently delete this listing?')) return;
  try {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Listing deleted from database.');
      closeItemDetails();
      fetchItems();
    }
  } catch (err) {
    alert('Failed to delete item listing');
  }
};

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
  window.scannedImageHash = '';
  window.scannedDetectedColors = [];
}

// Compute 64-bit Perceptual dHash & Dominant Colors in-browser (zero external APIs)
function analyzeImageSignature(imgSrc) {
  return new Promise((resolve) => {
    if (!imgSrc) return resolve({ imageHash: '', detectedColors: [] });
    const img = new Image();
    if (!imgSrc.startsWith('data:')) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve({ imageHash: '', detectedColors: [] }), 1200);
    img.onload = () => {
      clearTimeout(timer);
      try {
        // 1. 9x8 grayscale for 64-bit dHash
        const cHash = document.createElement('canvas');
        cHash.width = 9;
        cHash.height = 8;
        const ctxH = cHash.getContext('2d');
        ctxH.drawImage(img, 0, 0, 9, 8);
        const pxH = ctxH.getImageData(0, 0, 9, 8).data;
        let hash = '';
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const idx1 = (y * 9 + x) * 4;
            const idx2 = (y * 9 + x + 1) * 4;
            const g1 = pxH[idx1] * 0.299 + pxH[idx1 + 1] * 0.587 + pxH[idx1 + 2] * 0.114;
            const g2 = pxH[idx2] * 0.299 + pxH[idx2 + 1] * 0.587 + pxH[idx2 + 2] * 0.114;
            hash += g1 > g2 ? '1' : '0';
          }
        }

        // 2. 24x24 center crop for dominant colors
        const cCol = document.createElement('canvas');
        cCol.width = 24;
        cCol.height = 24;
        const ctxC = cCol.getContext('2d');
        ctxC.drawImage(img, 0, 0, 24, 24);
        const pxC = ctxC.getImageData(4, 4, 16, 16).data;
        const counts = {};
        for (let i = 0; i < pxC.length; i += 4) {
          const r = pxC[i], g = pxC[i + 1], b = pxC[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const diff = max - min;
          let col = 'grey';
          if (max < 55) col = 'black';
          else if (min > 200 && diff < 35) col = 'white';
          else if (diff < 30) col = 'silver';
          else if (r >= g && r >= b) {
            if (g > 150 && b < 100) col = 'yellow';
            else if (g > 90 && b < 80) col = 'orange';
            else if (r > 110 && g > 60 && b < 70 && max < 165) col = 'brown';
            else col = 'red';
          } else if (g >= r && g >= b) col = 'green';
          else if (b >= r && b >= g) col = (r > 110 && g < 90) ? 'purple' : 'blue';
          counts[col] = (counts[col] || 0) + 1;
        }
        const topColors = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(e => e[0]);

        resolve({ imageHash: hash, detectedColors: topColors });
      } catch (e) {
        resolve({ imageHash: '', detectedColors: [] });
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve({ imageHash: '', detectedColors: [] });
    };
    img.src = imgSrc;
  });
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

async function capturePhoto() {
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

  showToast('Photo captured! Analyzing visual signature & scanning database...');
  const sig = await analyzeImageSignature(scannedPhotoData);
  window.scannedImageHash = sig.imageHash;
  window.scannedDetectedColors = sig.detectedColors;
  executeScanMatch();
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(evt) {
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

    // Auto-populate keywords from meaningful file name (ignore generic IMG_1234 / photo names)
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
    const isGenericName = /^(img|dsc|photo|image|screenshot|pxl|vid|cam)\s*\d*$/i.test(cleanName);
    const keywordsInput = document.getElementById('scanItemKeywords');
    if (keywordsInput && !keywordsInput.value && !isGenericName) {
      keywordsInput.value = cleanName;
    }

    showToast('Photo uploaded! Analyzing visual signature & scanning database...');
    const sig = await analyzeImageSignature(scannedPhotoData);
    window.scannedImageHash = sig.imageHash;
    window.scannedDetectedColors = sig.detectedColors;
    executeScanMatch();
  };
  reader.readAsDataURL(file);
}

async function executeScanMatch() {
  const keywordsInput = document.getElementById('scanItemKeywords');
  const queryText = keywordsInput ? keywordsInput.value.trim() : '';
  const scanMode = document.getElementById('scanMode')?.value || 'all';
  const building = document.getElementById('scanBuilding')?.value || 'all';
  const category = document.getElementById('scanCategory')?.value || 'all';
  const resultsArea = document.getElementById('scanResultsArea');
  const imageHash = window.scannedImageHash || '';
  const detectedColors = window.scannedDetectedColors || [];

  if (!queryText && category === 'all' && !imageHash && detectedColors.length === 0) {
    showToast('Take/upload a photo, enter keywords, or pick a category to scan.');
    keywordsInput?.focus();
    return;
  }

  resultsArea.classList.remove('hidden');
  resultsArea.innerHTML = `
    <div style="text-align:center;padding:1.5rem;color:var(--accent-cyan);">
      <div style="font-size:1.8rem;animation:pulse 1.2s infinite;">📡</div>
      <p style="margin-top:0.5rem;font-weight:600;">Scanning Sai University MongoDB database...</p>
      <small style="color:var(--text-muted);">
        ${imageHash ? `Visual Fingerprint Active${detectedColors.length ? ` (${detectedColors.join(', ')})` : ''} &bull; ` : ''}
        Scope: ${building === 'all' ? 'All Buildings' : building}${queryText ? ` &bull; Keywords: ${escapeHtml(queryText)}` : ''}
      </small>
    </div>
  `;

  try {
    const res = await fetch('/api/items/scan-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryText, category, building, scanMode, imageHash, detectedColors })
    });
    const data = await res.json();

    if (data.success && data.matchFound && data.bestMatch) {
      const match = data.bestMatch;
      const owner = {
        name: match.ownerDetails?.name || match.reportedBy?.name || 'Sai University Member',
        email: (match.ownerDetails?.email && match.ownerDetails.email !== 'N/A' ? match.ownerDetails.email : match.reportedBy?.email) || 'N/A',
        phone: (match.ownerDetails?.phone && match.ownerDetails.phone !== 'N/A' ? match.ownerDetails.phone : match.reportedBy?.phone) || 'N/A',
        studentId: match.ownerDetails?.studentId || match.reportedBy?.studentId || 'Verified',
        department: match.ownerDetails?.department || match.reportedBy?.department || 'Sai University',
        role: match.reportedBy?.role || 'student'
      };
      const refCode = match.referenceCode || ('SAIU-LF-' + String(match._id).slice(-4).toUpperCase());
      const otherMatches = data.otherMatches || [];

      resultsArea.innerHTML = `
        <div class="scan-match-banner">
          <div class="scan-match-header">
            <div>
              <span style="font-size:1.1rem;font-weight:800;color:#6ee7b7;">🎯 ${data.totalMatches || 1} Match${(data.totalMatches || 1) > 1 ? 'es' : ''} Found in Campus Database!</span>
              <p style="font-size:0.78rem;color:var(--text-secondary);">Top matching ${match.type.toUpperCase()} report from Sai University database.</p>
            </div>
            <span class="match-confidence-pill">${match.matchScore || 90}% Match</span>
          </div>

          <!-- Matched Item Summary -->
          <div style="display:flex;gap:1rem;background:rgba(10,13,19,0.7);padding:0.9rem;border-radius:10px;border:1px solid var(--border-subtle);align-items:center;">
            <img src="${match.imageUrl}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0;" onerror="this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80'">
            <div>
              <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.2rem;">
                <span class="badge-tag tag-${match.type}" style="font-size:0.65rem;padding:0.1rem 0.45rem;">${match.type.toUpperCase()}</span>
                <code style="font-size:0.72rem;color:#fbbf24;">${refCode}</code>
              </div>
              <strong style="font-size:1.05rem;color:#fff;">${escapeHtml(match.title)}</strong><br>
              <span style="font-size:0.8rem;color:var(--accent-cyan);font-weight:600;">${match.category}</span> &bull; 
              <span style="font-size:0.8rem;color:var(--text-muted);">${match.building} (${escapeHtml(match.specificLocation)})</span><br>
              <small style="font-size:0.75rem;color:var(--text-secondary);">Date: ${new Date(match.dateOccurred).toLocaleDateString()}</small>
            </div>
          </div>

          <!-- OWNER DETAILS BOX -->
          <div class="owner-details-card">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-subtle);padding-bottom:0.5rem;">
              <strong style="color:var(--accent-cyan);font-size:0.85rem;letter-spacing:1px;text-transform:uppercase;">Owner / Reporter Details</strong>
              <span style="font-size:0.72rem;background:rgba(56,189,248,0.15);color:#7dd3fc;padding:0.2rem 0.5rem;border-radius:4px;border:1px solid rgba(56,189,248,0.3);">${escapeHtml(owner.studentId)}</span>
            </div>

            <div class="owner-info-row">
              <span style="color:var(--text-muted);">Name:</span>
              <strong style="color:#fff;">${escapeHtml(owner.name)}</strong>
            </div>

            <div class="owner-info-row">
              <span style="color:var(--text-muted);">Department:</span>
              <span style="color:#cbd5e1;">${escapeHtml(owner.department)} (${escapeHtml(owner.role)})</span>
            </div>

            <div class="owner-info-row">
              <span style="color:var(--text-muted);">Sai University Email:</span>
              <a href="mailto:${owner.email}?subject=Regarding%20Campus%20Item:%20${encodeURIComponent(match.title)}" style="color:var(--accent-cyan);text-decoration:none;font-weight:600;">${escapeHtml(owner.email)}</a>
            </div>

            <div class="owner-info-row">
              <span style="color:var(--text-muted);">Contact Phone:</span>
              <span style="color:#34d399;font-weight:600;">${escapeHtml(owner.phone)}</span>
            </div>

            <div class="owner-actions-row" style="display:flex;flex-wrap:wrap;gap:0.5rem;">
              ${owner.email && owner.email !== 'N/A' ? `
                <a href="mailto:${owner.email}?subject=Found%20/Regarding%20Item:%20${encodeURIComponent(match.title)}&body=Hello%20${encodeURIComponent(owner.name)},%20I%20am%20reaching%20out%20via%20Sai%20University%20Lost%20%26%20Found%20regarding:%20${encodeURIComponent(match.title)}." class="btn btn-primary btn-sm" style="flex:1;justify-content:center;">
                  ✉️ Email
                </a>
              ` : ''}
              ${owner.phone && owner.phone !== 'N/A' ? `
                <a href="https://wa.me/${owner.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(owner.name)},%20regarding%20${encodeURIComponent(match.title)}%20on%20Sai%20University%20Lost%20%26%20Found" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="flex:1;justify-content:center;border-color:rgba(34,197,94,0.4);color:#4ade80;">
                  💬 WhatsApp
                </a>
                <a href="tel:${owner.phone.replace(/\s+/g, '')}" class="btn btn-secondary btn-sm" style="flex:1;justify-content:center;">
                  📞 Call
                </a>
              ` : ''}
            </div>
          </div>

          ${otherMatches.length > 0 ? `
            <div style="margin-top:0.9rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:0.78rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem;">Other Possible Matches (${otherMatches.length})</div>
              <div style="display:flex;flex-direction:column;gap:0.5rem;">
                ${otherMatches.map(m => `
                  <div onclick="closeScannerModal(); openItemDetails('${m._id}');" style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;padding:0.6rem 0.8rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;cursor:pointer;">
                    <div style="display:flex;align-items:center;gap:0.6rem;">
                      <span class="badge-tag tag-${m.type}" style="font-size:0.62rem;padding:0.1rem 0.4rem;">${m.type.toUpperCase()}</span>
                      <div>
                        <div style="font-size:0.85rem;font-weight:600;color:#fff;">${escapeHtml(m.title)}</div>
                        <small style="font-size:0.72rem;color:var(--text-muted);">${m.building} &bull; ${escapeHtml(m.ownerDetails?.name || m.reportedBy?.name || 'Reporter')}</small>
                      </div>
                    </div>
                    <span style="font-size:0.74rem;color:var(--accent-cyan);font-weight:700;">${m.matchScore}%</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      const nextReportType = scanMode === 'found' ? 'lost' : 'found';
      resultsArea.innerHTML = `
        <div class="no-match-box">
          <span style="font-size:2rem;">🔍</span>
          <strong style="color:#ffffff;">No Matching Active Reports Found</strong>
          <p style="font-size:0.85rem;color:var(--text-secondary);max-width:440px;">
            No matching report exists in MongoDB yet. List this as a <strong>${nextReportType === 'found' ? 'Found' : 'Lost'} Item</strong> right now so campus members can discover it!
          </p>
          <button type="button" id="btnPrefillFromScan" class="btn btn-primary btn-sm">
            ✨ List as ${nextReportType === 'found' ? 'Found' : 'Lost'} Item in 1-Click
          </button>
        </div>
      `;
      document.getElementById('btnPrefillFromScan')?.addEventListener('click', () => {
        prefillFoundReport(queryText || category, building, category, nextReportType);
      });
    }
  } catch (err) {
    resultsArea.innerHTML = `<p style="color:var(--danger);text-align:center;">Error communicating with server during scan.</p>`;
  }
}

window.prefillFoundReport = function(title, building, category, reportType = 'found') {
  closeScannerModal();
  if (!authToken) {
    showToast('Please sign in to list this item.');
    openAuthModal();
    return;
  }

  // Pre-fill report form
  document.getElementById('reportType').value = reportType;
  document.getElementById('reportTitle').value = title === 'all' ? '' : title;
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
  const drawerUserStatus = document.getElementById('drawerUserStatus');
  const drawerItemsCount = document.getElementById('drawerItemsCount');
  const drawerMyReportsBtn = document.getElementById('drawerMyReportsBtn');
  const drawerLogoutBtn = document.getElementById('drawerLogoutBtn');

  if (drawerUserStatus) {
    if (authToken && currentUser) {
      drawerUserStatus.textContent = `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : '🎓 Student'})`;
    } else {
      drawerUserStatus.textContent = 'Guest Session (Not Signed In)';
    }
  }
  if (drawerItemsCount) {
    drawerItemsCount.textContent = `${currentItems.length} Active ${currentItems.length === 1 ? 'Listing' : 'Listings'}`;
  }
  if (drawerMyReportsBtn) {
    drawerMyReportsBtn.classList.toggle('hidden', !authToken);
  }
  if (drawerLogoutBtn) {
    drawerLogoutBtn.classList.toggle('hidden', !authToken);
  }

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

  // Close menu with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBlurDrawer?.classList.contains('open')) {
      closeMenu();
    }
  });

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

  const drawerLostLink = document.getElementById('drawerLostLink');
  if (drawerLostLink) {
    drawerLostLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
      if (filterType) filterType.value = 'lost';
      fetchItems();
      document.getElementById('itemsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const drawerFoundLink = document.getElementById('drawerFoundLink');
  if (drawerFoundLink) {
    drawerFoundLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
      if (filterType) filterType.value = 'found';
      fetchItems();
      document.getElementById('itemsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const drawerMyReportsBtn = document.getElementById('drawerMyReportsBtn');
  if (drawerMyReportsBtn) {
    drawerMyReportsBtn.addEventListener('click', () => {
      closeMenu();
      document.getElementById('chipMyReports')?.click();
      document.getElementById('itemsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const drawerLogoutBtn = document.getElementById('drawerLogoutBtn');
  if (drawerLogoutBtn) {
    drawerLogoutBtn.addEventListener('click', () => {
      closeMenu();
      handleLogout();
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
        window.location.href = 'login.html';
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

  const scanKeywordsInput = document.getElementById('scanItemKeywords');
  if (scanKeywordsInput) {
    scanKeywordsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeScanMatch();
      }
    });
  }
  document.querySelectorAll('.scan-quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (scanKeywordsInput) scanKeywordsInput.value = chip.dataset.kw || '';
      executeScanMatch();
    });
  });

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

  // --- Optimized Auth Modal State & Validation ---
  const tabSignIn = document.getElementById('tabSignIn');
  const tabRegister = document.getElementById('tabRegister');
  const authToggleLink = document.getElementById('authToggleLink');
  const authTogglePrompt = document.getElementById('authTogglePrompt');
  const authModalTitle = document.getElementById('authModalTitle');
  const registerFields = document.getElementById('registerFields');
  const authQuickFillBar = document.getElementById('authQuickFillBar');
  const authStrengthContainer = document.getElementById('authStrengthContainer');
  const btnAuthSubmit = document.getElementById('btnAuthSubmit');
  const authSubmitText = document.getElementById('authSubmitText');
  const authToggleBtn = document.getElementById('authToggleBtn');
  const authToggleText = document.getElementById('authToggleText');
  const authAlert = document.getElementById('authAlert');
  const authAlertText = document.getElementById('authAlertText');
  const authAlertIcon = document.getElementById('authAlertIcon');
  const authEmailInput = document.getElementById('authEmail');
  const authPasswordInput = document.getElementById('authPassword');
  const emailDomainHint = document.getElementById('emailDomainHint');
  const btnTogglePassword = document.getElementById('btnTogglePassword');

  function showAuthAlert(msg, isSuccess = false) {
    if (!authAlert) return;
    authAlert.classList.remove('hidden', 'neo-alert-error', 'neo-alert-success', 'auth-alert-error', 'auth-alert-success');
    authAlert.classList.add(isSuccess ? 'neo-alert-success' : 'neo-alert-error');
    if (authAlertText) authAlertText.textContent = msg;
    if (authAlertIcon) authAlertIcon.textContent = isSuccess ? '✅' : '⚠️';
  }

  function hideAuthAlert() {
    if (authAlert) authAlert.classList.add('hidden');
  }

  function setAuthMode(register) {
    isRegisterMode = register;
    hideAuthAlert();

    if (isRegisterMode) {
      if (tabRegister) tabRegister.classList.add('active');
      if (tabSignIn) tabSignIn.classList.remove('active');
      if (registerFields) registerFields.classList.remove('hidden');
      if (authQuickFillBar) authQuickFillBar.classList.add('hidden');
      if (authStrengthContainer) authStrengthContainer.classList.remove('hidden');
      if (authModalTitle) authModalTitle.textContent = 'REGISTER STUDENT';
      if (authSubmitText) authSubmitText.textContent = 'CREATE ACCOUNT';
      if (authToggleText) authToggleText.textContent = 'ALREADY REGISTERED? SIGN IN';
      if (authTogglePrompt) authTogglePrompt.textContent = 'Already have an account?';
      if (authToggleLink) authToggleLink.textContent = 'Sign In';
      const nameInput = document.getElementById('authName');
      if (nameInput) nameInput.focus();
    } else {
      if (tabSignIn) tabSignIn.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      if (registerFields) registerFields.classList.add('hidden');
      if (authQuickFillBar) authQuickFillBar.classList.remove('hidden');
      if (authStrengthContainer) authStrengthContainer.classList.add('hidden');
      if (authModalTitle) authModalTitle.textContent = 'SIGN IN TO CAMPUS';
      if (authSubmitText) authSubmitText.textContent = 'SIGN IN';
      if (authToggleText) authToggleText.textContent = 'NEW HERE? REGISTER';
      if (authTogglePrompt) authTogglePrompt.textContent = 'New student?';
      if (authToggleLink) authToggleLink.textContent = 'Create account';
      if (authEmailInput) authEmailInput.focus();
    }
  }

  if (tabSignIn) tabSignIn.addEventListener('click', () => setAuthMode(false));
  if (tabRegister) tabRegister.addEventListener('click', () => setAuthMode(true));
  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setAuthMode(!isRegisterMode);
    });
  }
  if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      setAuthMode(!isRegisterMode);
    });
  }

  // Quick-Fill Demo Account Buttons
  const chipFillStudent = document.getElementById('chipFillStudent');
  if (chipFillStudent) {
    chipFillStudent.addEventListener('click', () => {
      if (authEmailInput) authEmailInput.value = 'saisravan@saiuniversity.edu.in';
      if (authPasswordInput) authPasswordInput.value = 'StudentPassword123';
      hideAuthAlert();
      showToast('Loaded Student: saisravan@saiuniversity.edu.in');
    });
  }

  const chipFillAdmin = document.getElementById('chipFillAdmin');
  if (chipFillAdmin) {
    chipFillAdmin.addEventListener('click', () => {
      if (authEmailInput) authEmailInput.value = 'admin@saiuniversity.edu.in';
      if (authPasswordInput) authPasswordInput.value = 'AdminPassword123';
      hideAuthAlert();
      showToast('Loaded Campus Admin: admin@saiuniversity.edu.in');
    });
  }

  // Password Visibility Toggle
  if (btnTogglePassword && authPasswordInput) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = authPasswordInput.type === 'password';
      authPasswordInput.type = isPassword ? 'text' : 'password';
      btnTogglePassword.textContent = isPassword ? '🙈' : '👁️';
    });
  }

  // Email Domain Hint
  if (authEmailInput && emailDomainHint) {
    authEmailInput.addEventListener('input', () => {
      const val = authEmailInput.value.trim();
      if (val.length > 2 && !val.includes('@')) {
        emailDomainHint.classList.remove('hidden');
      } else {
        emailDomainHint.classList.add('hidden');
      }
    });

    emailDomainHint.addEventListener('click', () => {
      const val = authEmailInput.value.trim();
      if (!val.includes('@')) {
        authEmailInput.value = val + '@saiuniversity.edu.in';
        emailDomainHint.classList.add('hidden');
        if (authPasswordInput) authPasswordInput.focus();
      }
    });
  }

  // Live Password Strength Calculation
  if (authPasswordInput) {
    authPasswordInput.addEventListener('input', () => {
      if (!isRegisterMode) return;
      const pwd = authPasswordInput.value;
      const b1 = document.getElementById('strBar1');
      const b2 = document.getElementById('strBar2');
      const b3 = document.getElementById('strBar3');
      const b4 = document.getElementById('strBar4');
      const label = document.getElementById('authStrengthText');

      let score = 0;
      if (pwd.length >= 6) score++;
      if (pwd.length >= 10) score++;
      if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
      if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;

      const resetBars = () => [b1, b2, b3, b4].forEach(b => { if (b) b.style.backgroundColor = 'rgba(255,255,255,0.1)'; });
      resetBars();

      if (pwd.length === 0) {
        if (label) label.textContent = 'Password strength: Minimum 6 characters';
        return;
      }

      if (score === 1) {
        if (b1) b1.style.backgroundColor = '#ef4444';
        if (label) { label.textContent = 'Weak (add numbers & symbols)'; label.style.color = '#f87171'; }
      } else if (score === 2) {
        if (b1) b1.style.backgroundColor = '#f59e0b';
        if (b2) b2.style.backgroundColor = '#f59e0b';
        if (label) { label.textContent = 'Fair (make it 8+ chars)'; label.style.color = '#fbbf24'; }
      } else if (score === 3) {
        if (b1) b1.style.backgroundColor = '#38bdf8';
        if (b2) b2.style.backgroundColor = '#38bdf8';
        if (b3) b3.style.backgroundColor = '#38bdf8';
        if (label) { label.textContent = 'Good (secure password)'; label.style.color = '#38bdf8'; }
      } else if (score >= 4) {
        if (b1) b1.style.backgroundColor = '#22c55e';
        if (b2) b2.style.backgroundColor = '#22c55e';
        if (b3) b3.style.backgroundColor = '#22c55e';
        if (b4) b4.style.backgroundColor = '#22c55e';
        if (label) { label.textContent = 'Strong (excellent protection)'; label.style.color = '#4ade80'; }
      }
    });
  }

  let selectedReportPhotoBase64 = '';
  const reportImageFile = document.getElementById('reportImageFile');
  const reportPhotoPreviewWrap = document.getElementById('reportPhotoPreviewWrap');
  const reportPhotoPreview = document.getElementById('reportPhotoPreview');
  const reportPhotoSize = document.getElementById('reportPhotoSize');
  const btnRemoveReportPhoto = document.getElementById('btnRemoveReportPhoto');

  if (reportImageFile) {
    reportImageFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        selectedReportPhotoBase64 = event.target.result;
        if (reportPhotoPreview) reportPhotoPreview.src = selectedReportPhotoBase64;
        if (reportPhotoPreviewWrap) reportPhotoPreviewWrap.classList.remove('hidden');
        if (reportPhotoSize) reportPhotoSize.textContent = `${(file.size / 1024).toFixed(0)} KB • Photo attached to report`;
        showToast('Photo attached from your device!');
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveReportPhoto) {
    btnRemoveReportPhoto.addEventListener('click', () => {
      selectedReportPhotoBase64 = '';
      if (reportImageFile) reportImageFile.value = '';
      if (reportPhotoPreviewWrap) reportPhotoPreviewWrap.classList.add('hidden');
    });
  }

  // Quick Filter Chips Listener (Includes 'My Reported Items' filter)
  const quickFilterChips = document.getElementById('quickFilterChips');
  if (quickFilterChips) {
    quickFilterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      quickFilterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      if (chip.dataset.userFilter === 'me') {
        activeUserFilter = 'me';
        filterType.value = 'all';
        filterCategory.value = 'all';
      } else {
        activeUserFilter = null;
        if (chip.dataset.type) {
          filterType.value = chip.dataset.type;
        }
        if (chip.dataset.cat) {
          filterCategory.value = chip.dataset.cat;
        }
      }
      fetchItems();
    });
  }

  // Item Details Modal Close Button
  document.getElementById('btnCloseItemDetails')?.addEventListener('click', closeItemDetails);

  // Submit Report Form
  document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!authToken) {
      showToast('Please sign in first to report an item.');
      openAuthModal();
      return;
    }

    const imageUrl = selectedReportPhotoBase64 || document.getElementById('reportImage').value.trim();
    const sig = imageUrl ? await analyzeImageSignature(imageUrl) : { imageHash: '' };

    const payload = {
      title: document.getElementById('reportTitle').value.trim(),
      type: document.getElementById('reportType').value,
      category: document.getElementById('reportCategory').value,
      building: document.getElementById('reportBuilding').value,
      specificLocation: document.getElementById('reportLocation').value.trim(),
      dateOccurred: document.getElementById('reportDate').value,
      description: document.getElementById('reportDescription').value.trim(),
      imageUrl,
      imageHash: sig.imageHash || ''
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
        showToast('Report submitted to campus portal and saved in MongoDB!');
        reportModal.classList.add('hidden');
        document.getElementById('reportForm').reset();
        selectedReportPhotoBase64 = '';
        if (reportImageFile) reportImageFile.value = '';
        if (reportPhotoPreviewWrap) reportPhotoPreviewWrap.classList.add('hidden');
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
    hideAuthAlert();

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (!email || !password) {
      showAuthAlert('Please enter your email and password.');
      return;
    }

    if (isRegisterMode) {
      const name = document.getElementById('authName').value.trim();
      if (!name) {
        showAuthAlert('Please provide your full student / staff name.');
        return;
      }
      if (password.length < 6) {
        showAuthAlert('Password must be at least 6 characters long.');
        return;
      }
    }

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const payload = { email, password };

    if (isRegisterMode) {
      payload.name = document.getElementById('authName').value.trim();
      payload.role = document.getElementById('authRole').value;
      payload.studentId = document.getElementById('authStudentId')?.value.trim() || undefined;
      payload.department = document.getElementById('authDepartment')?.value.trim() || undefined;
      payload.phone = document.getElementById('authPhone')?.value.trim() || undefined;
    }

    // Set Loading State
    if (btnAuthSubmit) btnAuthSubmit.disabled = true;
    if (authSubmitText) {
      authSubmitText.innerHTML = `<span class="auth-btn-spinner"></span> ${isRegisterMode ? 'Creating Account...' : 'Signing in...'}`;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showAuthAlert(isRegisterMode ? 'Account registered successfully! Logging you in...' : 'Verified! Access granted.', true);
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('sai_portal_token', authToken);
        localStorage.setItem('sai_portal_user', JSON.stringify(currentUser));
        setupNavbar();

        setTimeout(() => {
          authModal.classList.add('hidden');
          showToast(`Welcome to SAIU Portal, ${currentUser.name}!`);
          if (btnAuthSubmit) btnAuthSubmit.disabled = false;
          if (authSubmitText) authSubmitText.textContent = isRegisterMode ? 'CREATE ACCOUNT' : 'SIGN IN';
          document.getElementById('authForm').reset();
          hideAuthAlert();
        }, 700);
      } else {
        if (btnAuthSubmit) btnAuthSubmit.disabled = false;
        if (authSubmitText) authSubmitText.textContent = isRegisterMode ? 'CREATE ACCOUNT' : 'SIGN IN';
        showAuthAlert(data.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      if (btnAuthSubmit) btnAuthSubmit.disabled = false;
      if (authSubmitText) authSubmitText.textContent = isRegisterMode ? 'CREATE ACCOUNT' : 'SIGN IN';
      showAuthAlert('Connection error with MongoDB authentication server.');
    }
  });
}

function openAuthModal() {
  const authAlert = document.getElementById('authAlert');
  if (authAlert) authAlert.classList.add('hidden');
  if (authModal) authModal.classList.remove('hidden');
  const emailInput = document.getElementById('authEmail');
  if (emailInput) setTimeout(() => emailInput.focus(), 150);
}

window.openReportModal = function() {
  if (!authToken) {
    showToast('Please sign in to report a lost or found item.');
    openAuthModal();
    return;
  }
  if (reportModal) reportModal.classList.remove('hidden');
};

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
