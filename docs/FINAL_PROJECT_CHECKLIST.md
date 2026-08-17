# AccountantsFactory Platform – Final Project Document vs Implementation

Checklist against **Service-Based Client Portal – Final Project Document**.

---

## 1. Project Objective ✅

| Requirement | Status |
|-------------|--------|
| Clients receive login only after purchasing a service | ✅ Admin creates client; no public signup |
| All accounts created and managed by Admin | ✅ Admin: create-client, assign-service, block/activate |
| Clients: track status, raise request/ticket, download documents, view referrals/bonuses | ✅ Client dashboard: services, request-service, documents, referrals |
| Admin: user access, service progress, document delivery, referral approval | ✅ Admin dashboard: clients, orders, documents, referrals, approve-referral |
| Referral: min one referral, circular process, professional service delivery | ✅ Referral model + approve-referral; status pending/approved/rejected |

---

## 2. Technology Stack ⚠️ (Equivalent, not Zoho Catalyst)

| Document | Actual | Status |
|----------|--------|--------|
| Frontend: HTML5, CSS3, Vanilla JS, Fetch API | ✅ Same | Done |
| Backend: Zoho Catalyst (Node.js) | Node.js + Express (standalone) | Equivalent |
| Database: Zoho Catalyst Data Store | MongoDB (local/Atlas) | Equivalent (relational → document) |
| File Storage: Zoho WorkDrive | Zoho WorkDrive (optional; see ZOHO_SETUP.md) | Done |
| Security: Zoho Catalyst Auth | JWT + role-based auth, HTTPS | Equivalent |

**Note:** Stack is Node/Express + MongoDB + optional WorkDrive instead of Zoho Catalyst. Functionality matches the document.

---

## 3. System Architecture ✅

| Component | Status |
|-----------|--------|
| Client Browser (HTML/CSS/JS) | ✅ public_html + portal |
| HTTPS | ✅ (production) |
| Node.js + Express | ✅ backend |
| Database (Mongo) | ✅ backend/src/models + database.js |
| Zoho WorkDrive (documents) | ✅ backend/src/services/zohoWorkDrive.js (optional) |

---

## 4. User Roles ✅

### 4.1 Admin ✅

| Capability | API / UI |
|------------|----------|
| Create client accounts | POST /admin/create-client ✅ |
| Assign services | POST /admin/assign-service ✅ |
| Update service status | PUT /admin/update-status ✅ |
| Upload service documents | POST /admin/upload-document ✅ |
| Generate referral codes | Auto on user create ✅ |
| Approve referral bonuses | POST /admin/approve-referral ✅ |
| Block or activate client accounts | PATCH /admin/clients/:id/status ✅ |

### 4.2 Client ✅

| Capability | API / UI |
|------------|----------|
| Log in with admin-provided credentials | POST /auth/login ✅ |
| View purchased services | GET /client/services ✅ |
| Track service status | Client dashboard ✅ |
| Download service documents | GET /client/document/:id/download ✅ |
| View referral code, share, track bonus | GET /client/referrals ✅ |
| Change password | POST /auth/change-password ✅ |
| Request more services | POST /client/request-service ✅ |
| Comment on existing services | POST /client/service/comment ✅ |
| Cannot register, change status, upload docs, modify referral | ✅ No signup; no client write on status/docs/referral |

---

## 5. Access Control ✅

| Rule | Status |
|------|--------|
| No public signup | ✅ No signup route |
| No Google login | ✅ No OAuth |
| Account only after service purchase (admin creates) | ✅ create-client + assign-service |
| Admin has full authority | ✅ requireAdmin middleware |
| Referral bonus requires admin approval | ✅ approve-referral; status pending/approved/rejected |

---

## 6. Authentication Workflow ✅

| Step | Status |
|------|--------|
| Client purchases → Admin creates account | ✅ create-client |
| Password hashed, referral code generated, service assigned | ✅ User model + createClient + assign-service |
| Client login → validate → JWT → redirect to dashboard | ✅ POST /auth/login, JWT, frontend redirect |
| Optional force password reset on first login | ⚠️ Not implemented (can add later) |

---

## 7. Services Covered ✅

| Document examples | In seed |
|-------------------|--------|
| GST Registration, GST Returns, Income Tax Filing, Company/LLP Registration, PF & ESI, ROC Filings | ✅ setupDatabase.js updated with these + Bookkeeping, Tax Consultation, Audit Support, Compliance |
| Add 7–8 other services | ✅ 10 default services seeded |
| System supports any number of services | ✅ Service model + admin can add via DB/UI |

---

## 8. Service Status Management ✅

| Requirement | Status |
|-------------|--------|
| Lifecycle: Pending → In Progress → Completed | ✅ ServiceOrder.status |
| Only Admin updates status | ✅ PUT /admin/update-status, requireAdmin |

---

## 9. Client Dashboard ✅

| Element | Status |
|---------|--------|
| Service status table (Name, Period, Purchase Date, Status, Documents) | ✅ Client dashboard + GET /client/services |
| Download documents | ✅ GET /client/document/:id/download |

---

## 10. Document Upload & Download ✅

