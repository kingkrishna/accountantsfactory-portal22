/**
 * Frontend Utility Functions
 * Helper functions for common operations
 */

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Safely set text content (prevents XSS)
function setTextContent(element, text) {
  if (!element) return;
  element.textContent = text || '';
}

// Safely set innerHTML with escaping
function setSafeHTML(element, html) {
  if (!element) return;
  // Escape any user content
  element.innerHTML = escapeHtml(html);
}

// Create element with text content
function createTextElement(tag, text, className = null) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  element.textContent = text || '';
  return element;
}

// Create element with safe HTML
function createHTMLElement(tag, html, className = null) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  element.innerHTML = escapeHtml(html || '');
  return element;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    return 'N/A';
  }
}

// Validate integer
function validateInteger(value, min = 1, max = 999999) {
  const num = parseInt(value);
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

// Show error message safely
function showError(element, message) {
  if (!element) return;
  element.textContent = message || 'An error occurred';
  element.style.display = 'block';
}

// Show success message safely
function showSuccess(element, message) {
  if (!element) return;
  element.textContent = message || 'Success';
  element.style.display = 'block';
  element.className = element.className.replace('alert-danger', 'alert-success');
}
