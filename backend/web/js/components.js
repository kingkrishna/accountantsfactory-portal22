// Components system for loading header, footer, and other reusable components
// All components are embedded as strings for better performance

const Components = {
    header: `<nav class="navbar navbar-expand-xl navbar-light bg-white border-bottom shadow-sm">
  <div class="container" style="max-width: 1320px; padding: 0 15px;">
    <a class="navbar-brand py-2" href="index.html">
      <img data-logo="logo1.png" src="images/logo1.png" alt="Accountants Factory — Tech-Driven Accounting Services" class="site-logo" style="height: 54px; width: auto; display: block;">
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

        <!-- Zoho Suite -->
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle font-weight-bold" href="zoho-books-ecosystem.html" id="zohoDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="color: #016F69;">
            <i class="fas fa-cubes mr-1" style="color:#016F69;"></i> Zoho Suite
          </a>
          <div class="dropdown-menu shadow-lg border-0" aria-labelledby="zohoDropdown" style="border-radius: 10px; min-width: 250px; padding: 10px 0;">
            <a class="dropdown-item py-2" href="zoho-books-ecosystem.html"><i class="fas fa-book mr-2 text-success"></i> Zoho Books &amp; GST</a>
            <a class="dropdown-item py-2" href="zoho-books-ecosystem.html#zoho-crm"><i class="fas fa-users-cog mr-2 text-primary"></i> Zoho CRM</a>
            <a class="dropdown-item py-2" href="zoho-books-ecosystem.html#zoho-people"><i class="fas fa-user-tie mr-2 text-warning"></i> Zoho People &amp; Payroll</a>
            <a class="dropdown-item py-2" href="zoho-books-ecosystem.html#zoho-erp"><i class="fas fa-layer-group mr-2 text-info"></i> Zoho Creator &amp; ERP</a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item py-2" href="zoho-books-ecosystem.html#migration"><i class="fas fa-exchange-alt mr-2 text-muted"></i> Tally to Zoho Migration</a>
            <a class="dropdown-item py-2" href="zoho-books-ecosystem.html#training"><i class="fas fa-graduation-cap mr-2 text-success"></i> Certified Training</a>
          </div>
        </li>

        <!-- Startup Services -->
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" href="startup-services.html" id="startupDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            Start a Business
          </a>
          <div class="dropdown-menu shadow-lg border-0" aria-labelledby="startupDropdown" style="border-radius: 10px; min-width: 270px; padding: 10px 0;">
            <a class="dropdown-item py-2" href="private-limited-company-registration-in-india.html"><i class="fas fa-building mr-2 text-primary"></i> Private Limited Company</a>
            <a class="dropdown-item py-2" href="llp-registration-in-india.html"><i class="fas fa-handshake mr-2 text-success"></i> LLP Registration</a>
            <a class="dropdown-item py-2" href="one-person-company-registration-in-india.html"><i class="fas fa-user mr-2 text-info"></i> One Person Company (OPC)</a>
            <a class="dropdown-item py-2" href="partnership-firm-registrations-in-india.html"><i class="fas fa-users mr-2 text-secondary"></i> Partnership Firm</a>
            <a class="dropdown-item py-2" href="start-up-india-registrations-in-india.html"><i class="fas fa-rocket mr-2 text-danger"></i> Startup India (DPIIT)</a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item py-2" href="gst-registrations-in-india.html"><i class="fas fa-file-invoice mr-2 text-warning"></i> GST Registration</a>
            <a class="dropdown-item py-2" href="msme-registrations-in-india.html"><i class="fas fa-certificate mr-2 text-info"></i> MSME / Udyam</a>
            <a class="dropdown-item py-2" href="IEC-Import-and-Export-Code-registration-in-india.html"><i class="fas fa-globe mr-2 text-primary"></i> Import Export Code (IEC)</a>
            <a class="dropdown-item py-2" href="rera-andhra-pradesh-registration-in-india.html"><i class="fas fa-home mr-2 text-muted"></i> AP RERA Registration</a>
          </div>
        </li>

        <!-- Accounting & Compliance -->
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" href="outsourced-accounting.html" id="accountingDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            Accounting &amp; Tax
          </a>
          <div class="dropdown-menu shadow-lg border-0" aria-labelledby="accountingDropdown" style="border-radius: 10px; min-width: 270px; padding: 10px 0;">
            <a class="dropdown-item py-2" href="outsourced-accounting.html"><i class="fas fa-book mr-2 text-primary"></i> Outsourced Bookkeeping</a>
            <a class="dropdown-item py-2" href="gst-filing-in-india.html"><i class="fas fa-receipt mr-2 text-success"></i> GST Filing &amp; 2B Matching</a>
            <a class="dropdown-item py-2" href="tds-return-filing-in-india.html"><i class="fas fa-coins mr-2 text-warning"></i> TDS &amp; Payroll Returns</a>
            <a class="dropdown-item py-2" href="itr-in-india.html"><i class="fas fa-calendar-check mr-2 text-danger"></i> Income Tax Return (ITR)</a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item py-2" href="aoc4-mgt-7-in-india.html"><i class="fas fa-stamp mr-2 text-info"></i> AOC-4 &amp; MGT-7 ROC Filing</a>
            <a class="dropdown-item py-2" href="form11-llp-in-india.html"><i class="fas fa-file-contract mr-2 text-secondary"></i> Form 11 LLP Annual Return</a>
            <a class="dropdown-item py-2" href="form8-llp-in-india.html"><i class="fas fa-balance-scale mr-2 text-secondary"></i> Form 8 Statement of Solvency</a>
            <a class="dropdown-item py-2" href="provident-fund-in-india.html"><i class="fas fa-shield-alt mr-2 text-success"></i> Provident Fund (PF)</a>
            <a class="dropdown-item py-2" href="esic-in-india.html"><i class="fas fa-heartbeat mr-2 text-danger"></i> ESIC Registration &amp; Filing</a>
            <a class="dropdown-item py-2" href="professional-tax-in-india.html"><i class="fas fa-briefcase mr-2 text-muted"></i> Professional Tax</a>
          </div>
        </li>

        <!-- Virtual CFO -->
        <li class="nav-item">
          <a class="nav-link" href="virtual-cfo-services-in-india.html">Virtual CFO</a>
        </li>

        <!-- Tools -->
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" href="#" id="toolsDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            Tools
          </a>
          <div class="dropdown-menu shadow-lg border-0" aria-labelledby="toolsDropdown" style="border-radius: 10px; min-width: 220px; padding: 10px 0;">
            <a class="dropdown-item py-2" href="incometax-cal.html"><i class="fas fa-calculator mr-2 text-primary"></i> Income Tax Calculator</a>
            <a class="dropdown-item py-2" href="cashflow-tool.html"><i class="fas fa-water mr-2 text-info"></i> Cash Flow Planner</a>
            <a class="dropdown-item py-2" href="new-gst-rates.html"><i class="fas fa-percentage mr-2 text-warning"></i> GST Rate Finder</a>
          </div>
        </li>

        <!-- About Us -->
        <li class="nav-item">
          <a class="nav-link" href="about.html">About</a>
        </li>

        <!-- Contact Us -->
        <li class="nav-item">
          <a class="nav-link" href="contact.html">Contact</a>
        </li>
             
        <!-- Client Portal Button -->
        <li class="nav-item ml-xl-2">
          <a class="btn btn-outline-primary client-portal-btn" href="portal/login.html" style="border-radius: 8px; font-weight: 700; padding: 8px 18px;">
            <i class="fas fa-user-lock mr-1"></i> Client Portal
          </a>
        </li>
             
        <!-- Consult Now Button -->
        <li class="nav-item ml-xl-2">
          <a class="btn btn-primary" href="contact.html" style="border-radius: 8px; font-weight: 700; padding: 9px 20px; background-color: #016F69; border-color: #016F69;">
            Consult Now
          </a>
        </li>
      </ul>
    </div>
  </div>
</nav>`,

    footer: `<footer class="bg-dark text-white footer" style="position: relative; background-color: #0D1A17 !important;" itemscope itemtype="https://schema.org/ProfessionalService">
    <div class="container" style="max-width: 1320px; padding: 60px 15px 30px;">
        <div class="row">
            <!-- Column 1: Company Details -->
            <div class="col-lg-4 col-md-6 mb-4 mb-lg-0">
                <h5 class="text-white font-weight-bold mb-3" style="font-size: 1.25rem;">
                  <span itemprop="name">Accountants Factory LLP</span>
                </h5>
                <p class="text-muted" style="font-size: 14px; line-height: 1.7; color: #8CA29E !important;">
                  Official Zoho Certified Partner and premier financial advisory firm. Providing end-to-end Zoho Suite implementations, company registrations, Virtual CFO leadership, and outsourced bookkeeping across India and globally.
                </p>
                <address style="font-style: normal; font-size: 14px; line-height: 1.6; color: #8CA29E;"
                         itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
                  <i class="fas fa-map-marker-alt mr-2" style="color:#C79A2E;"></i>
                  <span itemprop="streetAddress">Ground Floor, K S R Nilayam, Hathiramji Colony, Annamayya Circle</span>,<br>
                  <span itemprop="addressLocality">Tirupati</span>,
                  <span itemprop="addressRegion">Andhra Pradesh</span> - 
                  <span itemprop="postalCode">517501</span>,
                  <span itemprop="addressCountry">India</span>
                </address>
                <p style="margin-top: 12px; font-size: 14px; line-height: 1.8; color: #8CA29E;">
                  <i class="fas fa-phone mr-2" style="color:#C79A2E;"></i>
                  <a href="tel:+919176671206" itemprop="telephone" class="text-white text-decoration-none">+91 91766 71206</a><br>
                  <i class="fas fa-envelope mr-2" style="color:#C79A2E;"></i>
                  <a href="mailto:reachus@accountantsfactory.com" itemprop="email" class="text-white text-decoration-none">reachus@accountantsfactory.com</a>
                </p>
            </div>

            <!-- Column 2: Solutions -->
            <div class="col-lg-3 col-md-6 mb-4 mb-lg-0">
                <h5 class="text-white font-weight-bold mb-3" style="font-size: 1.1rem;">Core Solutions</h5>
                <ul style="list-style: none; padding: 0; font-size: 14px; line-height: 2.2;">
                    <li><a href="zoho-books-ecosystem.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>Zoho Books &amp; GST</a></li>
                    <li><a href="private-limited-company-registration-in-india.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>Private Limited Registration</a></li>
                    <li><a href="llp-registration-in-india.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>LLP Registration</a></li>
                    <li><a href="one-person-company-registration-in-india.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>One Person Company</a></li>
                    <li><a href="virtual-cfo-services-in-india.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>Virtual CFO Advisory</a></li>
                    <li><a href="outsourced-accounting.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>Outsourced Bookkeeping</a></li>
                    <li><a href="gst-filing-in-india.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>GST Return Filing</a></li>
                </ul>
            </div>

            <!-- Column 3: Quick Links & Portal -->
            <div class="col-lg-2 col-md-6 mb-4 mb-lg-0">
                <h5 class="text-white font-weight-bold mb-3" style="font-size: 1.1rem;">Quick Links</h5>
                <ul style="list-style: none; padding: 0; font-size: 14px; line-height: 2.2;">
                    <li><a href="about.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>About Us</a></li>
                    <li><a href="contact.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>Contact Us</a></li>
                    <li><a href="portal/login.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>Client Portal</a></li>
                    <li><a href="terms.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>Terms of Service</a></li>
                    <li><a href="privacy.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>Privacy Policy</a></li>
                    <li><a href="cookie.html" class="text-decoration-none" style="color: #8CA29E !important;"><i class="fas fa-angle-right mr-2" style="color:#C79A2E;"></i>Cookies Policy</a></li>
                </ul>
            </div>

            <!-- Column 4: Certifications & Social -->
            <div class="col-lg-3 col-md-6">
                <h5 class="text-white font-weight-bold mb-3" style="font-size: 1.1rem;">Connect With Us</h5>
                <p style="font-size: 14px; color: #8CA29E;">
                  Follow our insights on tax laws, Zoho automations, and startup finance strategies.
                </p>
                <div class="d-flex gap-2 mt-3">
                  <a href="https://www.linkedin.com/company/accountantsfactory" target="_blank" rel="noopener" class="btn btn-outline-light btn-sm mr-2" style="border-radius: 50%; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;"><i class="fab fa-linkedin-in"></i></a>
                  <a href="https://www.instagram.com/accountantsfactory/" target="_blank" rel="noopener" class="btn btn-outline-light btn-sm mr-2" style="border-radius: 50%; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;"><i class="fab fa-instagram"></i></a>
                  <a href="https://www.facebook.com/accountantsfactory/" target="_blank" rel="noopener" class="btn btn-outline-light btn-sm mr-2" style="border-radius: 50%; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;"><i class="fab fa-facebook-f"></i></a>
                  <a href="https://twitter.com/Accntantfactory" target="_blank" rel="noopener" class="btn btn-outline-light btn-sm" style="border-radius: 50%; width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;"><i class="fab fa-twitter"></i></a>
                </div>
                <div class="mt-4 p-3 rounded" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                  <div style="font-size: 13px; font-weight: 700; color: #C79A2E;"><i class="fas fa-check-circle mr-1"></i> Zoho Certified Partner</div>
                  <div style="font-size: 12px; color: #8CA29E;">Official Partner &amp; Certified Trainer</div>
                </div>
            </div>
        </div>

        <div class="border-top mt-5 pt-4 text-center" style="border-color: rgba(255,255,255,0.1) !important;">
          <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">
            &copy; 2026 Accountants Factory LLP. All rights reserved. | Official Zoho Partner &amp; Tech-Driven Financial Advisors.
          </p>
        </div>
    </div>
</footer>`,

    whatsapp: `<div class="d-flex flex-wrap gap-2 my-3">
  <a href="mailto:reachus@accountantsfactory.com?subject=Inquiry%20via%20Website" class="btn btn-primary mr-2 mb-2" style="background-color: #016F69; border-color: #016F69;"><i class="fas fa-envelope mr-1"></i> Email Us</a>
  <a href="tel:+919176671206" class="btn btn-outline-dark mb-2"><i class="fas fa-phone mr-1"></i> +91 91766 71206</a>
</div>`,

    mobilemenu: `<!-- Mobile menu loaded -->`,
    miniBanner: ``,

    form: `<form class="form p-4 rounded shadow-sm bg-white border" action="https://formsubmit.co/reachus@accountantsfactory.com" method="POST">
  <h4 class="font-weight-bold text-dark mb-3">Get a Free Consultation</h4>
  <p class="text-muted small mb-4">Talk to a Certified Zoho Specialist &amp; Chartered Accountant.</p>
  <div class="form-group">
    <label for="form-name" class="font-weight-bold small text-muted">Your Name *</label>
    <input type="text" class="form-control" name="name" id="form-name" placeholder="Rajesh Kumar" required>
  </div>
  <div class="form-group">
    <label for="form-email" class="font-weight-bold small text-muted">Business Email *</label>
    <input type="email" class="form-control" name="email" id="form-email" placeholder="rajesh@company.com" required>
  </div>
  <div class="form-group">
    <label for="form-mobile" class="font-weight-bold small text-muted">Phone Number *</label>
    <input type="tel" class="form-control" name="mobile" id="form-mobile" placeholder="+91 98765 43210" required>
  </div>
  <div class="form-group">
    <label for="form-service" class="font-weight-bold small text-muted">Service Needed *</label>
    <select class="form-control" id="form-service" name="service" required>
      <option value="" disabled selected>Choose a service...</option>
      <option value="Zoho Suite Implementation">Zoho Suite Implementation (Books/CRM/People/ERP)</option>
      <option value="Tally to Zoho Migration">Tally / QuickBooks to Zoho Migration</option>
      <option value="Startup Incorporation">Startup Company Registration (Pvt Ltd / LLP / OPC)</option>
      <option value="Startup India DPIIT">Startup India DPIIT Recognition &amp; Tax Exemption</option>
      <option value="Virtual CFO Services">Virtual CFO Advisory &amp; MIS</option>
      <option value="Outsourced Bookkeeping">Outsourced Accounting &amp; Bookkeeping</option>
      <option value="GST & Tax Filings">GST, TDS &amp; Income Tax Filings</option>
    </select>
  </div>
  <div class="form-group">
    <label for="form-message" class="font-weight-bold small text-muted">Message / Project Details</label>
    <textarea class="form-control" id="form-message" name="message" rows="3" placeholder="Tell us about your requirements..."></textarea>
  </div>
  <button type="submit" class="btn btn-primary btn-block py-2 mt-3 font-weight-bold" style="background-color: #016F69; border-color: #016F69;">
    <i class="fas fa-paper-plane mr-2"></i> Submit Inquiry
  </button>
</form>`
};

