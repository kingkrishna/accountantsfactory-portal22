// Reset Password Page Functionality
document.addEventListener('DOMContentLoaded', function() {
  var backHome = document.getElementById('back-to-home');
  if (backHome) {
    backHome.addEventListener('click', function(e) {
      if (e.ctrlKey || e.metaKey || e.button === 1) return;
      e.preventDefault();
      window.location.replace(this.getAttribute('href'));
    });
  }

  const resetForm = document.getElementById('reset-password-form');
  const errorDiv = document.getElementById('reset-error');
  const successDiv = document.getElementById('reset-success');
  const tokenInput = document.getElementById('reset-token');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('new-password');

  if (!resetForm || !errorDiv) return;

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    errorDiv.textContent = 'Invalid or missing reset token. Please request a new password reset link.';
    errorDiv.style.display = 'block';
    if (resetForm) resetForm.style.display = 'none';
    return;
  }

  if (tokenInput) tokenInput.value = token;

  // Toggle password visibility
  if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    const icon = this.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  });
  }

  // Handle form submission
  if (!resetForm) return;
  resetForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match';
      errorDiv.style.display = 'block';
      return;
    }

    // Validate password strength
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
      const submitBtn = resetForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';

      const response = await api.resetPassword(token, newPassword);
      
      if (successDiv) {
        successDiv.textContent = response.message || 'Password reset successfully! You can now login with your new password.';
        successDiv.style.display = 'block';
      }
      resetForm.style.display = 'none';
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 3000);
      
    } catch (error) {
      console.error('Reset password failed:', error);
      let errorMessage = error.message || 'Failed to reset password. Please try again.';
      
      // Use textContent to prevent XSS
      errorDiv.textContent = '';
      const lines = errorMessage.split('<br>');
      lines.forEach((line, index) => {
        if (index > 0) errorDiv.appendChild(document.createElement('br'));
        errorDiv.appendChild(document.createTextNode(line.replace(/<[^>]*>/g, '')));
      });
      errorDiv.style.display = 'block';
      
      const submitBtn = resetForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check"></i> Reset Password';
    }
  });
});
