// On localhost: leave empty so config.js falls back to http://localhost:3000/api
// On Zoho Catalyst: frontend and backend are on separate domains
(function () {
  var h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') {
    window.API_BASE_URL = '';
  } else if (h.indexOf('.catalystserverless.') !== -1 || h.indexOf('.zohosite.') !== -1) {
    // Zoho static hosting → API is on AppSail
    window.API_BASE_URL = 'https://accountantsfactory-api-50040008732.development.catalystappsail.in/api';
  } else {
    // Render, Vercel, custom domain → API is on same origin
    window.API_BASE_URL = window.location.origin + '/api';
  }
})();
