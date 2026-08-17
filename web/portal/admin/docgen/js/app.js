// Main Application Controller

const App = {
    selectedClient: null,
    selectedTemplates: new Set(),
    editingClientId: null,
    currentExtraTemplate: null,
    branchCount: 0,

    // All fields that get saved to DB
    ALL_FIELDS: [
        'fullName', 'fatherName', 'dob', 'gender', 'pan', 'aadhar', 'mobile', 'email',
        'address', 'city', 'state', 'pincode',
        'tradeName', 'proposedCompanyName', 'entityName', 'entityType', 'otherEntityType', 'registrationNumber',
        'cin', 'llpin', 'gstNumber', 'entityPan', 'dateOfIncorporation',
        'registeredAddress', 'communicationAddress',
        'branchAddress1', 'branchAddress2', 'branchAddress3', 'branchAddress4',
        'authorizedCapital', 'paidUpCapital'
    ],

    // ====== INITIALIZATION ======

    async init() {
        this.setupNavigation();
        await this.loadCustomTemplates();
        await this.loadClients();
        this.renderCategoryGrid();
    },

    // Load custom templates/categories from IndexedDB and inject into TEMPLATES/TEMPLATE_CATEGORIES
    async loadCustomTemplates() {
        try {
            // Load custom categories
            const customCats = await db.customCategories.getAll();
            for (const cat of customCats) {
                if (!TEMPLATE_CATEGORIES.find(c => c.id === cat.id)) {
                    TEMPLATE_CATEGORIES.push({ id: cat.id, name: cat.name, color: cat.color, templates: [] });
                }
            }

            // Load custom templates
            const customTemplates = await db.customTemplates.getAll();
            for (const ct of customTemplates) {
                const hasRealBlocks = ct.blocks && ct.blocks.length > 0 &&
                    ct.blocks.some(b => (b.type === 'heading' || b.type === 'text') && b.content && b.content.trim().length > 0);
                const isBuiltInOverride = !!TEMPLATES[ct.id];

                if (isBuiltInOverride && !hasRealBlocks) {
                    // Don't override a working built-in with empty blocks
                    continue;
                }

                if (isBuiltInOverride) {
                    // Override built-in: keep extraFields from built-in if custom has none
                    const builtIn = TEMPLATES[ct.id];
                    TEMPLATES[ct.id] = {
                        ...builtIn,
                        name: ct.name,
                        extraFields: (ct.extraFields && ct.extraFields.length > 0) ? ct.extraFields : builtIn.extraFields,
                        isCustom: true,
                        generate: (data) => renderBlocksToDocx(ct.blocks || [], data)
                    };
                } else {
                    // Purely new custom template
                    TEMPLATES[ct.id] = {
                        id: ct.id,
                        category: ct.categoryId,
                        name: ct.name,
                        requiredFields: ct.requiredFields || [],
                        extraFields: ct.extraFields || [],
                        isCustom: true,
                        generate: (data) => renderBlocksToDocx(ct.blocks || [], data)
                    };
                    // Add to category
                    const cat = TEMPLATE_CATEGORIES.find(c => c.id === ct.categoryId);
                    if (cat && !cat.templates.includes(ct.id)) {
                        cat.templates.push(ct.id);
                    }
                }
            }
        } catch (err) {
            console.warn('Could not load custom templates:', err);
        }
    },

    // ====== NAVIGATION ======

    setupNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`page-${tab.dataset.page}`).classList.add('active');
                if (tab.dataset.page === 'generate') this.refreshGeneratePage();
                if (tab.dataset.page === 'history') this.loadHistory();
            });
        });
    },

    // ====== TOAST ======

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    },

    // ====== CLIENT LIST ======

    async loadClients() {
        const clients = await db.clients.getAll();
        this.renderClientList(clients);
    },

    renderClientList(clients) {
        const container = document.getElementById('client-list');
        if (clients.length === 0) {
            container.innerHTML = `<div class="empty-state"><h3>No clients yet</h3><p>Click "Add Client" to get started</p></div>`;
            return;
        }
        container.innerHTML = clients.map(c => {
            const name = c.entityName || c.tradeName || c.proposedCompanyName || c.fullName;
            const details = [c.entityType, c.pan ? 'PAN: ' + c.pan : '', c.mobile].filter(Boolean).join(' | ');
            return `
            <div class="client-item ${this.selectedClient?.id === c.id ? 'selected' : ''}" onclick="App.selectClient(${c.id})">
                <div class="client-info">
                    <h3>${this.escapeHtml(name)}</h3>
                    <p>${this.escapeHtml(details)}</p>
                </div>
                <div class="client-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-outline btn-sm" onclick="App.editClient(${c.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="App.deleteClient(${c.id})">Delete</button>
                    <button class="btn btn-primary btn-sm" onclick="App.selectAndGenerate(${c.id})">Generate</button>
                </div>
            </div>`;
        }).join('');
    },

    async searchClients(query) {
        if (!query.trim()) { await this.loadClients(); return; }
        const results = await db.clients.search(query);
        this.renderClientList(results);
    },

    async selectClient(id) {
        this.selectedClient = await db.clients.get(id);
        await this.loadClients();
    },

    async selectAndGenerate(id) {
        this.selectedClient = await db.clients.get(id);
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelector('[data-page="generate"]').classList.add('active');
        document.getElementById('page-generate').classList.add('active');
        this.refreshGeneratePage();
    },

    // ====== CLIENT FORM — DYNAMIC ======

    showAddClient() {
        this.editingClientId = null;
        document.getElementById('client-modal-title').textContent = 'Add New Client';
        document.getElementById('client-form').reset();
        document.getElementById('client-id').value = '';
        document.getElementById('dynamic-form').style.display = 'none';
        document.getElementById('directors-container').innerHTML = '';
        this.branchCount = 0;
        // Reset entity type selection
        document.querySelectorAll('.entity-type-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.querySelector('input[type="radio"]').checked = false;
        });
        // Hide branches
        for (let i = 1; i <= 4; i++) document.getElementById(`branch-${i}`).style.display = 'none';

        document.getElementById('client-modal').classList.add('active');
        setTimeout(() => document.querySelector('#client-modal .modal').scrollTop = 0, 50);
    },

    async editClient(id) {
        const client = await db.clients.get(id);
        if (!client) return;

        this.editingClientId = id;
        document.getElementById('client-modal-title').textContent = 'Edit Client';
        document.getElementById('client-id').value = id;

        // Set entity type
        const entityType = client.entityType || '';
        if (entityType) {
            this.selectEntityType(entityType);
        }

        // Fill all fields
        this.ALL_FIELDS.forEach(f => {
            const el = document.getElementById(`cf-${f}`);
            if (el) el.value = client[f] || '';
        });

        // Show branch addresses that have data
        this.branchCount = 0;
        for (let i = 1; i <= 4; i++) {
            if (client[`branchAddress${i}`]) {
                document.getElementById(`branch-${i}`).style.display = 'block';
                this.branchCount = i;
            }
        }

        // Fill directors
        const dirContainer = document.getElementById('directors-container');
        dirContainer.innerHTML = '';
        if (client.directors && client.directors.length > 0) {
            client.directors.forEach(dir => this.addDirectorRow(dir));
        } else if (entityType !== 'Sole Proprietor') {
            this.addDirectorRow();
        }

        document.getElementById('client-modal').classList.add('active');
        setTimeout(() => document.querySelector('#client-modal .modal').scrollTop = 0, 50);
    },

    selectEntityType(type) {
        // Check radio and highlight selected option
        document.querySelectorAll('.entity-type-option').forEach(opt => {
            const radio = opt.querySelector('input[type="radio"]');
            const isMatch = radio.value === type;
            radio.checked = isMatch;
            opt.classList.toggle('selected', isMatch);
        });
        this.onEntityTypeChange(type);
    },

    onEntityTypeChange(type) {
        const isSole = (type === 'Sole Proprietor');
        const isLLP = (type === 'LLP');
        const isPvt = (type === 'Private Limited');
        const isPartnership = (type === 'Partnership');
        const isOther = (type === 'Others');

        // Show the dynamic form
        document.getElementById('dynamic-form').style.display = 'block';

        // Entity details section: show for all (but with different fields)
        document.getElementById('section-entity').style.display = 'block';

        // Trade Name: only for Sole Proprietor
        document.getElementById('grp-tradeName').style.display = isSole ? 'block' : 'none';

        // Proposed Name & Registered Name: hide for Sole Proprietor
        document.getElementById('grp-proposedName').style.display = isSole ? 'none' : 'block';
        document.getElementById('grp-registeredName').style.display = isSole ? 'none' : 'block';

        // Show/hide CIN vs LLPIN
        document.getElementById('grp-cin').style.display = (isPvt || isOther) ? 'block' : 'none';
        document.getElementById('grp-llpin').style.display = isLLP ? 'block' : 'none';
        document.getElementById('grp-otherType').style.display = isOther ? 'block' : 'none';
        document.getElementById('grp-regNumber').style.display = (isOther || isPartnership) ? 'block' : 'none';

        // Date of incorporation, capital: hide for Sole Proprietor
        document.getElementById('grp-dateOfIncorporation').style.display = isSole ? 'none' : 'block';
        document.getElementById('grp-authorizedCapital').style.display = isSole ? 'none' : 'block';
        document.getElementById('grp-paidUpCapital').style.display = isSole ? 'none' : 'block';

        // Update section labels
        const entityLabel = isSole ? 'Business' : isLLP ? 'LLP' : isPvt ? 'Company' : isPartnership ? 'Firm' : isOther ? 'Organisation' : 'Entity';
        document.getElementById('entity-section-label').textContent = `${entityLabel} Details`;

        const personStep = 'Step 3';
        const personLabel = isSole ? 'Proprietor' : 'Primary Contact Person';
        document.getElementById('person-section-label').textContent = `${personStep} — ${personLabel} Details`;

        document.getElementById('address-section-label').textContent = 'Step 4 — Addresses';

        // Partners/Directors section
        const showPartners = !isSole;
        document.getElementById('section-partners').style.display = showPartners ? 'block' : 'none';
        if (showPartners) {
            const partnerWord = isLLP ? 'Designated Partner' : isPvt ? 'Director' : isPartnership ? 'Partner' : 'Member';
            document.getElementById('partners-section-label').textContent = `Step 5 — ${partnerWord}s`;
            document.querySelectorAll('.partner-label').forEach(el => el.textContent = partnerWord);

            // Add one empty row if none exist
            if (document.getElementById('directors-container').children.length === 0) {
                this.addDirectorRow();
            }
        }

        // Update registered name label
        document.getElementById('lbl-registeredName').textContent =
            isLLP ? 'Registered LLP Name' : isPvt ? 'Registered Company Name' : isPartnership ? 'Registered Firm Name' : 'Registered Name';
        document.getElementById('lbl-proposedName').textContent =
            isLLP ? 'Proposed LLP Name' : isPvt ? 'Proposed Company Name' : isPartnership ? 'Proposed Firm Name' : 'Proposed Name';
    },

    addBranchAddress() {
        if (this.branchCount >= 4) {
            this.showToast('Maximum 4 branch addresses allowed', 'info');
            return;
        }
        this.branchCount++;
        document.getElementById(`branch-${this.branchCount}`).style.display = 'block';
    },

    addDirectorRow(data = {}) {
        const container = document.getElementById('directors-container');
        const row = document.createElement('div');
        row.className = 'director-row';
        row.innerHTML = `
            <button type="button" class="remove-director" onclick="this.parentElement.remove()">&times;</button>
            <div class="form-grid">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" class="dir-name" value="${this.escapeHtml(data.name || '')}">
                </div>
                <div class="form-group">
                    <label>DIN / DPIN</label>
                    <input type="text" class="dir-din" value="${this.escapeHtml(data.din || '')}">
                </div>
                <div class="form-group">
                    <label>Designation</label>
                    <input type="text" class="dir-designation" value="${this.escapeHtml(data.designation || '')}" placeholder="Director / Partner">
                </div>
                <div class="form-group">
                    <label>Date of Appointment</label>
                    <input type="date" class="dir-dateOfAppointment" value="${data.dateOfAppointment || ''}">
                </div>
                <div class="form-group">
                    <label>PAN</label>
                    <input type="text" class="dir-pan" value="${this.escapeHtml(data.pan || '')}" maxlength="10" style="text-transform:uppercase;">
                </div>
                <div class="form-group">
                    <label>Aadhar</label>
                    <input type="text" class="dir-aadhar" value="${this.escapeHtml(data.aadhar || '')}" maxlength="14">
                </div>
                <div class="form-group">
                    <label>Mobile</label>
                    <input type="tel" class="dir-mobile" value="${this.escapeHtml(data.mobile || '')}" maxlength="10">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="dir-email" value="${this.escapeHtml(data.email || '')}">
                </div>
                <div class="form-group full-width">
                    <label>Address</label>
                    <input type="text" class="dir-address" value="${this.escapeHtml(data.address || '')}">
                </div>
            </div>
        `;
        container.appendChild(row);
    },

    closeClientModal() {
        document.getElementById('client-modal').classList.remove('active');
    },

    async saveClient(e) {
        e.preventDefault();

        // Get entity type from radio
        const selectedRadio = document.querySelector('input[name="entityType"]:checked');
        if (!selectedRadio) {
            this.showToast('Please select an entity type', 'error');
            return;
        }

        const clientData = { entityType: selectedRadio.value };

        // Collect all fields
        this.ALL_FIELDS.forEach(f => {
            if (f === 'entityType') return; // already set from radio
            const el = document.getElementById(`cf-${f}`);
            clientData[f] = el ? el.value.trim() : '';
        });

        // Uppercase PAN/GST
        if (clientData.pan) clientData.pan = clientData.pan.toUpperCase();
        if (clientData.entityPan) clientData.entityPan = clientData.entityPan.toUpperCase();
        if (clientData.gstNumber) clientData.gstNumber = clientData.gstNumber.toUpperCase();

        // Directors/Partners
        const dirRows = document.querySelectorAll('#directors-container .director-row');
        clientData.directors = [];
        dirRows.forEach(row => {
            const name = row.querySelector('.dir-name').value.trim();
            if (name) {
                clientData.directors.push({
                    name,
                    din: row.querySelector('.dir-din').value.trim(),
                    designation: row.querySelector('.dir-designation').value.trim() || 'Director',
                    dateOfAppointment: row.querySelector('.dir-dateOfAppointment').value,
                    pan: (row.querySelector('.dir-pan').value || '').trim().toUpperCase(),
                    aadhar: row.querySelector('.dir-aadhar').value.trim(),
                    mobile: row.querySelector('.dir-mobile').value.trim(),
                    email: row.querySelector('.dir-email').value.trim(),
                    address: row.querySelector('.dir-address').value.trim()
                });
            }
        });

        try {
            if (this.editingClientId) {
                await db.clients.update(this.editingClientId, clientData);
                if (this.selectedClient?.id === this.editingClientId) {
                    this.selectedClient = await db.clients.get(this.editingClientId);
                }
                this.showToast('Client updated successfully');
            } else {
                await db.clients.add(clientData);
                this.showToast('Client added successfully');
            }
            this.closeClientModal();
            await this.loadClients();
        } catch (err) {
            this.showToast('Error saving client: ' + err.message, 'error');
        }
    },

    async deleteClient(id) {
        if (!confirm('Are you sure you want to delete this client?')) return;
        try {
            await db.clients.delete(id);
            if (this.selectedClient?.id === id) this.selectedClient = null;
            await this.loadClients();
            this.showToast('Client deleted');
        } catch (err) {
            this.showToast('Error: ' + err.message, 'error');
        }
    },

    // ====== GENERATE DOCUMENTS ======

    refreshGeneratePage() {
        if (!this.selectedClient) {
            document.getElementById('no-client-selected').style.display = 'block';
            document.getElementById('generate-content').style.display = 'none';
            this.renderQuickClientSelect();
            return;
        }
        document.getElementById('no-client-selected').style.display = 'none';
        document.getElementById('generate-content').style.display = 'block';

        const c = this.selectedClient;
        document.getElementById('selected-client-name').textContent = c.entityName || c.tradeName || c.proposedCompanyName || c.fullName;
        document.getElementById('selected-client-details').textContent =
            [c.entityType, c.pan ? 'PAN: ' + c.pan : '', c.gstNumber ? 'GST: ' + c.gstNumber : ''].filter(Boolean).join(' | ');

        this.renderCategoryGrid();
        this.updateSelectedCount();
    },

    async renderQuickClientSelect() {
        const clients = await db.clients.getAll();
        const container = document.getElementById('quick-client-select');
        if (clients.length === 0) {
            container.innerHTML = '<p style="text-align:center; color: var(--gray-400);">No clients available. Add a client first.</p>';
            return;
        }
        container.innerHTML = `
            <div class="search-bar" style="margin-bottom: 8px;">
                <select id="quick-client-dropdown" style="flex:1; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px; font-size: 14px;">
                    <option value="">-- Select a Client --</option>
                    ${clients.map(c => `<option value="${c.id}">${this.escapeHtml(c.entityName || c.tradeName || c.proposedCompanyName || c.fullName)} ${c.pan ? '(' + c.pan + ')' : ''}</option>`).join('')}
                </select>
                <button class="btn btn-primary" onclick="App.quickSelectClient()">Select</button>
            </div>`;
    },

    async quickSelectClient() {
        const id = parseInt(document.getElementById('quick-client-dropdown').value);
        if (!id) return;
        this.selectedClient = await db.clients.get(id);
        this.refreshGeneratePage();
    },

    changeClient() {
        this.selectedClient = null;
        this.selectedTemplates.clear();
        this.refreshGeneratePage();
    },

    renderCategoryGrid() {
        const grid = document.getElementById('category-grid');
        grid.innerHTML = TEMPLATE_CATEGORIES.map(cat => {
            const templates = cat.templates.map(tId => TEMPLATES[tId]).filter(Boolean);
            return `
                <div class="category-card">
                    <div class="category-card-header" style="background: ${cat.color}">
                        ${cat.name}
                        <span style="float:right; font-size:12px; opacity:0.8;">${templates.length} formats</span>
                    </div>
                    <div class="category-card-body">
                        ${templates.map(t => `
                            <div class="template-item">
                                <label>
                                    <input type="checkbox" value="${t.id}"
                                        ${this.selectedTemplates.has(t.id) ? 'checked' : ''}
                                        ${!t.generate ? 'disabled' : ''}
                                        onchange="App.toggleTemplate('${t.id}', this.checked)">
                                    ${this.escapeHtml(t.name)}
                                </label>
                                <span class="template-actions">
                                    <button class="btn-edit-extra" title="Edit saved details" onclick="event.preventDefault(); App.editExtraFields('${t.id}')">&#9998;</button>
                                    <span class="template-status ${t.generate ? 'ready' : 'coming'}">
                                        ${t.generate ? 'Ready' : 'Coming Soon'}
                                    </span>
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }).join('');
    },

    toggleTemplate(templateId, checked) {
        if (checked) this.selectedTemplates.add(templateId);
        else this.selectedTemplates.delete(templateId);
        this.updateSelectedCount();
    },

    updateSelectedCount() {
        const count = this.selectedTemplates.size;
        document.getElementById('selected-count').textContent = count;
        document.getElementById('generate-bar').style.display = count > 0 ? 'flex' : 'none';
    },

    // ====== DOCUMENT GENERATION ======

    async generateSelected() {
        if (!this.selectedClient) { this.showToast('Please select a client first', 'error'); return; }
        if (this.selectedTemplates.size === 0) { this.showToast('Please select at least one document', 'error'); return; }

        const templateIds = Array.from(this.selectedTemplates);

        for (const tId of templateIds) {
            const missing = Generator.getMissingRequiredFields(tId, this.selectedClient);
            if (missing.length > 0) {
                this.showToast(`Missing data for "${TEMPLATES[tId].name}": ${missing.join(', ')}. Please edit client.`, 'error');
                return;
            }
        }

        for (const tId of templateIds) {
            const savedExtra = await db.extraFields.get(this.selectedClient.id, tId);
            const missingExtra = Generator.getMissingExtraFields(tId, this.selectedClient, savedExtra);
            if (missingExtra.length > 0) {
                // Show all extra fields (not just missing), pre-filled with saved values
                this.showExtraFieldsModal(tId, savedExtra);
                return;
            }
        }

        await this.generateAllReady(templateIds);
    },

    async generateAllReady(templateIds) {
        let ok = 0, fail = 0;
        for (const tId of templateIds) {
            try {
                const savedExtra = await db.extraFields.get(this.selectedClient.id, tId);
                await Generator.generateDocument(tId, this.selectedClient, savedExtra);
                ok++;
            } catch (err) {
                console.error(`Error generating ${tId}:`, err);
                fail++;
            }
        }
        if (ok > 0) this.showToast(`${ok} document(s) generated!`);
        if (fail > 0) this.showToast(`${fail} document(s) failed`, 'error');
        this.selectedTemplates.clear();
        this.renderCategoryGrid();
        this.updateSelectedCount();
    },

    // ====== EXTRA FIELDS MODAL ======

    // Edit extra fields for a template (pencil button)
    async editExtraFields(templateId) {
        if (!this.selectedClient) {
            this.showToast('Please select a client first', 'error');
            return;
        }
        const savedExtra = await db.extraFields.get(this.selectedClient.id, templateId);
        this.showExtraFieldsModal(templateId, savedExtra, true);
    },

    // Show all extra fields for a template, pre-filled with saved values
    showExtraFieldsModal(templateId, savedExtra, editOnly = false) {
        const template = TEMPLATES[templateId];
        if (!template || !template.extraFields || template.extraFields.length === 0) return;

        this.currentExtraTemplate = templateId;
        this._extraEditOnly = editOnly;
        document.getElementById('extra-modal-title').textContent = `${editOnly ? 'Edit' : 'Additional'} Details — ${template.name}`;
        document.getElementById('extra-modal-desc').textContent =
            `${editOnly ? 'Edit the details below.' : 'Fill in the required details.'} These will be saved for future use.`;

        const client = this.selectedClient || {};
        // Collect available addresses for prefill
        const addresses = [];
        if (client.registeredAddress) addresses.push({ label: 'Registered Address', value: client.registeredAddress });
        if (client.communicationAddress) addresses.push({ label: 'Communication Address', value: client.communicationAddress });
        for (let i = 1; i <= 4; i++) {
            if (client[`branchAddress${i}`]) addresses.push({ label: `Branch Address ${i}`, value: client[`branchAddress${i}`] });
        }
        if (client.address) addresses.push({ label: 'Personal Address', value: client.address });

        const form = document.getElementById('extra-fields-form');
        form.innerHTML = template.extraFields.map(field => {
            const savedValue = (savedExtra && savedExtra[field.key]) || '';

            // Address prefill dropdown for address/textarea fields
            let prefillHtml = '';
            if (field.prefillAddress && addresses.length > 0) {
                prefillHtml = `<div class="address-prefill">
                    <select onchange="App.prefillAddress(this, '${field.key}')" style="font-size:12px; padding:2px 6px; border:1px solid var(--gray-300); border-radius:4px; margin-bottom:4px; color:var(--gray-500);">
                        <option value="">Copy from client address...</option>
                        ${addresses.map((a, i) => `<option value="${i}">${this.escapeHtml(a.label)}</option>`).join('')}
                    </select>
                </div>`;
            }

            const inputHtml = field.type === 'textarea'
                ? `${prefillHtml}<textarea id="ef-${field.key}" rows="2" placeholder="${field.placeholder || ''}">${this.escapeHtml(savedValue)}</textarea>`
                : `<input type="${field.type || 'text'}" id="ef-${field.key}" value="${this.escapeHtml(savedValue)}" placeholder="${field.placeholder || ''}">`;
            return `<div class="form-group${field.type === 'textarea' ? ' full-width' : ''}"><label>${field.label}</label>${inputHtml}</div>`;
        }).join('');

        // Store addresses for prefill callback
        this._prefillAddresses = addresses;

        // Update button text
        const saveBtn = document.querySelector('#extra-fields-modal .modal-footer .btn-primary');
        saveBtn.textContent = editOnly ? 'Save Details' : 'Save & Generate';

        document.getElementById('extra-fields-modal').classList.add('active');
    },

    prefillAddress(selectEl, fieldKey) {
        const idx = selectEl.value;
        if (idx === '' || !this._prefillAddresses) return;
        const addr = this._prefillAddresses[parseInt(idx)];
        if (addr) {
            document.getElementById(`ef-${fieldKey}`).value = addr.value;
        }
        selectEl.value = '';
    },

    closeExtraFieldsModal() {
        document.getElementById('extra-fields-modal').classList.remove('active');
        this.currentExtraTemplate = null;
        this._extraEditOnly = false;
    },

    async saveExtraFields() {
        const template = TEMPLATES[this.currentExtraTemplate];
        if (!template) return;

        const data = {};
        template.extraFields.forEach(field => {
            const el = document.getElementById(`ef-${field.key}`);
            if (el) data[field.key] = el.value.trim();
        });

        await db.extraFields.save(this.selectedClient.id, this.currentExtraTemplate, data);
        this.closeExtraFieldsModal();

        // If edit-only mode, just save and done
        if (this._extraEditOnly) {
            this.showToast('Details saved successfully');
            return;
        }

        const templateIds = Array.from(this.selectedTemplates);
        const currentIndex = templateIds.indexOf(this.currentExtraTemplate);

        for (let i = currentIndex + 1; i < templateIds.length; i++) {
            const tId = templateIds[i];
            const savedExtra = await db.extraFields.get(this.selectedClient.id, tId);
            const missingExtra = Generator.getMissingExtraFields(tId, this.selectedClient, savedExtra);
            if (missingExtra.length > 0) {
                this.showExtraFieldsModal(tId, savedExtra);
                return;
            }
        }

        await this.generateAllReady(templateIds);
    },

    // ====== HISTORY ======

    async loadHistory() {
        const history = await db.history.getAll();
        const container = document.getElementById('history-content');
        if (history.length === 0) {
            container.innerHTML = `<div class="empty-state"><h3>No documents generated yet</h3><p>Generated documents will appear here</p></div>`;
            return;
        }
        container.innerHTML = `
            <table class="history-table">
                <thead><tr><th>Date</th><th>Client</th><th>Category</th><th>Document</th><th>File</th></tr></thead>
                <tbody>
                    ${history.map(h => `<tr>
                        <td>${new Date(h.generatedAt).toLocaleString('en-IN')}</td>
                        <td>${this.escapeHtml(h.clientName || '')}</td>
                        <td><span class="badge" style="background:var(--gray-100);">${this.escapeHtml((h.category || '').toUpperCase())}</span></td>
                        <td>${this.escapeHtml(h.templateName || '')}</td>
                        <td style="font-size:12px;color:var(--gray-500);">${this.escapeHtml(h.fileName || '')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    },

    // ====== UTILITIES ======

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
