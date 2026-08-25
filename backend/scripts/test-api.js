#!/usr/bin/env node

/**
 * API Testing Script
 * Tests all API endpoints to ensure they're working
 * 
 * Usage: node scripts/test-api.js [baseUrl]
 * Example: node scripts/test-api.js http://localhost:3000
 */

const axios = require('axios');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test credentials (update these)
const TEST_ADMIN_EMAIL = 'admin@accountantsfactory.com';
const TEST_ADMIN_PASSWORD = 'Admin@Test123';
const TEST_CLIENT_EMAIL = 'client@test.com';
const TEST_CLIENT_PASSWORD = 'Client@Test123';

let adminToken = null;
let clientToken = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function testEndpoint(name, method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    logSuccess(`${name}: ${response.status} ${response.statusText}`);
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response) {
      logError(`${name}: ${error.response.status} - ${error.response.data?.message || error.message}`);
      return { success: false, status: error.response.status, error: error.response.data };
    } else {
      logError(`${name}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

async function runTests() {
  log('\n🧪 Starting API Tests...\n', 'blue');
  log(`Base URL: ${BASE_URL}\n`);

  // Test 1: Health Check
  logInfo('Testing Health Endpoint...');
  await testEndpoint('Health Check', 'GET', '/health');
  console.log('');

  // Test 2: Login (Admin)
  logInfo('Testing Admin Login...');
  const adminLogin = await testEndpoint('Admin Login', 'POST', '/auth/login', {
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD
  });
  if (adminLogin.success && adminLogin.data.token) {
    adminToken = adminLogin.data.token;
    logSuccess('Admin token obtained');
  }
  console.log('');

  // Test 3: Login (Client)
  logInfo('Testing Client Login...');
  const clientLogin = await testEndpoint('Client Login', 'POST', '/auth/login', {
    email: TEST_CLIENT_EMAIL,
    password: TEST_CLIENT_PASSWORD
  });
  if (clientLogin.success && clientLogin.data.token) {
    clientToken = clientLogin.data.token;
    logSuccess('Client token obtained');
  }
  console.log('');

  if (!adminToken) {
    logWarning('Admin token not available. Skipping admin endpoints.');
  } else {
    // Test 4: Admin Endpoints
    logInfo('Testing Admin Endpoints...');
    await testEndpoint('Get All Clients', 'GET', '/admin/clients', null, adminToken);
    await testEndpoint('Get All Services', 'GET', '/admin/services', null, adminToken);
    await testEndpoint('Get All Orders', 'GET', '/admin/orders', null, adminToken);
    await testEndpoint('Get All Referrals', 'GET', '/admin/referrals', null, adminToken);
    console.log('');
  }

  if (!clientToken) {
    logWarning('Client token not available. Skipping client endpoints.');
  } else {
    // Test 5: Client Endpoints
    logInfo('Testing Client Endpoints...');
    await testEndpoint('Get Dashboard', 'GET', '/client/dashboard', null, clientToken);
    await testEndpoint('Get Services', 'GET', '/client/services', null, clientToken);
    await testEndpoint('Get Documents', 'GET', '/client/documents', null, clientToken);
    await testEndpoint('Get Referrals', 'GET', '/client/referrals', null, clientToken);
    console.log('');
  }

  // Test 6: Public Endpoints
  logInfo('Testing Public Endpoints...');
  await testEndpoint('Forgot Password', 'POST', '/auth/forgot-password', {
    email: 'test@example.com'
  });
  console.log('');

  // Test 7: Error Cases
  logInfo('Testing Error Handling...');
  await testEndpoint('Invalid Login', 'POST', '/auth/login', {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  });
  await testEndpoint('Unauthorized Access', 'GET', '/admin/clients');
  console.log('');

  log('\n✨ Tests Complete!\n', 'blue');
  logInfo('Note: Some tests may fail if test accounts don\'t exist.');
  logInfo('Update TEST_ADMIN_EMAIL and TEST_CLIENT_EMAIL in the script.');
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  process.exit(1);
});
