document.addEventListener('DOMContentLoaded', function () {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  
    // Toggle the navbar collapse on mobile
    navbarToggler.addEventListener('click', function () {
      navbarCollapse.classList.toggle('show');
    });
  
    // Add event listeners for dropdown toggles
    dropdownToggles.forEach(dropdownToggle => {
      dropdownToggle.addEventListener('click', function (e) {
        e.preventDefault(); // Prevent default anchor behavior
  
        const parentItem = this.parentElement;
        const dropdownMenu = parentItem.querySelector('.dropdown-menu');
  
        // Check if the clicked dropdown is open
        if (dropdownMenu.classList.contains('show')) {
          // If open, close it
          dropdownMenu.classList.remove('show');
        } else {
          // Close all other open dropdowns
          document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
            openMenu.classList.remove('show');
          });
  
          // Open the clicked dropdown
          dropdownMenu.classList.add('show');
        }
      });
    });
  
    // Close navbar and dropdowns when clicking outside
    document.addEventListener('click', function (e) {
      // If the click is outside the navbar or dropdown, close them
      if (!navbarCollapse.contains(e.target) && !navbarToggler.contains(e.target)) {
        navbarCollapse.classList.remove('show');
        document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
          openMenu.classList.remove('show');
        });
      }
    });
  });


  
  