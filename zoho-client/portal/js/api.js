// API Communication Module
const api = {
  // Generic fetch wrapper with error handling
  request: async function (url, options = {}) {
    try {
      const isJsonBody = options.body && typeof options.body === 'string' && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH');
      const response = await fetch(url, {
        ...options,
        headers: {
          ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
          ...clientAuth.getAuthHeader(),
          ...options.headers
        }
      });

      // Check if response is JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || 'API request failed');
      }

      if (!response.ok) {
        throw new Error(data.message || `API request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      const msg = error && typeof error.message === 'string' ? error.message : '';

      if (error.name === 'TypeError' && msg.includes('fetch')) {
        throw new Error('Cannot connect to server. Please check your internet connection or try again later.');
      }
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        throw new Error('Network error: Cannot connect to the server. Please check your internet connection.');
      }

      throw error;
    }
  },

  // Auth APIs
  login: async function (email, password) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.LOGIN), {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  changePassword: async function (currentPassword, newPassword) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD), {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  setInitialPassword: async function (newPassword) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.SET_INITIAL_PASSWORD), {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  },

  forgotPassword: async function (email) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD), {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  },

  resetPassword: async function (token, newPassword) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.RESET_PASSWORD), {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  },

  twoFaLogin: async function (tempToken, code) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.TWOFA_LOGIN), {
      method: 'POST',
      body: JSON.stringify({ tempToken, code })
    });
  },

  twoFaSetup: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.TWOFA_SETUP), { method: 'POST' });
  },

  twoFaVerifySetup: async function (code) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.TWOFA_VERIFY_SETUP), {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },

  twoFaDisable: async function (password, code) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.TWOFA_DISABLE), {
      method: 'POST',
      body: JSON.stringify({ password, code })
    });
  },

  logout: async function () {
    try {
      await this.request(getApiUrl(API_CONFIG.ENDPOINTS.LOGOUT), {
        method: 'POST'
      });
    } catch (error) {
      // Even if server call fails, clear local storage
      console.error('Logout API call failed:', error);
    }
  },

  // Client APIs
  getDashboard: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.DASHBOARD));
  },

  getServices: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.SERVICES));
  },

  getAvailableServices: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.GET_AVAILABLE_SERVICES));
  },

  getDocuments: async function (serviceOrderId) {
    const url = serviceOrderId
      ? `${getApiUrl(API_CONFIG.ENDPOINTS.DOCUMENTS)}?serviceOrderId=${serviceOrderId}`
      : getApiUrl(API_CONFIG.ENDPOINTS.DOCUMENTS);
    return await this.request(url);
  },

  downloadDocument: async function (documentId) {
    try {
      // First, get the signed URL from backend
      const response = await fetch(`${getApiUrl(API_CONFIG.ENDPOINTS.DOCUMENT_DOWNLOAD)}/${documentId}/download`, {
        method: 'GET',
        headers: clientAuth.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      if (data.success && data.downloadUrl) {
        // Open the signed URL in a new window/tab
        window.open(data.downloadUrl, '_blank');
      } else {
        throw new Error(data.message || 'Failed to get download URL');
      }
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  },

  getReferrals: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.REFERRALS));
  },

  requestService: async function (serviceId, period, notes) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.REQUEST_SERVICE), {
      method: 'POST',
      body: JSON.stringify({ serviceId, period, notes })
    });
  },

  getServiceComments: async function (serviceOrderId) {
    return await this.request(`${getApiUrl(API_CONFIG.ENDPOINTS.SERVICE_COMMENTS)}/${serviceOrderId}/comments`);
  },

  addComment: async function (serviceOrderId, comment) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.ADD_COMMENT), {
      method: 'POST',
      body: JSON.stringify({ serviceOrderId, comment })
    });
  },

  // Admin APIs (only if admin)
  createClient: async function (clientData) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.CREATE_CLIENT), {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  },

  bulkImportClients: async function (clients) {
    return await this.request(getApiUrl('/admin/bulk-import-clients'), {
      method: 'POST',
      body: JSON.stringify({ clients })
    });
  },

  importClientsFromFile: async function () {
    return await this.request(getApiUrl('/admin/import-from-file'), {
      method: 'POST'
    });
  },

  assignService: async function (userId, serviceId, period) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.ASSIGN_SERVICE), {
      method: 'POST',
      body: JSON.stringify({ userId, serviceId, period })
    });
  },

  updateClientStatus: async function (userId, status) {
    const url = `${getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_CLIENT_STATUS)}/${encodeURIComponent(userId)}/status`;
    return await this.request(url, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  updateStatus: async function (serviceOrderId, status) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.UPDATE_STATUS), {
      method: 'PUT',
      body: JSON.stringify({ serviceOrderId, status })
    });
  },

  // Admin adds a document link (Zoho URL + embed code) for a service order
  addDocumentLink: async function (orderId, fileName, downloadUrl, embedCode) {
    return await this.request(getApiUrl('/admin/documents/add-link'), {
      method: 'POST',
      body: JSON.stringify({ orderId, fileName, downloadUrl, embedCode: embedCode || null })
    });
  },

  deleteDocumentLink: async function (documentId) {
    const url = `${getApiUrl('/admin/documents')}/${encodeURIComponent(documentId)}`;
    return await this.request(url, { method: 'DELETE' });
  },

  approveReferral: async function (referralId, approved, reason, bonusAmount) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.APPROVE_REFERRAL), {
      method: 'POST',
      body: JSON.stringify({ referralId, approved, reason, bonusAmount })
    });
  },

  getAllClients: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.GET_ALL_CLIENTS));
  },

  getAllServices: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.GET_ALL_SERVICES));
  },

  getAllOrders: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.GET_ALL_ORDERS));
  },

  getAllReferrals: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.GET_ALL_REFERRALS));
  },

  testEmail: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.TEST_EMAIL));
  },

  getOrderDocuments: async function (orderId) {
    const url = `${getApiUrl(API_CONFIG.ENDPOINTS.GET_ORDER_DOCUMENTS)}/${encodeURIComponent(orderId)}/documents`;
    return await this.request(url);
  },


  // --- Employee Management (Admin) ---
  createEmployee: async function (email, password) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.CREATE_EMPLOYEE), {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  getAllEmployees: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.GET_ALL_EMPLOYEES));
  },

  assignOrderToEmployee: async function (orderId, employeeId) {
    const url = `${getApiUrl(API_CONFIG.ENDPOINTS.ASSIGN_EMPLOYEE)}/${encodeURIComponent(orderId)}/assign-employee`;
    return await this.request(url, {
      method: 'PUT',
      body: JSON.stringify({ employeeId })
    });
  },

  toggleEmployeeStatus: async function (employeeId) {
    const url = `${getApiUrl('/admin/employees')}/${encodeURIComponent(employeeId)}/toggle`;
    return await this.request(url, { method: 'PATCH' });
  },

  deleteEmployee: async function (employeeId) {
    const url = `${getApiUrl('/admin/employees')}/${encodeURIComponent(employeeId)}`;
    return await this.request(url, { method: 'DELETE' });
  },

  // Service Catalog Management (Admin)
  adminCreateService: async function (name, description) {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.GET_ALL_SERVICES), {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  },

  bulkCreateServices: async function () {
    return await this.request(getApiUrl('/admin/services/bulk-create'), {
      method: 'POST'
    });
  },

  toggleService: async function (serviceId) {
    const url = `${getApiUrl(API_CONFIG.ENDPOINTS.GET_ALL_SERVICES)}/${encodeURIComponent(serviceId)}/toggle`;
    return await this.request(url, { method: 'PATCH' });
  },

  // Admin - view employee work updates for an order
  getOrderWorkUpdates: async function (orderId) {
    const url = `${getApiUrl(API_CONFIG.ENDPOINTS.GET_ORDER_DOCUMENTS)}/${encodeURIComponent(orderId)}/work-updates`;
    return await this.request(url);
  },

  // --- Employee Dashboard (Employee) ---
  getEmployeeDashboard: async function () {
    return await this.request(getApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DASHBOARD));
  },

  submitEODUpdate: async function (orderId, status, comments) {
    const url = `${getApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_EOD_UPDATE)}/${encodeURIComponent(orderId)}/eod-update`;
    return await this.request(url, {
      method: 'POST',
      body: JSON.stringify({ status, comments })
    });
  }
};

