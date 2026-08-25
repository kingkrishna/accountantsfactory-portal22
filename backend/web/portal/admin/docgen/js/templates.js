// Document Template Definitions
// All templates for CA/CS practice document automation

function formatDate(dateStr) {
    if (!dateStr) return '___________';
    const d = new Date(dateStr);
    const day = d.getDate();
    const suffix = [, 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 !== 10) * day % 10] || 'th';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function numberToWords(num) {
    if (!num || num === 0) return '___________';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function convert(n) {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    }
    return convert(Number(num));
}

// Helper to create standard paragraphs quickly
function P(text, opts = {}) {
    const { Paragraph, TextRun, AlignmentType } = docx;
    const runs = [];
    if (typeof text === 'string') {
        runs.push(new TextRun({ text, bold: !!opts.bold, size: opts.size || 24, underline: opts.underline ? {} : undefined, italics: !!opts.italics }));
    } else if (Array.isArray(text)) {
        text.forEach(t => {
            if (typeof t === 'string') runs.push(new TextRun({ text: t, size: 24 }));
            else runs.push(new TextRun({ size: 24, ...t }));
        });
    }
    return new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : (opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT),
        spacing: { after: opts.after !== undefined ? opts.after : 150 },
        children: runs
    });
}

function BLANK(after) {
    return P('', { after: after || 200 });
}

// ====== CATEGORIES ======

const TEMPLATE_CATEGORIES = [
    {
        id: 'gst',
        name: 'GST',
        color: '#e74c3c',
        templates: ['gst_noc', 'gst_rental_agreement', 'gst_authorization']
    },
    {
        id: 'pvt',
        name: 'Private Limited (PVT)',
        color: '#3498db',
        templates: ['pvt_noc', 'pvt_dir_consent', 'pvt_inc9', 'pvt_specimen', 'pvt_appointment', 'pvt_resignation', 'pvt_board_resolution']
    },
    {
        id: 'llp',
        name: 'LLP',
        color: '#1abc9c',
        templates: ['llp_consent', 'llp_noc', 'llp_subscriber', 'llp_revised_agreement']
    },
    {
        id: 'aoc',
        name: 'AOC-04',
        color: '#9b59b6',
        templates: ['aoc_director_report', 'aoc_auditor_report']
    },
    {
        id: 'dsc',
        name: 'Organisation DSC',
        color: '#e67e22',
        templates: ['dsc_auth_letter']
    },
    {
        id: 'fssai',
        name: 'FSSAI',
        color: '#27ae60',
        templates: ['fssai_declaration', 'fssai_affidavit', 'fssai_self_declaration', 'fssai_fsms']
    },
    {
        id: 'mca',
        name: 'MCA Forms',
        color: '#34495e',
        templates: ['mca_form03', 'mca_form15', 'mca_dir2']
    },
    {
        id: 'labour',
        name: 'Labour',
        color: '#c0392b',
        templates: ['labour_auth_letter']
    }
];

// ====== TEMPLATES ======
//
// HOW TO EDIT A TEMPLATE:
// -----------------------
// Each template below is a JS object. To change the wording of any document:
//   1. Find the template by its id (e.g., 'gst_noc')
//   2. Look at the `generate` function — it builds the .docx
//   3. Each P(...) call is a paragraph. Edit the text inside quotes.
//   4. Use { text: '...', bold: true } for bold, { text: '...', italics: true } for italics
//   5. Use data.fieldName to insert client/extra field values (e.g., data.entityName)
//   6. Save the file and refresh the browser — changes take effect immediately.
//

