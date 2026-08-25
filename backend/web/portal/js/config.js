// API Configuration
const API_CONFIG = {
  // Priority: 1) window.API_BASE_URL (injected by api-url.js for any deployment)
  //           2) localhost fallback for local development
  BASE_URL: (typeof window !== 'undefined' && window.API_BASE_URL)
    ? window.API_BASE_URL
    : (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
      ? 'https://accountantsfactory-api-50040008732.development.catalystappsail.in/api'
      : 'http://localhost:3000/api',

  // API Endpoints
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    CHANGE_PASSWORD: '/auth/change-password',
    SET_INITIAL_PASSWORD: '/auth/set-initial-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_TOKEN: '/auth/verify',
    TWOFA_LOGIN: '/auth/2fa/login',
    TWOFA_SETUP: '/auth/2fa/setup',
    TWOFA_VERIFY_SETUP: '/auth/2fa/verify-setup',
    TWOFA_DISABLE: '/auth/2fa/disable',
    LOGOUT: '/auth/logout',

    // Admin
    CREATE_CLIENT: '/admin/create-client',
    ASSIGN_SERVICE: '/admin/assign-service',
    UPDATE_STATUS: '/admin/update-status',
    UPLOAD_DOCUMENT: '/admin/upload-document',
    APPROVE_REFERRAL: '/admin/approve-referral',
    GET_ALL_CLIENTS: '/admin/clients',
    UPDATE_CLIENT_STATUS: '/admin/clients',
    GET_ALL_SERVICES: '/admin/services',
    GET_ALL_ORDERS: '/admin/orders',
    GET_ORDER_DOCUMENTS: '/admin/orders',
    ADMIN_DOCUMENT_DOWNLOAD: '/admin/documents',
    GET_ALL_REFERRALS: '/admin/referrals',
    TEST_EMAIL: '/admin/test-email',
    CREATE_EMPLOYEE: '/admin/employee',
    GET_ALL_EMPLOYEES: '/admin/employees',
    ASSIGN_EMPLOYEE: '/admin/orders', // Will append /:orderId/assign-employee

    // Employee
    EMPLOYEE_DASHBOARD: '/employee/dashboard',
    EMPLOYEE_EOD_UPDATE: '/employee/order', // Will append /:id/eod-update

    // Client
    DASHBOARD: '/client/dashboard',
    SERVICES: '/client/services',
    GET_AVAILABLE_SERVICES: '/client/all-services',
    DOCUMENTS: '/client/documents',
    DOCUMENT_DOWNLOAD: '/client/document',
    REFERRALS: '/client/referrals',
    REQUEST_SERVICE: '/client/request-service',
    SERVICE_COMMENTS: '/client/service',
    ADD_COMMENT: '/client/service/comment',

    // Admin — Compliance & Company Profile
    ADMIN_COMPANY_PROFILE: '/admin/clients',       // + /:id/company-profile
    ADMIN_COMPLIANCE_CONFIG: '/admin/clients',      // + /:id/compliance-config
    ADMIN_COMPLIANCE_FILINGS: '/admin/clients',     // + /:id/compliance-filings
    ADMIN_COMPLIANCE_FILING: '/admin/compliance-filings', // + /:filingId
    ADMIN_COMPLIANCE_OVERVIEW: '/admin/compliance-overview',

    // Admin — Document Generator
    ADMIN_DOC_TEMPLATES: '/admin/doc-templates',
    ADMIN_GENERATED_DOCS: '/admin/generated-documents',

    // Client — Compliance View
    CLIENT_COMPLIANCE: '/client/compliance'
  }
};

// Helper function to get full API URL
function getApiUrl(endpoint) {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}
