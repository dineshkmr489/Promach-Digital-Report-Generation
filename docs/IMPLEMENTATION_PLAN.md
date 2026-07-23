# Promach Digital Service Report Application

## 1. Product definition

Promach DSR is a focused digital Service Report / Delivery Order application. It is not an invoice, billing, inventory, scheduling, or full maintenance-management system.

The application has two secure roles:

- **Admin:** manages master data, creates and sends service reports, records equipment work, collects technician/client signatures, and manages completed records.
- **Client:** sees only reports assigned to their organization, reviews work, acknowledges service, signs, and downloads completed PDFs.

The production outcome is a responsive browser application that works well on phones at a service site, tablets used for signatures, and desktop computers used for administration.

## 2. Guiding product principles

1. **Field-first:** every essential report action must be comfortable on a phone or tablet.
2. **Audit-ready:** status changes, signatures, revisions, and downloads must be attributable and timestamped.
3. **Client isolation:** a client can never access another client’s records, even through a guessed URL.
4. **Structured data first:** checklist results and measurements are captured as data, not flattened handwritten text.
5. **Immutable completion:** signed reports are locked. Corrections create a new version and preserve the original audit trail.
6. **Focused MVP:** invoicing, inventory, scheduling, GPS, attendance, payments, QR, OCR, offline sync, and WhatsApp remain outside the first release.

## 3. Recommended technical architecture

### Application

- Next.js with TypeScript and the App Router
- Responsive, accessible component system with shared design tokens
- Server-rendered pages where practical; client components only for interactive forms and signature capture
- Form validation on both client and server

### Data and files

- Relational database for users, clients, locations, equipment, checklist templates, reports, revisions, signatures, and audit events
- Object storage for equipment images, service photos, supporting files, signature images, and generated PDFs
- Signed, short-lived download links for private attachments and PDFs

### Security

- Managed authentication with secure password recovery and optional MFA
- Server-side role and tenant authorization for every protected read/write
- Encrypted transport, encrypted storage, secure cookies, CSRF protection, rate limits, and session expiry
- Append-only audit log for sensitive actions
- Antivirus/content-type checks and file-size limits for uploads

### Documents and messaging

- Server-generated PDF using a versioned service-report template
- Transactional email provider for assignment, reminder, correction, and completion notices
- Background jobs for PDF generation and email retry

### Quality and operations

- Automated unit, integration, authorization, PDF, accessibility, and responsive browser tests
- Error tracking, structured logs, uptime checks, and audit-log monitoring
- Separate development, staging, and production environments
- Automated deployment with database migration controls and rollback

## 4. Core data model

### Identity and tenancy

- `organizations`: Promach and each client organization
- `users`: account profile, email, status, last login
- `memberships`: user, organization, role, permissions
- `sessions`: managed by the selected identity platform

### Master data

- `clients`
- `client_contacts`
- `locations`
- `equipment_types`
- `equipment`
- `checklist_templates`
- `checklist_template_items`
- `measurement_definitions`
- `technicians`
- `technician_signatures`

### Service reporting

- `service_reports`
- `service_report_equipment`
- `service_report_checklist_results`
- `service_report_measurements`
- `service_report_technicians`
- `service_report_attachments`
- `service_report_acknowledgements`
- `service_report_revisions`
- `generated_documents`
- `audit_events`
- `notifications`

Every business table includes a stable ID, tenant/organization owner, created/updated timestamps, actor ID, and soft-deletion/status fields where appropriate.

## 5. Status and revision rules

Primary flow:

`Draft → Sent to client → Awaiting client signature → Signed and submitted → Completed`

Exception flow:

`Awaiting client signature → Correction required → Revised draft → Awaiting client signature`

Other terminal state:

`Draft / Awaiting client signature → Cancelled`

Rules:

