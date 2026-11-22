document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect') || 'dashboard.html';

  // 1. Session Check & State Management
  checkExistingSession();

  // 2. Unified Tab Navigation (No separate student vs admin sign in)
  const tabBtnLogin = document.getElementById('tabBtnLogin');
  const tabBtnRegister = document.getElementById('tabBtnRegister');

  const unifiedLoginForm = document.getElementById('unifiedLoginForm');
  const studentRegisterForm = document.getElementById('studentRegisterForm');

  function switchTab(activeTab) {
    hideAlert();
    [tabBtnLogin, tabBtnRegister].forEach(b => { if (b) b.classList.remove('active'); });
    [unifiedLoginForm, studentRegisterForm].forEach(f => { if (f) f.classList.add('hidden'); });

    const portalHeaderTitle = document.getElementById('portalHeaderTitle');

    if (activeTab === 'login') {
      if (tabBtnLogin) tabBtnLogin.classList.add('active');
      if (unifiedLoginForm) unifiedLoginForm.classList.remove('hidden');
      if (portalHeaderTitle) portalHeaderTitle.textContent = 'SIGN IN TO CAMPUS';
    } else if (activeTab === 'register') {
      if (tabBtnRegister) tabBtnRegister.classList.add('active');
      if (studentRegisterForm) studentRegisterForm.classList.remove('hidden');
      if (portalHeaderTitle) portalHeaderTitle.textContent = 'REGISTER TO CAMPUS';
    }
  }

  tabBtnLogin?.addEventListener('click', () => switchTab('login'));
  tabBtnRegister?.addEventListener('click', () => switchTab('register'));

  document.getElementById('btnToggleToRegister')?.addEventListener('click', () => switchTab('register'));
  document.getElementById('btnToggleToLogin')?.addEventListener('click', () => switchTab('login'));

  // Check URL tab query param (e.g. ?tab=register)
  if (urlParams.get('tab') === 'register') {
    switchTab('register');
  } else {
    switchTab('login');
  }

  // 3. Password Visibility Toggles
  setupPasswordToggle('toggleLoginPassword', 'loginPassword');
  setupPasswordToggle('toggleRegPassword', 'regPassword');

  // 5. Live Password Strength Meter for Registration
  const regPassword = document.getElementById('regPassword');
  const bar1 = document.getElementById('regStrBar1');
  const bar2 = document.getElementById('regStrBar2');
  const bar3 = document.getElementById('regStrBar3');
  const strText = document.getElementById('regStrengthText');

  if (regPassword) {
    regPassword.addEventListener('input', () => {
      const val = regPassword.value;
      let score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
      if (val.length >= 10 && /[^A-Za-z0-9]/.test(val)) score++;

      [bar1, bar2, bar3].forEach(b => { if (b) b.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; });

      if (score === 1) {
        if (bar1) bar1.style.backgroundColor = '#f87171';
        if (strText) { strText.textContent = 'Weak (At least 6 characters)'; strText.style.color = '#f87171'; }
      } else if (score === 2) {
        if (bar1) bar1.style.backgroundColor = '#fbbf24';
        if (bar2) bar2.style.backgroundColor = '#fbbf24';
        if (strText) { strText.textContent = 'Good (Mixed alphanumeric)'; strText.style.color = '#fbbf24'; }
      } else if (score === 3) {
        if (bar1) bar1.style.backgroundColor = '#34d399';
        if (bar2) bar2.style.backgroundColor = '#34d399';
        if (bar3) bar3.style.backgroundColor = '#34d399';
        if (strText) { strText.textContent = 'Strong (Excellent security)'; strText.style.color = '#34d399'; }
      } else {
        if (strText) { strText.textContent = 'Minimum 6 characters'; strText.style.color = 'var(--text-muted)'; }
      }
    });
  }

  // 6. Single Unified Sign-In Submission (Automatically segregates Student vs Admin View based on credentials)
  unifiedLoginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('btnLoginSubmit');

    hideAlert();
    setButtonLoading(submitBtn, 'Authenticating...');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        saveSession(data.token, data.user);
        
        // Segregate feedback and dashboard view based on user role from MongoDB
        if (data.user.role === 'admin') {
          showAlert(`🛡️ Security Administrator authenticated (${data.user.name}). Loading Admin Console...`, 'success');
        } else {
          showAlert(`🎓 Welcome back, ${data.user.name}! Loading Student Portal...`, 'success');
        }

        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 1100);
      } else {
        showAlert(data.message || 'Invalid email or password', 'error');
        resetButton(submitBtn, 'SIGN IN');
      }
    } catch (err) {
      showAlert('Could not connect to authentication server. Please check your connection.', 'error');
      resetButton(submitBtn, 'SIGN IN');
    }
  });

  // 9. New Student Registration Submission
  studentRegisterForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim().toLowerCase();
    const studentId = document.getElementById('regStudentId')?.value.trim();
    const phone = document.getElementById('regPhone')?.value.trim();
    const department = document.getElementById('regDept')?.value || 'School of Computing & Data Science';
    const yearOfStudy = document.getElementById('regYear')?.value || '3rd Year Undergrad';
    const password = document.getElementById('regPassword')?.value;
    const submitBtn = document.getElementById('btnRegisterSubmit');

    hideAlert();

    // University Domain Check
    if (!email || !email.includes('saiuniversity.edu.in')) {
      showAlert('⚠️ Email must contain or end with saiuniversity.edu.in (e.g. yourname@saiuniversity.edu.in)', 'error');
      document.getElementById('regEmail')?.focus();
      return;
    }

    if (!name || !password) {
      showAlert('Please enter your full name and password', 'error');
      return;
    }

    setButtonLoading(submitBtn, 'Creating Account...');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          studentId,
          phone,
          department,
          yearOfStudy,
          password,
          role: 'student'
        })
      });
      const data = await res.json();

      if (data.success) {
        saveSession(data.token, data.user);
        showAlert('Registration complete! Account saved in MongoDB. Redirecting to your dashboard...', 'success');
        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 1200);
      } else {
        showAlert(data.message || 'Registration failed. Please check inputs.', 'error');
        resetButton(submitBtn, 'CREATE ACCOUNT');
      }
    } catch (err) {
      showAlert('Server connection error during registration.', 'error');
      resetButton(submitBtn, 'CREATE ACCOUNT');
    }
  });

  // 10. Switch Account / Sign Out Handler
  document.getElementById('btnSwitchAccount')?.addEventListener('click', () => {
    localStorage.removeItem('sai_portal_token');
    localStorage.removeItem('sai_portal_user');
    checkExistingSession();
    showAlert('Signed out of previous session. You can now log in.', 'success');
  });

  // 11. Password Reset Modal Setup
  const resetModal = document.getElementById('resetModal');
  const btnForgotStudent = document.getElementById('btnForgotStudent');
  const btnForgotAdmin = document.getElementById('btnForgotAdmin');
  const btnHelpModalTrigger = document.getElementById('btnHelpModalTrigger');
  const btnCloseReset = document.getElementById('btnCloseReset');

  function openResetModal() {
    if (resetModal) resetModal.classList.remove('hidden');
    const resetAlert = document.getElementById('resetAlert');
    if (resetAlert) resetAlert.classList.add('hidden');
  }

  btnForgotStudent?.addEventListener('click', openResetModal);
  btnForgotAdmin?.addEventListener('click', openResetModal);
  btnHelpModalTrigger?.addEventListener('click', openResetModal);
  btnCloseReset?.addEventListener('click', () => {
    if (resetModal) resetModal.classList.add('hidden');
  });

  document.getElementById('resetPasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();
    const newPassword = document.getElementById('resetNewPassword').value;
    const btnReset = document.getElementById('btnResetSubmit');
    const alertBox = document.getElementById('resetAlert');
    const alertText = document.getElementById('resetAlertText');

    if (btnReset) {
      btnReset.disabled = true;
      btnReset.innerHTML = '<span class="auth-btn-spinner"></span> Updating MongoDB...';
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });
      const data = await res.json();

      if (data.success) {
        if (alertBox) {
          alertBox.className = 'auth-alert auth-alert-success';
          alertBox.classList.remove('hidden');
        }
        if (alertText) alertText.textContent = data.message || 'Password successfully updated!';
        setTimeout(() => {
          if (resetModal) resetModal.classList.add('hidden');
          switchTab('student');
          document.getElementById('studentEmail').value = email;
          document.getElementById('studentPassword').value = newPassword;
          showAlert('Password updated in database! Click Sign In to continue.', 'success');
        }, 1500);
      } else {
        if (alertBox) {
          alertBox.className = 'auth-alert auth-alert-error';
          alertBox.classList.remove('hidden');
        }
        if (alertText) alertText.textContent = data.message || 'Password reset error.';
      }
    } catch (err) {
      if (alertBox) {
        alertBox.className = 'auth-alert auth-alert-error';
        alertBox.classList.remove('hidden');
      }
      if (alertText) alertText.textContent = 'Server connection error.';
    } finally {
      if (btnReset) {
        btnReset.disabled = false;
        btnReset.textContent = '🔄 Update Password in Database';
      }
    }
  });
});

