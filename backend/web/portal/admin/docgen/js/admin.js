// Admin Dashboard Controller
// Handles category/template CRUD, block editor, preview.
//
// AUTHENTICATION: This page relies on the portal's JWT + admin-role gate.
// Authorization is enforced server-side: the static directory is served behind
// requireAuth + requireAdmin middleware in api/src/app.js. Visiting this page
// without a valid portal session redirects to /portal/login.html.

const Admin = {
    currentCategory: null,
    editingTemplateId: null,
    blocks: [],
    extraFields: [],

    // ===== AUTH =====
    // Verify the user has a valid portal JWT with admin role. If not, redirect
    // to the portal login page. The server-side static gate is the actual
    // authorization control; this is just a UX nicety.
    checkAuth() {
        try {
            const token = (window.clientAuth && window.clientAuth.getToken && window.clientAuth.getToken())
                || localStorage.getItem('authToken') || '';
            const user = (window.clientAuth && window.clientAuth.getUser && window.clientAuth.getUser()) || null;
            if (!token || !user || user.role !== 'admin') {
                window.location.replace('../../login.html');
                return false;
            }
            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.style.display = 'none';
            return true;
        } catch (e) {
            window.location.replace('../../login.html');
            return false;
        }
    },

    login() { this.checkAuth(); },

    logout() {
        if (window.clientAuth && typeof window.clientAuth.logout === 'function') {
            window.clientAuth.logout();
        } else {
            try { localStorage.removeItem('authToken'); } catch (_) {}
            window.location.replace('../../login.html');
        }
    },

    // ===== INIT =====
    async init() {
        if (!this.checkAuth()) return;
        await db._ready;
        await this.renderCategories();
    },

    // ===== CATEGORIES =====
    async getAllCategories() {
        // Merge built-in + custom categories
        const custom = await db.customCategories.getAll();
        const all = [...TEMPLATE_CATEGORIES];
        for (const c of custom) {
            if (!all.find(x => x.id === c.id)) {
                all.push({ id: c.id, name: c.name, color: c.color, templates: [] });
            }
        }
        return all;
    },

    async renderCategories() {
        const cats = await this.getAllCategories();
        const customTemplates = await db.customTemplates.getAll();
        const list = document.getElementById('category-list');
        let html = '';

        for (const cat of cats) {
            // Count: built-in templates + custom templates in this category
            const builtInCount = (cat.templates || []).length;
            const customCount = customTemplates.filter(t => t.categoryId === cat.id).length;
            const total = builtInCount + customCount;
            const isActive = this.currentCategory === cat.id;

            html += `<div class="sidebar-item ${isActive ? 'active' : ''}" onclick="Admin.selectCategory('${cat.id}')">
                <span><span class="cat-dot" style="background:${cat.color || '#666'}"></span>${cat.name}</span>
                <span class="count">${total}</span>
            </div>`;
        }
        list.innerHTML = html;

        // If a category is selected, refresh its templates
        if (this.currentCategory) {
            await this.renderTemplates(this.currentCategory);
        }
    },

    async selectCategory(id) {
        this.currentCategory = id;
        await this.renderCategories();
    },

    async renderTemplates(categoryId) {
        const cats = await this.getAllCategories();
        const cat = cats.find(c => c.id === categoryId);
        if (!cat) return;

        const customTemplates = await db.customTemplates.getAll();
        const main = document.getElementById('main-area');
        let html = `<h2>${cat.name}</h2><div class="template-grid">`;

        // Built-in templates (check if a custom override exists)
        const builtInIds = cat.templates || [];
        for (const tplId of builtInIds) {
            const tpl = TEMPLATES[tplId];
            if (!tpl) continue;
            const hasOverride = customTemplates.find(t => t.id === tplId);
            if (hasOverride) {
                // Show as editable custom override
                html += `<div class="tpl-card">
                    <h3>${hasOverride.name}</h3>
                    <p><span class="badge badge-custom">Edited</span> ${hasOverride.blocks ? hasOverride.blocks.length + ' blocks' : ''}</p>
                    <div class="tpl-actions">
                        <button class="btn btn-outline btn-sm" onclick="Admin.openEditor('${tplId}')">Edit</button>
                        <button class="btn btn-outline btn-sm" onclick="Admin.cloneTemplate('${tplId}', true)">Clone</button>
                        <button class="btn btn-outline btn-sm" onclick="Admin.restoreBuiltIn('${tplId}')">Restore Original</button>
                    </div>
                </div>`;
            } else {
                html += `<div class="tpl-card">
                    <h3>${tpl.name}</h3>
                    <p><span class="badge badge-builtin">Built-in</span></p>
                    <div class="tpl-actions">
                        <button class="btn btn-outline btn-sm" onclick="Admin.editBuiltIn('${tplId}')">Edit</button>
                        <button class="btn btn-outline btn-sm" onclick="Admin.cloneTemplate('${tplId}', false)">Clone</button>
                    </div>
                </div>`;
            }
        }

        // Custom templates in this category (exclude overrides already shown above)
        const customs = customTemplates.filter(t => t.categoryId === categoryId && !builtInIds.includes(t.id));
        for (const ct of customs) {
            html += `<div class="tpl-card">
                <h3>${ct.name}</h3>
                <p><span class="badge badge-custom">Custom</span> ${ct.blocks ? ct.blocks.length + ' blocks' : ''}</p>
                <div class="tpl-actions">
                    <button class="btn btn-outline btn-sm" onclick="Admin.openEditor('${ct.id}')">Edit</button>
                    <button class="btn btn-outline btn-sm" onclick="Admin.cloneTemplate('${ct.id}', true)">Clone</button>
                    <button class="btn btn-danger btn-sm" onclick="Admin.deleteTemplate('${ct.id}')">Delete</button>
                </div>
            </div>`;
        }

        // Add new card
        html += `<div class="tpl-card add-card" onclick="Admin.openEditor(null, '${categoryId}')">+ New Template</div>`;
        html += '</div>';
        main.innerHTML = html;
    },

    // ===== TEMPLATE EDITOR =====
    async openEditor(templateId, defaultCategoryId) {
        this.editingTemplateId = templateId;
        this.blocks = [];
        this.extraFields = [];

        // Populate category dropdown
        const cats = await this.getAllCategories();
        const catSelect = document.getElementById('ed-category');
        catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        if (templateId) {
            // Load existing custom template
            const tpl = await db.customTemplates.get(templateId);
            if (!tpl) { this.showToast('Template not found', 'error'); return; }
            document.getElementById('ed-name').value = tpl.name;
            catSelect.value = tpl.categoryId;
            this.blocks = JSON.parse(JSON.stringify(tpl.blocks || []));
            this.extraFields = JSON.parse(JSON.stringify(tpl.extraFields || []));
            document.getElementById('editor-title').textContent = 'Edit Template';
        } else {
            document.getElementById('ed-name').value = '';
            catSelect.value = defaultCategoryId || cats[0]?.id || '';
            this.blocks = [];
            this.extraFields = [];
            document.getElementById('editor-title').textContent = 'New Template';
        }

        this.renderBlockEditor();
        this.renderExtraFieldsEditor();
        document.getElementById('editor-overlay').classList.add('active');
    },

    closeEditor() {
        document.getElementById('editor-overlay').classList.remove('active');
        this.editingTemplateId = null;
        this._saveAsId = null;
    },

    // ===== BLOCKS =====
    addBlock(type) {
        const block = { type };
        if (type === 'heading') {
            block.content = '';
            block.style = { bold: true, center: true, size: 28 };
        } else if (type === 'text') {
            block.content = '';
            block.style = { bold: false, size: 24 };
        } else if (type === 'blank') {
            block.spacing = 200;
        } else if (type === 'signatureBlock') {
            block.lines = ['____________________________', '{{fullName}}', 'Signature'];
            block.style = {};
        }
        this.blocks.push(block);
        this.renderBlockEditor();
    },

    removeBlock(index) {
        this.blocks.splice(index, 1);
        this.renderBlockEditor();
    },

    moveBlock(from, direction) {
        const to = from + direction;
        if (to < 0 || to >= this.blocks.length) return;
        const temp = this.blocks[from];
        this.blocks[from] = this.blocks[to];
        this.blocks[to] = temp;
        this.renderBlockEditor();
    },

    updateBlockContent(index) {
        const ta = document.getElementById('block-content-' + index);
        if (ta) this.blocks[index].content = ta.value;
    },

    updateBlockStyle(index, prop, value) {
        if (!this.blocks[index].style) this.blocks[index].style = {};
        this.blocks[index].style[prop] = value;
        this.renderBlockEditor();
    },

    updateBlockSpacing(index, value) {
        this.blocks[index].spacing = parseInt(value) || 200;
    },

    updateSignatureLine(blockIndex, lineIndex) {
        const input = document.getElementById(`sig-${blockIndex}-${lineIndex}`);
        if (input) this.blocks[blockIndex].lines[lineIndex] = input.value;
    },

    addSignatureLine(blockIndex) {
        if (!this.blocks[blockIndex].lines) this.blocks[blockIndex].lines = [];
        this.blocks[blockIndex].lines.push('');
        this.renderBlockEditor();
    },

    removeSignatureLine(blockIndex, lineIndex) {
        this.blocks[blockIndex].lines.splice(lineIndex, 1);
        this.renderBlockEditor();
    },

    renderBlockEditor() {
        // Save current textarea values before re-rendering
        this.blocks.forEach((block, i) => {
            if (block.type === 'heading' || block.type === 'text') {
                const ta = document.getElementById('block-content-' + i);
                if (ta) block.content = ta.value;
            }
            if (block.type === 'signatureBlock' && block.lines) {
                block.lines.forEach((_, li) => {
                    const inp = document.getElementById(`sig-${i}-${li}`);
                    if (inp) block.lines[li] = inp.value;
                });
            }
        });

        const container = document.getElementById('ed-blocks');
        if (!this.blocks.length) {
            container.innerHTML = '<p style="color:var(--gray-400); font-size:13px; padding:12px;">No blocks yet. Add blocks using the buttons below.</p>';
            return;
        }

        let html = '';
        this.blocks.forEach((block, i) => {
            const s = block.style || {};
            const typeLabel = { heading: 'Heading', text: 'Text', blank: 'Blank Space', signatureBlock: 'Signature Block' }[block.type] || block.type;

            html += `<div class="block-item" draggable="true" data-index="${i}">
                <div class="block-header">
                    <span class="drag-handle" title="Drag to reorder">&#9776;</span>
                    <strong>${typeLabel}</strong>
                    <div class="block-actions">
                        <button class="btn btn-outline btn-sm" onclick="Admin.moveBlock(${i}, -1)" ${i === 0 ? 'disabled' : ''} title="Move up">&#9650;</button>
                        <button class="btn btn-outline btn-sm" onclick="Admin.moveBlock(${i}, 1)" ${i === this.blocks.length - 1 ? 'disabled' : ''} title="Move down">&#9660;</button>
                        <button class="btn btn-danger btn-sm" onclick="Admin.removeBlock(${i})" title="Remove">&#10005;</button>
                    </div>
                </div>
                <div class="block-body">`;

            if (block.type === 'heading' || block.type === 'text') {
                html += `<textarea id="block-content-${i}" rows="${block.type === 'heading' ? 2 : 4}" placeholder="Enter text... Use {{placeholder}} for dynamic values" onblur="Admin.updateBlockContent(${i})">${this._esc(block.content || '')}</textarea>
                    <div class="style-bar">
                        <button title="Bold" class="${s.bold ? 'active' : ''}" onclick="Admin.updateBlockStyle(${i}, 'bold', ${!s.bold})"><b>B</b></button>
                        <button title="Italic" class="${s.italics ? 'active' : ''}" onclick="Admin.updateBlockStyle(${i}, 'italics', ${!s.italics})"><i>I</i></button>
                        <button title="Underline" class="${s.underline ? 'active' : ''}" onclick="Admin.updateBlockStyle(${i}, 'underline', ${!s.underline})"><u>U</u></button>
                        <button title="Center" class="${s.center ? 'active' : ''}" onclick="Admin.updateBlockStyle(${i}, 'center', ${!s.center})">C</button>
                        <label>Size:</label>
                        <select onchange="Admin.updateBlockStyle(${i}, 'size', parseInt(this.value))">
                            <option value="20" ${s.size === 20 ? 'selected' : ''}>10pt</option>
                            <option value="22" ${s.size === 22 ? 'selected' : ''}>11pt</option>
                            <option value="24" ${(s.size || 24) === 24 ? 'selected' : ''}>12pt</option>
                            <option value="28" ${s.size === 28 ? 'selected' : ''}>14pt</option>
                            <option value="32" ${s.size === 32 ? 'selected' : ''}>16pt</option>
                            <option value="36" ${s.size === 36 ? 'selected' : ''}>18pt</option>
                            <option value="48" ${s.size === 48 ? 'selected' : ''}>24pt</option>
                        </select>
                    </div>`;
            } else if (block.type === 'blank') {
                html += `<label style="font-size:12px; color:var(--gray-500);">Spacing (twips):</label>
                    <input type="number" class="spacing-input" value="${block.spacing || 200}" onchange="Admin.updateBlockSpacing(${i}, this.value)">`;
            } else if (block.type === 'signatureBlock') {
                html += '<div class="sig-lines">';
                (block.lines || []).forEach((line, li) => {
                    html += `<div class="sig-line-row">
                        <input id="sig-${i}-${li}" value="${this._esc(line)}" placeholder="Signature line text" onblur="Admin.updateSignatureLine(${i}, ${li})">
                        <button class="ef-remove" onclick="Admin.removeSignatureLine(${i}, ${li})">&#10005;</button>
                    </div>`;
                });
                html += `</div>
                    <button class="btn btn-outline btn-sm" style="margin-top:4px;" onclick="Admin.addSignatureLine(${i})">+ Line</button>`;
            }

            html += '</div></div>';
        });

        container.innerHTML = html;
    },

    // ===== EXTRA FIELDS EDITOR =====
    addExtraField() {
        this.extraFields.push({ key: '', label: '', type: 'text', prefillAddress: false });
        this.renderExtraFieldsEditor();
    },

    removeExtraField(index) {
        this.extraFields.splice(index, 1);
        this.renderExtraFieldsEditor();
    },

    syncExtraFields() {
        const container = document.getElementById('ed-extra-fields');
        const rows = container.querySelectorAll('.ef-row');
        rows.forEach((row, i) => {
            if (this.extraFields[i]) {
                this.extraFields[i].key = row.querySelector('.ef-key').value;
                this.extraFields[i].label = row.querySelector('.ef-label').value;
                this.extraFields[i].type = row.querySelector('.ef-type').value;
                const cb = row.querySelector('.ef-prefill');
                if (cb) this.extraFields[i].prefillAddress = cb.checked;
            }
        });
    },

    renderExtraFieldsEditor() {
        this.syncExtraFields();
        const container = document.getElementById('ed-extra-fields');
        if (!this.extraFields.length) {
            container.innerHTML = '<p style="color:var(--gray-400); font-size:12px;">No extra fields. These appear as a popup when generating documents.</p>';
            return;
        }
        let html = '';
        this.extraFields.forEach((ef, i) => {
            html += `<div class="ef-row">
                <input class="ef-key" value="${this._esc(ef.key)}" placeholder="key">
                <input class="ef-label" value="${this._esc(ef.label)}" placeholder="Label">
                <select class="ef-type">
                    <option value="text" ${ef.type === 'text' ? 'selected' : ''}>Text</option>
                    <option value="date" ${ef.type === 'date' ? 'selected' : ''}>Date</option>
                    <option value="number" ${ef.type === 'number' ? 'selected' : ''}>Number</option>
                    <option value="textarea" ${ef.type === 'textarea' ? 'selected' : ''}>Textarea</option>
                </select>
                <input type="checkbox" class="ef-prefill" title="Address prefill" ${ef.prefillAddress ? 'checked' : ''}>
                <button class="ef-remove" onclick="Admin.removeExtraField(${i})">&#10005;</button>
            </div>`;
        });
        container.innerHTML = html;
    },

    // ===== SAVE =====
    async saveTemplate() {
        // Sync all current values
        this.syncExtraFields();
        this.blocks.forEach((block, i) => {
            if (block.type === 'heading' || block.type === 'text') {
                const ta = document.getElementById('block-content-' + i);
                if (ta) block.content = ta.value;
            }
            if (block.type === 'signatureBlock' && block.lines) {
                block.lines.forEach((_, li) => {
                    const inp = document.getElementById(`sig-${i}-${li}`);
                    if (inp) block.lines[li] = inp.value;
                });
            }
        });

        const name = document.getElementById('ed-name').value.trim();
        if (!name) { this.showToast('Template name is required', 'error'); return; }

        const categoryId = document.getElementById('ed-category').value;
        // _saveAsId is set when editing a built-in template (override with same ID)
        const id = this.editingTemplateId || this._saveAsId || ('custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now());

        const template = {
            id,
            name,
            categoryId,
            blocks: JSON.parse(JSON.stringify(this.blocks)),
            extraFields: JSON.parse(JSON.stringify(this.extraFields)),
            requiredFields: []
        };

        try {
            if (this.editingTemplateId) {
                await db.customTemplates.update(id, template);
            } else if (this._saveAsId) {
                // Overriding a built-in — check if override already exists
                const existing = await db.customTemplates.get(this._saveAsId);
                if (existing) {
                    await db.customTemplates.update(id, template);
                } else {
                    await db.customTemplates.add(template);
                }
            } else {
                await db.customTemplates.add(template);
            }
            this._saveAsId = null;
            this.showToast('Template saved successfully!', 'success');
            this.closeEditor();
            await this.renderCategories();
        } catch (err) {
            console.error(err);
            this.showToast('Error saving template: ' + err.message, 'error');
        }
    },

    // ===== DELETE =====
    async deleteTemplate(id) {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await db.customTemplates.delete(id);
            this.showToast('Template deleted', 'success');
            await this.renderCategories();
        } catch (err) {
            this.showToast('Error deleting: ' + err.message, 'error');
        }
    },

    // ===== EDIT BUILT-IN =====
    async editBuiltIn(templateId) {
        const tpl = TEMPLATES[templateId];
        if (!tpl) { this.showToast('Template not found', 'error'); return; }

        // Check if a custom override already exists in IndexedDB
        const existingOverride = await db.customTemplates.get(templateId);

        // Use the same ID so it overrides the built-in in the main app
        this.editingTemplateId = existingOverride ? templateId : null;
        this._saveAsId = existingOverride ? null : templateId;
        this.extraFields = JSON.parse(JSON.stringify(tpl.extraFields || []));

        // Load blocks: from existing override if available, else from BUILTIN_BLOCKS
        if (existingOverride && existingOverride.blocks && existingOverride.blocks.length > 0) {
            this.blocks = JSON.parse(JSON.stringify(existingOverride.blocks));
        } else if (typeof BUILTIN_BLOCKS !== 'undefined' && BUILTIN_BLOCKS[templateId]) {
            this.blocks = JSON.parse(JSON.stringify(BUILTIN_BLOCKS[templateId]));
        } else {
            // Fallback: basic starter blocks
            this.blocks = [
                { type: 'heading', content: tpl.name, style: { bold: true, center: true, size: 28 } },
                { type: 'blank', spacing: 200 },
                { type: 'text', content: 'Edit this template content here. Use {{placeholders}} for dynamic values.', style: { size: 24 } },
                { type: 'blank', spacing: 200 },
                { type: 'signatureBlock', lines: ['____________________________', '{{fullName}}', 'Signature'], style: {} }
            ];
        }

        const cats = await this.getAllCategories();
        const catSelect = document.getElementById('ed-category');
        catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        catSelect.value = tpl.category || '';

        document.getElementById('ed-name').value = tpl.name;
        document.getElementById('editor-title').textContent = 'Edit Template — ' + tpl.name;

        this.renderBlockEditor();
        this.renderExtraFieldsEditor();
        document.getElementById('editor-overlay').classList.add('active');
    },

    // ===== RESTORE BUILT-IN =====
    async restoreBuiltIn(templateId) {
        if (!confirm('Restore this template to its original built-in version? Your edits will be removed.')) return;
        try {
            await db.customTemplates.delete(templateId);
            this._saveAsId = null;
            this.showToast('Template restored to original', 'success');
            await this.renderCategories();
        } catch (err) {
            this.showToast('Error restoring: ' + err.message, 'error');
        }
    },

    // ===== CLONE TEMPLATE =====
    async cloneTemplate(templateId, isCustom) {
        let blocks, extraFields, name, categoryId;

        if (isCustom) {
            // Clone from IndexedDB custom template
            const ct = await db.customTemplates.get(templateId);
            if (ct) {
                blocks = JSON.parse(JSON.stringify(ct.blocks || []));
                extraFields = JSON.parse(JSON.stringify(ct.extraFields || []));
                name = ct.name;
                categoryId = ct.categoryId;
            }
        }

        if (!blocks) {
            // Clone from built-in template
            const tpl = TEMPLATES[templateId];
            if (!tpl) { this.showToast('Template not found', 'error'); return; }
            name = tpl.name;
            categoryId = tpl.category;
            extraFields = JSON.parse(JSON.stringify(tpl.extraFields || []));
            // Get blocks from BUILTIN_BLOCKS
            if (typeof BUILTIN_BLOCKS !== 'undefined' && BUILTIN_BLOCKS[templateId]) {
                blocks = JSON.parse(JSON.stringify(BUILTIN_BLOCKS[templateId]));
            } else {
                blocks = [
                    { type: 'heading', content: name, style: { bold: true, center: true, size: 28 } },
                    { type: 'blank', spacing: 200 },
                    { type: 'text', content: 'Cloned template. Edit the content here.', style: { size: 24 } }
                ];
            }
        }

        // Open editor as a new template (no editingTemplateId)
        this.editingTemplateId = null;
        this._saveAsId = null;
        this.blocks = blocks;
        this.extraFields = extraFields;

        const cats = await this.getAllCategories();
        const catSelect = document.getElementById('ed-category');
        catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        catSelect.value = categoryId || cats[0]?.id || '';

        document.getElementById('ed-name').value = name + ' (Copy)';
        document.getElementById('editor-title').textContent = 'Clone Template';

        this.renderBlockEditor();
        this.renderExtraFieldsEditor();
        document.getElementById('editor-overlay').classList.add('active');
    },

    // ===== PREVIEW =====
    previewTemplate() {
        // Sync blocks
        this.blocks.forEach((block, i) => {
            if (block.type === 'heading' || block.type === 'text') {
                const ta = document.getElementById('block-content-' + i);
                if (ta) block.content = ta.value;
            }
            if (block.type === 'signatureBlock' && block.lines) {
                block.lines.forEach((_, li) => {
                    const inp = document.getElementById(`sig-${i}-${li}`);
                    if (inp) block.lines[li] = inp.value;
                });
            }
        });

        const sampleData = {
            fullName: 'John Doe', fatherName: 'Richard Doe', pan: 'ABCDE1234F',
            aadhar: '1234 5678 9012', mobile: '9876543210', email: 'john@example.com',
            entityName: 'ABC Pvt Ltd', entityType: 'Private Limited', tradeName: 'ABC Enterprises',
            gstNumber: '07ABCDE1234F1Z5', entityPan: 'ABCDE1234F', cin: 'U12345MH2024PTC123456',
            registeredAddress: '123, Main Street, Delhi - 110001', communicationAddress: '456, Park Avenue, Mumbai - 400001',
            address: '123, Main Street, Delhi', city: 'Delhi', state: 'Delhi', pincode: '110001',
            authorizedCapital: '1000000', paidUpCapital: '100000',
            directors: [{ name: 'John Doe', din: '12345678' }, { name: 'Jane Doe', din: '87654321' }],
            dateOfIncorporation: '2024-01-15'
        };

        // Add extra field sample values
        this.extraFields.forEach(ef => {
            if (ef.key && !sampleData[ef.key]) {
                sampleData[ef.key] = ef.type === 'date' ? '2024-06-15' : (ef.type === 'number' ? '50000' : '[' + (ef.label || ef.key) + ']');
            }
        });

        const html = renderBlocksToHTML(this.blocks, sampleData);
        document.getElementById('preview-content').innerHTML = html || '<p style="color:var(--gray-400);">No content to preview.</p>';
        document.getElementById('preview-overlay').classList.add('active');
    },

    // ===== NEW CATEGORY =====
    showNewCategoryModal() {
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-color').value = '#8e44ad';
        document.getElementById('cat-modal').classList.add('active');
    },

    closeNewCategoryModal() {
        document.getElementById('cat-modal').classList.remove('active');
    },

    async saveNewCategory() {
        const name = document.getElementById('cat-name').value.trim();
        if (!name) { this.showToast('Category name is required', 'error'); return; }

        const id = 'cat_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
        const color = document.getElementById('cat-color').value;

        try {
            await db.customCategories.add({ id, name, color });
            this.showToast('Category created!', 'success');
            this.closeNewCategoryModal();
            this.currentCategory = id;
            await this.renderCategories();
        } catch (err) {
            this.showToast('Error: ' + err.message, 'error');
        }
    },

    // ===== UTILITIES =====
    copyPH(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied: ' + text, 'success');
        }).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.showToast('Copied: ' + text, 'success');
        });
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type + ' show';
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    },

    _esc(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
    Admin.init();
});
