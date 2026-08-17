// Login Page Functionality
// Demo accounts – no backend required. When you connect the API, these still work via backend.
var DEMO_ACCOUNTS = {
  'admin@demo.com': { password: 'Demo@123', role: 'admin', id: 'demo-admin', referral_code: null },
  'client@demo.com': { password: 'Demo@123', role: 'client', id: 'demo-client', referral_code: 'DEMO-REF' }
};

document.addEventListener('DOMContentLoaded', function () {
  // Check if already logged in
  if (clientAuth.isAuthenticated()) {
    if (clientAuth.isAdmin()) {
      window.location.href = '../portal/admin/dashboard.html';
    } else if (clientAuth.getUser() && clientAuth.getUser().role === 'employee') {
      window.location.href = '../portal/employee/dashboard.html';
    } else {
      window.location.href = '../portal/client/dashboard.html';
    }
    return;
  }

  const loginForm = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');

  if (!loginForm || !errorDiv) return;

  // Toggle password visibility
  togglePasswordBtn.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    const icon = this.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  });

  let twoFaTempToken = null;

  function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('login-2fa-step').style.display = 'none';
    twoFaTempToken = null;
    errorDiv.style.display = 'none';
  }

  function show2FaStep(token) {
    twoFaTempToken = token;
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('login-2fa-step').style.display = 'block';
    document.getElementById('totp-code').value = '';
    errorDiv.style.display = 'none';
  }

  function showError(msg) {
    errorDiv.textContent = '';
    const lines = (msg || 'An error occurred').split('<br>');
    lines.forEach((line, index) => {
      if (index > 0) errorDiv.appendChild(document.createElement('br'));
      errorDiv.appendChild(document.createTextNode(line.replace(/<[^>]*>/g, '')));
    });
    errorDiv.style.display = 'block';
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.style.display = 'none';

    const email = (document.getElementById('email').value || '').toLowerCase().trim();
    const password = document.getElementById('password').value;

    // Demo login – no backend required
    var demo = DEMO_ACCOUNTS[email];
    if (demo && demo.password === password) {
      var user = {
        id: demo.id,
        email: email,
        role: demo.role,
        referral_code: demo.referral_code,
        status: 'active',
        demo: true
      };
      clientAuth.setAuth('demo-' + demo.role, user);
      if (demo.role === 'admin') {
        window.location.href = '../portal/admin/dashboard.html';
      } else if (demo.role === 'employee') {
        window.location.href = '../portal/employee/dashboard.html';
      } else {
        window.location.href = '../portal/client/dashboard.html';
      }
      return;
    }

    try {
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

      const response = await api.login(email, password);

      if (response.requires2FA && response.tempToken) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        show2FaStep(response.tempToken);
        return;
      }

      clientAuth.setAuth(response.token, response.user);
      if (response.user.must_change_password) {
        window.location.href = 'set-initial-password.html';
        return;
      }
      if (response.user.role === 'admin') {
        window.location.href = '../portal/admin/dashboard.html';
      } else if (response.user.role === 'employee') {
        window.location.href = '../portal/employee/dashboard.html';
      } else {
        window.location.href = '../portal/client/dashboard.html';
      }
    } catch (error) {
      console.error('Login failed:', error);
      let errorMessage = (error.message && error.message.length > 0) ? error.message : 'Login failed. Please check your credentials.';
      if (error.message && (error.message.includes('Cannot connect to server') || error.message.includes('Network error'))) {
        errorMessage = error.message + '<br><small>Use demo accounts to try without backend: admin@demo.com or client@demo.com / Demo@123</small>';
      }
      showError(errorMessage);
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
  });

  document.getElementById('login-2fa-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    const code = document.getElementById('totp-code').value.trim();
    if (!code) {
      showError('Please enter your authentication code.');
      return;
    }
    if (!twoFaTempToken) {
      showError('Session expired. Please log in again.');
      showLoginForm();
      return;
    }

    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    try {
      const response = await api.twoFaLogin(twoFaTempToken, code);
      clientAuth.setAuth(response.token, response.user);
      if (response.user.must_change_password) {
        window.location.href = 'set-initial-password.html';
        return;
      }
      if (response.user.role === 'admin') {
        window.location.href = '../portal/admin/dashboard.html';
      } else if (response.user.role === 'employee') {
        window.location.href = '../portal/employee/dashboard.html';
      } else {
        window.location.href = '../portal/client/dashboard.html';
      }
    } catch (err) {
      console.error('2FA login failed:', err);
      showError('Invalid code. Please try again.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Verify';
    }
  });

  document.getElementById('login-2fa-back').addEventListener('click', showLoginForm);

  // Forgot password link
  document.getElementById('forgot-password-link').addEventListener('click', function (e) {
    e.preventDefault();
    window.location.href = 'forgot-password.html';
  });

  // Back to Home – ensure it always redirects (normal click)
  var backHome = document.getElementById('back-to-home');
  if (backHome) {
    backHome.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.button === 1) return;
      e.preventDefault();
      window.location.replace(this.getAttribute('href'));
    });
  }
});