| Requirement | Status |
|-------------|--------|
| Storage in Zoho WorkDrive (no app-layer file store) | ✅ zohoWorkDrive.js (optional); fallback possible |
| Admin upload: returns, acknowledgements, certificates, reports | ✅ POST /admin/upload-document |
| Mapped to client, service, status | ✅ Document model: user_id, service_order_id |
| Client: see only related documents, download via secure link | ✅ GET /client/documents, download with auth |
| Time-limited / validated access | ✅ Auth required; WorkDrive share links configurable |

---

## 11. Referral System ✅

| Requirement | Status |
|-------------|--------|
| Auto-generated code per client, not editable | ✅ User.referral_code, generated on create |
| Flow: client shares code → admin verifies → admin approves → bonus credited | ✅ Referral model; approve-referral with status + bonus_amount |
| Status: Pending, Approved, Rejected (with reason) | ✅ Referral.status enum; reason field |
| No automatic payouts; circular/conditional as per policy | ✅ Manual approve-referral; no auto-payout |

---

## 12. Database Structure ✅

| Document table | Model | Status |
|----------------|-------|--------|
| users (id, email, password_hash, role, referral_code, status, created_at) | User.js | ✅ + totp for 2FA |
| services | Service.js | ✅ |
| service_orders | ServiceOrder.js | ✅ |
| referrals | Referral.js | ✅ |
| documents (s3_key → WorkDrive) | Document.js | ✅ |

---

## 13. Application Pages ✅

| Type | Pages | Status |
|------|-------|--------|
| Public | Home, Services (many HTML), About, Contact, Login | ✅ index.html, about.html, contact.html, portal/login.html + service pages |
| Admin (protected) | Login, Dashboard, Client Mgmt, Service Mgmt, Status, Document Upload, Referral Approval | ✅ portal/admin/dashboard.html (sections) |
| Client (protected) | Dashboard, My Services, Status, Documents, Referral Summary, Profile | ✅ portal/client/dashboard.html |

---

## 14. API Overview ✅

| Document API | Actual | Status |
|--------------|--------|--------|
| POST /auth/login | ✅ | Done |
| POST /auth/change-password | ✅ | Done |
| POST /admin/create-client | ✅ | Done |
| POST /admin/assign-service | ✅ | Done |
| POST or PUT /admin/update-status | PUT /admin/update-status | Done |
| POST /admin/upload-document | ✅ | Done |
| POST /admin/approve-referral | ✅ | Done |
| GET /client/dashboard | ✅ | Done |
| GET /client/services | ✅ | Done |
| GET /client/documents | ✅ | Done |
| GET /client/document/:id/download | GET /client/document/:documentId/download | Done |

Additional: forgot-password, reset-password, 2FA, client request-service, comments, admin test-email, client referrals, etc. ✅

---

## 15. Security & Compliance ✅

| Requirement | Status |
|-------------|--------|
| Role-based access | ✅ requireAdmin, requireClient |
| Audit trail for admin actions | ✅ AuditLog model |
| Encrypted credentials | ✅ bcrypt password_hash |
| Secure document access | ✅ Auth + document ownership |
| HTTPS in production | ✅ Document + PRODUCTION_DEPLOYMENT.md |

---

## 16. Implementation Timeline (Project View)

| Week | Focus | Status |
|------|--------|--------|
| 1 – Platform setup | Backend, DB, env, WorkDrive config | ✅ Done |
| 2 – Core backend | Auth, models, roles | ✅ Done |
| 3 – Admin module | Client create, assign, status, referral | ✅ Done |
| 4 – Client module | Dashboard, services, referrals | ✅ Done |
| 5 – Document management | WorkDrive, upload, download | ✅ Done (optional WorkDrive) |
| 6 – Frontend & launch | Connect frontend, testing, UAT, production | ✅ Frontend connected; production checklist in PRODUCTION_DEPLOYMENT.md |

---

## Summary

| Category | Status |
|----------|--------|
| **Objectives (1)** | ✅ Done |
| **Tech stack (2)** | ✅ Equivalent (Node/Express + MongoDB + optional WorkDrive) |
| **Architecture (3)** | ✅ Done |
| **Roles & access (4, 5)** | ✅ Done |
| **Auth workflow (6)** | ✅ Done (optional: force password reset on first login) |
| **Services (7, 8)** | ✅ Done; seed updated to match document examples |
| **Client dashboard (9)** | ✅ Done |
| **Documents (10)** | ✅ Done |
| **Referral (11)** | ✅ Done |
| **Database (12)** | ✅ Done |
| **Pages (13)** | ✅ Done |
| **APIs (14)** | ✅ Done |
| **Security (15)** | ✅ Done |
| **Timeline (16)** | ✅ Implemented |

**Conclusion:** The project implements the Final Project Document. Differences: backend is Node/Express with MongoDB (and optional Zoho WorkDrive) instead of Zoho Catalyst/Data Store; behaviour and features align with the document. Optional enhancement: force password reset on first client login if required.

---

**Services seed:** Default services in `setupDatabase.js` now match document §7 (GST Registration, GST Returns, Income Tax Filing, Company/LLP Registration, PF & ESI, ROC Filings, plus Bookkeeping, Tax Consultation, Audit Support, Compliance). If you already ran `npm run setup-database` and have the old 8 services, either add new services via Admin Dashboard or drop the `services` collection and run `npm run setup-database` again to seed the new list.
