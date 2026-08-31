(function () {
  var h = window.location.hostname;
  var p = window.location.port;

  if (h.indexOf('catalystappsail') !== -1) {
    // Served directly from AppSail backend = same-origin
    window.API_BASE_URL = '/api';
  } else if ((h === 'localhost' || h === '127.0.0.1') && p === '3000') {
    // Local Node.js backend port
    window.API_BASE_URL = 'http://localhost:3000/api';
  } else {
    // Live production / Vercel preview / local static server (5500) -> connect to live backend API
    window.API_BASE_URL = 'https://accountantsfactory-api-50040008732.development.catalystappsail.in/api';
  }
})();
