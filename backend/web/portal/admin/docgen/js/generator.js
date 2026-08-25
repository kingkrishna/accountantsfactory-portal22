// DOCX Generator
// Merges client data + extra fields → generates .docx via docx.js → triggers download

const Generator = {

    // Merge client data with extra field data into a single flat object
    mergeData(client, extraFieldData) {
        const merged = { ...client };
        if (extraFieldData) {
            Object.assign(merged, extraFieldData);
        }
        return merged;
    },

    // Generate and download a single document
    async generateDocument(templateId, client, extraFieldData) {
        const template = TEMPLATES[templateId];
        if (!template) {
            throw new Error(`Template "${templateId}" not found`);
        }

        if (!template.generate) {
            throw new Error(`Template "${template.name}" does not have a generate function yet. It is a placeholder for future implementation.`);
        }

        const mergedData = this.mergeData(client, extraFieldData);
        const doc = template.generate(mergedData);

        const blob = await docx.Packer.toBlob(doc);
        const fileName = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${(client.entityName || client.fullName || 'Document').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;

        saveAs(blob, fileName);

        // Log to history
        await db.history.add({
            clientId: client.id,
            clientName: client.entityName || client.fullName,
            templateId: templateId,
            templateName: template.name,
            category: template.category,
            fileName: fileName
        });

        return fileName;
    },

    // Generate multiple documents at once
    async generateBulk(templateIds, client, extraFieldsMap) {
        const results = [];
        for (const templateId of templateIds) {
            try {
                const extraData = extraFieldsMap[templateId] || null;
                const fileName = await this.generateDocument(templateId, client, extraData);
                results.push({ templateId, fileName, success: true });
            } catch (err) {
                results.push({ templateId, error: err.message, success: false });
            }
        }
        return results;
    },

    // Check which extra fields are needed for a template given current client data
    getMissingExtraFields(templateId, client, savedExtraData) {
        const template = TEMPLATES[templateId];
        if (!template) return [];

        const missing = [];
        for (const field of template.extraFields) {
            const hasValue = (savedExtraData && savedExtraData[field.key]) || client[field.key];
            if (!hasValue) {
                missing.push(field);
            }
        }
        return missing;
    },

    // Check if template has all required client fields
    getMissingRequiredFields(templateId, client) {
        const template = TEMPLATES[templateId];
        if (!template) return [];

        const missing = [];
        for (const fieldKey of template.requiredFields) {
            if (fieldKey === 'directors') {
                if (!client.directors || client.directors.length === 0) {
                    missing.push('directors');
                }
            } else if (!client[fieldKey]) {
                missing.push(fieldKey);
            }
        }
        return missing;
    }
};
