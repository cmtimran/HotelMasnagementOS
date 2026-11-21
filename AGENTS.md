# HotelManagementOS - AI Agent Guidelines & Architecture Rules

## Agent skills

### Issue tracker
GitHub Issues is the canonical tracking system for bug reports, refactors, and feature specifications. See `docs/agents/issue-tracker.md`.

### Domain docs
Single-context domain model documented at repository root in `CONTEXT.md` and `docs/agents/domain.md`.

---

## Architectural Rules for Agents

1. **Zero Data Desynchronization:** Never rely on browser `localStorage` as a primary source of truth for financial, booking, or inventory state. All write operations must execute against PostgreSQL first, using transactions where multiple rows or balances are updated.
2. **Idempotency & Concurrency:** All financial mutations (folio charges, payments, refunds, night audit postings) and room reservation allocations must require idempotency tokens and atomic database locking.
3. **Strict RBAC & Audit Trails:** Every mutation must attribute the authenticated employee/user ID and user name, logging an audit trail in `folio_audit_trail` or `guest_edit_history`.
4. **DevSecOps First:** Parameterize all SQL queries. Never disable CORS or CSRF guards in production. Ensure strict validation (Zod schemas) on all API payload boundaries.
