// Block Renderer — Converts block arrays to docx.Document
// Shared between admin.html (preview) and index.html (generation)
// Depends on: docx.js (global `docx`), formatDate(), numberToWords() from templates.js

// Resolve dotted/bracket paths like "directors[0].name"
function resolvePath(obj, path) {
    if (!obj || !path) return undefined;
    return path.replace(/\[(\d+)\]/g, '.$1').split('.').reduce((o, key) => {
        return (o !== undefined && o !== null) ? o[key] : undefined;
    }, obj);
}

// Replace {{placeholder}} and {{placeholder|formatter}} in text
function substitutePlaceholders(text, data) {
    if (!text) return '';
    return text.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
        const parts = expr.split('|').map(s => s.trim());
        const path = parts[0];
        const formatter = parts[1];
        let value = resolvePath(data, path);
        if (value === undefined || value === null || value === '') return '___________';
        if (formatter === 'date') return (typeof formatDate === 'function') ? formatDate(value) : value;
        if (formatter === 'words') return (typeof numberToWords === 'function') ? numberToWords(value) : value;
        if (formatter === 'upper') return String(value).toUpperCase();
        if (formatter === 'lower') return String(value).toLowerCase();
        return String(value);
    });
}

// Convert a block array + merged data into a docx.Document
function renderBlocksToDocx(blocks, data, options = {}) {
    const { Document, Paragraph, TextRun, AlignmentType } = docx;
    const children = [];
    const margins = options.margins || { top: 1440, bottom: 1440, left: 1440, right: 1440 };

    for (const block of blocks) {
        if (block.type === 'blank') {
            children.push(new Paragraph({
                spacing: { after: block.spacing || 200 },
                children: [new TextRun({ text: '', size: 24 })]
            }));
        } else if (block.type === 'heading' || block.type === 'text') {
            const s = block.style || {};
            const resolvedText = substitutePlaceholders(block.content || '', data);

            // Split text on {{placeholder}} boundaries to bold placeholder values
            // For simplicity, render as single TextRun with block-level style
            const alignment = s.center ? AlignmentType.CENTER : (s.right ? AlignmentType.RIGHT : AlignmentType.LEFT);
            children.push(new Paragraph({
                alignment,
                spacing: { after: s.after !== undefined ? s.after : 150 },
                children: [new TextRun({
                    text: resolvedText,
                    bold: s.bold || false,
                    italics: s.italics || false,
                    underline: s.underline ? {} : undefined,
                    size: s.size || 24
                })]
            }));
        } else if (block.type === 'signatureBlock') {
            // Add spacing before signature
            children.push(new Paragraph({
                spacing: { after: 300 },
                children: [new TextRun({ text: '', size: 24 })]
            }));
            const lines = block.lines || ['____________________________'];
            for (const line of lines) {
                const resolvedLine = substitutePlaceholders(line, data);
                const s = block.style || {};
                children.push(new Paragraph({
                    spacing: { after: 50 },
                    children: [new TextRun({
                        text: resolvedLine,
                        bold: s.bold || false,
                        size: s.size || 24
                    })]
                }));
            }
        }
    }

    return new Document({
        sections: [{
            properties: { page: { margin: margins } },
            children
        }]
    });
}

// Build an HTML preview string from blocks (for admin preview without generating .docx)
function renderBlocksToHTML(blocks, sampleData) {
    const lines = [];
    for (const block of blocks) {
        if (block.type === 'blank') {
            lines.push('<div style="height: 16px;"></div>');
        } else if (block.type === 'heading' || block.type === 'text') {
            const s = block.style || {};
            const text = substitutePlaceholders(block.content || '', sampleData || {});
            const styles = [];
            if (s.bold) styles.push('font-weight:bold');
            if (s.italics) styles.push('font-style:italic');
            if (s.underline) styles.push('text-decoration:underline');
            if (s.center) styles.push('text-align:center');
            if (s.right) styles.push('text-align:right');
            const fontSize = s.size ? (s.size / 2) : 12;
            styles.push(`font-size:${fontSize}pt`);
            lines.push(`<p style="${styles.join(';')};margin:4px 0;line-height:1.6;">${escapeHTML(text)}</p>`);
        } else if (block.type === 'signatureBlock') {
            lines.push('<div style="height: 24px;"></div>');
            const sl = block.lines || ['____________________________'];
            for (const line of sl) {
                const text = substitutePlaceholders(line, sampleData || {});
                lines.push(`<p style="margin:2px 0;font-size:12pt;">${escapeHTML(text)}</p>`);
            }
        }
    }
    return lines.join('\n');
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
