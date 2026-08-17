// Database Layer — IndexedDB wrapper
// Designed with clean async API so it can be swapped to REST API calls later

const DB_NAME = 'DocAutomationDB';
const DB_VERSION = 2;

class Database {
    constructor() {
        this._db = null;
        this._ready = this._init();
    }

    _init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const oldVersion = e.oldVersion;

                if (oldVersion < 1) {
                    const clientStore = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
                    clientStore.createIndex('fullName', 'fullName', { unique: false });
                    clientStore.createIndex('entityName', 'entityName', { unique: false });
                    clientStore.createIndex('pan', 'pan', { unique: false });

                    const extraStore = db.createObjectStore('extraFields', { keyPath: ['clientId', 'templateId'] });
                    extraStore.createIndex('clientId', 'clientId', { unique: false });

                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('clientId', 'clientId', { unique: false });
                    historyStore.createIndex('generatedAt', 'generatedAt', { unique: false });
                }

                if (oldVersion < 2) {
                    const ctStore = db.createObjectStore('customTemplates', { keyPath: 'id' });
                    ctStore.createIndex('categoryId', 'categoryId', { unique: false });
                    db.createObjectStore('customCategories', { keyPath: 'id' });
                }
            };

            request.onsuccess = (e) => {
                this._db = e.target.result;
                resolve();
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }

    async _getStore(storeName, mode = 'readonly') {
        await this._ready;
        const tx = this._db.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    // --- Clients ---

    clients = {
        add: async (client) => {
            const store = await this._getStore('clients', 'readwrite');
            client.createdAt = new Date().toISOString();
            client.updatedAt = new Date().toISOString();
            return new Promise((resolve, reject) => {
                const req = store.add(client);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },

        get: async (id) => {
            const store = await this._getStore('clients');
            return new Promise((resolve, reject) => {
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },

        getAll: async () => {
            const store = await this._getStore('clients');
            return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },

        update: async (id, data) => {
            const store = await this._getStore('clients', 'readwrite');
            return new Promise((resolve, reject) => {
                const getReq = store.get(id);
                getReq.onsuccess = () => {
                    const existing = getReq.result;
                    if (!existing) return reject(new Error('Client not found'));
                    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
                    const putReq = store.put(updated);
                    putReq.onsuccess = () => resolve(updated);
                    putReq.onerror = () => reject(putReq.error);
                };
                getReq.onerror = () => reject(getReq.error);
            });
        },

        delete: async (id) => {
            const store = await this._getStore('clients', 'readwrite');
            return new Promise((resolve, reject) => {
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        },

        search: async (query) => {
            const all = await this.clients.getAll();
            const q = query.toLowerCase();
            return all.filter(c =>
                (c.fullName || '').toLowerCase().includes(q) ||
                (c.entityName || '').toLowerCase().includes(q) ||
                (c.pan || '').toLowerCase().includes(q) ||
                (c.mobile || '').includes(q)
            );
        }
    };

    // --- Extra Fields (per client per template) ---

    extraFields = {
        save: async (clientId, templateId, data) => {
            const store = await this._getStore('extraFields', 'readwrite');
            const record = { clientId, templateId, data, savedAt: new Date().toISOString() };
            return new Promise((resolve, reject) => {
                const req = store.put(record);
                req.onsuccess = () => resolve(record);
                req.onerror = () => reject(req.error);
            });
        },

        get: async (clientId, templateId) => {
            const store = await this._getStore('extraFields');
            return new Promise((resolve, reject) => {
                const req = store.get([clientId, templateId]);
                req.onsuccess = () => resolve(req.result ? req.result.data : null);
                req.onerror = () => reject(req.error);
            });
        }
    };

    // --- Generation History ---

    history = {
        add: async (entry) => {
            const store = await this._getStore('history', 'readwrite');
            entry.generatedAt = new Date().toISOString();
            return new Promise((resolve, reject) => {
                const req = store.add(entry);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },

        getAll: async () => {
            const store = await this._getStore('history');
            return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result.sort((a, b) =>
                    new Date(b.generatedAt) - new Date(a.generatedAt)
                ));
                req.onerror = () => reject(req.error);
            });
        },

        getByClient: async (clientId) => {
            const store = await this._getStore('history');
            const index = store.index('clientId');
            return new Promise((resolve, reject) => {
                const req = index.getAll(clientId);
                req.onsuccess = () => resolve(req.result.sort((a, b) =>
                    new Date(b.generatedAt) - new Date(a.generatedAt)
                ));
                req.onerror = () => reject(req.error);
            });
        }
    };

    // --- Custom Templates (admin-created) ---

    customTemplates = {
        add: async (template) => {
            const store = await this._getStore('customTemplates', 'readwrite');
            template.createdAt = new Date().toISOString();
            template.updatedAt = new Date().toISOString();
            return new Promise((resolve, reject) => {
                const req = store.put(template);
                req.onsuccess = () => resolve(template);
                req.onerror = () => reject(req.error);
            });
        },

        get: async (id) => {
            const store = await this._getStore('customTemplates');
            return new Promise((resolve, reject) => {
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },

        getAll: async () => {
            const store = await this._getStore('customTemplates');
            return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },

        update: async (id, data) => {
            const store = await this._getStore('customTemplates', 'readwrite');
            return new Promise((resolve, reject) => {
                const getReq = store.get(id);
                getReq.onsuccess = () => {
                    const existing = getReq.result;
                    if (!existing) return reject(new Error('Template not found'));
                    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
                    const putReq = store.put(updated);
                    putReq.onsuccess = () => resolve(updated);
                    putReq.onerror = () => reject(putReq.error);
                };
                getReq.onerror = () => reject(getReq.error);
            });
        },

        delete: async (id) => {
            const store = await this._getStore('customTemplates', 'readwrite');
            return new Promise((resolve, reject) => {
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }
    };

    // --- Custom Categories (admin-created) ---

    customCategories = {
        add: async (category) => {
            const store = await this._getStore('customCategories', 'readwrite');
            return new Promise((resolve, reject) => {
                const req = store.put(category);
                req.onsuccess = () => resolve(category);
                req.onerror = () => reject(req.error);
            });
        },

        getAll: async () => {
            const store = await this._getStore('customCategories');
            return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        },

        delete: async (id) => {
            const store = await this._getStore('customCategories', 'readwrite');
            return new Promise((resolve, reject) => {
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }
    };
}

// Singleton instance
const db = new Database();