const TEMPLATES = {

    // ══════════════════════════════════════════
    //  GST TEMPLATES
    // ══════════════════════════════════════════

    gst_noc: {
        id: 'gst_noc',
        category: 'gst',
        name: 'GST - NOC',
        requiredFields: [],
        extraFields: [
            { key: 'nocDate', label: 'Date of NOC', type: 'date' },
            { key: 'nocPurpose', label: 'Purpose of NOC', type: 'text', placeholder: 'e.g., GST Registration / Change of address / Additional place of business' },
            { key: 'propertyOwnerName', label: 'Property Owner Name', type: 'text' },
            { key: 'propertyOwnerRelation', label: 'Owner S/o, D/o, W/o', type: 'text' },
            { key: 'propertyOwnerPan', label: 'Property Owner PAN', type: 'text' },
            { key: 'propertyOwnerAadhar', label: 'Property Owner Aadhar', type: 'text' },
            { key: 'propertyAddress', label: 'Property Address', type: 'textarea', prefillAddress: true },
            { key: 'nocPlace', label: 'Place', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const isSole = (data.entityType || '').toLowerCase().includes('sole');
            const companyName = data.entityName || data.proposedCompanyName || data.tradeName || data.fullName || '___________';
            const gstLine = data.gstNumber ? ` (GSTIN: ${data.gstNumber})` : '';

            // Build the business description
            let businessDesc = '';
            if (isSole && data.tradeName) {
                businessDesc = `${data.fullName || '___________'}, bearing PAN ${data.pan || '___________'} and Aadhar No. ${data.aadhar || '___________'}, carrying on business under the trade name "${data.tradeName}"${gstLine}`;
            } else {
                businessDesc = `${companyName}${gstLine}`;
            }

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('NO OBJECTION CERTIFICATE', { bold: true, size: 32, underline: true, center: true, after: 300 }),
                        P([
                            { text: 'Date: ', bold: true },
                            { text: formatDate(data.nocDate) }
                        ], { after: 100 }),
                        P([
                            { text: 'Place: ', bold: true },
                            { text: data.nocPlace || '___________' }
                        ], { after: 200 }),
                        BLANK(100),
                        P('To Whom So Ever It May Concern', { bold: true, size: 26, after: 200 }),
                        BLANK(100),
                        P([
                            { text: 'Subject: ', bold: true },
                            { text: `No Objection Certificate for ${data.nocPurpose || 'GST Registration'} of ${companyName}` }
                        ], { after: 200 }),
                        BLANK(100),
                        P('Respected Sir/Madam,'),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.propertyOwnerName || '___________', bold: true },
                            { text: data.propertyOwnerRelation ? ` S/o / D/o / W/o ${data.propertyOwnerRelation}` : '' },
                            { text: `, bearing PAN ` },
                            { text: data.propertyOwnerPan || '___________', bold: true },
                            { text: ` and Aadhar No. ` },
                            { text: data.propertyOwnerAadhar || '___________', bold: true },
                            { text: `, owner of the property situated at ` },
                            { text: data.propertyAddress || '___________', bold: true },
                            { text: `, hereby state that I have no objection if ` },
                            { text: businessDesc, bold: true },
                            { text: ` uses the above-mentioned premises for the purpose of ${data.nocPurpose || 'GST Registration'}.` }
                        ]),
                        BLANK(100),
                        P('I confirm that the above information is true and correct to the best of my knowledge and belief.'),
                        BLANK(300),
                        P('Yours faithfully,'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${data.propertyOwnerName || '___________'}`, bold: true }]),
                        P([{ text: `PAN: ${data.propertyOwnerPan || '___________'}` }]),
                        P([{ text: `Aadhar: ${data.propertyOwnerAadhar || '___________'}` }]),
                        P('(Property Owner)', { italics: true }),
                    ]
                }]
            });
        }
    },

    gst_rental_agreement: {
        id: 'gst_rental_agreement',
        category: 'gst',
        name: 'Rental Agreement',
        requiredFields: [],
        extraFields: [
            { key: 'agreementDate', label: 'Agreement Date', type: 'date' },
            { key: 'landlordName', label: 'Landlord Full Name', type: 'text' },
            { key: 'landlordFatherName', label: 'Landlord S/o / D/o / W/o', type: 'text' },
            { key: 'landlordAddress', label: 'Landlord Permanent Address', type: 'textarea' },
            { key: 'landlordAadhar', label: 'Landlord Aadhar No.', type: 'text' },
            { key: 'landlordPan', label: 'Landlord PAN No.', type: 'text' },
            { key: 'propertyAddress', label: 'Rented Property Address', type: 'textarea', prefillAddress: true },
            { key: 'monthlyRent', label: 'Monthly Rent (Rs.)', type: 'number' },
            { key: 'securityDeposit', label: 'Security Deposit (Rs.)', type: 'number' },
            { key: 'agreementPeriod', label: 'Agreement Period (months)', type: 'number' },
            { key: 'agreementPlace', label: 'Place of Execution', type: 'text' },
            { key: 'tenantAuthorizedPerson', label: 'Tenant Authorized Signatory Name', type: 'text' },
            { key: 'tenantDesignation', label: 'Tenant Signatory Designation', type: 'text', placeholder: 'e.g., Director / Partner / Proprietor' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || data.tradeName || data.fullName || '___________';
            const startDate = formatDate(data.agreementDate);
            const rent = data.monthlyRent || '___________';
            const rentWords = numberToWords(data.monthlyRent);
            const deposit = data.securityDeposit || '___________';
            const depositWords = numberToWords(data.securityDeposit);
            const period = data.agreementPeriod || '11';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1200, right: 1200 } } },
                    children: [
                        P('RENTAL AGREEMENT', { bold: true, size: 32, underline: true, center: true, after: 300 }),
                        BLANK(100),
                        P([
                            { text: `This Rental Agreement is executed on this ` },
                            { text: startDate, bold: true },
                            { text: ` at ` },
                            { text: data.agreementPlace || '___________', bold: true },
                        ]),
                        BLANK(100),
                        P('BETWEEN', { bold: true, center: true }),
                        BLANK(100),
                        P([
                            { text: data.landlordName || '___________', bold: true },
                            { text: data.landlordFatherName ? ` S/o / D/o / W/o ${data.landlordFatherName}` : '' },
                            { text: `, residing at ${data.landlordAddress || '___________'}` },
                            { text: data.landlordAadhar ? ` (Aadhar: ${data.landlordAadhar})` : '' },
                            { text: data.landlordPan ? ` (PAN: ${data.landlordPan})` : '' },
                        ]),
                        P([{ text: '(Hereinafter referred to as the "LANDLORD", which expression shall include his/her heirs, executors, and assigns)', italics: true }], { after: 200 }),
                        BLANK(100),
                        P('AND', { bold: true, center: true }),
                        BLANK(100),
                        P([
                            { text: companyName, bold: true },
                            { text: data.entityType ? ` (${data.entityType})` : '' },
                            { text: data.cin ? ` (CIN: ${data.cin})` : '' },
                            { text: data.llpin ? ` (LLPIN: ${data.llpin})` : '' },
                            { text: data.gstNumber ? ` (GSTIN: ${data.gstNumber})` : '' },
                            { text: data.registeredAddress ? `, having its registered office at ${data.registeredAddress}` : '' },
                            { text: `, represented by ` },
                            { text: data.tenantAuthorizedPerson || data.fullName || '___________', bold: true },
                            { text: `, ${data.tenantDesignation || 'Authorized Signatory'}` },
                        ]),
                        P([{ text: '(Hereinafter referred to as the "TENANT", which expression shall include its successors and assigns)', italics: true }], { after: 200 }),
                        BLANK(100),
                        P('The Landlord and Tenant are collectively referred to as "Parties" and individually as "Party".'),
                        BLANK(100),
                        P('WHEREAS the Landlord is the absolute owner of the property more fully described hereunder and has agreed to let out the same to the Tenant on the terms and conditions mentioned below:'),
                        BLANK(100),
                        P([{ text: '1. PREMISES:', bold: true }]),
                        P([
                            { text: `The Landlord hereby lets out the premises situated at ` },
                            { text: data.propertyAddress || '___________', bold: true },
                            { text: ` (hereinafter referred to as the "Premises") to the Tenant for commercial/official use.` }
                        ], { after: 200 }),
                        P([{ text: '2. PERIOD OF TENANCY:', bold: true }]),
                        P(`The tenancy shall be for a period of ${period} months commencing from ${startDate}, unless terminated earlier by either party.`, { after: 200 }),
                        P([{ text: '3. MONTHLY RENT:', bold: true }]),
                        P(`The Tenant shall pay a monthly rent of Rs. ${rent}/- (Rupees ${rentWords} Only) to the Landlord, payable on or before the 5th day of every succeeding month.`, { after: 200 }),
                        P([{ text: '4. SECURITY DEPOSIT:', bold: true }]),
                        P(`The Tenant has deposited a sum of Rs. ${deposit}/- (Rupees ${depositWords} Only) as security deposit with the Landlord, which shall be refundable without interest at the time of vacating the premises, after adjusting any outstanding dues.`, { after: 200 }),
                        P([{ text: '5. USE OF PREMISES:', bold: true }]),
                        P('The Tenant shall use the premises solely for commercial/official purposes and shall not use the same for any unlawful activity.', { after: 200 }),
                        P([{ text: '6. MAINTENANCE:', bold: true }]),
                        P('The Tenant shall maintain the premises in good and habitable condition and shall not make any structural alterations without the prior written consent of the Landlord.', { after: 200 }),
                        P([{ text: '7. TERMINATION:', bold: true }]),
                        P('Either party may terminate this agreement by giving one month prior written notice to the other party. Upon termination, the Tenant shall vacate the premises peacefully and hand over possession to the Landlord.', { after: 200 }),
                        P([{ text: '8. GOVERNING LAW:', bold: true }]),
                        P('This agreement shall be governed by and construed in accordance with the laws of India.', { after: 200 }),
                        BLANK(100),
                        P('IN WITNESS WHEREOF, the parties have set and subscribed their hands on the day, month, and year first above written.'),
                        BLANK(300),
                        P([
                            { text: 'LANDLORD', bold: true },
                            { text: '                                        ' },
                            { text: 'TENANT', bold: true }
                        ]),
                        BLANK(200),
                        P([
                            { text: `Signature: ____________________` },
                            { text: '              ' },
                            { text: `Signature: ____________________` }
                        ]),
                        P([
                            { text: `Name: ${data.landlordName || '___________'}` },
                            { text: '                       ' },
                            { text: `Name: ${data.tenantAuthorizedPerson || data.fullName || '___________'}` }
                        ]),
                        P([
                            { text: `Aadhar: ${data.landlordAadhar || '___________'}` },
                            { text: '                    ' },
                            { text: `Designation: ${data.tenantDesignation || '___________'}` }
                        ]),
                        P([
                            { text: '' },
                            { text: '                                                    ' },
                            { text: `For: ${companyName}` }
                        ]),
                        BLANK(300),
                        P([{ text: 'WITNESSES:', bold: true }]),
                        P('1. Name: ____________________  Signature: ____________________'),
                        P('   Address: ________________________________________________'),
                        BLANK(100),
                        P('2. Name: ____________________  Signature: ____________________'),
                        P('   Address: ________________________________________________'),
                    ]
                }]
            });
        }
    },

    gst_authorization: {
        id: 'gst_authorization',
        category: 'gst',
        name: 'GST Authorization Letter',
        requiredFields: [],
        extraFields: [
            { key: 'authDate', label: 'Date', type: 'date' },
            { key: 'authPersonName', label: 'Authorized Person Name', type: 'text' },
            { key: 'authPersonPan', label: 'Authorized Person PAN', type: 'text' },
            { key: 'authPersonAadhar', label: 'Authorized Person Aadhar', type: 'text' },
            { key: 'authPurpose', label: 'Purpose', type: 'text', placeholder: 'e.g., GST Registration / GST Filing / GST Cancellation' },
            { key: 'authPlace', label: 'Place', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.tradeName || data.fullName || '___________';
            const isSole = (data.entityType || '').toLowerCase().includes('sole');

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('AUTHORIZATION LETTER', { bold: true, size: 32, underline: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.authDate) }], { after: 100 }),
                        P([{ text: 'Place: ', bold: true }, { text: data.authPlace || '___________' }], { after: 200 }),
                        BLANK(100),
                        P('To Whom So Ever It May Concern', { bold: true, size: 26, after: 200 }),
                        BLANK(100),
                        P([
                            { text: 'Subject: ', bold: true },
                            { text: `Authorization Letter for ${data.authPurpose || 'GST Registration'} of ${companyName}` }
                        ], { after: 200 }),
                        BLANK(100),
                        P('Respected Sir/Madam,'),
                        BLANK(100),
                        P([
                            { text: isSole ? `I, ` : `We, ` },
                            { text: companyName, bold: true },
                            { text: data.gstNumber ? ` (GSTIN: ${data.gstNumber})` : '' },
                            { text: data.registeredAddress ? `, having its office at ${data.registeredAddress}` : '' },
                            { text: `, hereby authorize ` },
                            { text: data.authPersonName || '___________', bold: true },
                            { text: `, bearing PAN ` },
                            { text: data.authPersonPan || '___________', bold: true },
                            { text: ` and Aadhar No. ` },
                            { text: data.authPersonAadhar || '___________', bold: true },
                            { text: `, to act on ${isSole ? 'my' : 'our'} behalf for the purpose of ${data.authPurpose || 'GST Registration'} and to sign and submit all necessary documents, applications, and declarations in connection therewith.` }
                        ]),
                        BLANK(100),
                        P([
                            { text: `The authorized person is empowered to represent ${isSole ? 'me' : 'the company/firm'} before the GST authorities and to do all acts, deeds, and things as may be necessary for the said purpose.` }
                        ]),
                        BLANK(100),
                        P('This authorization is valid until revoked in writing.'),
                        BLANK(300),
                        P('Yours faithfully,'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `For ${companyName}`, bold: true }]),
                        P([{ text: `Name: ${data.fullName || '___________'}` }]),
                        P([{ text: `Designation: ${isSole ? 'Proprietor' : (data.directors?.[0]?.designation || 'Director')}` }]),
                    ]
                }]
            });
        }
    },

    // ══════════════════════════════════════════
    //  PRIVATE LIMITED (PVT) TEMPLATES
    // ══════════════════════════════════════════

    pvt_noc: {
        id: 'pvt_noc',
        category: 'pvt',
        name: 'NOC for Registered Office',
        requiredFields: [],
        extraFields: [
            { key: 'nocDate', label: 'Date of NOC', type: 'date' },
            { key: 'propertyOwnerName', label: 'Property Owner Name', type: 'text' },
            { key: 'propertyOwnerRelation', label: 'Owner S/o, D/o, W/o', type: 'text' },
            { key: 'propertyOwnerPan', label: 'Property Owner PAN', type: 'text' },
            { key: 'propertyOwnerAadhar', label: 'Property Owner Aadhar', type: 'text' },
            { key: 'propertyAddress', label: 'Property Address', type: 'textarea', prefillAddress: true },
            { key: 'nocPlace', label: 'Place', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';
            const cin = data.cin || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('NO OBJECTION CERTIFICATE', { bold: true, size: 32, underline: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.nocDate) }], { after: 100 }),
                        P([{ text: 'Place: ', bold: true }, { text: data.nocPlace || '___________' }], { after: 200 }),
                        BLANK(100),
                        P('To Whom So Ever It May Concern', { bold: true, size: 26, after: 200 }),
                        BLANK(100),
                        P([
                            { text: 'Subject: ', bold: true },
                            { text: `No Objection Certificate for use of premises as Registered Office of ` },
                            { text: companyName, bold: true }
                        ], { after: 200 }),
                        P([
                            { text: 'Reference: ', bold: true },
                            { text: `CIN: ${cin}` }
                        ], { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.propertyOwnerName || '___________', bold: true },
                            { text: data.propertyOwnerRelation ? `, S/o / D/o / W/o ${data.propertyOwnerRelation}` : '' },
                            { text: `, bearing PAN ` },
                            { text: data.propertyOwnerPan || '___________', bold: true },
                            { text: ` and Aadhar No. ` },
                            { text: data.propertyOwnerAadhar || '___________', bold: true },
                            { text: `, am the owner/authorized occupant of the premises situated at ` },
                            { text: data.propertyAddress || data.registeredAddress || '___________', bold: true },
                            { text: `.` }
                        ]),
                        BLANK(100),
                        P([
                            { text: `I hereby give my No Objection / Consent for ` },
                            { text: companyName, bold: true },
                            { text: ` (CIN: ${cin}) to use the above-mentioned premises as its Registered Office address as per the provisions of the Companies Act, 2013.` }
                        ]),
                        BLANK(100),
                        P('I further declare that:'),
                        P('(a) I am the lawful owner/authorized occupant of the said premises.'),
                        P('(b) I have given my consent voluntarily and without any coercion.'),
                        P('(c) This NOC shall remain valid until revoked by me in writing.'),
                        BLANK(100),
                        P('I confirm that the above information is true and correct to the best of my knowledge and belief.'),
                        BLANK(300),
                        P('Yours faithfully,'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${data.propertyOwnerName || '___________'}`, bold: true }]),
                        P(`PAN: ${data.propertyOwnerPan || '___________'}`),
                        P(`Aadhar: ${data.propertyOwnerAadhar || '___________'}`),
                        P('(Property Owner / Authorized Occupant)', { italics: true }),
                    ]
                }]
            });
        }
    },

    pvt_dir_consent: {
        id: 'pvt_dir_consent',
        category: 'pvt',
        name: 'DIR - Consent to Act as Director',
        requiredFields: [],
        extraFields: [
            { key: 'consentDate', label: 'Date', type: 'date' },
            { key: 'directorName', label: 'Director Name', type: 'text' },
            { key: 'directorDin', label: 'DIN', type: 'text' },
            { key: 'directorAddress', label: 'Director Address', type: 'textarea' },
            { key: 'directorPan', label: 'Director PAN', type: 'text' },
            { key: 'directorAadhar', label: 'Director Aadhar', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';
            const dir = data.directorName || (data.directors?.[0]?.name) || '___________';
            const din = data.directorDin || (data.directors?.[0]?.din) || '___________';
            const dirPan = data.directorPan || (data.directors?.[0]?.pan) || '___________';
            const dirAadhar = data.directorAadhar || (data.directors?.[0]?.aadhar) || '___________';
            const dirAddr = data.directorAddress || (data.directors?.[0]?.address) || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('CONSENT TO ACT AS DIRECTOR', { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        P('(Pursuant to Section 152 of the Companies Act, 2013 and Rule 8 of the Companies (Appointment and Qualification of Directors) Rules, 2014)', { italics: true, center: true, after: 200 }),
                        BLANK(100),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.consentDate) }], { after: 200 }),
                        P('To,'),
                        P('The Board of Directors,'),
                        P([{ text: companyName, bold: true }]),
                        P(data.registeredAddress || '___________', { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: dir, bold: true },
                            { text: `, bearing DIN ` },
                            { text: din, bold: true },
                            { text: `, PAN ` },
                            { text: dirPan, bold: true },
                            { text: ` and Aadhar No. ` },
                            { text: dirAadhar, bold: true },
                            { text: `, residing at ${dirAddr}, hereby give my consent to act as a Director of ` },
                            { text: companyName, bold: true },
                            { text: ` (CIN: ${data.cin || '___________'}) with effect from the date of my appointment by the Board of Directors / Members of the Company.` }
                        ]),
                        BLANK(100),
                        P('I further confirm that I am not disqualified from being appointed as a Director under Section 164 of the Companies Act, 2013.'),
                        BLANK(100),
                        P('I also confirm that I have not been debarred from holding the office of Director by virtue of any order of NCLT or any other authority under any other law for the time being in force.'),
                        BLANK(300),
                        P('Yours faithfully,'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${dir}`, bold: true }]),
                        P(`DIN: ${din}`),
                        P(`PAN: ${dirPan}`),
                        P(`Address: ${dirAddr}`),
                    ]
                }]
            });
        }
    },

    pvt_inc9: {
        id: 'pvt_inc9',
        category: 'pvt',
        name: 'INC-9 Declaration',
        requiredFields: [],
        extraFields: [
            { key: 'declarationDate', label: 'Date', type: 'date' },
            { key: 'declarantName', label: 'Declarant Name', type: 'text' },
            { key: 'declarantDesignation', label: 'Designation', type: 'text', placeholder: 'Director / Subscriber' },
            { key: 'declarantDin', label: 'DIN', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('DECLARATION', { bold: true, size: 28, underline: true, center: true, after: 200 }),
                        P('(In terms of INC-9 — Declaration by Subscribers and First Directors)', { italics: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.declarationDate) }], { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.declarantName || data.fullName || '___________', bold: true },
                            { text: `, ${data.declarantDesignation || 'Director'} of ` },
                            { text: companyName, bold: true },
                            { text: data.declarantDin ? ` (DIN: ${data.declarantDin})` : '' },
                            { text: `, do hereby declare and confirm that:` }
                        ]),
                        BLANK(100),
                        P('1. I am not convicted of any offence in connection with the promotion, formation or management of any company or LLP during the last five years.'),
                        BLANK(50),
                        P('2. I am not an undischarged insolvent.'),
                        BLANK(50),
                        P('3. I have not been declared as a fugitive economic offender under Section 12 of the Fugitive Economic Offenders Act, 2018.'),
                        BLANK(50),
                        P('4. I have not been convicted of the offence of fraud under the Companies Act, 2013.'),
                        BLANK(50),
                        P('5. All the information given in the form and attachments thereto is correct and complete, and no information material to the subject matter has been suppressed or concealed.'),
                        BLANK(50),
                        P('6. I have complied with all the provisions of the Companies Act, 2013 and the rules made thereunder.'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${data.declarantName || data.fullName || '___________'}`, bold: true }]),
                        P(`Designation: ${data.declarantDesignation || 'Director'}`),
                        P(data.declarantDin ? `DIN: ${data.declarantDin}` : ''),
                        P(`Date: ${formatDate(data.declarationDate)}`),
                    ]
                }]
            });
        }
    },

    pvt_specimen: {
        id: 'pvt_specimen',
        category: 'pvt',
        name: 'Specimen Signature',
        requiredFields: [],
        extraFields: [
            { key: 'specimenDate', label: 'Date', type: 'date' },
            { key: 'signatoryName', label: 'Signatory Name', type: 'text' },
            { key: 'signatoryDesignation', label: 'Designation', type: 'text' },
            { key: 'signatoryDin', label: 'DIN', type: 'text' },
            { key: 'signatoryPan', label: 'PAN', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('SPECIMEN SIGNATURE', { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.specimenDate) }], { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.signatoryName || data.fullName || '___________', bold: true },
                            { text: `, ${data.signatoryDesignation || 'Director'} of ` },
                            { text: companyName, bold: true },
                            { text: ` (CIN: ${data.cin || '___________'})` },
                            { text: `, hereby furnish my specimen signature as under:` }
                        ]),
                        BLANK(300),
                        P('Specimen Signature:', { bold: true }),
                        BLANK(100),
                        P('1. ____________________________'),
                        BLANK(100),
                        P('2. ____________________________'),
                        BLANK(100),
                        P('3. ____________________________'),
                        BLANK(300),
                        P([{ text: `Name: ${data.signatoryName || data.fullName || '___________'}`, bold: true }]),
                        P(`Designation: ${data.signatoryDesignation || 'Director'}`),
                        P(data.signatoryDin ? `DIN: ${data.signatoryDin}` : ''),
                        P(data.signatoryPan ? `PAN: ${data.signatoryPan}` : ''),
                        P(`For: ${companyName}`),
                    ]
                }]
            });
        }
    },

    pvt_appointment: {
        id: 'pvt_appointment',
        category: 'pvt',
        name: 'Appointment Letter',
        requiredFields: [],
        extraFields: [
            { key: 'appointmentDate', label: 'Date of Appointment', type: 'date' },
            { key: 'appointeeName', label: 'Appointee Name', type: 'text' },
            { key: 'appointeeDin', label: 'DIN', type: 'text' },
            { key: 'appointeeDesignation', label: 'Designation', type: 'text', placeholder: 'e.g., Director / Additional Director / Managing Director' },
            { key: 'appointeeAddress', label: 'Appointee Address', type: 'textarea' },
            { key: 'appointeeRemuneration', label: 'Remuneration (if any)', type: 'text', placeholder: 'e.g., Rs. 50,000/- per month' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P([{ text: companyName, bold: true, size: 28 }], { center: true, after: 50 }),
                        P(`CIN: ${data.cin || '___________'}`, { center: true, after: 50 }),
                        P(`Registered Office: ${data.registeredAddress || '___________'}`, { center: true, after: 200 }),
                        P('_____________________________________________________________________________', { center: true, after: 200 }),
                        BLANK(100),
                        P('APPOINTMENT LETTER', { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.appointmentDate) }], { after: 200 }),
                        P('To,'),
                        P([{ text: data.appointeeName || '___________', bold: true }]),
                        P(data.appointeeAddress || '___________', { after: 200 }),
                        BLANK(100),
                        P([{ text: 'Subject: ', bold: true }, { text: `Appointment as ${data.appointeeDesignation || 'Director'}` }], { after: 200 }),
                        BLANK(100),
                        P([{ text: `Dear ${data.appointeeName || '___________'},` }]),
                        BLANK(100),
                        P([
                            { text: `We are pleased to inform you that the Board of Directors of ` },
                            { text: companyName, bold: true },
                            { text: ` has, at its meeting held on ${formatDate(data.appointmentDate)}, appointed you as ` },
                            { text: data.appointeeDesignation || 'Director', bold: true },
                            { text: ` of the Company with effect from ${formatDate(data.appointmentDate)}.` }
                        ]),
                        BLANK(100),
                        P('Your appointment is subject to the provisions of the Companies Act, 2013 and the Articles of Association of the Company.'),
                        BLANK(100),
                        data.appointeeRemuneration ? P(`Your remuneration shall be ${data.appointeeRemuneration} as approved by the Board.`) : P(''),
                        BLANK(100),
                        P('We look forward to your valuable contribution to the Company.'),
                        BLANK(300),
                        P('Yours faithfully,'),
                        P([{ text: `For ${companyName}`, bold: true }]),
                        BLANK(200),
                        P('____________________________'),
                        P('Authorized Signatory'),
                    ]
                }]
            });
        }
    },

    pvt_resignation: {
        id: 'pvt_resignation',
        category: 'pvt',
        name: 'Resignation Letter',
        requiredFields: [],
        extraFields: [
            { key: 'resignationDate', label: 'Date of Resignation', type: 'date' },
            { key: 'resigneeName', label: 'Resigning Director Name', type: 'text' },
            { key: 'resigneeDin', label: 'DIN', type: 'text' },
            { key: 'resigneeDesignation', label: 'Designation', type: 'text' },
            { key: 'effectiveDate', label: 'Effective Date', type: 'date' },
            { key: 'resignationReason', label: 'Reason for Resignation', type: 'textarea', placeholder: 'e.g., Personal reasons / Other commitments' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('RESIGNATION LETTER', { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.resignationDate) }], { after: 200 }),
                        P('To,'),
                        P('The Board of Directors,'),
                        P([{ text: companyName, bold: true }]),
                        P(data.registeredAddress || '___________', { after: 200 }),
                        BLANK(100),
                        P([
                            { text: 'Subject: ', bold: true },
                            { text: `Resignation from the post of ${data.resigneeDesignation || 'Director'}` }
                        ], { after: 200 }),
                        BLANK(100),
                        P('Respected Members of the Board,'),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.resigneeName || '___________', bold: true },
                            { text: data.resigneeDin ? ` (DIN: ${data.resigneeDin})` : '' },
                            { text: `, hereby tender my resignation from the post of ${data.resigneeDesignation || 'Director'} of ` },
                            { text: companyName, bold: true },
                            { text: ` (CIN: ${data.cin || '___________'}) with effect from ${formatDate(data.effectiveDate || data.resignationDate)}.` }
                        ]),
                        BLANK(100),
                        data.resignationReason ? P(`Reason: ${data.resignationReason}`) : P(''),
                        BLANK(100),
                        P('I confirm that there are no other material reasons for my resignation other than those mentioned above.'),
                        BLANK(100),
                        P('I request you to kindly accept my resignation and take it on record at the earliest.'),
                        BLANK(300),
                        P('Yours faithfully,'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${data.resigneeName || '___________'}`, bold: true }]),
                        P(data.resigneeDin ? `DIN: ${data.resigneeDin}` : ''),
                    ]
                }]
            });
        }
    },

    pvt_board_resolution: {
        id: 'pvt_board_resolution',
        category: 'pvt',
        name: 'Board Resolution',
        requiredFields: [],
        extraFields: [
            { key: 'resolutionDate', label: 'Date of Meeting', type: 'date' },
            { key: 'resolutionSubject', label: 'Subject of Resolution', type: 'text', placeholder: 'e.g., Opening of Bank Account / Appointment of Director' },
            { key: 'resolutionText', label: 'Resolution Text', type: 'textarea', placeholder: 'RESOLVED THAT...' },
            { key: 'meetingPlace', label: 'Place of Meeting', type: 'text' },
            { key: 'meetingTime', label: 'Time of Meeting', type: 'text', placeholder: 'e.g., 11:00 AM' },
            { key: 'chairpersonName', label: 'Chairperson Name', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P([{ text: companyName, bold: true, size: 28 }], { center: true, after: 50 }),
                        P(`CIN: ${data.cin || '___________'}`, { center: true, after: 50 }),
                        P(`Registered Office: ${data.registeredAddress || '___________'}`, { center: true, after: 200 }),
                        P('_____________________________________________________________________________', { center: true, after: 200 }),
                        BLANK(100),
                        P('CERTIFIED TRUE COPY OF THE RESOLUTION', { bold: true, size: 26, underline: true, center: true, after: 200 }),
                        P([{ text: `Passed at the Meeting of the Board of Directors of ${companyName} held on ${formatDate(data.resolutionDate)} at ${data.meetingTime || '___________'} at ${data.meetingPlace || data.registeredAddress || '___________'}.` }], { after: 200 }),
                        BLANK(100),
                        P([{ text: 'Subject: ', bold: true }, { text: data.resolutionSubject || '___________' }], { after: 200 }),
                        BLANK(100),
                        P([{ text: data.resolutionText || 'RESOLVED THAT ___________', bold: true }]),
                        BLANK(100),
                        P([{ text: 'FURTHER RESOLVED THAT ', bold: true }, { text: `any one Director of the Company be and is hereby authorized to do all such acts, deeds, matters, and things as may be necessary, proper, or expedient for giving effect to the above resolution.` }]),
                        BLANK(300),
                        P([{ text: `For ${companyName}`, bold: true }]),
                        BLANK(200),
                        P('____________________________'),
                        P([{ text: `${data.chairpersonName || '___________'}`, bold: true }]),
                        P('Chairperson'),
                        P(`Date: ${formatDate(data.resolutionDate)}`),
                    ]
                }]
            });
        }
    },

    // ══════════════════════════════════════════
    //  LLP TEMPLATES
    // ══════════════════════════════════════════

    llp_consent: {
        id: 'llp_consent',
        category: 'llp',
        name: 'Consent Letter (Designated Partner)',
        requiredFields: [],
        extraFields: [
            { key: 'consentDate', label: 'Date', type: 'date' },
            { key: 'partnerName', label: 'Partner Name', type: 'text' },
            { key: 'partnerDpin', label: 'DPIN', type: 'text' },
            { key: 'partnerPan', label: 'Partner PAN', type: 'text' },
            { key: 'partnerAadhar', label: 'Partner Aadhar', type: 'text' },
            { key: 'partnerAddress', label: 'Partner Address', type: 'textarea' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const llpName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('CONSENT TO ACT AS DESIGNATED PARTNER', { bold: true, size: 28, underline: true, center: true, after: 200 }),
                        P('(Pursuant to Section 7(1) of the Limited Liability Partnership Act, 2008)', { italics: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.consentDate) }], { after: 200 }),
                        P('To,'),
                        P([{ text: `${llpName} LLP`, bold: true }]),
                        P(data.registeredAddress || '___________', { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.partnerName || '___________', bold: true },
                            { text: `, bearing DPIN ` },
                            { text: data.partnerDpin || '___________', bold: true },
                            { text: `, PAN ` },
                            { text: data.partnerPan || '___________', bold: true },
                            { text: ` and Aadhar No. ` },
                            { text: data.partnerAadhar || '___________', bold: true },
                            { text: `, residing at ${data.partnerAddress || '___________'}, hereby give my consent to act as a Designated Partner of ` },
                            { text: `${llpName} LLP`, bold: true },
                            { text: ` (LLPIN: ${data.llpin || '___________'}).` }
                        ]),
                        BLANK(100),
                        P('I hereby declare that:'),
                        P('(a) I am not disqualified from being appointed as a Designated Partner under the LLP Act, 2008.'),
                        P('(b) I have obtained a valid Designated Partner Identification Number (DPIN).'),
                        P('(c) I consent to act as Designated Partner and agree to be bound by the provisions of the LLP Agreement and the LLP Act, 2008.'),
                        BLANK(300),
                        P('Yours faithfully,'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${data.partnerName || '___________'}`, bold: true }]),
                        P(`DPIN: ${data.partnerDpin || '___________'}`),
                        P(`PAN: ${data.partnerPan || '___________'}`),
                    ]
                }]
            });
        }
    },

    llp_noc: {
        id: 'llp_noc',
        category: 'llp',
        name: 'NOC for Registered Office',
        requiredFields: [],
        extraFields: [
            { key: 'nocDate', label: 'Date of NOC', type: 'date' },
            { key: 'propertyOwnerName', label: 'Property Owner Name', type: 'text' },
            { key: 'propertyOwnerRelation', label: 'Owner S/o, D/o, W/o', type: 'text' },
            { key: 'propertyOwnerPan', label: 'Property Owner PAN', type: 'text' },
            { key: 'propertyOwnerAadhar', label: 'Property Owner Aadhar', type: 'text' },
            { key: 'propertyAddress', label: 'Property Address', type: 'textarea', prefillAddress: true },
            { key: 'nocPlace', label: 'Place', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const llpName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('NO OBJECTION CERTIFICATE', { bold: true, size: 32, underline: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.nocDate) }], { after: 100 }),
                        P([{ text: 'Place: ', bold: true }, { text: data.nocPlace || '___________' }], { after: 200 }),
                        BLANK(100),
                        P('To Whom So Ever It May Concern', { bold: true, size: 26, after: 200 }),
                        BLANK(100),
                        P([
                            { text: 'Subject: ', bold: true },
                            { text: `No Objection Certificate for use of premises as Registered Office of ` },
                            { text: `${llpName} LLP`, bold: true }
                        ], { after: 200 }),
                        P([
                            { text: 'Reference: ', bold: true },
                            { text: `LLPIN: ${data.llpin || '___________'}` }
                        ], { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.propertyOwnerName || '___________', bold: true },
                            { text: data.propertyOwnerRelation ? `, S/o / D/o / W/o ${data.propertyOwnerRelation}` : '' },
                            { text: `, bearing PAN ` },
                            { text: data.propertyOwnerPan || '___________', bold: true },
                            { text: ` and Aadhar No. ` },
                            { text: data.propertyOwnerAadhar || '___________', bold: true },
                            { text: `, am the owner/authorized occupant of the premises situated at ` },
                            { text: data.propertyAddress || data.registeredAddress || '___________', bold: true },
                            { text: `.` }
                        ]),
                        BLANK(100),
                        P([
                            { text: `I hereby give my No Objection / Consent for ` },
                            { text: `${llpName} LLP`, bold: true },
                            { text: ` (LLPIN: ${data.llpin || '___________'}) to use the above-mentioned premises as its Registered Office address as per the provisions of the Limited Liability Partnership Act, 2008.` }
                        ]),
                        BLANK(100),
                        P('I further declare that:'),
                        P('(a) I am the lawful owner/authorized occupant of the said premises.'),
                        P('(b) I have given my consent voluntarily and without any coercion.'),
                        P('(c) This NOC shall remain valid until revoked by me in writing.'),
                        BLANK(300),
                        P('Yours faithfully,'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${data.propertyOwnerName || '___________'}`, bold: true }]),
                        P(`PAN: ${data.propertyOwnerPan || '___________'}`),
                        P(`Aadhar: ${data.propertyOwnerAadhar || '___________'}`),
                        P('(Property Owner / Authorized Occupant)', { italics: true }),
                    ]
                }]
            });
        }
    },

    llp_subscriber: {
        id: 'llp_subscriber',
        category: 'llp',
        name: 'Subscriber Sheet',
        requiredFields: [],
        extraFields: [
            { key: 'subscriberDate', label: 'Date', type: 'date' },
            { key: 'contributionAmount', label: 'Contribution Amount (Rs.)', type: 'number' }
        ],
        generate: (data) => {
            const { Document, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;
            const llpName = data.entityName || data.proposedCompanyName || '___________';
            const directors = data.directors || [];

            const headerRow = new TableRow({
                children: ['S.No.', 'Name', 'DPIN', 'Address', 'Contribution (Rs.)', 'Signature'].map(text =>
                    new TableCell({
                        children: [P(text, { bold: true, after: 50 })],
                        width: { size: text === 'Address' ? 2500 : 1500, type: WidthType.DXA }
                    })
                )
            });

            const dataRows = directors.length > 0 ? directors.map((dir, i) =>
                new TableRow({
                    children: [
                        new TableCell({ children: [P(`${i + 1}`, { after: 50 })] }),
                        new TableCell({ children: [P(dir.name || '', { after: 50 })] }),
                        new TableCell({ children: [P(dir.din || '', { after: 50 })] }),
                        new TableCell({ children: [P(dir.address || '', { after: 50 })] }),
                        new TableCell({ children: [P(data.contributionAmount || '', { after: 50 })] }),
                        new TableCell({ children: [P('', { after: 50 })] }),
                    ]
                })
            ) : [new TableRow({
                children: ['1', '___________', '___________', '___________', '___________', ''].map(text =>
                    new TableCell({ children: [P(text, { after: 50 })] })
                )
            })];

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1200, right: 1200 } } },
                    children: [
                        P('SUBSCRIBER SHEET', { bold: true, size: 28, underline: true, center: true, after: 200 }),
                        P('(For incorporation of Limited Liability Partnership)', { italics: true, center: true, after: 300 }),
                        BLANK(100),
                        P([
                            { text: 'LLP Name: ', bold: true },
                            { text: `${llpName} LLP` }
                        ], { after: 100 }),
                        P([
                            { text: 'Date: ', bold: true },
                            { text: formatDate(data.subscriberDate) }
                        ], { after: 200 }),
                        BLANK(100),
                        P('We, the undersigned persons, do hereby subscribe our names to this LLP and agree to form a Limited Liability Partnership under the Limited Liability Partnership Act, 2008.', { after: 200 }),
                        BLANK(100),
                        new Table({
                            rows: [headerRow, ...dataRows],
                            width: { size: 100, type: WidthType.PERCENTAGE }
                        }),
                        BLANK(200),
                        P('Witness:'),
                        P('Name: ____________________________'),
                        P('Address: ____________________________'),
                        P('Signature: ____________________________'),
                    ]
                }]
            });
        }
    },

    llp_revised_agreement: {
        id: 'llp_revised_agreement',
        category: 'llp',
        name: 'Revised LLP Agreement',
        requiredFields: [],
        extraFields: [
            { key: 'agreementDate', label: 'Date of Agreement', type: 'date' },
            { key: 'originalAgreementDate', label: 'Original Agreement Date', type: 'date' },
            { key: 'revisionReason', label: 'Reason for Revision', type: 'textarea', placeholder: 'e.g., Change in profit sharing ratio / Addition of new partner / Change in registered office' },
            { key: 'partner1Name', label: 'Partner 1 Name', type: 'text' },
            { key: 'partner1Dpin', label: 'Partner 1 DPIN', type: 'text' },
            { key: 'partner1Address', label: 'Partner 1 Address', type: 'textarea' },
            { key: 'partner1Contribution', label: 'Partner 1 Contribution (Rs.)', type: 'number' },
            { key: 'partner1ProfitShare', label: 'Partner 1 Profit Sharing %', type: 'text' },
            { key: 'partner2Name', label: 'Partner 2 Name', type: 'text' },
            { key: 'partner2Dpin', label: 'Partner 2 DPIN', type: 'text' },
            { key: 'partner2Address', label: 'Partner 2 Address', type: 'textarea' },
            { key: 'partner2Contribution', label: 'Partner 2 Contribution (Rs.)', type: 'number' },
            { key: 'partner2ProfitShare', label: 'Partner 2 Profit Sharing %', type: 'text' },
            { key: 'agreementPlace', label: 'Place of Execution', type: 'text' },
            { key: 'businessNature', label: 'Nature of Business', type: 'text' },
            { key: 'witnessName', label: 'Witness Name', type: 'text' },
            { key: 'witnessAddress', label: 'Witness Address', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const llpName = data.entityName || data.proposedCompanyName || '___________';
            const p1 = data.partner1Name || (data.directors?.[0]?.name) || '___________';
            const p2 = data.partner2Name || (data.directors?.[1]?.name) || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1200, right: 1200 } } },
                    children: [
                        P('REVISED LIMITED LIABILITY PARTNERSHIP AGREEMENT', { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        BLANK(100),
                        P([
                            { text: `This Revised LLP Agreement is made and executed on this ` },
                            { text: formatDate(data.agreementDate), bold: true },
                            { text: ` at ` },
                            { text: data.agreementPlace || '___________', bold: true },
                        ]),
                        BLANK(100),
                        P([
                            { text: `In supersession of the earlier LLP Agreement dated ` },
                            { text: formatDate(data.originalAgreementDate), bold: true },
                            { text: `, the partners of ` },
                            { text: `${llpName} LLP`, bold: true },
                            { text: ` (LLPIN: ${data.llpin || '___________'}) have mutually agreed to revise the LLP Agreement as follows:` }
                        ]),
                        BLANK(100),
                        P([{ text: 'Reason for Revision: ', bold: true }, { text: data.revisionReason || '___________' }], { after: 200 }),
                        BLANK(100),
                        P('BETWEEN', { bold: true, center: true }),
                        BLANK(100),
                        P([
                            { text: '1. ', bold: true },
                            { text: p1, bold: true },
                            { text: data.partner1Dpin ? ` (DPIN: ${data.partner1Dpin})` : '' },
                            { text: data.partner1Address ? `, residing at ${data.partner1Address}` : '' },
                            { text: ' (hereinafter referred to as "First Designated Partner")' }
                        ], { after: 200 }),
                        P([
                            { text: '2. ', bold: true },
                            { text: p2, bold: true },
                            { text: data.partner2Dpin ? ` (DPIN: ${data.partner2Dpin})` : '' },
                            { text: data.partner2Address ? `, residing at ${data.partner2Address}` : '' },
                            { text: ' (hereinafter referred to as "Second Designated Partner")' }
                        ], { after: 200 }),
                        BLANK(100),
                        P('NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:', { bold: true, after: 200 }),
                        BLANK(100),
                        P([{ text: '1. NAME OF LLP:', bold: true }]),
                        P(`The name of the LLP shall be "${llpName} LLP".`, { after: 200 }),
                        P([{ text: '2. REGISTERED OFFICE:', bold: true }]),
                        P(`The registered office of the LLP shall be at ${data.registeredAddress || '___________'}.`, { after: 200 }),
                        P([{ text: '3. NATURE OF BUSINESS:', bold: true }]),
                        P(data.businessNature || 'The LLP shall carry on such business as may be decided by the partners from time to time.', { after: 200 }),
                        P([{ text: '4. CAPITAL CONTRIBUTION:', bold: true }]),
                        P([
                            { text: `${p1}: Rs. ${data.partner1Contribution || '___________'}/- (Rupees ${numberToWords(data.partner1Contribution)} Only)` }
                        ]),
                        P([
                            { text: `${p2}: Rs. ${data.partner2Contribution || '___________'}/- (Rupees ${numberToWords(data.partner2Contribution)} Only)` }
                        ], { after: 200 }),
                        P([{ text: '5. PROFIT AND LOSS SHARING RATIO:', bold: true }]),
                        P(`${p1}: ${data.partner1ProfitShare || '___________'}%`),
                        P(`${p2}: ${data.partner2ProfitShare || '___________'}%`, { after: 200 }),
                        P([{ text: '6. MANAGEMENT:', bold: true }]),
                        P('The management and conduct of the business of the LLP shall be carried out by mutual consent of all the Designated Partners.', { after: 200 }),
                        P([{ text: '7. BANK ACCOUNT:', bold: true }]),
                        P('The LLP shall operate bank account(s) in the name of the LLP. The bank account shall be operated jointly/severally by the Designated Partners.', { after: 200 }),
                        P([{ text: '8. BOOKS OF ACCOUNTS:', bold: true }]),
                        P('The LLP shall maintain proper books of accounts at its registered office as required under the LLP Act, 2008.', { after: 200 }),
                        P([{ text: '9. DISPUTE RESOLUTION:', bold: true }]),
                        P('Any dispute or difference arising between the partners shall be referred to arbitration in accordance with the Arbitration and Conciliation Act, 1996.', { after: 200 }),
                        P([{ text: '10. GENERAL:', bold: true }]),
                        P('All other matters not specifically covered under this Agreement shall be governed by the provisions of the Limited Liability Partnership Act, 2008 and the rules made thereunder.', { after: 200 }),
                        BLANK(100),
                        P('IN WITNESS WHEREOF, the parties have set and subscribed their hands on the day, month, and year first above written.'),
                        BLANK(300),
                        P([
                            { text: 'FIRST DESIGNATED PARTNER', bold: true },
                            { text: '                    ' },
                            { text: 'SECOND DESIGNATED PARTNER', bold: true }
                        ]),
                        BLANK(200),
                        P([
                            { text: `Signature: ____________________` },
                            { text: '              ' },
                            { text: `Signature: ____________________` }
                        ]),
                        P([
                            { text: `Name: ${p1}` },
                            { text: '                                ' },
                            { text: `Name: ${p2}` }
                        ]),
                        P([
                            { text: `DPIN: ${data.partner1Dpin || '___________'}` },
                            { text: '                              ' },
                            { text: `DPIN: ${data.partner2Dpin || '___________'}` }
                        ]),
                        BLANK(300),
                        P([{ text: 'WITNESS:', bold: true }]),
                        P(`Name: ${data.witnessName || '____________________________'}`),
                        P(`Address: ${data.witnessAddress || '____________________________'}`),
                        P('Signature: ____________________________'),
                    ]
                }]
            });
        }
    },

    // ══════════════════════════════════════════
    //  AOC-04 TEMPLATES
    // ══════════════════════════════════════════

    aoc_director_report: {
        id: 'aoc_director_report',
        category: 'aoc',
        name: "Director's Report",
        requiredFields: [],
        extraFields: [
            { key: 'reportDate', label: 'Date of Report', type: 'date' },
            { key: 'financialYear', label: 'Financial Year', type: 'text', placeholder: 'e.g., 2024-25' },
            { key: 'turnover', label: 'Turnover (Rs.)', type: 'number' },
            { key: 'netProfit', label: 'Net Profit / (Loss) (Rs.)', type: 'text' },
            { key: 'dividendRemarks', label: 'Dividend Remarks', type: 'text', placeholder: 'e.g., No dividend recommended' },
            { key: 'auditorName', label: 'Auditor Name/Firm', type: 'text' },
            { key: 'auditorRegNo', label: 'Auditor Firm Registration No.', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P([{ text: companyName, bold: true, size: 28 }], { center: true, after: 50 }),
                        P(`CIN: ${data.cin || '___________'}`, { center: true, after: 50 }),
                        P(`Registered Office: ${data.registeredAddress || '___________'}`, { center: true, after: 200 }),
                        P('_____________________________________________________________________________', { center: true, after: 200 }),
                        BLANK(100),
                        P("BOARD'S REPORT", { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        BLANK(100),
                        P([
                            { text: `To the Members of ` },
                            { text: companyName, bold: true }
                        ], { after: 200 }),
                        P([
                            { text: `Your Directors have pleasure in presenting the Report of the Board of Directors along with the Audited Financial Statements for the financial year ended ${data.financialYear || '___________'}.` }
                        ], { after: 200 }),
                        BLANK(100),
                        P([{ text: '1. FINANCIAL SUMMARY:', bold: true }]),
                        P(`Turnover: Rs. ${data.turnover || '___________'}/-`),
                        P(`Net Profit / (Loss): Rs. ${data.netProfit || '___________'}/-`, { after: 200 }),
                        BLANK(100),
                        P([{ text: '2. DIVIDEND:', bold: true }]),
                        P(data.dividendRemarks || 'The Board does not recommend any dividend for the financial year under review.', { after: 200 }),
                        BLANK(100),
                        P([{ text: '3. STATE OF COMPANY AFFAIRS:', bold: true }]),
                        P('The Company is carrying on its business activities and the state of affairs of the Company is satisfactory.', { after: 200 }),
                        BLANK(100),
                        P([{ text: '4. CHANGE IN NATURE OF BUSINESS:', bold: true }]),
                        P('There has been no change in the nature of business of the Company during the year.', { after: 200 }),
                        BLANK(100),
                        P([{ text: '5. DIRECTORS:', bold: true }]),
                        P('The composition of the Board of Directors is in accordance with the provisions of the Companies Act, 2013.', { after: 200 }),
                        BLANK(100),
                        P([{ text: '6. AUDITORS:', bold: true }]),
                        P([
                            { text: `M/s ${data.auditorName || '___________'}` },
                            { text: data.auditorRegNo ? ` (Firm Reg. No. ${data.auditorRegNo})` : '' },
                            { text: `, Chartered Accountants, have been appointed as Statutory Auditors of the Company.` }
                        ], { after: 200 }),
                        BLANK(100),
                        P([{ text: "7. DIRECTORS' RESPONSIBILITY STATEMENT:", bold: true }]),
                        P('Your Directors confirm that:'),
                        P('(a) In preparation of the annual accounts, applicable accounting standards have been followed.'),
                        P('(b) Accounting policies have been selected and applied consistently.'),
                        P('(c) Judgements and estimates are reasonable and prudent.'),
                        P('(d) Applicable accounting standards have been followed.'),
                        P('(e) Internal financial controls are adequate and operating effectively.'),
                        P('(f) Systems to ensure compliance with laws are adequate and operating effectively.', { after: 200 }),
                        BLANK(100),
                        P([{ text: '8. ACKNOWLEDGEMENTS:', bold: true }]),
                        P('Your Directors wish to express their grateful appreciation for the assistance and cooperation received from the banks, government authorities, customers, and other stakeholders.', { after: 200 }),
                        BLANK(100),
                        P([{ text: `For and on behalf of the Board of Directors of ${companyName}`, bold: true }]),
                        BLANK(200),
                        P('____________________________'),
                        P('Director'),
                        P(`DIN: ___________`),
                        BLANK(100),
                        P('____________________________'),
                        P('Director'),
                        P(`DIN: ___________`),
                        BLANK(100),
                        P(`Place: ${data.state || '___________'}`),
                        P(`Date: ${formatDate(data.reportDate)}`),
                    ]
                }]
            });
        }
    },

    aoc_auditor_report: {
        id: 'aoc_auditor_report',
        category: 'aoc',
        name: "Auditor's Report",
        requiredFields: [],
        extraFields: [
            { key: 'reportDate', label: 'Date of Report', type: 'date' },
            { key: 'financialYear', label: 'Financial Year', type: 'text', placeholder: 'e.g., 2024-25' },
            { key: 'auditorName', label: 'Auditor Name / Firm', type: 'text' },
            { key: 'auditorRegNo', label: 'Firm Registration No.', type: 'text' },
            { key: 'auditorMembershipNo', label: 'Membership No.', type: 'text' },
            { key: 'auditorPlace', label: 'Place', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('INDEPENDENT AUDITOR\'S REPORT', { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        BLANK(100),
                        P([
                            { text: `To the Members of ` },
                            { text: companyName, bold: true }
                        ], { after: 200 }),
                        BLANK(100),
                        P([{ text: 'Report on the Audit of the Financial Statements', bold: true, underline: true }], { after: 200 }),
                        BLANK(100),
                        P([{ text: 'Opinion:', bold: true }]),
                        P([
                            { text: `We have audited the accompanying financial statements of ` },
                            { text: companyName, bold: true },
                            { text: ` (CIN: ${data.cin || '___________'}), which comprise the Balance Sheet as at March 31, ${data.financialYear ? data.financialYear.split('-')[1] : '___________'}, the Statement of Profit and Loss, and the Cash Flow Statement for the year then ended, and notes to the financial statements.` }
                        ], { after: 200 }),
                        BLANK(100),
                        P('In our opinion and to the best of our information and according to the explanations given to us, the aforesaid financial statements give the information required by the Companies Act, 2013 in the manner so required and give a true and fair view in conformity with the Accounting Standards prescribed under Section 133 of the Act.', { after: 200 }),
                        BLANK(100),
                        P([{ text: 'Basis for Opinion:', bold: true }]),
                        P('We conducted our audit in accordance with the Standards on Auditing (SAs) specified under Section 143(10) of the Companies Act, 2013.', { after: 200 }),
                        BLANK(100),
                        P([{ text: "Management's Responsibility for the Financial Statements:", bold: true }]),
                        P("The Company's Board of Directors is responsible for the matters stated in Section 134(5) of the Companies Act, 2013 with respect to the preparation of these financial statements.", { after: 200 }),
                        BLANK(100),
                        P([{ text: "Auditor's Responsibility:", bold: true }]),
                        P('Our responsibility is to express an opinion on these financial statements based on our audit.', { after: 200 }),
                        BLANK(300),
                        P([{ text: `For ${data.auditorName || '___________'}`, bold: true }]),
                        P('Chartered Accountants'),
                        P(`Firm Registration No.: ${data.auditorRegNo || '___________'}`),
                        BLANK(200),
                        P('____________________________'),
                        P('Partner'),
                        P(`Membership No.: ${data.auditorMembershipNo || '___________'}`),
                        P(`Place: ${data.auditorPlace || '___________'}`),
                        P(`Date: ${formatDate(data.reportDate)}`),
                    ]
                }]
            });
        }
    },

    // ══════════════════════════════════════════
    //  ORGANISATION DSC TEMPLATES
    // ══════════════════════════════════════════

    dsc_auth_letter: {
        id: 'dsc_auth_letter',
        category: 'dsc',
        name: 'DSC Authorised Letter',
        requiredFields: [],
        extraFields: [
            { key: 'dscDate', label: 'Date', type: 'date' },
            { key: 'dscHolderName', label: 'DSC Holder Name', type: 'text' },
            { key: 'dscHolderDesignation', label: 'Designation', type: 'text' },
            { key: 'dscHolderPan', label: 'DSC Holder PAN', type: 'text' },
            { key: 'dscPurpose', label: 'Purpose of DSC', type: 'text', placeholder: 'e.g., MCA Filing / GST Filing / Income Tax Filing' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.tradeName || data.fullName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('AUTHORIZATION LETTER FOR DIGITAL SIGNATURE CERTIFICATE (DSC)', { bold: true, size: 26, underline: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.dscDate) }], { after: 200 }),
                        BLANK(100),
                        P('To Whom So Ever It May Concern', { bold: true, size: 26, after: 200 }),
                        BLANK(100),
                        P([
                            { text: `This is to certify that ` },
                            { text: data.dscHolderName || '___________', bold: true },
                            { text: `, ${data.dscHolderDesignation || 'Director'} of ` },
                            { text: companyName, bold: true },
                            { text: data.dscHolderPan ? ` (PAN: ${data.dscHolderPan})` : '' },
                            { text: `, is hereby authorized to use the Digital Signature Certificate (DSC) of the organization for the purpose of ${data.dscPurpose || 'MCA Filing / GST Filing'}.` }
                        ]),
                        BLANK(100),
                        P('The said person is authorized to digitally sign all documents, forms, applications, and returns that may be required to be filed electronically with the concerned authorities.'),
                        BLANK(100),
                        P('This authorization is valid until revoked in writing by the organization.'),
                        BLANK(300),
                        P([{ text: `For ${companyName}`, bold: true }]),
                        BLANK(200),
                        P('____________________________'),
                        P('Authorized Signatory'),
                        P(`Date: ${formatDate(data.dscDate)}`),
                    ]
                }]
            });
        }
    },

    // ══════════════════════════════════════════
    //  FSSAI TEMPLATES
    // ══════════════════════════════════════════

    fssai_declaration: {
        id: 'fssai_declaration',
        category: 'fssai',
        name: 'Declaration',
        requiredFields: [],
        extraFields: [
            { key: 'declarationDate', label: 'Date', type: 'date' },
            { key: 'fssaiLicenseNo', label: 'FSSAI License/Registration No.', type: 'text' },
            { key: 'foodCategory', label: 'Food Category / Type of Business', type: 'text', placeholder: 'e.g., Manufacturing / Trading / Restaurant' },
            { key: 'declarantName', label: 'Declarant Name', type: 'text' },
            { key: 'declarantDesignation', label: 'Designation', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.tradeName || data.fullName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('DECLARATION', { bold: true, size: 28, underline: true, center: true, after: 200 }),
                        P('(For FSSAI Registration / License)', { italics: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.declarationDate) }], { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `I/We, ` },
                            { text: data.declarantName || data.fullName || '___________', bold: true },
                            { text: `, ${data.declarantDesignation || 'Proprietor/Director'} of ` },
                            { text: companyName, bold: true },
                            { text: `, do hereby declare that:` }
                        ]),
                        BLANK(100),
                        P('1. The information provided in the application for FSSAI Registration/License is true and correct to the best of my knowledge and belief.'),
                        BLANK(50),
                        P(`2. The food business operated under the name "${companyName}" is engaged in ${data.foodCategory || '___________'}.`),
                        BLANK(50),
                        P('3. The food products manufactured/sold/served by us comply with the Food Safety and Standards Act, 2006 and Rules/Regulations made thereunder.'),
                        BLANK(50),
                        P('4. We shall maintain proper records and registers as required under the Act.'),
                        BLANK(50),
                        P('5. We shall not employ any person who is suffering from any communicable disease.'),
                        BLANK(50),
                        P('6. We shall ensure cleanliness and hygiene in the food establishment at all times.'),
                        BLANK(50),
                        P(data.fssaiLicenseNo ? `7. Our FSSAI License/Registration No. is: ${data.fssaiLicenseNo}` : '7. We are applying for FSSAI License/Registration.'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${data.declarantName || data.fullName || '___________'}`, bold: true }]),
                        P(`Designation: ${data.declarantDesignation || 'Proprietor/Director'}`),
                        P(`For: ${companyName}`),
                        P(`Date: ${formatDate(data.declarationDate)}`),
                    ]
                }]
            });
        }
    },

    fssai_affidavit: {
        id: 'fssai_affidavit',
        category: 'fssai',
        name: 'Affidavit',
        requiredFields: [],
        extraFields: [
            { key: 'affidavitDate', label: 'Date', type: 'date' },
            { key: 'deponentName', label: 'Deponent Name', type: 'text' },
            { key: 'deponentFatherName', label: 'S/o, D/o, W/o', type: 'text' },
            { key: 'deponentAddress', label: 'Deponent Address', type: 'textarea' },
            { key: 'affidavitPlace', label: 'Place', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.tradeName || data.fullName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('AFFIDAVIT', { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        P('(For FSSAI Registration / License)', { italics: true, center: true, after: 300 }),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.deponentName || data.fullName || '___________', bold: true },
                            { text: data.deponentFatherName ? ` S/o / D/o / W/o ${data.deponentFatherName}` : '' },
                            { text: `, aged _____ years, residing at ${data.deponentAddress || data.address || '___________'}, do hereby solemnly affirm and declare as under:` }
                        ]),
                        BLANK(100),
                        P([
                            { text: '1. That I am the ${data.declarantDesignation || "Proprietor/Director"} of ' },
                            { text: companyName, bold: true },
                            { text: ` and am competent to make this affidavit.` }
                        ]),
                        BLANK(50),
                        P('2. That the food business establishment is in compliance with the sanitary and hygienic requirements prescribed under the Food Safety and Standards Act, 2006.'),
                        BLANK(50),
                        P('3. That I shall ensure that the food articles manufactured/stored/sold are safe and wholesome for human consumption.'),
                        BLANK(50),
                        P('4. That I have not been convicted under the Food Safety and Standards Act, 2006 or any other food law.'),
                        BLANK(50),
                        P('5. That the information furnished above is true and correct to the best of my knowledge and belief.'),
                        BLANK(200),
                        P('DEPONENT'),
                        BLANK(200),
                        P('____________________________'),
                        P([{ text: `Name: ${data.deponentName || data.fullName || '___________'}`, bold: true }]),
                        BLANK(200),
                        P(`Place: ${data.affidavitPlace || '___________'}`),
                        P(`Date: ${formatDate(data.affidavitDate)}`),
                        BLANK(200),
                        P('VERIFICATION', { bold: true }),
                        P(`I, the above-named deponent, do hereby verify that the contents of this affidavit are true and correct to the best of my knowledge and belief and nothing material has been concealed therefrom.`),
                        BLANK(100),
                        P(`Verified at ${data.affidavitPlace || '___________'} on this ${formatDate(data.affidavitDate)}.`),
                        BLANK(200),
                        P('DEPONENT'),
                    ]
                }]
            });
        }
    },

    fssai_self_declaration: {
        id: 'fssai_self_declaration',
        category: 'fssai',
        name: 'Self Declaration',
        requiredFields: [],
        extraFields: [
            { key: 'declarationDate', label: 'Date', type: 'date' },
            { key: 'declarantName', label: 'Declarant Name', type: 'text' },
            { key: 'declarantDesignation', label: 'Designation', type: 'text' },
            { key: 'premisesAddress', label: 'Premises Address', type: 'textarea', prefillAddress: true }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.tradeName || data.fullName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('SELF DECLARATION', { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        P('(Under Food Safety and Standards Act, 2006)', { italics: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.declarationDate) }], { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.declarantName || data.fullName || '___________', bold: true },
                            { text: `, ${data.declarantDesignation || 'Proprietor/Director'} of ` },
                            { text: companyName, bold: true },
                            { text: `, located at ${data.premisesAddress || data.registeredAddress || '___________'}, do hereby declare that:` }
                        ]),
                        BLANK(100),
                        P('1. The food business establishment maintains adequate sanitary and hygienic conditions.'),
                        P('2. The premises and equipment are kept clean and in good repair.'),
                        P('3. All food handlers maintain personal hygiene.'),
                        P('4. Water used in the food business is potable.'),
                        P('5. No food article that is unsafe, adulterated, or misbranded is manufactured, stored, or sold.'),
                        P('6. Records of food sources and purchases are maintained.'),
                        P('7. The food business complies with the provisions of the Food Safety and Standards Act, 2006.'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${data.declarantName || data.fullName || '___________'}`, bold: true }]),
                        P(`Designation: ${data.declarantDesignation || 'Proprietor/Director'}`),
                        P(`For: ${companyName}`),
                    ]
                }]
            });
        }
    },

    fssai_fsms: {
        id: 'fssai_fsms',
        category: 'fssai',
        name: 'FSMS Plan',
        requiredFields: [],
        extraFields: [
            { key: 'fsmsDate', label: 'Date', type: 'date' },
            { key: 'fsmsResponsiblePerson', label: 'Responsible Person Name', type: 'text' },
            { key: 'foodProducts', label: 'Food Products / Items', type: 'textarea', placeholder: 'List the food products manufactured/handled' },
            { key: 'premisesAddress', label: 'Premises Address', type: 'textarea', prefillAddress: true }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.tradeName || data.fullName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('FOOD SAFETY MANAGEMENT SYSTEM (FSMS) PLAN', { bold: true, size: 26, underline: true, center: true, after: 300 }),
                        BLANK(100),
                        P([{ text: 'Organisation: ', bold: true }, { text: companyName }], { after: 100 }),
                        P([{ text: 'Address: ', bold: true }, { text: data.premisesAddress || data.registeredAddress || '___________' }], { after: 100 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.fsmsDate) }], { after: 100 }),
                        P([{ text: 'Responsible Person: ', bold: true }, { text: data.fsmsResponsiblePerson || data.fullName || '___________' }], { after: 200 }),
                        BLANK(100),
                        P([{ text: '1. SCOPE:', bold: true }]),
                        P(`This Food Safety Management System Plan covers all food handling, processing, storage, and distribution activities carried out by ${companyName}.`, { after: 200 }),
                        P([{ text: '2. FOOD PRODUCTS:', bold: true }]),
                        P(data.foodProducts || '___________', { after: 200 }),
                        P([{ text: '3. HYGIENE AND SANITATION:', bold: true }]),
                        P('- Daily cleaning schedule for all food contact surfaces and equipment.'),
                        P('- Personal hygiene requirements for all food handlers.'),
                        P('- Pest control measures in place.', { after: 200 }),
                        P([{ text: '4. FOOD SAFETY PRACTICES:', bold: true }]),
                        P('- Temperature monitoring for storage and cooking.'),
                        P('- Cross-contamination prevention measures.'),
                        P('- Proper waste disposal procedures.', { after: 200 }),
                        P([{ text: '5. RECORD KEEPING:', bold: true }]),
                        P('- Daily temperature logs.'),
                        P('- Supplier records and purchase invoices.'),
                        P('- Cleaning schedule records.'),
                        P('- Staff training records.', { after: 200 }),
                        P([{ text: '6. TRAINING:', bold: true }]),
                        P('All food handlers receive regular training on food safety and hygiene practices.', { after: 200 }),
                        BLANK(200),
                        P([{ text: `Prepared by: ${data.fsmsResponsiblePerson || '___________'}`, bold: true }]),
                        P(`For: ${companyName}`),
                        P(`Date: ${formatDate(data.fsmsDate)}`),
                    ]
                }]
            });
        }
    },

    // ══════════════════════════════════════════
    //  MCA FORMS
    // ══════════════════════════════════════════

    mca_form03: {
        id: 'mca_form03',
        category: 'mca',
        name: 'Form 03 - LLP Agreement Information',
        requiredFields: [],
        extraFields: [
            { key: 'formDate', label: 'Date', type: 'date' },
            { key: 'agreementDate', label: 'Date of LLP Agreement', type: 'date' },
            { key: 'partnerContribution', label: 'Total Contribution (Rs.)', type: 'number' },
            { key: 'profitSharingRatio', label: 'Profit Sharing Ratio', type: 'text', placeholder: 'e.g., 50:50 / 60:40' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const llpName = data.entityName || data.proposedCompanyName || '___________';
            const directors = data.directors || [];

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('FORM 03', { bold: true, size: 28, center: true, after: 100 }),
                        P('Information with regard to Limited Liability Partnership Agreement', { bold: true, center: true, after: 200 }),
                        P('(Pursuant to Section 23 of the Limited Liability Partnership Act, 2008 and Rule 17)', { italics: true, center: true, after: 300 }),
                        BLANK(100),
                        P([{ text: 'LLP Name: ', bold: true }, { text: `${llpName} LLP` }], { after: 100 }),
                        P([{ text: 'LLPIN: ', bold: true }, { text: data.llpin || '___________' }], { after: 100 }),
                        P([{ text: 'Date of LLP Agreement: ', bold: true }, { text: formatDate(data.agreementDate) }], { after: 100 }),
                        P([{ text: 'Registered Office: ', bold: true }, { text: data.registeredAddress || '___________' }], { after: 200 }),
                        BLANK(100),
                        P([{ text: 'Details of Partners:', bold: true }], { after: 100 }),
                        ...directors.map((dir, i) => P(`${i + 1}. ${dir.name || '___________'} (DPIN: ${dir.din || '___________'})`)),
                        BLANK(100),
                        P([{ text: 'Total Contribution: ', bold: true }, { text: `Rs. ${data.partnerContribution || '___________'}/-` }], { after: 100 }),
                        P([{ text: 'Profit Sharing Ratio: ', bold: true }, { text: data.profitSharingRatio || '___________' }], { after: 200 }),
                        BLANK(100),
                        P('I/We hereby confirm that the LLP Agreement has been duly executed and the details mentioned above are true and correct.'),
                        BLANK(300),
                        P('____________________________'),
                        P('Designated Partner'),
                        P(`Date: ${formatDate(data.formDate)}`),
                    ]
                }]
            });
        }
    },

    mca_form15: {
        id: 'mca_form15',
        category: 'mca',
        name: 'Form 15 - Declaration of Compliance',
        requiredFields: [],
        extraFields: [
            { key: 'formDate', label: 'Date', type: 'date' },
            { key: 'declarantName', label: 'Declarant Name', type: 'text' },
            { key: 'declarantDesignation', label: 'Designation', type: 'text', placeholder: 'e.g., Director / Company Secretary / Advocate' },
            { key: 'declarantEnrollmentNo', label: 'Enrollment / Membership No.', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.proposedCompanyName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('FORM 15', { bold: true, size: 28, center: true, after: 100 }),
                        P('Declaration of Compliance', { bold: true, center: true, after: 200 }),
                        P('(Pursuant to Section 7(1)(b) of the Companies Act, 2013 and Rule 14 of the Companies (Incorporation) Rules, 2014)', { italics: true, center: true, after: 300 }),
                        BLANK(100),
                        P([{ text: 'Company Name: ', bold: true }, { text: companyName }], { after: 100 }),
                        P([{ text: 'CIN: ', bold: true }, { text: data.cin || '(To be allotted)' }], { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: data.declarantName || data.fullName || '___________', bold: true },
                            { text: `, ${data.declarantDesignation || 'Director'} of ` },
                            { text: companyName, bold: true },
                            { text: data.declarantEnrollmentNo ? ` (Enrollment/Membership No.: ${data.declarantEnrollmentNo})` : '' },
                            { text: `, do hereby declare and certify that:` }
                        ]),
                        BLANK(100),
                        P('1. All the requirements of the Companies Act, 2013 and the rules made thereunder in respect of the incorporation of the company and matters precedent and incidental thereto have been complied with.'),
                        BLANK(50),
                        P('2. The company is not required to obtain any approval from any sectoral regulator before incorporation.'),
                        BLANK(50),
                        P('3. The Memorandum and Articles of Association of the company have been duly executed by the subscribers.'),
                        BLANK(50),
                        P('4. All the information and particulars furnished in the application for registration are true, correct, and complete.'),
                        BLANK(50),
                        P('5. The registered office of the company is situated in the State mentioned in the application.'),
                        BLANK(300),
                        P('____________________________'),
                        P([{ text: `Name: ${data.declarantName || data.fullName || '___________'}`, bold: true }]),
                        P(`Designation: ${data.declarantDesignation || 'Director'}`),
                        P(data.declarantEnrollmentNo ? `Enrollment/Membership No.: ${data.declarantEnrollmentNo}` : ''),
                        P(`Date: ${formatDate(data.formDate)}`),
                    ]
                }]
            });
        }
    },

    mca_dir2: {
        id: 'mca_dir2',
        category: 'mca',
        name: 'DIR-2 - Consent to Act as Director',
        requiredFields: [],
        extraFields: [
            { key: 'directorName', label: 'Director Name', type: 'text' },
            { key: 'directorFatherName', label: "Father's Name", type: 'text' },
            { key: 'directorDOB', label: 'Date of Birth', type: 'date' },
            { key: 'directorNationality', label: 'Nationality', type: 'text', placeholder: 'Indian' },
            { key: 'directorAddress', label: 'Residential Address', type: 'text' },
            { key: 'directorOccupation', label: 'Occupation', type: 'text' },
            { key: 'din', label: 'DIN (Director Identification Number)', type: 'text' },
            { key: 'directorPAN', label: 'PAN of Director', type: 'text' },
            { key: 'consentDate', label: 'Date of Consent', type: 'date' },
            { key: 'appointmentDate', label: 'Date of Appointment', type: 'date' },
            { key: 'boardResolutionDate', label: 'Board Resolution Date', type: 'date' },
            { key: 'directorDesignation', label: 'Designation', type: 'text', placeholder: 'e.g., Director / Additional Director / Independent Director' },
            { key: 'directorPlace', label: 'Place', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.tradeName || data.fullName || '___________';
            const dirName = data.directorName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('FORM DIR-2', { bold: true, size: 32, center: true, after: 100 }),
                        P('Consent to Act as a Director of a Company', { bold: true, size: 26, center: true, after: 100 }),
                        P('[Pursuant to Section 152(5) of the Companies Act, 2013 and Rule 8 of the Companies (Appointment and Qualification of Directors) Rules, 2014]', { size: 20, center: true, after: 300 }),
                        P([{ text: 'To,', bold: true }], { after: 100 }),
                        P([{ text: 'The Board of Directors', bold: true }]),
                        P([{ text: companyName, bold: true }]),
                        P(data.address || '___________'),
                        BLANK(200),
                        P([{ text: 'Subject: ', bold: true }, { text: `Consent to act as ${data.directorDesignation || 'Director'} of the Company` }], { after: 200 }),
                        BLANK(100),
                        P('Dear Sir/Madam,'),
                        BLANK(100),
                        P([
                            { text: `I, ` },
                            { text: dirName, bold: true },
                            { text: `, son/daughter of ` },
                            { text: data.directorFatherName || '___________', bold: true },
                            { text: `, aged ___ years, resident of ` },
                            { text: data.directorAddress || '___________' },
                            { text: `, bearing DIN ` },
                            { text: data.din || '___________', bold: true },
                            { text: ` and PAN ` },
                            { text: data.directorPAN || data.pan || '___________', bold: true },
                            { text: `, hereby give my consent to act as ${data.directorDesignation || 'Director'} of ` },
                            { text: companyName, bold: true },
                            { text: ` with effect from ` },
                            { text: formatDate(data.appointmentDate) },
                            { text: `.` }
                        ]),
                        BLANK(100),
                        P('I hereby confirm and declare that:'),
                        BLANK(50),
                        P('1. I am not disqualified to act as a Director under Section 164 of the Companies Act, 2013.'),
                        BLANK(50),
                        P('2. I have not been convicted of any offence dealing with related party transactions under Section 188 of the Companies Act, 2013 at any time during the last preceding five years.'),
                        BLANK(50),
                        P('3. I have not been debarred from holding the office of a director by virtue of any SEBI order or any other such authority.'),
                        BLANK(50),
                        P('4. I have not been declared as a person unfit for appointment as a director by any competent court or tribunal.'),
                        BLANK(50),
                        P('5. I am not an undischarged insolvent.'),
                        BLANK(50),
                        P('6. I have not been convicted by a court for any offence involving moral turpitude and sentenced to imprisonment for not less than six months and a period of five years has not elapsed from the date of expiry of the sentence.'),
                        BLANK(50),
                        P('7. I have not been removed as a director of a company under Section 169 of the Act.'),
                        BLANK(100),
                        P('My details for the purpose of records are as follows:'),
                        BLANK(100),
                        P([{ text: 'Name: ', bold: true }, { text: dirName }]),
                        P([{ text: "Father's Name: ", bold: true }, { text: data.directorFatherName || '___________' }]),
                        P([{ text: 'Date of Birth: ', bold: true }, { text: formatDate(data.directorDOB) }]),
                        P([{ text: 'Nationality: ', bold: true }, { text: data.directorNationality || 'Indian' }]),
                        P([{ text: 'Occupation: ', bold: true }, { text: data.directorOccupation || '___________' }]),
                        P([{ text: 'PAN: ', bold: true }, { text: data.directorPAN || data.pan || '___________' }]),
                        P([{ text: 'DIN: ', bold: true }, { text: data.din || '___________' }]),
                        P([{ text: 'Residential Address: ', bold: true }, { text: data.directorAddress || '___________' }]),
                        BLANK(300),
                        P('Yours faithfully,'),
                        BLANK(200),
                        P('____________________________'),
                        P([{ text: dirName, bold: true }]),
                        P(`DIN: ${data.din || '___________'}`),
                        P(`Place: ${data.directorPlace || '___________'}`),
                        P(`Date: ${formatDate(data.consentDate)}`),
                    ]
                }]
            });
        }
    },

    // ══════════════════════════════════════════
    //  LABOUR TEMPLATES
    // ══════════════════════════════════════════

    labour_auth_letter: {
        id: 'labour_auth_letter',
        category: 'labour',
        name: 'Labour Authorization Letter',
        requiredFields: [],
        extraFields: [
            { key: 'authDate', label: 'Date', type: 'date' },
            { key: 'authPersonName', label: 'Authorized Person Name', type: 'text' },
            { key: 'authPersonDesignation', label: 'Authorized Person Designation', type: 'text' },
            { key: 'authPersonPan', label: 'Authorized Person PAN', type: 'text' },
            { key: 'authPersonAadhar', label: 'Authorized Person Aadhar', type: 'text' },
            { key: 'authPurpose', label: 'Purpose', type: 'text', placeholder: 'e.g., Shop & Establishment Registration / PF Registration / ESI Registration' },
            { key: 'authPlace', label: 'Place', type: 'text' }
        ],
        generate: (data) => {
            const { Document } = docx;
            const companyName = data.entityName || data.tradeName || data.fullName || '___________';

            return new Document({
                sections: [{
                    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
                    children: [
                        P('AUTHORIZATION LETTER', { bold: true, size: 28, underline: true, center: true, after: 300 }),
                        P([{ text: 'Date: ', bold: true }, { text: formatDate(data.authDate) }], { after: 200 }),
                        BLANK(100),
                        P('To Whom So Ever It May Concern', { bold: true, size: 26, after: 200 }),
                        BLANK(100),
                        P([
                            { text: 'Subject: ', bold: true },
                            { text: `Authorization Letter for ${data.authPurpose || 'Labour Department Registration'}` }
                        ], { after: 200 }),
                        BLANK(100),
                        P([
                            { text: `This is to certify that ` },
                            { text: data.authPersonName || '___________', bold: true },
                            { text: `, ${data.authPersonDesignation || 'Director'}` },
                            { text: `, bearing PAN ` },
                            { text: data.authPersonPan || '___________', bold: true },
                            { text: ` and Aadhar No. ` },
                            { text: data.authPersonAadhar || '___________', bold: true },
                            { text: `, is hereby authorized to represent ` },
                            { text: companyName, bold: true },
                            { text: ` before the Labour Department / authorities for the purpose of ${data.authPurpose || 'registration and compliance'}.` }
                        ]),
                        BLANK(100),
                        P('The authorized person is empowered to sign and submit all necessary documents, applications, declarations, and returns on behalf of the organization.'),
                        BLANK(100),
                        P('This authorization is valid until revoked in writing.'),
                        BLANK(300),
                        P([{ text: `For ${companyName}`, bold: true }]),
                        BLANK(200),
                        P('____________________________'),
                        P('Authorized Signatory'),
                        P(`Place: ${data.authPlace || '___________'}`),
                        P(`Date: ${formatDate(data.authDate)}`),
                    ]
                }]
            });
        }
    }
};
