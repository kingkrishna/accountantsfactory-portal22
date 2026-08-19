# Build Script for Accountants Factory Portal - New Unified Design System
$webDir = "c:\Users\RAMA\Downloads\accountantsfactory-portal-main\accountantsfactory-portal-main\web"

$pages = @(
    @{
        filename = "private-limited-company-registration-in-india.html"
        title = "Private Limited Company Registration in India | Accountants Factory"
        badge = "Company Incorporation"
        h1 = "Register a <span class='mark'>Private Limited</span> Company"
        sub = "End-to-end incorporation with MCA name reservation, DSC, DIN, MOA/AOA, PAN, TAN and GST. Fixed fee, completed in 7-10 working days."
        micro1 = "Fixed ₹9,999 All-Inclusive"
        micro2 = "7-10 Working Days"
        micro3 = "Bank Account & GST Included"
        cards = @(
            @{ ic = "fas fa-signature"; title = "DSC & DIN Allotment"; desc = "Digital Signature Certificates for all directors and Director Identification Numbers issued seamlessly." },
            @{ ic = "fas fa-shield-alt"; title = "Name Reservation & SPICe+"; desc = "MCA RUN name approval and complete SPICe+ Part A & B electronic filing with ROC." },
            @{ ic = "fas fa-file-invoice-dollar"; title = "PAN, TAN & GST Registration"; desc = "Company PAN, TAN, standard MOA/AOA drafting, and automatic GSTIN enrollment upon incorporation." }
        )
        steps = @(
            @{ title = "1. Document Collection"; desc = "Submit PAN, Aadhaar, address proof and photos of proposed directors via our secure portal." },
            @{ title = "2. Name Approval & Filing"; desc = "We check MCA availability, file RUN application, draft custom MOA/AOA, and submit SPICe+." },
            @{ title = "3. Certificate of Incorporation"; desc = "ROC approves the application and issues CIN, Certificate of Incorporation, PAN and TAN." }
        )
        price = "₹9,999"
        priceNote = "all-inclusive professional & MCA filing fee"
    },
    @{
        filename = "llp-registration-in-india.html"
        title = "LLP Registration in India | Accountants Factory"
        badge = "Partnership Structuring"
        h1 = "Limited Liability <span class='mark'>Partnership (LLP)</span>"
        sub = "Combine the operational flexibility of a partnership with the limited liability benefits of a corporate structure. Zero audit requirement up to ₹40 Lakhs turnover."
        micro1 = "From ₹7,999"
        micro2 = "Zero Minimum Capital"
        micro3 = "No Mandatory Audit < ₹40L"
        cards = @(
            @{ ic = "fas fa-handshake"; title = "DPIN & Digital Signatures"; desc = "Designated Partner Identification Numbers and Class 3 DSCs issued for all designated partners." },
            @{ ic = "fas fa-file-contract"; title = "Custom LLP Agreement"; desc = "Professional drafting of the LLP Agreement defining profit ratios, rights, and dispute mechanisms." },
            @{ ic = "fas fa-certificate"; title = "FiLLiP & MCA Incorporation"; desc = "Electronic submission on MCA21 portal and prompt receipt of Certificate of Incorporation." }
        )
        steps = @(
            @{ title = "1. Partner Onboarding"; desc = "Provide KYC documents, address proofs, and registered office utility bills." },
            @{ title = "2. Name Reservation & Filing"; desc = "RUN-LLP name approval and electronic filing of Form FiLLiP with the ROC." },
            @{ title = "3. Agreement Filing (Form 3)"; desc = "Drafting, execution on state stamp paper, and filing Form 3 within 30 days of incorporation." }
        )
        price = "₹7,999"
        priceNote = "complete registration + agreement drafting"
    },
    @{
        filename = "one-person-company-registration-in-india.html"
        title = "One Person Company (OPC) Registration | Accountants Factory"
        badge = "Solo Entrepreneur"
        h1 = "One Person <span class='mark'>Company (OPC)</span> Registration"
        sub = "100% sole ownership with complete corporate limited liability protection. The ideal corporate entity for solo founders, freelancers, and solopreneurs."
        micro1 = "From ₹6,999"
        micro2 = "Single Director Structure"
        micro3 = "Limited Liability Protection"
        cards = @(
            @{ ic = "fas fa-user-shield"; title = "Sole Shareholder Control"; desc = "Retain 100% equity and operational control while safeguarding personal wealth from business debts." },
            @{ ic = "fas fa-file-alt"; title = "Nominee Documentation"; desc = "Smooth nomination compliance as mandated by the Companies Act 2013 with digital consent filings." },
            @{ ic = "fas fa-chart-line"; title = "Conversion Flexibility"; desc = "Easily convert into a full Private Limited company as your business scales and brings in co-founders." }
        )
        steps = @(
            @{ title = "1. KYC & Nominee Details"; desc = "Submit founder KYC, nominee consent form INC-3, and registered business address proofs." },
            @{ title = "2. SPICe+ OPC Filing"; desc = "Draft MOA/AOA with nominee clause, obtain DSC, and file SPICe+ with the Registrar of Companies." },
            @{ title = "3. Incorporation & Banking"; desc = "Receive Certificate of Incorporation, PAN, TAN, and instant bank account opening assistance." }
        )
        price = "₹6,999"
        priceNote = "incorporation, nominee filing & PAN/TAN"
    },
    @{
        filename = "partnership-firm-registrations-in-india.html"
        title = "Partnership Firm Registration in India | Accountants Factory"
        badge = "Traditional Business"
        h1 = "Partnership <span class='mark'>Firm Registration</span>"
        sub = "Fast, cost-effective structure for 2 to 20 partners. Full legal drafting of Partnership Deed, notary attestation, and Registrar of Firms (ROF) filing."
        micro1 = "From ₹3,999"
        micro2 = "Minimal Compliance"
        micro3 = "Done in 3-5 Days"
        cards = @(
            @{ ic = "fas fa-balance-scale"; title = "Deed Drafting & Notary"; desc = "Custom deed outlining capital sharing, profit/loss distribution, interest on capital, and dissolution terms." },
            @{ ic = "fas fa-university"; title = "Firm PAN & Bank Account"; desc = "Separate legal entity PAN allotment under Indian Partnership Act, 1932." },
            @{ ic = "fas fa-stamp"; title = "Registrar of Firms (ROF)"; desc = "Optional registration with the state Registrar of Firms for legal dispute enforceability." }
        )
        steps = @(
            @{ title = "1. Drafting Terms"; desc = "Discuss terms with our legal advisors to formulate a airtight partnership agreement." },
            @{ title = "2. Stamp Duty & Notary"; desc = "Execution on requisite non-judicial stamp paper and notarization." },
            @{ title = "3. PAN & GST Enrollment"; desc = "Apply for Partnership Firm PAN card, current account resolution, and GST registration." }
        )
        price = "₹3,999"
        priceNote = "deed drafting, notary & PAN"
    },
    @{
        filename = "start-up-india-registrations-in-india.html"
        title = "Startup India DPIIT Recognition & 80-IAC | Accountants Factory"
        badge = "Govt Benefits & Tax Holiday"
        h1 = "Startup India <span class='mark'>DPIIT Recognition</span>"
        sub = "Unlock 3-year 100% tax holiday under Section 80-IAC, Angel Tax exemption (Section 56), fast-tracked 80% patent rebate, and government tender priority."
        micro1 = "Section 80-IAC Tax Exemption"
        micro2 = "Angel Tax Exemption"
        micro3 = "Govt Tender & EMD Waivers"
        cards = @(
            @{ ic = "fas fa-rocket"; title = "DPIIT Certificate"; desc = "Official recognition certificate from Department for Promotion of Industry and Internal Trade." },
            @{ ic = "fas fa-percentage"; title = "Tax Holiday (80-IAC)"; desc = "Preparation of innovation pitch deck, business model review, and application to IMB." },
            @{ ic = "fas fa-award"; title = "Fast-Track IP & Tenders"; desc = "80% rebate on patent filings and exemption from prior turnover/experience criteria in government tenders." }
        )
        steps = @(
            @{ title = "1. Eligibility Audit"; desc = "Evaluate innovation criteria, scalable business model, and incorporation date." },
            @{ title = "2. Pitch Deck & Documentation"; desc = "Draft proof-of-concept summary, uniqueness write-up, and pitch deck for DPIIT examiners." },
            @{ title = "3. Portal Submission & Certificate"; desc = "Submit on the National Startup Portal and track query resolution until certificate is granted." }
        )
        price = "₹4,999"
        priceNote = "complete DPIIT recognition filing"
    },
    @{
        filename = "msme-registrations-in-india.html"
        title = "MSME Udyam Registration | Accountants Factory"
        badge = "Government Subsidies"
        h1 = "MSME / <span class='mark'>Udyam Registration</span>"
        sub = "Get your official Udyam Certificate for Micro, Small and Medium Enterprises. Access collateral-free bank loans (CGTMSE), lower electricity tariffs, and 45-day MSME payment protection."
        micro1 = "Same-Day Issuance"
        micro2 = "45-Day Payment Rule"
        micro3 = "Collateral-Free Loan Access"
        cards = @(
            @{ ic = "fas fa-industry"; title = "Udyam Certificate"; desc = "Permanent 19-digit Udyam Registration Number with QR code issued by the Ministry of MSME." },
            @{ ic = "fas fa-shield-virus"; title = "Delayed Payment Protection"; desc = "Mandatory 45-day payment enforcement under Section 43B(h) of the Income Tax Act." },
            @{ ic = "fas fa-coins"; title = "Bank Interest Subsidies"; desc = "1% to 2% interest subvention on business overdrafts and priority sector lending benefits." }
        )
        steps = @(
            @{ title = "1. Share Aadhaar & PAN"; desc = "Provide proprietor/director Aadhaar linked to mobile number and business PAN." },
            @{ title = "2. NIC Classification"; desc = "We classify your business under exact National Industrial Classification (NIC) codes." },
            @{ title = "3. Instant Certificate Download"; desc = "Receive your verified Government of India Udyam Certificate directly in your email." }
        )
        price = "₹999"
        priceNote = "fast-track Udyam filing"
    },
    @{
        filename = "gst-registrations-in-india.html"
        title = "GST Registration in India | Accountants Factory"
        badge = "Tax Compliance"
        h1 = "Online <span class='mark'>GST Registration</span>"
        sub = "Mandatory for sales exceeding threshold limits, e-commerce sellers, and interstate trade. Accurate filing, zero query delays, and quick GSTIN generation."
        micro1 = "ARN in 24 Hours"
        micro2 = "Aadhaar Authentication"
        micro3 = "E-Commerce & Interstate Ready"
        cards = @(
            @{ ic = "fas fa-file-invoice"; title = "GST Application (REG-01)"; desc = "Detailed drafting of business principal place of business, HSN/SAC codes, and bank authorizations." },
            @{ ic = "fas fa-fingerprint"; title = "Biometric / Aadhaar OTP"; desc = "Fast-track approval pathway using Aadhaar biometric authentication without physical site inspection." },
            @{ ic = "fas fa-check-double"; title = "GSTIN Certificate (REG-06)"; desc = "Final 15-digit GSTIN Certificate with login credentials and ledger setups." }
        )
        steps = @(
            @{ title = "1. Document Upload"; desc = "Upload electricity bill, rent agreement/NOC, PAN, Aadhaar, and cancelled cheque." },
            @{ title = "2. Portal Submission"; desc = "We submit Form GST REG-01 and guide you through the 1-click Aadhaar OTP verification." },
            @{ title = "3. GSTIN Issued"; desc = "GST officer approves within 3 to 7 working days, delivering your certificate." }
        )
        price = "₹1,499"
        priceNote = "complete registration + ARN tracking"
    },
    @{
        filename = "IEC-Import-and-Export-Code-registration-in-india.html"
        title = "IEC Code Registration in India | Accountants Factory"
        badge = "Global Trade"
        h1 = "Import Export <span class='mark'>Code (IEC)</span>"
        sub = "Mandatory 10-digit license issued by DGFT for importing or exporting goods and services from India. One-time registration with lifetime validity."
        micro1 = "Lifetime Validity"
        micro2 = "Issued in 24-48 Hours"
        micro3 = "DGFT & Customs Integrated"
        cards = @(
            @{ ic = "fas fa-ship"; title = "DGFT Direct Filing"; desc = "Electronic application on the DGFT digital platform integrated with ICEGATE customs network." },
            @{ ic = "fas fa-globe"; title = "Export Remittance Ready"; desc = "Allows receiving foreign inwards remittances (USD, EUR, GBP) legally in your current account." },
            @{ ic = "fas fa-infinity"; title = "No Renewal Required"; desc = "Valid for the life of the firm with mandatory annual online confirmation in April-June." }
        )
        steps = @(
            @{ title = "1. Basic KYC"; desc = "Submit business PAN, entity bank certificate or pre-printed cancelled cheque, and address proof." },
            @{ title = "2. DGFT Submission"; desc = "We pay the official government fee and process the application with Class 3 DSC." },
            @{ title = "3. IEC Certificate Download"; desc = "Instant download of your official e-IEC certificate." }
        )
        price = "₹1,999"
        priceNote = "all-inclusive DGFT registration"
    },
    @{
        filename = "rera-andhra-pradesh-registration-in-india.html"
        title = "AP RERA Registration for Projects & Agents | Accountants Factory"
        badge = "Real Estate Compliance"
        h1 = "Andhra Pradesh <span class='mark'>RERA Registration</span>"
        sub = "Comprehensive regulatory clearance for builders, real estate layout developers, and commercial agents under AP Real Estate Regulatory Authority."
        micro1 = "Project & Agent Licensing"
        micro2 = "Legal Title Verification"
        micro3 = "Quarterly RERA Compliance"
        cards = @(
            @{ ic = "fas fa-building"; title = "Project Registration"; desc = "Mandatory for layouts and apartments > 500 sq. meters or > 8 apartments prior to marketing or booking." },
            @{ ic = "fas fa-user-tie"; title = "Real Estate Agent License"; desc = "5-year valid RERA Agent Registration certificate for property consultants and brokers." },
            @{ ic = "fas fa-book"; title = "RERA Escrow Account Audit"; desc = "Form 1, Form 2, and Form 3 CA certification for 70% project escrow fund utilization." }
        )
        steps = @(
            @{ title = "1. Project Documentation"; desc = "Gather approved building plan, land title deed, encumbrance certificate, and NOCs." },
            @{ title = "2. AP-RERA Submission"; desc = "Prepare financial forecasts, promoter affidavits, and file on AP-RERA portal." },
            @{ title = "3. Approval & Unique ID"; desc = "Obtain official RERA Project Registration Number for all marketing materials." }
        )
        price = "₹14,999"
        priceNote = "professional drafting & documentation"
    },
    @{
        filename = "outsourced-accounting.html"
        title = "Outsourced Bookkeeping & Accounting Services | Accountants Factory"
        badge = "Accounting Excellence"
        h1 = "Outsourced <span class='mark'>Accounting & Books</span>"
        sub = "Cloud-powered bookkeeping on Zoho Books, Tally, or QuickBooks. Dedicated accountant + CA supervision for reconciled ledgers, daily transactions, and monthly MIS."
        micro1 = "From ₹2,000 / Month"
        micro2 = "Zoho Certified Experts"
        micro3 = "Monthly MIS & Profit/Loss"
        cards = @(
            @{ ic = "fas fa-book-reader"; title = "Transaction Processing"; desc = "Daily/weekly recording of sales invoices, vendor bills, expense vouchers, and payroll entries." },
            @{ ic = "fas fa-university"; title = "Multi-Bank Reconciliation"; desc = "Automated bank feeds, payment gateway reconciliations (Razorpay, Stripe) and zero variance." },
            @{ ic = "fas fa-chart-pie"; title = "Executive MIS Reports"; desc = "Monthly P&L, Balance Sheet, Accounts Receivable/Payable aging analysis delivered by the 7th." }
        )
        steps = @(
            @{ title = "1. Setup & Migration"; desc = "We review your Chart of Accounts, migrate opening balances, and configure cloud accounting software." },
            @{ title = "2. Ongoing Bookkeeping"; desc = "Share bills via email, WhatsApp, or cloud drive; our team reconciles entries weekly." },
            @{ title = "3. Monthly Review & Close"; desc = "Receive finalized financial statements and a structured review call with our senior CA team." }
        )
        price = "₹2,500/mo"
        priceNote = "billed quarterly or annually"
    },
    @{
        filename = "gst-filing-in-india.html"
        title = "GST Return Filing & GSTR-2B Reconciliation | Accountants Factory"
        badge = "Tax Filings"
        h1 = "Monthly & Annual <span class='mark'>GST Return Filing</span>"
        sub = "Error-free GSTR-1, GSTR-3B, GSTR-9, and 9C filing. Automated GSTR-2B matching to maximize your Input Tax Credit (ITC) and prevent departmental notices."
        micro1 = "100% On-Time Filing"
        micro2 = "Zero ITC Leakage"
        micro3 = "Notice Representation"
        cards = @(
            @{ ic = "fas fa-receipt"; title = "GSTR-1 & Invoice Matching"; desc = "Outward supplies filing with HSN summaries, e-way bill validations, and B2B invoice uploads." },
            @{ ic = "fas fa-file-invoice-dollar"; title = "GSTR-3B & Tax Optimization"; desc = "Accurate ITC claim based on GSTR-2B reconciliation and optimal cash ledger tax offsets." },
            @{ ic = "fas fa-balance-scale-right"; title = "GSTR-9 Annual Audit"; desc = "Comprehensive annual return compilation and CA-certified reconciliation statement (GSTR-9C)." }
        )
        steps = @(
            @{ title = "1. Data Collection"; desc = "Provide sales registers and purchase invoices by the 5th of each month." },
            @{ title = "2. 2B vs Purchase Matching"; desc = "We run advanced automated comparison algorithms to identify missing vendor invoices." },
            @{ title = "3. Portal Filing & Challan"; desc = "Challan generation for net tax payable and timely filing before the 20th." }
        )
        price = "₹999/mo"
        priceNote = "includes GSTR-1, 3B & 2B recon"
    },
    @{
        filename = "tds-return-filing-in-india.html"
        title = "TDS Return Filing (24Q, 26Q, 27Q) & Form 16 | Accountants Factory"
        badge = "Withholding Tax"
        h1 = "Quarterly <span class='mark'>TDS Return Filing</span>"
        sub = "Calculate correct withholding tax under sections 194C, 194J, 194I, 192, and 194Q. Timely quarterly 24Q/26Q filings and automatic TRACES Form 16 generation."
        micro1 = "Form 16 & 16A Issuance"
        micro2 = "TRACES Portal Integration"
        micro3 = "Zero Late Fee Penalty (234E)"
        cards = @(
            @{ ic = "fas fa-users-cog"; title = "Form 24Q (Salary TDS)"; desc = "Monthly payroll tax deduction computation, chapter VI-A deductions, and quarterly 24Q filing." },
            @{ ic = "fas fa-building"; title = "Form 26Q (Vendor Payments)"; desc = "TDS on contractor payments, professional fees, commercial rent, commission, and purchase of goods." },
            @{ ic = "fas fa-file-download"; title = "Form 16/16A Downloads"; desc = "Direct bulk generation and digital signing of Form 16 for employees and 16A for vendors." }
        )
        steps = @(
            @{ title = "1. Monthly Challan Payment"; desc = "Verify TDS deductions and deposit tax via e-tax payment before the 7th." },
            @{ title = "2. Return Preparation"; desc = "Validate PANs, link BSR codes and challan CIN numbers in RPU utility." },
            @{ title = "3. TRACES Processing"; desc = "Submit FVU file to NSDL and download digitally signed TDS certificates." }
        )
        price = "₹1,499/qtr"
        priceNote = "includes return filing & Form 16/16A"
    },
    @{
        filename = "itr-in-india.html"
        title = "Income Tax Return (ITR) Filing Services | Accountants Factory"
        badge = "Direct Tax"
        h1 = "Income Tax Return <span class='mark'>(ITR-1 to ITR-7)</span>"
        sub = "File your Income Tax Return with experienced CAs. Complete tax planning, capital gains computation, AIS/TIS reconciliation, and refund tracking."
        micro1 = "Old vs New Regime Optimization"
        micro2 = "AIS/TIS 100% Matched"
        micro3 = "Fast-Track Refund Approval"
        cards = @(
            @{ ic = "fas fa-user-tie"; title = "Salaried & Professionals"; desc = "ITR-1 & ITR-2 for salary earners, multiple house properties, ESOPs, and stock market capital gains." },
            @{ ic = "fas fa-store"; title = "Presumptive Tax (44AD/ADA)"; desc = "ITR-4 for small businesses and independent freelancers saving 50%+ on tax legally." },
            @{ ic = "fas fa-landmark"; title = "Corporate & LLP Tax (ITR-5/6)"; desc = "Comprehensive balance sheet audits, book profit calculation for MAT, and company tax returns." }
        )
        steps = @(
            @{ title = "1. Document Review"; desc = "Share Form 16, bank statements, stock P&L statements, and home loan certificates." },
            @{ title = "2. Computation of Income"; desc = "Our CAs analyze Old vs New regime to minimize tax liability legally and maximize refunds." },
            @{ title = "3. E-Filing & Verification"; desc = "We submit the return on the Income Tax e-filing portal and complete instant e-verification." }
        )
        price = "From ₹999"
        priceNote = "varies by complexity & entity type"
    },
    @{
        filename = "aoc4-mgt-7-in-india.html"
        title = "Annual ROC Filings AOC-4 & MGT-7 | Accountants Factory"
        badge = "MCA Annual Compliance"
        h1 = "Annual ROC Filing <span class='mark'>(AOC-4 & MGT-7)</span>"
        sub = "Mandatory yearly filing for all Private Limited, OPC, and Section 8 companies. Prevent heavy ₹100/day penalties and director disqualification."
        micro1 = "Director Disqualification Protection"
        micro2 = "Financial Statements XBRL/PDF"
        micro3 = "AGM & Board Resolutions"
        cards = @(
            @{ ic = "fas fa-file-invoice"; title = "Form AOC-4 (Financials)"; desc = "Filing Balance Sheet, P&L, Director's Report, and Auditor's Report within 30 days of AGM." },
            @{ ic = "fas fa-users"; title = "Form MGT-7 / 7A (Annual Return)"; desc = "Filing shareholding pattern, board meetings summary, and director remuneration details within 60 days." },
            @{ ic = "fas fa-id-card"; title = "DIR-3 KYC & DPT-3"; desc = "Annual director KYC verification and mandatory disclosure of outstanding loans and deposits." }
        )
        steps = @(
            @{ title = "1. Financials Preparation"; desc = "Compile audited balance sheet, profit and loss statement, and notes to accounts." },
            @{ title = "2. Secretarial Documentation"; desc = "Draft AGM notice, directors' report, board resolutions, and extract of annual returns." },
            @{ title = "3. MCA Filing & SRN"; desc = "Upload certified forms with Director and Practicing CS/CA digital signatures." }
        )
        price = "₹4,999"
        priceNote = "includes AOC-4, MGT-7 & Board Notes"
    },
    @{
        filename = "form11-llp-in-india.html"
        title = "LLP Annual Return Form 11 Filing | Accountants Factory"
        badge = "LLP Compliance"
        h1 = "LLP Annual Return <span class='mark'>Form 11 Filing</span>"
        sub = "Mandatory annual filing for every LLP registered in India due on or before 30th May every year. Avoid the severe ₹100/day penalty for delay."
        micro1 = "Due Date: 30th May"
        micro2 = "Mandatory for ALL LLPs"
        micro3 = "DSC Verification Included"
        cards = @(
            @{ ic = "fas fa-users-cog"; title = "Partner Summary"; desc = "Comprehensive disclosure of total number of partners, capital contribution, and partner changes." },
            @{ ic = "fas fa-shield-alt"; title = "Penalty Avoidance"; desc = "MCA levies ₹100/day per form with NO upper cap. Timely filing keeps your LLP in good standing." },
            @{ ic = "fas fa-certificate"; title = "Professional Certification"; desc = "Verification and certification by practicing Chartered Accountant or Company Secretary." }
        )
        steps = @(
            @{ title = "1. Partner Details"; desc = "Verify designated partner details, capital contributions, and operational status." },
            @{ title = "2. Form 11 Preparation"; desc = "Draft the electronic pre-fill form on MCA V3 portal with required attachments." },
            @{ title = "3. Submission & SRN"; desc = "Affix designated partner DSC and submit with payment of MCA statutory fees." }
        )
        price = "₹1,999"
        priceNote = "complete preparation & filing"
    },
    @{
        filename = "form8-llp-in-india.html"
        title = "LLP Form 8 Statement of Accounts & Solvency | Accountants Factory"
        badge = "LLP Financials"
        h1 = "LLP Statement of <span class='mark'>Accounts (Form 8)</span>"
        sub = "Declaration of solvency, balance sheet, and profit & loss statement for LLPs. Due on or before 30th October every financial year."
        micro1 = "Due Date: 30th October"
        micro2 = "Statement of Solvency"
        micro3 = "Balance Sheet & P&L"
        cards = @(
            @{ ic = "fas fa-balance-scale"; title = "Statement of Solvency"; desc = "Formal declaration signed by designated partners verifying the LLP's capability to pay debts." },
            @{ ic = "fas fa-file-invoice"; title = "Income & Expenditure"; desc = "Structured presentation of annual revenues, direct expenses, partner remuneration, and net profits." },
            @{ ic = "fas fa-stamp"; title = "CA Audit / Certification"; desc = "Mandatory certification by an independent practicing CA ensuring regulatory compliance." }
        )
        steps = @(
            @{ title = "1. Accounts Finalization"; desc = "Finalize the financial books and ledger balances as of 31st March." },
            @{ title = "2. Form 8 Compilation"; desc = "Prepare the electronic Form 8 with breakdown of assets, liabilities, and solvency disclosures." },
            @{ title = "3. MCA V3 Upload"; desc = "Digitally sign and submit to ROC with generated Service Request Number (SRN)." }
        )
        price = "₹2,499"
        priceNote = "accounts compilation + CA certification"
    },
    @{
        filename = "provident-fund-in-india.html"
        title = "EPF Registration & Monthly ECR Filing | Accountants Factory"
        badge = "Payroll Compliance"
        h1 = "Employee <span class='mark'>Provident Fund (EPF)</span>"
        sub = "Mandatory for organizations with 20+ employees (voluntary for smaller firms). End-to-end EPFO employer registration, UAN generation, and monthly ECR return filing."
        micro1 = "Mandatory for 20+ Staff"
        micro2 = "Monthly ECR Filing"
        micro3 = "UAN Activation Support"
        cards = @(
            @{ ic = "fas fa-piggy-bank"; title = "EPFO Employer Code"; desc = "Online registration with the Employees' Provident Fund Organisation under Shram Suvidha." },
            @{ ic = "fas fa-file-upload"; title = "Monthly ECR Return"; desc = "Calculating 12% employee + 12% employer contributions (EPF + EPS + EDLI) and uploading ECR text file." },
            @{ ic = "fas fa-id-badge"; title = "Member UAN Allotment"; desc = "Generating and linking Universal Account Numbers with Aadhaar KYC for new joiners." }
        )
        steps = @(
            @{ title = "1. Employer Registration"; desc = "Provide company PAN, incorporation certificate, director KYC, and bank account setup." },
            @{ title = "2. Monthly Payroll Sync"; desc = "Share monthly salary sheets before the 10th of each month for PF calculations." },
            @{ title = "3. Challan Generation"; desc = "We generate the TRRN challan on EPFO unified portal for direct online payment." }
        )
        price = "₹1,499/mo"
        priceNote = "monthly ECR filing & challans"
    },
    @{
        filename = "esic-in-india.html"
        title = "ESIC Registration & Monthly Return Filing | Accountants Factory"
        badge = "Healthcare Benefit"
        h1 = "Employee State <span class='mark'>Insurance (ESIC)</span>"
        sub = "Medical and social security protection for employees earning up to ₹21,000/month. 17-digit employer code registration, e-Pehchan card issuance, and monthly filings."
        micro1 = "For Staff Wages <= ₹21,000"
        micro2 = "3.25% Employer + 0.75% Employee"
        micro3 = "Cash & Medical Benefits"
        cards = @(
            @{ ic = "fas fa-hospital-user"; title = "ESIC Registration Code"; desc = "Obtain the permanent 17-digit employer registration number on ESIC portal." },
            @{ ic = "fas fa-notes-medical"; title = "Monthly Contribution Return"; desc = "Filing monthly wage registers, computing 4% aggregate contributions before the 15th." },
            @{ ic = "fas fa-address-card"; title = "e-Pehchan Card Generation"; desc = "Issuing employee health insurance identity cards for free access to ESI dispensaries and hospitals." }
        )
        steps = @(
            @{ title = "1. Entity Onboarding"; desc = "Submit shop & establishment license, employee list, and wage breakdown." },
            @{ title = "2. Monthly Wage Filing"; desc = "We process the wage statement, calculate exact contributions, and generate payment challans." },
            @{ title = "3. Semi-Annual Compliance"; desc = "Filing half-yearly returns and maintaining Form 5 inspection registers." }
        )
        price = "₹1,499/mo"
        priceNote = "monthly contribution filings"
    },
    @{
        filename = "professional-tax-in-india.html"
        title = "Professional Tax (PT) Registration & Filing | Accountants Factory"
        badge = "State Tax Compliance"
        h1 = "Professional <span class='mark'>Tax (PT) Compliance</span>"
        sub = "State-level taxation on salaried employees and business entities. Registration for PTRC (Employer deduction) and PTEC (Company liability) across Andhra Pradesh, Telangana, Karnataka, and Maharashtra."
        micro1 = "PTRC & PTEC Registration"
        micro2 = "State-Wise Slabs"
        micro3 = "Monthly & Annual Returns"
        cards = @(
            @{ ic = "fas fa-money-check"; title = "PTEC & PTRC Enrollment"; desc = "Dual certificates for business entity liability and payroll salary deduction." },
            @{ ic = "fas fa-map-marked-alt"; title = "Multi-State Support"; desc = "Accurate deduction conforming to varying state slab laws across South and West India." },
            @{ ic = "fas fa-calendar-check"; title = "Monthly Remittance"; desc = "Timely challan generation and filing of annual return Form 5 / Form III." }
        )
        steps = @(
            @{ title = "1. State Identification"; desc = "Identify state jurisdiction and entity category (Proprietorship, LLP, Company)." },
            @{ title = "2. Certificate Allotment"; desc = "Submit commercial tax portal applications and receive PT registration certificates." },
            @{ title = "3. Regular Filings"; desc = "Remit deducted employee PT monthly and file annual assessment returns." }
        )
        price = "₹999/mo"
        priceNote = "multi-state registration & filing"
    },
    @{
        filename = "virtual-cfo-services-in-india.html"
        title = "Virtual CFO Services for Growth Companies | Accountants Factory"
        badge = "Strategic Financial Leadership"
        h1 = "Virtual <span class='mark'>CFO Retainer</span>"
        sub = "High-impact financial strategy, cash flow management, investor reporting, and bank funding guidance without the overhead of a full-time ₹40 Lakhs CFO."
        micro1 = "From ₹35,000 / Month"
        micro2 = "Weekly Cash Flow Modeling"
        micro3 = "Board & Investor Decks"
        cards = @(
            @{ ic = "fas fa-chart-line"; title = "Strategic Financial Planning"; desc = "Annual budgeting, 13-week rolling cash flow forecasts, unit economics analysis, and burn rate management." },
            @{ ic = "fas fa-university"; title = "Bank Funding (CMA & DPR)"; desc = "Detailed Project Reports, CMA data preparation for CC/OD limits, term loans, and credit negotiations." },
            @{ ic = "fas fa-briefcase"; title = "Board & Investor Governance"; desc = "Monthly MIS decks, KPI tracking, cap table management, and proactive internal financial controls." }
        )
        steps = @(
            @{ title = "1. Financial Diagnostic"; desc = "Deep-dive audit of historical financials, cost leakages, tax positions, and software workflows." },
            @{ title = "2. System Architecture"; desc = "Implement automated dashboards, KPI scorecards, and weekly cash control systems." },
            @{ title = "3. Executive Execution"; desc = "Weekly strategy sessions, monthly board meetings, and direct support for banking and fundraising." }
        )
        price = "₹35,000/mo"
        priceNote = "dedicated senior finance leader"
    },
    @{
        filename = "zoho-books-ecosystem.html"
        title = "Zoho Books & Zoho ERP Implementation | Accountants Factory"
        badge = "Zoho Authorized Partner"
        h1 = "Zoho Books & <span class='mark'>Cloud ERP Suite</span>"
        sub = "Official Zoho Authorized Partner & Certified Trainers. We configure, automate, and customize Zoho Books, CRM, People, Inventory, and Creator for your exact workflows."
        micro1 = "Authorized Zoho Partner"
        micro2 = "Tally to Zoho Zero-Loss Migration"
        micro3 = "Custom ERP & Automation"
        cards = @(
            @{ ic = "fas fa-calculator"; title = "Zoho Books & GST Automation"; desc = "E-Invoicing, automated bank reconciliation, e-way bills, and direct GST portal filing integration." },
            @{ ic = "fas fa-exchange-alt"; title = "Tally to Zoho Migration"; desc = "100% historical ledger, voucher, inventory, and opening balance transfer with zero reconciliation gaps." },
            @{ ic = "fas fa-users-cog"; title = "Zoho People & Payroll Suite"; desc = "Leave management, biometric attendance sync, automated payslips, and statutory tax calculations." }
        )
        steps = @(
            @{ title = "1. Workflow Scoping"; desc = "Map your sales, procurement, inventory, and accounting flows to optimal Zoho apps." },
            @{ title = "2. Setup & Customization"; desc = "Design custom invoice templates, approval workflows, chart of accounts, and user roles." },
            @{ title = "3. Migration & Team Training"; desc = "Transfer existing data, test reconciliations, and conduct live hands-on staff training." }
        )
        price = "Custom Quote"
        priceNote = "based on modules & user licenses"
    },
    @{
        filename = "cashflow-tool.html"
        title = "Cash Flow & Working Capital Planning Tool | Accountants Factory"
        badge = "Financial Tools"
        h1 = "13-Week <span class='mark'>Cash Flow Planner</span>"
        sub = "Take control of your working capital. Model cash inflows, vendor outflows, payroll commitments, and tax obligations with forward-looking precision."
        micro1 = "13-Week Rolling Horizon"
        micro2 = "Runway & Burn Rate Alerts"
        micro3 = "Scenario Planning (Best/Worst)"
        cards = @(
            @{ ic = "fas fa-tint"; title = "Liquidity Forecasting"; desc = "Predict future bank balances based on expected customer collections and scheduled vendor dues." },
            @{ ic = "fas fa-exclamation-triangle"; title = "Cash Crunch Warning"; desc = "Identify potential cash deficits 4 to 6 weeks in advance to arrange credit lines in time." },
            @{ ic = "fas fa-sliders-h"; title = "Scenario Testing"; desc = "Simulate payment delays, unexpected expenses, or rapid sales growth on your cash runway." }
        )
        steps = @(
            @{ title = "1. Connect Ledgers"; desc = "Import open accounts receivable, payable schedules, and fixed operational expenses." },
            @{ title = "2. Set Collection Velocity"; desc = "Assign realistic payment collection timelines based on customer credit terms." },
            @{ title = "3. Weekly Cash Decisioning"; desc = "Review the 13-week runway weekly to prioritize vendor disbursements and preserve liquidity." }
        )
        price = "Free Consultation"
        priceNote = "custom template provided with CFO Retainer"
    },
    @{
        filename = "incometax-cal.html"
        title = "Income Tax Calculator FY 2025-26 | Accountants Factory"
        badge = "Interactive Tax Tool"
        h1 = "Income Tax <span class='mark'>Calculator (FY 2025-26)</span>"
        sub = "Compare tax liability under the Old Regime vs the New Simplified Tax Regime (Section 115BAC) with standard deductions and rebate allowances."
        micro1 = "Updated for FY 2025-26"
        micro2 = "Section 87A Rebate Computed"
        micro3 = "Old vs New Comparison"
        cards = @(
            @{ ic = "fas fa-balance-scale"; title = "Instant Regime Comparison"; desc = "See exact rupee difference between claiming chapter VI-A deductions vs lower new slab rates." },
            @{ ic = "fas fa-percentage"; title = "Standard Deduction Included"; desc = "Automatic ₹75,000 standard deduction under New Regime and ₹50,000 under Old Regime." },
            @{ ic = "fas fa-calculator"; title = "Marginal Relief Calculated"; desc = "Precise surcharge and Section 87A rebate calculation for income up to ₹7.75 Lakhs." }
        )
        steps = @(
            @{ title = "1. Enter Annual Income"; desc = "Input gross salary, business income, house property income, or other sources." },
            @{ title = "2. Add Deductions"; desc = "Declare 80C (PPF, ELSS), 80D (Health Insurance), and Home Loan Interest for Old Regime." },
            @{ title = "3. Compare & File"; desc = "Get clear recommendation and connect with our CA team to file your ITR smoothly." }
        )
        price = "100% Free"
        priceNote = "no signup required to compute tax"
    },
    @{
        filename = "new-gst-rates.html"
        title = "GST Rates Directory 2025-26 | Accountants Factory"
        badge = "GST Reference Library"
        h1 = "GST Rates <span class='mark'>& HSN Finder</span>"
        sub = "Quick reference guide for Goods and Services Tax rates in India across standard slab categories: 0% (Exempt), 5%, 12%, 18%, and 28%."
        micro1 = "Search by HSN / Product"
        micro2 = "Goods & Services Covered"
        micro3 = "Updated for Current FY"
        cards = @(
            @{ ic = "fas fa-percentage"; title = "0% (Exempt Goods)"; desc = "Fresh agricultural produce, unpacked grains, milk, salt, curd, health and basic education services." },
            @{ ic = "fas fa-percentage"; title = "5% & 12% Slabs"; desc = "Packaged food items, apparel below ₹1000, medicines, transport services, processed foods." },
            @{ ic = "fas fa-percentage"; title = "18% & 28% Slabs"; desc = "IT software, accounting services, consulting, electronics, automobiles, and luxury goods." }
        )
        steps = @(
            @{ title = "1. Search Goods or Service"; desc = "Type your product or industry name to view prevailing CGST, SGST, and IGST rates." },
            @{ title = "2. Check HSN/SAC Code"; desc = "Identify the mandatory 4 to 8 digit Harmonized System of Nomenclature code for invoices." },
            @{ title = "3. Consult on Classifications"; desc = "Need help classifying complex multi-service contracts? Talk to our GST experts." }
        )
        price = "Free Reference"
        priceNote = "maintained by our indirect tax desk"
    }
)