- Sending validates all required fields and creates an audit event.
- A signed report cannot be edited in place.
- Correction creates a new revision linked to the original report.
- Completion stores the signer, signature channel, signed time, report revision, document checksum, and generated PDF version.

## 6. Phase-wise implementation plan

### Phase 0 — Discovery and sign-off

**Duration:** 3–5 working days

**Objectives**

- Confirm production users, company branding, expected monthly volume, service report numbering, retention period, hosting region, and notification requirements.
- Review the existing paper/PDF service forms and identify every equipment-specific field.
- Decide the production identity provider and email provider.
- Confirm whether client users belong to one client only or can manage multiple organizations.

**Deliverables**

- Approved requirements and out-of-scope list
- Screen map and workflow diagram
- Data dictionary
- PDF field-mapping specification
- Security and retention decisions
- Acceptance criteria and release plan

**Exit criteria**

- No unresolved field, status, tenant, or signature-rule decisions
- Stakeholders approve the MVP backlog

### Phase 1 — Product foundation and responsive UX

**Duration:** 1–2 weeks

**Objectives**

- Establish the Next.js project, environments, design system, navigation, accessible inputs, and responsive layouts.
- Build admin/client sign-in journeys and authenticated application shells.
- Create working high-fidelity screens with realistic data for dashboard, reports, report creation, master data, report view, and signature capture.

**Deliverables**

- Responsive desktop, tablet, and mobile UI
- Shared components and design tokens
- Admin and client navigation
- Interactive report-creation wizard
- Touch/mouse/stylus signature pad
- Approved visual QA baseline

**Exit criteria**

- Core journeys are usable at 360 px, 768 px, 1024 px, and desktop widths
- Keyboard navigation, labels, contrast, and reduced-motion behavior pass review

### Phase 2 — Authentication, roles, and master data

**Duration:** 1–2 weeks

**Objectives**

- Implement production authentication, password recovery, session security, and server-side authorization.
- Implement organization/tenant isolation.
- Build CRUD workflows for client, location, equipment type, equipment, checklist template, measurement definition, and technician records.

**Deliverables**

- Admin and client role policies
- User invitation and activation flow
- Validated master-data screens
- Equipment/checklist mapping
- Technician signature management
- Audit events for all master-data changes

**Exit criteria**

- Automated tests prove clients cannot read or mutate other tenants’ data
- Admin permissions and inactive-record rules are enforced server-side

### Phase 3 — Service report workflow

**Duration:** 2–3 weeks

**Objectives**

- Implement report numbering, draft autosave, validation, equipment selection, checklist loading, measurements, attachments, technicians, and service conditions.
- Implement send-to-client and correction/revision flows.
- Add report history, search, filters, and status dashboards.

**Deliverables**

- Durable report draft and edit workflow
- Checklist and measurement capture
- Photo/supporting-file upload
- Technician assignment and signature
- Status transitions and revision history
- Admin reporting dashboard

**Exit criteria**

- Reports survive reloads and interrupted sessions
- Invalid status transitions are blocked
- Every write records the actor and timestamp

### Phase 4 — Client acknowledgement, signatures, and PDF

**Duration:** 2 weeks

**Objectives**

- Build the client review and signature workflow.
- Support signing through the client portal or an admin device.
- Generate an immutable, print-ready PDF combining service report, checklist, measurements, attachments summary, technician signatures, and client acknowledgement.

**Deliverables**

- Client acknowledgement form and satisfaction status
- Touch/mouse/stylus signature capture
- Signature-channel audit (`client portal` or `admin device`)
- Locked completed report
- Versioned PDF generation, download, and print
- Document checksum and generation history

**Exit criteria**

- Signed records cannot be directly edited
- PDF content matches the signed report revision exactly
- Signing metadata is present in the UI, database, audit log, and PDF

### Phase 5 — Notifications, operations, and hardening

**Duration:** 1–2 weeks

**Objectives**

