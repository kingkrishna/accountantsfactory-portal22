// Form handling for contact forms and other forms
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function () {
    initializeForms();

    // Re-initialize after components load (with delay for dynamic content)
    setTimeout(initializeForms, 500);
    setTimeout(initializeForms, 1000);
});

function handleContactFormSubmit(form) {
    const name = document.getElementById('name').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const email = document.getElementById('email').value.trim();
    const service = document.getElementById('service').value;
    const message = document.getElementById('message').value.trim();

    if (!name || !contact || !email || !service) {
        alert('Please fill in all required fields.');
        return;
    }

    // Generate ticket ID
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(10000 + Math.random() * 90000);
    const ticketId = `TICKET-${timestamp}-${randomPart}`;

    // Form payload for backend
    const payload = {
        name,
        email,
        mobile: contact,
        service,
        message,
        source: 'contact_form',
        ticketId
    };

    // Determine API URL based on config if available, otherwise fallback
    const configUrl = (window.config && window.config.API_URL) ? window.config.API_URL : 'http://localhost:3000/api';

    // Submit to backend
    fetch(`${configUrl}/public/contact`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).catch(err => console.error('Error saving contact form:', err));

    // Create WhatsApp message
    const whatsappMessage = `Hello, I would like to inquire about the following:\nName: ${name}\nContact: ${contact}\nEmail: ${email}\nService: ${service}\nMessage: ${message || 'N/A'}`;
    const whatsappURL = `https://wa.me/+919885988540?text=${encodeURIComponent(whatsappMessage)}`;

    // Open WhatsApp
    window.open(whatsappURL, '_blank');

    // Show success message (sanitize name to prevent XSS in alert)
    const safeName = name.replace(/[<>]/g, '');
    alert(`Thank you ${safeName}! We've opened WhatsApp for you to send your inquiry.\nYour Ticket ID: ${ticketId}\nPlease send the message to complete your request.`);

    // Reset form
    form.reset();
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

    // Form payload for backend
    const payload = {
        name,
        email,
        mobile,
        service,
        message,
        source: 'page_generic_form'
    };

    // Determine API URL based on config if available, otherwise fallback
    const configUrl = (window.config && window.config.API_URL) ? window.config.API_URL : 'http://localhost:3000/api';

    // Submit to backend
    fetch(`${configUrl}/public/contact`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }).catch(err => console.error('Error saving generic form:', err));

    // Create WhatsApp message
    const whatsappMessage = `Hello, I would like to inquire about the following:\nName: ${name}\nEmail: ${email}\nMobile: ${mobile}\nService: ${service}\nMessage: ${message || 'N/A'}`;
    const whatsappURL = `https://wa.me/+919885988540?text=${encodeURIComponent(whatsappMessage)}`;

    // Open WhatsApp
    window.open(whatsappURL, '_blank');

    // Show success message (sanitize name to prevent XSS in alert)
    const safeName = name.replace(/[<>]/g, '');
    alert(`Thank you ${safeName}! We've opened WhatsApp for you to send your inquiry.\nPlease send the message to complete your request.`);

    // Reset form
    form.reset();
    if (privacyCheckbox) {
        privacyCheckbox.checked = false;
    }
}

