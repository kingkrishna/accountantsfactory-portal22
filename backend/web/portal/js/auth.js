// Authentication Management
const clientAuth = {
  // Get token from localStorage
  getToken: function () {
    return localStorage.getItem('auth_token');
  },

  // Get user data from localStorage
  getUser: function () {
    try {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: function () {
    return !!this.getToken();
  },

  // Check if user is admin or sub_admin
  isAdmin: function () {
    const user = this.getUser();
    return user && (user.role === 'admin' || user.role === 'sub_admin');
  },

  // Save authentication data
  setAuth: function (token, userData) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData));
  },

  // Clear authentication data
  clearAuth: function () {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  },

  // Logout and redirect to login (relative to portal/client/ or portal/admin/)
  logout: async function () {
    const user = this.getUser();
    const isDemo = user && user.demo === true;
    this.clearAuth();
    if (!isDemo && typeof api !== 'undefined' && api.logout) {
      try { await api.logout(); } catch (e) { /* ignore */ }
    }
    window.location.replace('../login.html');
  },

  // Verify token with server (skip API for demo users – no backend required)
  verifyToken: async function () {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    const user = this.getUser();
    if (user && user.demo === true) {
      return true;
    }

    try {
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.VERIFY_TOKEN), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const u = data.user;
        if (u && typeof u.id === 'string' && typeof u.email === 'string' && typeof u.role === 'string') {
          this.setAuth(token, u);
          if (u.must_change_password) {
            window.location.href = '../set-initial-password.html';
            return false;
          }
          return true;
        }
        this.clearAuth();
        return false;
      } else {
        this.clearAuth();
        return false;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      this.clearAuth();
      return false;
    }
  },

  // Get authorization header (omit Authorization when no token, e.g. login/forgot/reset)
  getAuthHeader: function () {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }
};

// Protect routes - redirect to login if not authenticated
function requireAuth() {
  if (!clientAuth.isAuthenticated()) {
    window.location.replace('../login.html');
    return false;
  }
  return true;
}

// Protect admin routes
function requireAdmin() {
  if (!requireAuth()) {
    return false;
  }
  if (!clientAuth.isAdmin()) {
    window.location.replace('../client/dashboard.html');
    return false;
  }
  return true;
}

// Protect employee routes
function requireEmployee() {
  if (!requireAuth()) {
    return false;
  }
  const user = clientAuth.getUser();
  if (!user || user.role !== 'employee') {
    window.location.replace('../client/dashboard.html');
    return false;
  }
  return true;
}
