// Components system for loading header, footer, and other reusable components
// All components are embedded as strings for better performance

const Components = {
    header: `<nav class="navbar navbar-expand-xl navbar-light ">
  <div class="container-fluid" style="width: 90%; max-width: 1400px; margin: 0 auto; padding: 0;">
    <a class="navbar-brand" href="index.html">
      <img src="images/logo-accountants-factory.png" alt="Accountant's Factory" style="height: 55px; max-width: 100%;">
    </a>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse justify-content-end" id="navbarNavDropdown">
      <ul class="navbar-nav align-items-center">
      <!-- Home -->
      <li class="nav-item">
        <a class="nav-link" href="index.html">Home</a>
      </li>

      <!-- Virtual CFO -->
      <li class="nav-item">
        <a class="nav-link" href="virtual-cfo-services-in-india.html">Virtual CFO Services</a>
      </li>

      <!-- Registrations Dropdown -->
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" id="registrationsDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          Registrations
        </a>
        <div class="dropdown-menu" aria-labelledby="registrationsDropdown">
          <a class="dropdown-item" href="start-up-india-registrations-in-india.html">Start-up India Registration</a>
          <a class="dropdown-item" href="llp-registration-in-india.html">LLP Registration</a>
          <a class="dropdown-item" href="one-person-company-registration-in-india.html">One Person Company Registration</a>
          <a class="dropdown-item" href="partnership-firm-registrations-in-india.html">Partnership Firm Registrations</a>
          <a class="dropdown-item" href="private-limited-company-registration-in-india.html">Private Limited Company Registration</a>
        </div>
      </li>

      <!-- Goods & Service Tax Dropdown -->
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" id="gstDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          GST
        </a>
        <div class="dropdown-menu" aria-labelledby="gstDropdown">
          <a class="dropdown-item" href="gst-registrations-in-india.html">GST Registrations</a>
          <a class="dropdown-item" href="gst-filing-in-india.html">GST Filing</a>
          <a class="dropdown-item" href="new-gst-rates.html">New GST Rates 22092025</a>
        </div>
      </li>

      <!-- Income Tax Dropdown -->
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" id="incomeTaxDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          Income Tax
        </a>
        <div class="dropdown-menu" aria-labelledby="incomeTaxDropdown">
          <a class="dropdown-item" href="incometax-cal.html">Tax Calculation</a>
          <a class="dropdown-item" href="itr-in-india.html">ITR Filing</a>
          <a class="dropdown-item" href="itr1-in-india.html">ITR-1</a>
          <a class="dropdown-item" href="itr2-in-india.html">ITR-2</a>
          <a class="dropdown-item" href="itr3-in-india.html">ITR-3</a>
          <a class="dropdown-item" href="itr4-in-india.html">ITR-4</a>
          <a class="dropdown-item" href="itr5-in-india.html">ITR-5</a>
          <a class="dropdown-item" href="itr6-in-india.html">ITR-6</a>
          <a class="dropdown-item" href="itr7-in-india.html">ITR-7</a>
          <a class="dropdown-item" href="tds-return-filing-in-india.html">TDS Return Filing</a>
        </div>
      </li>

      <!-- Other Services Dropdown -->
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" id="otherServicesDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          Other Services
        </a>
        <div class="dropdown-menu" aria-labelledby="otherServicesDropdown">
          <a class="dropdown-item" href="provident-fund-in-india.html">Provident Fund</a>
          <a class="dropdown-item" href="esic-in-india.html">ESIC</a>
          <a class="dropdown-item" href="rera-andhra-pradesh-registration-in-india.html">RERA Andhra Pradesh Registration</a>
          <a class="dropdown-item" href="IEC-Import-and-Export-Code-registration-in-india.html">IEC Registration</a>
          <a class="dropdown-item" href="msme-registrations-in-india.html">MSME Registrations</a>
          <a class="dropdown-item" href="form11-llp-in-india.html">Form 11 (LLP)</a>
          <a class="dropdown-item" href="form8-llp-in-india.html">Form 8 (LLP)</a>
          <a class="dropdown-item" href="aoc4-mgt-7-in-india.html">AOC-4 & MGT-7</a>
        </div>
      </li>
             
      <!-- Client Portal Button -->
      <li class="nav-item">
        <a class="btn btn-outline-primary client-portal-btn" href="portal/login.html" style="margin-right: 10px;">
          <i class="fas fa-user-circle"></i> Client Portal
        </a>
      </li>
             
      <!-- Consult Now Button -->
      <li class="nav-item">
        <a class="btn btn-primary" href="contact.html">Consult Now</a>
      </li>
    </ul>
  </div>
  </div>
</nav>`,

    footer: `<section class="bg-light text-dark footer" style="position: relative;">
    <div class="container" style="max-width: 1400px; padding: 60px 20px;">
        <div class="row text-center">
            <div class="col-md-2 mb-4 mb-md-0">
                <a href="about.html" class="footer-link">About Us</a>
            </div>
            <div class="col-md-2 mb-4 mb-md-0">
                <a href="terms.html" class="footer-link">Terms and Conditions</a>
            </div>
            <div class="col-md-2 mb-4 mb-md-0">
                <a href="cookie.html" class="footer-link">Cookies Policy</a>
            </div>
            <div class="col-md-2 mb-4 mb-md-0">
                <a href="privacy.html" class="footer-link">Privacy Policy</a>
            </div>
            <div class="col-md-2">
                <a href="contact.html" class="footer-link">Contact Us</a>
            </div>
        </div>
    </div>
</section>

<div class="py-4 container text-center" style="max-width: 1400px;">
    <div class="row">
        <div class="col-12 small">
            <p style="color: var(--text-muted); font-size: 14px;">
                <i class="fas fa-copyright"></i> Accountant's Factory LLP | Designed & Developed by 
                <a href="https://theshtechnologies.com/" style="color: var(--brand); font-weight: 600;">SH Technologies</a>
            </p>
        </div>
    </div>
</div>

<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">

<!-- Social Media Buttons -->
<div class="social-icons glass-effect" style="padding: 10px; border-radius: 50px;">
  <a href="https://www.instagram.com/accountantsfactory/" target="_blank" class="social-button"><i class="fab fa-instagram"></i></a>
  <a href="https://www.facebook.com/accountantsfactory/" target="_blank" class="social-button"><i class="fab fa-facebook-f"></i></a>
  <a href="https://www.linkedin.com/company/accountantsfactory" target="_blank" class="social-button"><i class="fab fa-linkedin-in"></i></a>
  <a href="https://twitter.com/Accntantfactory" target="_blank" class="social-button"><i class="fab fa-twitter"></i></a>
</div>

<style type="text/css">
/* Container for Social Icons */
.social-icons {
    position: fixed;
    top: 70%;
    right: 30px;
    left: auto;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 15px;
    z-index: 1000;
}

/* Individual Social Media Button Styles */
.social-button {
    background-color: #0c9782;
    color: white;
    padding: 12px;
    border-radius: 50%;
    text-align: center;
    font-size: 20px;
    text-decoration: none;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    transition: background-color 0.3s ease, transform 0.3s ease;
}

/* Hover Effects for Social Media Buttons */
.social-button:hover {
  background-color: #0c9782;
    transform: scale(1.1);
    text-decoration: none;
    color: white;
}

/* Icon Spacing and Alignment */
.social-button i {
    display: block;
}
</style>

<!--Start of Tawk.to Script-->
<script type="text/javascript">
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/6758020349e2fd8dfef5b21a/1iensfnuu';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
</script>
<!--End of Tawk.to Script-->`,

    whatsapp: `<br><a href="https://api.whatsapp.com/send?phone=+919885988540&text=Hi,%20I%20would%20like%20to%20get%20more%20information..about%20Services%20at%20Accountant's%20Factory" target="_blank" class="btn-card">Whatsapp Now</a>   
  <a href="tel:+919885988540" class="btn-card-dark">Call Now</a>
<br><br>`,

    mobilemenu: `<!-- Mobile menu (optional) -->`,
    miniBanner: `<div class="mini-banner">
               <div class="container-fluid" style="width:90%;">
<p align="center">Don't stress or worry about last-minute ITR filing. Trust our expert — <span class="blink"><b>File now!</b></span></p>
</div>
 </div>`,

    form: `  <form class="form">
                        <div class="row">
                            <div class="col-12 col-md-6">
                                <label  for="form-name">Your Name  <sup>*</sup></label><br/>
                                <input type="text" class="form-control  " placeholder="" required name="name" id="form-name"/>
                              </div>
                              <div class="col-12 col-md-6">
                                <label class="business_email_label"  for="form-email">Business Email <sup>*</sup></label><br/>
                                <input type="email" class="form-control" placeholder="" required name="email" id="form-email"/>
                                <br/>
                              </div>
                        </div>
                        <div>
                            <label  for="form-mobile">Mobile <sup>*</sup></label><br/>
                            <input type="tel" class="form-control" placeholder="" required name="mobile" id="form-mobile"/><br/>
                        </div>
                        <div>
                            <label  for="form-service">Need assistance for <sup>*</sup></label><br/>
                            <select class="form-control" id="form-service" required>
                            <option selected disabled>Choose a service...</option>
                            <option>Virtual CFO Services</option>
                                        <option>Business Advisory Services</option>
                                        <option>Management Consulting Services</option>
                                        <option>Accounting and Financial Reporting</option>
                                        <option>Bookkeeping Services</option>
                                        <option>Start-up India Registration Services</option>
                                        <option>Tax Filing Services</option>
                                        <option>GST Filing Services</option>
                                        <option>Payroll and Employee Benefit Services</option>
                                        <option>Business Compliance and Regulatory Services</option>
                                        <option>Wealth Management Services</option>
                                        <option>MCA Annual Return Filing Services</option>
                                        <option>Sole Proprietorship</option>
                                        <option>Partnership Firm</option>
                                        <option>One Person Company</option>
                                        <option>ITR 1 Form Filing</option>
                                        <option>ITR 2 Form Filing</option>
                                        <option>ITR 3 Form Filing</option>
                                        <option>ITR 4 Form Filing</option>
                                        <option>ITR 5 Form Filing</option>
                                        <option>ITR 6 Form Filing</option>
                                        <option>ITR 7 Form Filing</option>
                            </select><br/>
                        </div>
                        <div>
                            <label  for="form-message">Message</label><br/>
                            <textarea class="form-control" id="form-message"> </textarea> 
                             
                        </div>
    
                     <br>
                        <div class="checkbox-container"  >
                            <input class="checkbox" type="checkbox" id="form-privacy" required/> I have read the <a href="privacy.html">Privacy Policy</a> <br/>
                        
                       </div>
<br>
                        <div>
                            <button type="submit" class="btn form-button">Get In Touch</button>
                        </div>
                   </form>`
};

