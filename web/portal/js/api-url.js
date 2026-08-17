(function () {
  var h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') {
    window.API_BASE_URL = 'http://localhost:3000/api';
  } else if (h.indexOf('catalystappsail') !== -1) {
    // Served from AppSail = same origin as API
    window.API_BASE_URL = '/api';
  } else {
    // Served from Zoho Slate (www.accountantsfactory.com) = cross-origin to AppSail
    window.API_BASE_URL = 'https://accountantsfactory-api-50040008732.development.catalystappsail.in/api';
  }
})();
