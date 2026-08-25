// Set Initial Password (first login) – requires valid JWT
document.addEventListener('DOMContentLoaded', function() {
  if (!clientAuth.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('set-initial-password-form');
  const errorDiv = document.getElementById('set-password-error');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('new-password');

  if (!form || !errorDiv) return;

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      const icon = this.querySelector('i');
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    });
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    errorDiv.style.display = 'none';

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match';
      errorDiv.style.display = 'block';
      return;
    }

    if (newPassword.length < 8) {
      errorDiv.textContent = 'Password must be at least 8 characters long';
      errorDiv.style.display = 'block';
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      errorDiv.textContent = 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)';
      errorDiv.style.display = 'block';
      return;
    }

    try {
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting password...';

      await api.setInitialPassword(newPassword);

      if (clientAuth.isAdmin()) {
        window.location.href = 'admin/dashboard.html';
      } else {
        window.location.href = 'client/dashboard.html';
      }
    } catch (error) {
      console.error('Set initial password failed:', error);
      errorDiv.textContent = error.message || 'Failed to set password. Please try again.';
      errorDiv.style.display = 'block';
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check"></i> Set Password';
    }
  });

  const backToLogin = document.getElementById('back-to-login');
  if (backToLogin) {
    backToLogin.addEventListener('click', function(e) {
      if (e.ctrlKey || e.metaKey || e.button === 1) return;
      e.preventDefault();
      window.location.href = 'login.html';
    });
  }
});
