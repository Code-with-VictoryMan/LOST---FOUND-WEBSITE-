document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect') || 'dashboard.html';

  // 1. Session Check & State Management
  checkExistingSession();

  // 2. Tab Navigation
  const tabBtnStudent = document.getElementById('tabBtnStudent');
  const tabBtnAdmin = document.getElementById('tabBtnAdmin');
  const tabBtnRegister = document.getElementById('tabBtnRegister');

  const studentLoginForm = document.getElementById('studentLoginForm');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const studentRegisterForm = document.getElementById('studentRegisterForm');

  function switchTab(activeTab) {
    hideAlert();
    [tabBtnStudent, tabBtnAdmin, tabBtnRegister].forEach(b => b.classList.remove('active'));
    [studentLoginForm, adminLoginForm, studentRegisterForm].forEach(f => f.classList.add('hidden'));

    const portalHeaderTitle = document.getElementById('portalHeaderTitle');

    if (activeTab === 'student') {
      tabBtnStudent.classList.add('active');
      studentLoginForm.classList.remove('hidden');
      if (portalHeaderTitle) portalHeaderTitle.textContent = 'SIGN IN TO CAMPUS';
    } else if (activeTab === 'admin') {
      tabBtnAdmin.classList.add('active');
      adminLoginForm.classList.remove('hidden');
      if (portalHeaderTitle) portalHeaderTitle.textContent = 'CAMPUS SECURITY CONSOLE';
    } else if (activeTab === 'register') {
      tabBtnRegister.classList.add('active');
      studentRegisterForm.classList.remove('hidden');
      if (portalHeaderTitle) portalHeaderTitle.textContent = 'REGISTER TO CAMPUS';
    }
  }

  tabBtnStudent.addEventListener('click', () => switchTab('student'));
  tabBtnAdmin.addEventListener('click', () => switchTab('admin'));
  tabBtnRegister.addEventListener('click', () => switchTab('register'));

  document.getElementById('btnToggleToRegister')?.addEventListener('click', () => switchTab('register'));
  document.getElementById('btnToggleToLogin')?.addEventListener('click', () => switchTab('student'));
  document.getElementById('btnBackToStudent')?.addEventListener('click', () => switchTab('student'));

  // Check URL tab query param (e.g. ?tab=register)
  if (urlParams.get('tab') === 'register') {
    switchTab('register');
  } else if (urlParams.get('tab') === 'admin') {
    switchTab('admin');
  }

  // 3. 1-Click Evaluation Chips
  document.getElementById('chipStudent1')?.addEventListener('click', () => {
    switchTab('student');
    document.getElementById('studentEmail').value = 'saisravan@saiuniversity.edu.in';
    document.getElementById('studentPassword').value = 'StudentPassword123';
    showAlert('Autofilled demo student: Sai Sravan V', 'success');
  });

  document.getElementById('chipStudent2')?.addEventListener('click', () => {
    switchTab('student');
    document.getElementById('studentEmail').value = 'aditi.sharma@saiuniversity.edu.in';
    document.getElementById('studentPassword').value = 'StudentPassword123';
    showAlert('Autofilled demo student: Aditi Sharma', 'success');
  });

  document.getElementById('chipAdmin')?.addEventListener('click', () => {
    switchTab('admin');
    document.getElementById('adminEmail').value = 'admin@saiuniversity.edu.in';
    document.getElementById('adminPassword').value = 'AdminPassword123';
    showAlert('Autofilled demo admin: Campus Security Admin', 'success');
  });

  // 4. Domain Hint Helpers
  document.getElementById('hintStudentDomain')?.addEventListener('click', () => {
    const input = document.getElementById('studentEmail');
    if (!input.value.includes('@')) {
      input.value += '@saiuniversity.edu.in';
    }
  });

  document.getElementById('hintRegDomain')?.addEventListener('click', () => {
    const input = document.getElementById('regEmail');
    if (!input.value.includes('@')) {
      input.value += '@saiuniversity.edu.in';
    }
  });

  // 5. Password Visibility Toggles
  setupPasswordToggle('toggleStudentPassword', 'studentPassword');
  setupPasswordToggle('toggleAdminPassword', 'adminPassword');
  setupPasswordToggle('toggleRegPassword', 'regPassword');

  // 6. Live Password Strength Meter for Registration
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

  // 7. Student Sign-In Submission
  studentLoginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('studentEmail').value.trim();
    const password = document.getElementById('studentPassword').value;
    const submitBtn = document.getElementById('btnStudentSubmit');

    hideAlert();
    setButtonLoading(submitBtn, 'Signing In...');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        saveSession(data.token, data.user);
        showAlert(`Welcome back, ${data.user.name}! Redirecting...`, 'success');
        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 1200);
      } else {
        showAlert(data.message || 'Invalid email or password', 'error');
        resetButton(submitBtn, '🎓 Sign In to Student Portal');
      }
    } catch (err) {
      showAlert('Could not connect to authentication server. Please check your connection.', 'error');
      resetButton(submitBtn, '🎓 Sign In to Student Portal');
    }
  });

  // 8. Admin Sign-In Submission
  adminLoginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const submitBtn = document.getElementById('btnAdminSubmit');

    hideAlert();
    setButtonLoading(submitBtn, 'Verifying Admin Authority...');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        if (data.user.role !== 'admin') {
          showAlert('This account is registered as a student. Switching you to the student dashboard...', 'success');
        } else {
          showAlert('Security Admin credentials authenticated! Loading console...', 'success');
        }
        saveSession(data.token, data.user);
        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 1200);
      } else {
        showAlert(data.message || 'Invalid administrator credentials', 'error');
        resetButton(submitBtn, '🛡️ Access Campus Security Console');
      }
    } catch (err) {
      showAlert('Server connection error. Please verify server status.', 'error');
      resetButton(submitBtn, '🛡️ Access Campus Security Console');
    }
  });

  // 9. New Student Registration Submission
  studentRegisterForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const studentId = document.getElementById('regStudentId').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const department = document.getElementById('regDept').value;
    const yearOfStudy = document.getElementById('regYear').value;
    const password = document.getElementById('regPassword').value;
    const submitBtn = document.getElementById('btnRegisterSubmit');

    hideAlert();
    setButtonLoading(submitBtn, 'Registering & Saving to MongoDB...');

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
        }, 1500);
      } else {
        showAlert(data.message || 'Registration failed. Please check inputs.', 'error');
        resetButton(submitBtn, '✨ Register & Save to MongoDB');
      }
    } catch (err) {
      showAlert('Server connection error during registration.', 'error');
      resetButton(submitBtn, '✨ Register & Save to MongoDB');
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
