// Forgot Password Page Functionality
document.addEventListener('DOMContentLoaded', function() {
  const forgotForm = document.getElementById('forgot-password-form');
  const errorDiv = document.getElementById('forgot-error');
  const successDiv = document.getElementById('forgot-success');
  if (!forgotForm || !errorDiv) return;

  // Handle form submission
  forgotForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    const email = document.getElementById('email').value.trim();

    // Basic email validation
    if (!email) {
      errorDiv.textContent = 'Please enter your email address';
      errorDiv.style.display = 'block';
      return;
    }

    try {
      const submitBtn = forgotForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      const response = await api.forgotPassword(email);
      
      // Always show success message (to prevent email enumeration)
      successDiv.textContent = response.message || 'If an account with that email exists, a password reset link has been sent.';
      successDiv.style.display = 'block';
      
      // In development, show token in console if available
      // Note: Token is logged on backend console, not frontend
      // Check backend terminal for reset token in development mode
      
      // Clear form
      forgotForm.reset();
      
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
    } catch (error) {
      console.error('Forgot password failed:', error);
      let errorMessage = error.message || 'Failed to send reset link. Please try again.';
      
      // Use textContent to prevent XSS
      errorDiv.textContent = '';
      const lines = errorMessage.split('<br>');
      lines.forEach((line, index) => {
        if (index > 0) errorDiv.appendChild(document.createElement('br'));
        errorDiv.appendChild(document.createTextNode(line.replace(/<[^>]*>/g, '')));
      });
      errorDiv.style.display = 'block';
      
      const submitBtn = forgotForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
    }
  });

  var backHome = document.getElementById('back-to-home');
  if (backHome) {
    backHome.addEventListener('click', function(e) {
      if (e.ctrlKey || e.metaKey || e.button === 1) return;
      e.preventDefault();
      window.location.replace(this.getAttribute('href'));
    });
  }
});