// Component loader class
class ComponentLoader {
    loadComponent(componentName, targetElementId) {
        const component = Components[componentName];
        if (!component) {
            return;
        }

        const targetElement = document.getElementById(targetElementId);
        if (targetElement) {
            targetElement.innerHTML = component;
            if (componentName === 'header') {
                this.resolveHeaderLogo();
                this.fixPortalHeaderLinks();
            }
            if (componentName === 'footer') this.fixPortalFooterLinks();
        }
    }

    pathToRoot() {
        if (this._cachedPathToRoot !== undefined) return this._cachedPathToRoot;
        const path = (window.location.pathname || '/').replace(/\\/g, '/');
        const hasTrailingSlash = path.endsWith('/');
        const segments = path.split('/').filter(s => s.length > 0);
        if (!hasTrailingSlash && segments.length > 0) segments.pop();
        this._cachedPathToRoot = '../'.repeat(segments.length);
        return this._cachedPathToRoot;
    }

    resolveHeaderLogo() {
        const logo = document.querySelector('.site-logo');
        if (!logo) return;
        const rel = logo.getAttribute('data-logo');
        if (!rel) return;
        logo.src = this.pathToRoot() + 'images/' + rel;
    }

    fixPortalHeaderLinks() {
        const root = this.pathToRoot();
        if (!root) return;
        document.querySelectorAll('#header-container a').forEach(a => {
            const href = a.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
            a.setAttribute('href', root + href);
        });
    }

    fixPortalFooterLinks() {
        const root = this.pathToRoot();
        if (!root) return;
        document.querySelectorAll('#footer-container a').forEach(a => {
            const href = a.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
            a.setAttribute('href', root + href);
        });
    }
}

const componentLoader = new ComponentLoader();
document.addEventListener('DOMContentLoaded', () => {
    componentLoader.loadComponent('header', 'header-container');
    componentLoader.loadComponent('footer', 'footer-container');
    componentLoader.loadComponent('miniBanner', 'mini-banner-container');
    componentLoader.loadComponent('mobilemenu', 'mobilemenu-container');
    componentLoader.loadComponent('whatsapp', 'whatsapp-container');
    componentLoader.loadComponent('form', 'form-container');
});