// Component loader class
class ComponentLoader {
    loadComponent(componentName, targetElementId) {
        const component = Components[componentName];
        if (!component) {
            console.error(`Component ${componentName} not found`);
            return;
        }

        const targetElement = document.getElementById(targetElementId);
        if (targetElement) {
            targetElement.innerHTML = component;
            if (componentName === 'header') this.fixPortalHeaderLinks();
            if (componentName === 'footer') this.fixPortalFooterLinks();
            setTimeout(() => {
                this.initComponentScripts();
                if (typeof initializeForms === 'function') {
                    setTimeout(initializeForms, 100);
                }
            }, 0);
        }
    }

    fixPortalHeaderLinks() {
        const path = (window.location.pathname || window.location.href || '').replace(/\\/g, '/');
        const inPortal = path.indexOf('portal') !== -1;
        if (!inPortal) return;
        const inPortalSub = /portal[\/\\](client|admin)[\/\\]/.test(path);
        const base = inPortalSub ? '../../' : '../';
        const container = document.getElementById('header-container');
        if (!container) return;
        // Fix logo image path so it loads from portal (works with file:// and http)
        const logoImg = container.querySelector('.navbar-brand img');
        if (logoImg) logoImg.setAttribute('src', base + 'images/img30.png');
        container.querySelectorAll('a[href]').forEach(a => {
            const h = (a.getAttribute('href') || '').trim();
            if (!h || h === '#' || /^https?:\/\//i.test(h) || h.startsWith('javascript:')) return;
            if (h === 'index.html') {
                a.setAttribute('href', base + 'index.html');
                return;
            }
            if (h === 'portal/login.html') {
                a.setAttribute('href', inPortalSub ? '../login.html' : 'login.html');
                return;
            }
            if (h.includes('/') === false && h.endsWith('.html')) {
                a.setAttribute('href', base + h);
            }
        });
    }

    fixPortalFooterLinks() {
        const path = (window.location.pathname || window.location.href || '').replace(/\\/g, '/');
        const inPortal = path.indexOf('portal') !== -1;
        if (!inPortal) return;
        const inPortalSub = /portal[\/\\](client|admin)[\/\\]/.test(path);
        const base = inPortalSub ? '../../' : '../';
        const container = document.getElementById('footer-container');
        if (!container) return;
        container.querySelectorAll('a[href]').forEach(a => {
            const h = (a.getAttribute('href') || '').trim();
            if (!h || h === '#' || /^https?:\/\//i.test(h)) return;
            if (h.includes('/') === false && h.endsWith('.html')) {
                a.setAttribute('href', base + h);
            }
        });
    }

    initComponentScripts() {
        // Initialize navigation functionality
        this.initNavigation();
    }

    initNavigation() {
        // Prevent duplicate initialization
        if (this.navigationInitialized) {
            return;
        }
        this.navigationInitialized = true;

        const navbarToggler = document.querySelector('.navbar-toggler');
        const navbarCollapse = document.querySelector('.navbar-collapse');
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

        if (navbarToggler && navbarCollapse) {
            navbarToggler.addEventListener('click', function () {
                navbarCollapse.classList.toggle('show');
            });
        }

        // Add event listeners for dropdown toggles
        dropdownToggles.forEach(dropdownToggle => {
            dropdownToggle.addEventListener('click', function (e) {
                e.preventDefault();

                const parentItem = this.parentElement;
                const dropdownMenu = parentItem.querySelector('.dropdown-menu');

                if (dropdownMenu && dropdownMenu.classList.contains('show')) {
                    dropdownMenu.classList.remove('show');
                } else {
                    document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
                        openMenu.classList.remove('show');
                    });
                    if (dropdownMenu) {
                        dropdownMenu.classList.add('show');
                    }
                }
            });
        });

        // Close navbar and dropdowns when clicking outside (only add once)
        if (!this.outsideClickHandler) {
            this.outsideClickHandler = function (e) {
                if (navbarCollapse && !navbarCollapse.contains(e.target) &&
                    navbarToggler && !navbarToggler.contains(e.target)) {
                    navbarCollapse.classList.remove('show');
                    document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
                        openMenu.classList.remove('show');
                    });
                }
            };
            document.addEventListener('click', this.outsideClickHandler);
        }
    }
}

// Initialize component loader
const componentLoader = new ComponentLoader();

// Load components when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Load header first, then footer
    componentLoader.loadComponent('header', 'header-container');
    componentLoader.loadComponent('footer', 'footer-container');

    // Load additional components if containers exist
    if (document.getElementById('form-container')) {
        componentLoader.loadComponent('form', 'form-container');
    }
    if (document.getElementById('whatsapp-container')) {
        componentLoader.loadComponent('whatsapp', 'whatsapp-container');
    }
    if (document.getElementById('mini-banner-container')) {
        componentLoader.loadComponent('miniBanner', 'mini-banner-container');
    }
    if (document.getElementById('mobilemenu-container')) {
        componentLoader.loadComponent('mobilemenu', 'mobilemenu-container');
    }
});