- Add assignment, reminder, correction, and completion email notifications.
- Add monitoring, backup, retention, security controls, and support tooling.
- Complete performance, accessibility, authorization, and device testing.

**Deliverables**

- Transactional email templates and retry handling
- Error monitoring and operational dashboards
- Database backup/recovery procedure
- Security review and penetration-test remediation
- Admin support runbook and user guides
- Release candidate in staging

**Exit criteria**

- No open critical/high-severity defects
- Agreed performance and availability targets are met
- Backup restore and rollback are rehearsed

### Phase 6 — Pilot and production launch

**Duration:** 1–2 weeks

**Objectives**

- Pilot with a small admin group and one or two clients.
- Import approved master data.
- Train users, observe real service visits, and fix pilot issues.
- Launch production in controlled waves.

**Deliverables**

- Pilot report and approved fixes
- Production data migration
- Training and support material
- Go-live checklist and rollback decision
- Post-launch review

**Exit criteria**

- Pilot stakeholders approve go-live
- Production monitoring, support owners, and escalation paths are active

## 7. Responsive acceptance criteria

### Mobile (360–767 px)

- Bottom navigation or accessible drawer for primary actions
- Single-column forms and stacked report cards
- Minimum 44 px tap targets for frequent actions
- Signature canvas fits without horizontal scrolling
- Sticky save/continue action during long forms
- Tables transform into readable report cards

### Tablet (768–1023 px)

- Compact navigation with two-column forms where comfortable
- Signature modal optimized for landscape or portrait use
- No clipped filters, dialogs, or long equipment names

### Desktop (1024 px and above)

- Persistent navigation
- Dense but legible tables, dashboards, and multi-column form layouts
- Keyboard-first search, filters, and report creation

## 8. MVP acceptance scenarios

1. An admin creates a client, location, equipment item, checklist, and technician.
2. The admin creates a draft report; selected equipment loads the correct checklist and readings.
3. The admin leaves and returns without losing the draft.
4. The admin sends the report; it becomes visible only to the assigned client.
5. The client reviews the exact report revision and signs it.
6. The admin collects a client signature on a tablet and the audit trail records the admin-device channel.
7. A signed report becomes immutable and produces a matching PDF.
8. The client downloads only their organization’s completed reports.
9. A correction request creates a revision without deleting the previous audit history.
10. Admin dashboards and report histories reflect the correct status counts.

## 9. Testing strategy

- **Unit:** validation, numbering, status transitions, checklist rules, permission predicates
- **Integration:** database writes, object storage, PDF generation, email jobs
- **Authorization:** tenant isolation, role restrictions, guessed IDs, expired sessions
- **End-to-end:** admin create/send, client sign, admin-device sign, correction, PDF download
- **Responsive:** phone, tablet portrait/landscape, laptop, wide desktop
- **Accessibility:** keyboard, focus order, form labels, error messaging, screen-reader landmarks, contrast, reduced motion
- **Performance:** dashboard, report search, file upload, PDF generation, concurrent client access
- **Security:** upload validation, rate limits, session handling, CSRF, injection, audit integrity

## 10. Deployment and operating checklist

- Production domain, TLS, identity-provider callbacks, and sender-domain verification
- Secrets stored outside source control
- Database migrations reviewed and reversible
- Object-storage lifecycle and private-access rules
- Retention and deletion policy approved
- Automated backups and restore test
- Monitoring, alerts, on-call owner, and support mailbox
- Privacy notice, acceptable-use wording, and signature consent wording reviewed
- Staff and pilot-client training completed

## 11. Future backlog (after MVP)

- Job scheduling and technician assignment
- Inventory and spare-parts management
- AMC and contract tracking
- Quotations, pricing, GST, invoices, and payments
- QR equipment lookup
- Offline field mode
- GPS and attendance
- Advanced analytics
- WhatsApp notifications
- OCR/AI-assisted data entry

These items should be separately scoped and should not be hidden inside the MVP estimate.
