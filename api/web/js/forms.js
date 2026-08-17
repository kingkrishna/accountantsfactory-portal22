// Form handling for contact forms and other forms.
// Submissions are sent DIRECTLY to nitin@accountantsfactory.com via
// FormSubmit.co (free, no-auth HTTP endpoint) — no mail client popup,
// no Outlook/Gmail redirect, fully automatic.
//
// IMPORTANT: The first time a new FormSubmit endpoint is used, FormSubmit
// will email nitin@accountantsfactory.com a one-time activation link.
// Click it once and all subsequent submissions arrive straight in the
// inbox with zero user interaction.

const RECIPIENT_EMAIL = 'nitin@accountantsfactory.com';
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + RECIPIENT_EMAIL;

function initializeForms() {
    // Contact form handler
    const contactForm = document.getElementById('contactForm');
    if (contactForm && !contactForm.hasAttribute('data-initialized')) {
        contactForm.setAttribute('data-initialized', 'true');
        contactForm.addEventListener('submit', function (event) {
            event.preventDefault();
            handleContactFormSubmit(this);
        });
    }

    // Generic form handler (for forms loaded via components)
    const genericForms = document.querySelectorAll('form.form:not([data-initialized])');
    genericForms.forEach(form => {
        if (!form.id || form.id !== 'contactForm') {
            form.setAttribute('data-initialized', 'true');
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                handleGenericFormSubmit(this);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    initializeForms();
    // Re-run after components inject their form-container
    setTimeout(initializeForms, 500);
    setTimeout(initializeForms, 1000);
});

/**
 * POST the enquiry to FormSubmit.co. Returns a Promise.
 * Also fires-and-forgets the internal backend /public/contact for
 * audit-trail purposes (non-blocking).
 */
function sendEnquiry(payload) {
    // 1. Best-effort backend log (non-blocking).
    try {
        const configUrl = (window.config && window.config.API_URL) ? window.config.API_URL : '';
        if (configUrl) {
            fetch(`${configUrl}/public/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }).catch(() => {});
        }
    } catch (_) { /* ignore */ }

    // 2. Actually deliver the email via FormSubmit.co.
    const formSubmitBody = {
        name: payload.name,
        email: payload.email,
        mobile: payload.mobile,
        service: payload.service,
        message: payload.message || '',
        ticketId: payload.ticketId || '',
        source: payload.source || 'website',
        _subject: `New Enquiry — ${payload.service || 'Accountants Factory'}`,
        _template: 'table',
        _captcha: 'false',
    };

    return fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(formSubmitBody),
    }).then(r => r.json());
}

function setSubmitButtonState(form, busy, originalText) {
    const btn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!btn) return;
    if (busy) {
        btn.dataset._origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    } else {
        btn.disabled = false;
        if (btn.dataset._origText) btn.innerHTML = btn.dataset._origText;
    }
}

function handleContactFormSubmit(form) {
    // Tolerant field lookup: different pages use #contact vs #mobile, etc.
    const getVal = (...ids) => {
        for (const id of ids) {
            const el = form.querySelector('#' + id) || document.getElementById(id);
            if (el) return (el.value || '').trim();
        }
        return '';
    };
    const name = getVal('name', 'form-name');
    const contact = getVal('contact', 'mobile', 'form-mobile');
    const email = getVal('email', 'form-email');
    const service = getVal('service', 'form-service');
    const message = getVal('message', 'form-message');
    const privacyEl = form.querySelector('input[type="checkbox"]');

    if (!name || !contact || !email || !service) {
        alert('Please fill in all required fields.');
        return;
    }
    if (privacyEl && !privacyEl.checked) {
        alert('Please accept the Privacy Policy to continue.');
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(10000 + Math.random() * 90000);
    const ticketId = `TICKET-${timestamp}-${randomPart}`;

    setSubmitButtonState(form, true);

    sendEnquiry({
        name, email, mobile: contact, service, message,
        source: 'contact_form', ticketId,
    }).then(() => {
        const safeName = name.replace(/[<>]/g, '');
        alert(`Thank you ${safeName}! Your enquiry has been sent to our team.\nTicket ID: ${ticketId}\nWe'll get back to you shortly.`);
        form.reset();
    }).catch(err => {
        console.error('Enquiry send failed:', err);
        alert('Sorry, we couldn\'t send your enquiry right now. Please call +91 91766 71206 or email nitin@accountantsfactory.com directly.');
    }).finally(() => {
        setSubmitButtonState(form, false);
    });
}

function handleGenericFormSubmit(form) {
    const nameInput = form.querySelector('#form-name, input[name="name"]');
    const emailInput = form.querySelector('#form-email, input[name="email"]');
    const mobileInput = form.querySelector('#form-mobile, input[name="mobile"]');
    const serviceSelect = form.querySelector('#form-service, select');
    const messageTextarea = form.querySelector('#form-message, textarea');
    const privacyCheckbox = form.querySelector('#form-privacy, input[type="checkbox"]');

    if (!nameInput || !emailInput || !mobileInput || !serviceSelect) {
        alert('Please fill in all required fields.');
        return;
    }
    if (privacyCheckbox && !privacyCheckbox.checked) {
        alert('Please accept the Privacy Policy to continue.');
        return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const mobile = mobileInput.value.trim();
    const service = serviceSelect.value;
    const message = messageTextarea ? messageTextarea.value.trim() : '';

    if (!name || !email || !mobile || !service) {
        alert('Please fill in all required fields.');
        return;
    }

    setSubmitButtonState(form, true);

    sendEnquiry({
        name, email, mobile, service, message, source: 'page_generic_form',
    }).then(() => {
        const safeName = name.replace(/[<>]/g, '');
        alert(`Thank you ${safeName}! Your enquiry has been sent to our team. We'll get back to you shortly.`);
        form.reset();
        if (privacyCheckbox) privacyCheckbox.checked = false;
    }).catch(err => {
        console.error('Enquiry send failed:', err);
        alert('Sorry, we couldn\'t send your enquiry right now. Please call +91 91766 71206 or email nitin@accountantsfactory.com directly.');
    }).finally(() => {
        setSubmitButtonState(form, false);
    });
}