// Helper Functions
function checkExistingSession() {
  const token = localStorage.getItem('sai_portal_token');
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('sai_portal_user'));
  } catch (e) {
    user = null;
  }

  const activeBanner = document.getElementById('activeSessionBlock');
  const formsContainer = document.getElementById('authFormsContainer');
  const nameEl = document.getElementById('activeSessionName');
  const metaEl = document.getElementById('activeSessionMeta');

  if (token && user) {
    if (activeBanner) activeBanner.classList.remove('hidden');
    if (formsContainer) formsContainer.classList.add('hidden');
    if (nameEl) nameEl.textContent = `Signed In: ${user.name}`;
    if (metaEl) metaEl.textContent = `${user.email} • ${user.role.toUpperCase()} ${user.studentId ? `(${user.studentId})` : ''}`;
  } else {
    if (activeBanner) activeBanner.classList.add('hidden');
    if (formsContainer) formsContainer.classList.remove('hidden');
  }
}

function saveSession(token, user) {
  localStorage.setItem('sai_portal_token', token);
  localStorage.setItem('sai_portal_user', JSON.stringify(user));
}

function setupPasswordToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (btn && input) {
    btn.addEventListener('click', () => {
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      btn.textContent = isPwd ? '🙈' : '👁️';
    });
  }
}

function showAlert(message, type = 'error') {
  const alertBox = document.getElementById('portalAlert');
  const alertText = document.getElementById('portalAlertText');
  const alertIcon = document.getElementById('portalAlertIcon');
  if (!alertBox || !alertText) return;

  alertBox.className = `neo-alert neo-alert-${type}`;
  alertIcon.textContent = type === 'success' ? '✅' : '⚠️';
  alertText.textContent = message;
  alertBox.classList.remove('hidden');
}

function hideAlert() {
  const alertBox = document.getElementById('portalAlert');
  if (alertBox) alertBox.classList.add('hidden');
}

function setButtonLoading(btn, loadingText) {
  if (!btn) return;
  btn.disabled = true;
  btn.dataset.originalText = btn.innerHTML;
  btn.innerHTML = `<span class="auth-btn-spinner"></span> ${loadingText}`;
}

function resetButton(btn, defaultText) {
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = defaultText || btn.dataset.originalText || 'Submit';
}