$template = @'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<meta name="description" content="__SUB__">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://use.fontawesome.com/releases/v5.8.1/css/all.css" rel="stylesheet">
<style>
:root{
  --teal:#016F69; --teal-dark:#015C57; --teal-deep:#01423F;
  --tint:#E9F2F1; --line:#CFE2E0; --gold:#C79A2E;
  --ink:#132420; --body:#4A5B57; --grey:#6E807C;
  --cream:#FBF7EF; --soft:#F4F8F7;
  --r:46px; --r-md:34px; --r-sm:22px;
  --sh:0 4px 10px rgba(19,36,32,.04), 0 20px 46px rgba(19,36,32,.09);
  --sh-lg:0 10px 22px rgba(19,36,32,.07), 0 34px 70px rgba(19,36,32,.14);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--body);background:#fff;line-height:1.65;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{color:var(--ink);margin:0 0 .5em;letter-spacing:-.03em;font-weight:800;line-height:1.15}
p{margin:0 0 1em}
a{color:var(--teal);text-decoration:none}
.wrap{max-width:1200px;margin:0 auto;padding:0 22px}
.hand{font-family:'Caveat',cursive;font-weight:700}
:focus-visible{outline:3px solid var(--gold);outline-offset:3px;border-radius:8px}

.btn{display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:.94rem;padding:15px 30px;border-radius:999px;border:1.5px solid transparent;cursor:pointer;transition:.22s;font-family:inherit}
.btn-primary{background:var(--teal);color:#fff;box-shadow:0 10px 26px rgba(1,111,105,.3)}
.btn-primary:hover{background:var(--teal-dark);transform:translateY(-2px)}
.btn-ghost{background:#fff;color:var(--ink);border-color:var(--line)}
.btn-ghost:hover{border-color:var(--teal);color:var(--teal)}
.btn-gold{background:var(--gold);color:#2B2B2B}
.btn-gold:hover{transform:translateY(-2px)}
.btn-outline-light{background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}
.btn-outline-light:hover{background:rgba(255,255,255,.14)}
.btn-sm{padding:11px 22px;font-size:.85rem}

/* strip + nav */
.strip{background:var(--teal-deep);color:#CFE4E2;font-size:.79rem;padding:9px 0}
.strip .wrap{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
.strip a{color:#fff;font-weight:600}.strip i{color:var(--gold)}
nav{position:sticky;top:0;z-index:80;background:rgba(255,255,255,.94);backdrop-filter:blur(12px);border-bottom:1px solid #EAF1F0}
.nav-in{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 0}
.logo{font-weight:800;font-size:1.18rem;color:var(--ink);letter-spacing:-.03em}
.logo b{color:var(--teal)}
.logo span{display:block;font-size:.6rem;font-weight:700;color:var(--grey);letter-spacing:.14em;text-transform:uppercase}
.menu{display:flex;gap:6px;align-items:center}
.mi{position:relative}
.mi>a{display:flex;align-items:center;gap:6px;color:var(--ink);font-weight:600;font-size:.9rem;padding:10px 14px;border-radius:999px;transition:.2s}
.mi>a:hover{background:var(--tint);color:var(--teal)}
.mi>a i{font-size:.58rem;opacity:.55}
.drop{position:absolute;top:calc(100% + 10px);left:0;min-width:280px;background:#fff;border:1px solid #E7EFEE;border-radius:var(--r-sm);box-shadow:var(--sh);padding:10px;opacity:0;visibility:hidden;transform:translateY(-6px);transition:.2s}
.mi:hover .drop,.mi:focus-within .drop{opacity:1;visibility:visible;transform:none}
.drop a{display:flex;gap:11px;align-items:center;padding:10px 12px;border-radius:16px;color:var(--body);font-size:.87rem;font-weight:600;transition:.15s}
.drop a:hover{background:var(--soft);color:var(--teal)}
.drop a i{width:28px;height:28px;border-radius:10px;background:var(--tint);color:var(--teal);display:grid;place-items:center;font-size:.72rem;flex:0 0 26px}
.burger{display:none;background:none;border:0;font-size:1.3rem;color:var(--ink);cursor:pointer}
@media(max-width:1080px){.menu{display:none}.burger{display:block}}

/* service page hero */
.svc-hero{padding:68px 0 54px;text-align:center;background:#fff;position:relative;overflow:hidden}
.blob{position:absolute;border-radius:50%;filter:blur(46px);z-index:0}
.b1{width:400px;height:400px;background:rgba(1,111,105,.12);top:-120px;left:-100px}
.b2{width:360px;height:360px;background:rgba(199,154,46,.12);top:-80px;right:-80px}
.svc-hero-in{position:relative;z-index:2;max-width:880px;margin:0 auto}
.badge{display:inline-flex;align-items:center;gap:7px;background:var(--tint);color:var(--teal);font-size:.82rem;font-weight:700;padding:8px 18px;border-radius:999px;margin-bottom:18px;letter-spacing:.04em;text-transform:uppercase}
.mark{position:relative;display:inline-block;padding:0 .22em;z-index:1;color:#fff;white-space:nowrap}
.mark:before{content:"";position:absolute;left:0;right:0;top:.1em;bottom:.08em;background:var(--teal);border-radius:10px 18px 12px 20px;transform:rotate(-.8deg);z-index:-1}
h1.hero-title{font-size:clamp(2rem,4.5vw,3.4rem);margin-bottom:14px;letter-spacing:-.03em}
.sub{font-size:1.08rem;max-width:680px;margin:0 auto 24px;color:var(--body)}
.hero-cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:18px}
.micro{font-size:.86rem;color:var(--grey);display:flex;gap:22px;flex-wrap:wrap;justify-content:center}
.micro i{color:var(--teal)}

/* content sections */
.sec{padding:68px 0}
.sec-soft{background:var(--soft)}
.sec-cream{background:var(--cream)}
.head{text-align:center;max-width:660px;margin:0 auto 44px}
.head .hand{font-size:1.55rem;color:var(--teal);display:block;margin-bottom:2px}
.head h2{font-size:clamp(1.7rem,3.2vw,2.3rem)}
.card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
@media(max-width:920px){.card-grid{grid-template-columns:1fr}}
.feature-card{background:#fff;border-radius:var(--r-md);padding:30px 26px;border:1.5px solid #E7EFEE;box-shadow:var(--sh);transition:.25s;display:flex;flex-direction:column}
.feature-card:hover{transform:translateY(-5px);box-shadow:var(--sh-lg);border-color:var(--teal)}
.feature-card .ic{width:54px;height:54px;border-radius:18px;background:var(--tint);color:var(--teal);display:grid;place-items:center;font-size:1.25rem;margin-bottom:18px}
.feature-card h3{font-size:1.2rem;margin-bottom:8px}
.feature-card p{font-size:.92rem;color:var(--grey);margin:0}

/* steps */
.steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
@media(max-width:920px){.steps-grid{grid-template-columns:1fr}}
.step-card{background:#fff;border-radius:var(--r-md);padding:28px 24px;border:1.5px solid #E7EFEE;box-shadow:var(--sh)}
.step-pill{font-family:'Caveat',cursive;font-size:1.25rem;font-weight:700;color:var(--gold);margin-bottom:6px;display:block}
.step-card h3{font-size:1.15rem;margin-bottom:8px}
.step-card p{font-size:.9rem;color:var(--grey);margin:0}

/* pricing banner */
.pricing-banner{background:#fff;border:2px solid var(--teal);border-radius:var(--r);padding:40px;box-shadow:var(--sh-lg);display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
.pb-info h3{font-size:1.5rem;margin-bottom:6px}
.pb-info p{color:var(--grey);margin:0}
.pb-price{font-size:2.4rem;font-weight:800;color:var(--teal);letter-spacing:-.03em}
.pb-price span{font-size:.9rem;color:var(--grey);display:block;font-weight:600}

/* cta */
.cta{background:linear-gradient(140deg,var(--teal-deep),var(--teal) 140%);color:#CDE3E1;text-align:center;padding:74px 0;border-radius:var(--r) var(--r) 0 0}
.cta h2{color:#fff;font-size:clamp(1.7rem,3.2vw,2.3rem)}
.cta .hand{color:var(--gold);font-size:1.5rem;display:block;margin-bottom:4px}
.cta p{max-width:540px;margin:0 auto 26px}
.cta-b{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

/* footer */
footer{background:#0D1A17;color:#8CA29E;font-size:.88rem;padding:54px 0 24px}
.fg{display:grid;grid-template-columns:1.7fr 1fr 1fr 1fr;gap:32px}
footer h5{color:#fff;font-size:.76rem;letter-spacing:.12em;text-transform:uppercase;margin:0 0 14px}
footer a{color:#8CA29E;display:block;padding:5px 0}
footer a:hover{color:var(--gold)}
.fbot{border-top:1px solid rgba(255,255,255,.09);margin-top:34px;padding-top:18px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.79rem}
.disc{font-size:.75rem;color:#6B807C;margin-top:12px}
@media(max-width:880px){.fg{grid-template-columns:1fr 1fr}}
@media(max-width:520px){.fg{grid-template-columns:1fr}}

/* mobile drawer */
.mnav{display:none;position:fixed;inset:0;background:#fff;z-index:90;padding:24px;overflow-y:auto}
.mnav.open{display:block}
.mnav details summary{font-weight:700;padding:12px 0;cursor:pointer;list-style:none;display:flex;justify-content:space-between;border-bottom:1px solid var(--line)}
.mnav a{display:block;padding:10px 0 10px 16px;font-size:.9rem;color:var(--body);border-bottom:1px solid #f0f0f0}
.mnav-close{float:right;background:none;border:0;font-size:1.4rem;color:var(--ink);cursor:pointer}
</style>
</head>
<body>

<div class="strip">
  <div class="wrap">
    <span><i class="fas fa-certificate"></i> Zoho Authorized Partner &middot; Tirupati, Andhra Pradesh</span>
    <span><i class="fas fa-phone-alt"></i> <a href="tel:+919176671206">91766 71206</a></span>
  </div>
</div>

<nav>
  <div class="wrap nav-in">
    <a href="index.html" class="logo">Accountants <b>Factory</b><span>Tech-driven accounting services</span></a>
    <div class="menu">
      <div class="mi">
        <a href="start-a-business.html">Start a Business <i class="fas fa-chevron-down"></i></a>
        <div class="drop">
          <a href="private-limited-company-registration-in-india.html"><i class="fas fa-building"></i> Private Limited Company</a>
          <a href="llp-registration-in-india.html"><i class="fas fa-handshake"></i> LLP Registration</a>
          <a href="one-person-company-registration-in-india.html"><i class="fas fa-user"></i> OPC &amp; Proprietorship</a>
          <a href="partnership-firm-registrations-in-india.html"><i class="fas fa-users"></i> Partnership Firm</a>
          <a href="start-up-india-registrations-in-india.html"><i class="fas fa-rocket"></i> Startup India (DPIIT)</a>
          <a href="msme-registrations-in-india.html"><i class="fas fa-industry"></i> MSME / Udyam</a>
          <a href="gst-registrations-in-india.html"><i class="fas fa-file-invoice"></i> GST Registration</a>
          <a href="IEC-Import-and-Export-Code-registration-in-india.html"><i class="fas fa-ship"></i> IEC Registration</a>
          <a href="rera-andhra-pradesh-registration-in-india.html"><i class="fas fa-hard-hat"></i> RERA (AP)</a>
        </div>
      </div>
      <div class="mi">
        <a href="outsourced-accounting.html">Accounting <i class="fas fa-chevron-down"></i></a>
        <div class="drop">
          <a href="outsourced-accounting.html"><i class="fas fa-book"></i> Outsourced Bookkeeping</a>
          <a href="gst-filing-in-india.html"><i class="fas fa-receipt"></i> GST Returns &amp; Filing</a>
          <a href="tds-return-filing-in-india.html"><i class="fas fa-users"></i> TDS &amp; Payroll</a>
          <a href="itr-in-india.html"><i class="fas fa-calendar-check"></i> Income Tax / ITR</a>
          <a href="aoc4-mgt-7-in-india.html"><i class="fas fa-stamp"></i> ROC / AOC-4 / MGT-7</a>
          <a href="form11-llp-in-india.html"><i class="fas fa-file-alt"></i> LLP Form 11</a>
          <a href="form8-llp-in-india.html"><i class="fas fa-file-alt"></i> LLP Form 8</a>
          <a href="provident-fund-in-india.html"><i class="fas fa-piggy-bank"></i> Provident Fund (PF)</a>
          <a href="esic-in-india.html"><i class="fas fa-heartbeat"></i> ESIC</a>
          <a href="professional-tax-in-india.html"><i class="fas fa-money-check-alt"></i> Professional Tax</a>
        </div>
      </div>
      <div class="mi">
        <a href="zoho-books-ecosystem.html">Zoho Solutions <i class="fas fa-chevron-down"></i></a>
        <div class="drop">
          <a href="zoho-books-ecosystem.html"><i class="fas fa-calculator"></i> Zoho Books &amp; GST</a>
          <a href="zoho-books-ecosystem.html"><i class="fas fa-bullseye"></i> Zoho CRM</a>
          <a href="zoho-books-ecosystem.html"><i class="fas fa-user-tie"></i> Zoho People &amp; Payroll</a>
        </div>
      </div>
      <div class="mi">
        <a href="virtual-cfo-services-in-india.html">Virtual CFO <i class="fas fa-chevron-down"></i></a>
        <div class="drop">
          <a href="virtual-cfo-services-in-india.html"><i class="fas fa-chart-line"></i> Virtual CFO Retainer</a>
          <a href="cashflow-tool.html"><i class="fas fa-water"></i> Cash Flow &amp; Budgeting</a>
        </div>
      </div>
      <div class="mi"><a href="pricing.html">Pricing</a></div>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <a href="portal/login.html" class="btn btn-ghost btn-sm"><i class="fas fa-user-lock"></i> Client Portal</a>
      <a href="contact.html" class="btn btn-primary btn-sm">Book a free call</a>
      <button class="burger" aria-label="Menu"><i class="fas fa-bars"></i></button>
    </div>
  </div>
</nav>

<!-- HERO -->
<header class="svc-hero">
  <span class="blob b1"></span><span class="blob b2"></span>
  <div class="wrap svc-hero-in">
    <div class="badge"><i class="fas fa-check-circle"></i> __BADGE__</div>
    <h1 class="hero-title">__H1__</h1>
    <p class="sub">__SUB__</p>
    <div class="hero-cta">
      <a href="contact.html" class="btn btn-primary">Get Started Today <i class="fas fa-arrow-right"></i></a>
      <a href="tel:+919176671206" class="btn btn-ghost"><i class="fas fa-phone-alt"></i> Talk to a CA</a>
    </div>
    <div class="micro">
      <span><i class="fas fa-check-circle"></i> __MICRO1__</span>
      <span><i class="fas fa-check-circle"></i> __MICRO2__</span>
      <span><i class="fas fa-check-circle"></i> __MICRO3__</span>
    </div>
  </div>
</header>

<!-- WHAT YOU GET -->
<section class="sec sec-soft">
  <div class="wrap">
    <div class="head">
      <span class="hand">complete end-to-end service</span>
      <h2>Everything Included in the Package</h2>
    </div>
    <div class="card-grid">
__CARDS__
    </div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section class="sec">
  <div class="wrap">
    <div class="head">
      <span class="hand">transparent 3-step process</span>
      <h2>How It Works</h2>
    </div>
    <div class="steps-grid">
__STEPS__
    </div>
    <br><br>
    <div class="pricing-banner">
      <div class="pb-info">
        <h3>Fixed Transparent Pricing</h3>
        <p>No hidden fees. Free pre-filing consultation with senior chartered accountants.</p>
      </div>
      <div>
        <div class="pb-price">__PRICE__ <span>__PRICENOTE__</span></div>
      </div>
      <div>
        <a href="contact.html" class="btn btn-primary">Book Consultation <i class="fas fa-arrow-right"></i></a>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta">
  <div class="wrap">
    <span class="hand">ready to get started?</span>
    <h2>Speak to Our Chartered Accountants Today</h2>
    <p>Get your queries answered in minutes with a quick phone call or WhatsApp message.</p>
    <div class="cta-b">
      <a href="tel:+919176671206" class="btn btn-gold"><i class="fas fa-phone-alt"></i> Call 91766 71206</a>
      <a href="https://wa.me/919176671206" class="btn btn-outline-light"><i class="fab fa-whatsapp"></i> WhatsApp Us</a>
    </div>
  </div>
</section>

<footer>
  <div class="wrap">
    <div class="fg">
      <div>
        <div class="logo" style="color:#fff">Accountants <b style="color:var(--gold)">Factory</b><span style="color:#8CA29E">Tech-driven accounting services</span></div>
        <p style="margin-top:14px">Ground Floor, K S R Nilayam, Near Master Minds College, Hathiramji Colony, Annamayya Circle, Tirupati, Andhra Pradesh 517501</p>
        <p><a href="tel:+919176671206" style="display:inline">91766 71206</a> &middot; <a href="mailto:reachus@accountantsfactory.com" style="display:inline">reachus@accountantsfactory.com</a></p>
      </div>
      <div>
        <h5>Start</h5>
        <a href="private-limited-company-registration-in-india.html">Private Limited</a>
        <a href="llp-registration-in-india.html">LLP</a>
        <a href="one-person-company-registration-in-india.html">OPC</a>
        <a href="gst-registrations-in-india.html">GST Registration</a>
      </div>
      <div>
        <h5>Run</h5>
        <a href="outsourced-accounting.html">Bookkeeping</a>
        <a href="gst-filing-in-india.html">GST Filing</a>
        <a href="tds-return-filing-in-india.html">Payroll / TDS</a>
        <a href="zoho-books-ecosystem.html">Zoho Books</a>
      </div>
      <div>
        <h5>Scale</h5>
        <a href="virtual-cfo-services-in-india.html">Virtual CFO</a>
        <a href="cashflow-tool.html">Cash Flow Tool</a>
        <a href="incometax-cal.html">Tax Calculator</a>
        <a href="portal/login.html">Client Portal</a>
      </div>
    </div>
    <p class="disc">Fees shown are professional fees, exclusive of government charges, stamp duty and applicable GST.</p>
    <div class="fbot">
      <span>&copy; 2026 Accountants Factory LLP</span>
      <span>Zoho Authorized Partner &middot; Certified Zoho &amp; Tally Trainer</span>
    </div>
  </div>
</footer>

<div class="mnav" id="mnav">
  <button class="mnav-close" id="mnav-close"><i class="fas fa-times"></i></button>
  <details><summary>Start a Business <i class="fas fa-chevron-down"></i></summary>
    <a href="private-limited-company-registration-in-india.html">Private Limited Company</a>
    <a href="llp-registration-in-india.html">LLP Registration</a>
    <a href="one-person-company-registration-in-india.html">OPC</a>
    <a href="partnership-firm-registrations-in-india.html">Partnership Firm</a>
    <a href="start-up-india-registrations-in-india.html">Startup India</a>
    <a href="msme-registrations-in-india.html">MSME</a>
    <a href="gst-registrations-in-india.html">GST Registration</a>
    <a href="IEC-Import-and-Export-Code-registration-in-india.html">IEC</a>
    <a href="rera-andhra-pradesh-registration-in-india.html">RERA AP</a>
  </details>
  <details><summary>Accounting <i class="fas fa-chevron-down"></i></summary>
    <a href="outsourced-accounting.html">Outsourced Bookkeeping</a>
    <a href="gst-filing-in-india.html">GST Filing</a>
    <a href="tds-return-filing-in-india.html">TDS &amp; Payroll</a>
    <a href="itr-in-india.html">Income Tax / ITR</a>
    <a href="aoc4-mgt-7-in-india.html">ROC / AOC-4 / MGT-7</a>
    <a href="form11-llp-in-india.html">LLP Form 11</a>
    <a href="form8-llp-in-india.html">LLP Form 8</a>
    <a href="provident-fund-in-india.html">Provident Fund</a>
    <a href="esic-in-india.html">ESIC</a>
    <a href="professional-tax-in-india.html">Professional Tax</a>
  </details>
  <details><summary>Zoho Solutions <i class="fas fa-chevron-down"></i></summary>
    <a href="zoho-books-ecosystem.html">Zoho Books &amp; GST</a>
    <a href="zoho-books-ecosystem.html">Zoho CRM</a>
    <a href="zoho-books-ecosystem.html">Zoho People</a>
  </details>
  <details><summary>Virtual CFO <i class="fas fa-chevron-down"></i></summary>
    <a href="virtual-cfo-services-in-india.html">Virtual CFO Retainer</a>
    <a href="cashflow-tool.html">Cash Flow &amp; Budgeting</a>
  </details>
  <a href="pricing.html">Pricing</a>
  <a href="portal/login.html">Client Portal</a>
  <a href="contact.html">Book a free call</a>
</div>
<script>
(function(){
  var b=document.querySelector('.burger'), m=document.getElementById('mnav'), c=document.getElementById('mnav-close');
  if(b) b.addEventListener('click',function(){m.classList.toggle('open')});
  if(c) c.addEventListener('click',function(){m.classList.remove('open')});
})();
</script>
</body>
</html>
'@

foreach ($p in $pages) {
    $cardsHtml = ""
    foreach ($c in $p.cards) {
        $cardsHtml += @"
      <div class="feature-card">
        <div class="ic"><i class="$($c.ic)"></i></div>
        <h3>$($c.title)</h3>
        <p>$($c.desc)</p>
      </div>
"@
    }

    $stepsHtml = ""
    $stepIdx = 1
    foreach ($s in $p.steps) {
        $stepsHtml += @"
      <div class="step-card">
        <span class="step-pill">Step $stepIdx</span>
        <h3>$($s.title)</h3>
        <p>$($s.desc)</p>
      </div>
"@
        $stepIdx++
    }

    $pageContent = $template -replace '__TITLE__', $p.title `
                             -replace '__BADGE__', $p.badge `
                             -replace '__H1__', $p.h1 `
                             -replace '__SUB__', $p.sub `
                             -replace '__MICRO1__', $p.micro1 `
                             -replace '__MICRO2__', $p.micro2 `
                             -replace '__MICRO3__', $p.micro3 `
                             -replace '__CARDS__', $cardsHtml `
                             -replace '__STEPS__', $stepsHtml `
                             -replace '__PRICE__', $p.price `
                             -replace '__PRICENOTE__', $p.priceNote

    $outPath = Join-Path $webDir $p.filename
    [System.IO.File]::WriteAllText($outPath, $pageContent, [System.Text.Encoding]::UTF8)
    Write-Host "Generated: $($p.filename)"
}
