// Components system for loading unified header, footer, and mobile navigation
// All components are embedded as strings for performance and consistency

const Components = {
    header: `<div class="strip">
  <div class="wrap">
    <span><i class="fas fa-certificate"></i> Zoho Authorized Partner &amp; Certified Trainer &middot; Tirupati, Andhra Pradesh</span>
    <span><i class="fas fa-phone-alt"></i> <a href="tel:+919176671206">91766 71206</a></span>
  </div>
</div>

<nav>
  <div class="wrap nav-in">
    <a href="index.html" class="logo">Accountants <b>Factory</b><span>Tech-driven accounting services</span></a>

    <div class="menu">
      <div class="mi">
        <a href="startup-services.html">Start a Business <i class="fas fa-chevron-down"></i></a>
        <div class="drop">
          <a href="startup-services.html"><i class="fas fa-building"></i> Private Limited Company</a>
          <a href="startup-services.html"><i class="fas fa-handshake"></i> LLP Registration</a>
          <a href="startup-services.html"><i class="fas fa-user"></i> OPC &amp; Proprietorship</a>
          <a href="startup-services.html"><i class="fas fa-hand-holding-heart"></i> Section 8 / NGO</a>
          <a href="startup-services.html"><i class="fas fa-rocket"></i> Startup India (DPIIT)</a>
          <a href="startup-services.html"><i class="fas fa-file-signature"></i> GST, MSME, IEC, Trademark</a>
        </div>
      </div>
      <div class="mi">
        <a href="outsourced-accounting.html">Accounting <i class="fas fa-chevron-down"></i></a>
        <div class="drop">
          <a href="outsourced-accounting.html"><i class="fas fa-book"></i> Outsourced bookkeeping</a>
          <a href="outsourced-accounting.html"><i class="fas fa-receipt"></i> GST returns &amp; reconciliation</a>
          <a href="outsourced-accounting.html"><i class="fas fa-users"></i> TDS &amp; payroll</a>
          <a href="outsourced-accounting.html"><i class="fas fa-calendar-check"></i> Year-end &amp; income tax</a>
          <a href="outsourced-accounting.html"><i class="fas fa-stamp"></i> Annual ROC compliance</a>
        </div>
      </div>
      <div class="mi">
        <a href="zoho-books-ecosystem.html">Zoho Solutions <i class="fas fa-chevron-down"></i></a>
        <div class="drop">
          <a href="zoho-books-ecosystem.html"><i class="fas fa-calculator"></i> Zoho Books &amp; GST</a>
          <a href="zoho-books-ecosystem.html#zoho-crm"><i class="fas fa-bullseye"></i> Zoho CRM</a>
          <a href="zoho-books-ecosystem.html#zoho-people"><i class="fas fa-user-tie"></i> Zoho People &amp; Payroll</a>
          <a href="zoho-books-ecosystem.html#zoho-erp"><i class="fas fa-cogs"></i> Zoho Creator &amp; ERP</a>
          <a href="zoho-books-ecosystem.html"><i class="fas fa-exchange-alt"></i> Tally to Zoho migration</a>
          <a href="zoho-books-ecosystem.html"><i class="fas fa-chalkboard-teacher"></i> Zoho training</a>
        </div>
      </div>
      <div class="mi">
        <a href="virtual-cfo-services-in-india.html">Virtual CFO <i class="fas fa-chevron-down"></i></a>
        <div class="drop">
          <a href="virtual-cfo-services-in-india.html"><i class="fas fa-chart-line"></i> Virtual CFO retainer</a>
          <a href="virtual-cfo-services-in-india.html"><i class="fas fa-tachometer-alt"></i> MIS &amp; dashboards</a>
          <a href="virtual-cfo-services-in-india.html"><i class="fas fa-water"></i> Cash flow &amp; budgeting</a>
          <a href="virtual-cfo-services-in-india.html"><i class="fas fa-university"></i> CMA / DPR for funding</a>
        </div>
      </div>
      <div class="mi"><a href="index.html#deck">Pricing</a></div>
    </div>

    <div style="display:flex;gap:10px;align-items:center">
      <a href="portal/login.html" class="btn btn-ghost btn-sm" style="border:1.5px solid var(--line);"><i class="fas fa-user-lock"></i> Client Portal</a>
      <a href="contact.html" class="btn btn-primary btn-sm">Book a free call</a>
      <button class="burger" aria-label="Menu"><i class="fas fa-bars"></i></button>
    </div>
  </div>
</nav>

<!-- mobile drawer -->
<div class="mnav" id="mnav">
  <details><summary>Start a Business <i class="fas fa-chevron-down"></i></summary>
    <a href="startup-services.html">Private Limited Company</a>
    <a href="startup-services.html">LLP Registration</a>
    <a href="startup-services.html">OPC &amp; Proprietorship</a>
    <a href="startup-services.html">Section 8 / NGO</a>
    <a href="startup-services.html">Startup India (DPIIT)</a>
    <a href="startup-services.html">GST, MSME, IEC, Trademark</a>
  </details>
  <details><summary>Accounting <i class="fas fa-chevron-down"></i></summary>
    <a href="outsourced-accounting.html">Outsourced bookkeeping</a>
    <a href="outsourced-accounting.html">GST returns &amp; reconciliation</a>
    <a href="outsourced-accounting.html">TDS &amp; payroll</a>
    <a href="outsourced-accounting.html">Year-end &amp; income tax</a>
    <a href="outsourced-accounting.html">Annual ROC compliance</a>
  </details>
  <details><summary>Zoho Solutions <i class="fas fa-chevron-down"></i></summary>
    <a href="zoho-books-ecosystem.html">Zoho Books &amp; GST</a>
    <a href="zoho-books-ecosystem.html#zoho-crm">Zoho CRM</a>
    <a href="zoho-books-ecosystem.html#zoho-people">Zoho People &amp; Payroll</a>
    <a href="zoho-books-ecosystem.html#zoho-erp">Zoho Creator &amp; ERP</a>
    <a href="zoho-books-ecosystem.html">Tally to Zoho migration</a>
    <a href="zoho-books-ecosystem.html">Zoho training</a>
  </details>
  <details><summary>Virtual CFO <i class="fas fa-chevron-down"></i></summary>
    <a href="virtual-cfo-services-in-india.html">Virtual CFO retainer</a>
    <a href="virtual-cfo-services-in-india.html">MIS &amp; dashboards</a>
    <a href="virtual-cfo-services-in-india.html">Cash flow &amp; budgeting</a>
    <a href="virtual-cfo-services-in-india.html">CMA / DPR for funding</a>
  </details>
  <a class="m-flat" href="portal/login.html"><i class="fas fa-user-lock"></i> Client Portal Login</a>
  <a class="m-flat" href="index.html#deck">Pricing</a>
  <div class="m-cta">
    <a href="tel:+919176671206" class="btn btn-primary btn-sm"><i class="fas fa-phone-alt"></i> 91766 71206</a>
    <a href="https://wa.me/919176671206" class="btn btn-ghost btn-sm"><i class="fab fa-whatsapp"></i> WhatsApp</a>
  </div>
</div>`,

    footer: `<footer>
  <div class="wrap">
    <div class="fg">
      <div>
        <div class="logo" style="color:#fff">Accountants <b style="color:var(--gold)">Factory</b><span style="color:#8CA29E">Tech-driven accounting services</span></div>
        <p style="margin-top:14px">Ground Floor, K S R Nilayam, Near Master Minds College, Hathiramji Colony, Annamayya Circle, Tirupati, Andhra Pradesh 517501</p>
        <p><a href="tel:+919176671206" style="display:inline">91766 71206</a> &middot; <a href="mailto:reachus@accountantsfactory.com" style="display:inline">reachus@accountantsfactory.com</a></p>
      </div>
      <div>
        <h5>Start</h5>
        <a href="startup-services.html">Private Limited</a>
        <a href="startup-services.html">LLP</a>
        <a href="startup-services.html">OPC</a>
        <a href="startup-services.html">Registrations</a>
      </div>
      <div>
        <h5>Run</h5>
        <a href="outsourced-accounting.html">Bookkeeping</a>
        <a href="outsourced-accounting.html">GST filing</a>
        <a href="outsourced-accounting.html">Payroll</a>
        <a href="zoho-books-ecosystem.html">Zoho Books</a>
      </div>
      <div>
        <h5>Scale</h5>
        <a href="virtual-cfo-services-in-india.html">Virtual CFO</a>
        <a href="zoho-books-ecosystem.html">Zoho ERP</a>
        <a href="zoho-books-ecosystem.html">Tally migration</a>
        <a href="virtual-cfo-services-in-india.html">Bank funding</a>
      </div>
    </div>
    <p class="disc">Fees shown are professional fees, exclusive of government charges, stamp duty and applicable GST. Content on this site is general information and does not constitute legal or tax advice under the Income Tax Act, 1961.</p>
    <div class="fbot">
      <span>&copy; 2026 Accountants Factory LLP</span>
      <span>Zoho Authorized Partner &middot; Certified Zoho &amp; Tally Trainer &middot; <a href="portal/login.html" style="color:#8CA29E; text-decoration: underline;">Client Portal</a></span>
    </div>
  </div>
</footer>`,

    init: function() {
        // Load Header
        const headerContainer = document.getElementById('header-container');
        if (headerContainer) {
            headerContainer.innerHTML = this.header;
            
            // Attach mobile burger listener
            const b = headerContainer.querySelector('.burger');
            const m = headerContainer.querySelector('#mnav');
            if (b && m) {
                b.setAttribute('aria-expanded', 'false');
                b.addEventListener('click', function() {
                    const on = m.classList.toggle('open');
                    b.setAttribute('aria-expanded', on ? 'true' : 'false');
                    b.innerHTML = '<i class="fas fa-' + (on ? 'times' : 'bars') + '"></i>';
                });
                m.addEventListener('click', function(e) {
                    if (e.target.closest('a')) {
                        m.classList.remove('open');
                        b.innerHTML = '<i class="fas fa-bars"></i>';
                    }
                });
            }
        }

        // Load Footer
        const footerContainer = document.getElementById('footer-container');
        if (footerContainer) {
            footerContainer.innerHTML = this.footer;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Components.init();
});
