# 📘 Channel Manager + PMS — Complete Development Blueprint (v7)

> **এই ডকুমেন্টের উদ্দেশ্য:** developer এটি পড়ে directly code শুরু করতে পারবে — অন্য কোনো reference document লাগবে না। Vision থেকে শুরু করে database schema, API endpoint, UI flow, sprint plan, OTA integration spec, compliance checklist — সব এক জায়গায়।
>
> **Target Market:** Bangladesh/South Asia first → Global expansion in V2
> **Timeline:** 24 months (MVP → V2)
> **Project Codename:** Atlas (working name; product name TBD)
> **Document Version:** v7.1 (full restructure)

---

# 📑 সম্পূর্ণ সূচিপত্র (Table of Contents)

### PART I — Foundation
1. Vision, Goals & Success Metrics
2. Glossary (Domain Terminology)
3. Tech Stack & Architecture
4. Multi-tenancy & Tenant Isolation
5. Coding Standards & Conventions
6. Git Workflow & Branching
7. DevOps, CI/CD & Environments
8. Folder & Repository Structure

### PART II — Domain Model
9. Entity Relationship Overview
10. Core Tables (Schema with columns, types, indexes)
11. State Machines (Reservation, Folio, Payment, Channel Job)
12. Business Rules & Invariants
13. Event Catalog (Domain Events)

### PART III — API Design
14. REST API Conventions
15. Authentication & Authorization
16. Error Handling & Status Codes
17. Pagination, Filtering, Sorting
18. Rate Limiting & Idempotency
19. Complete Endpoint Catalog (per module)
20. Webhook Catalog
21. GraphQL Layer (V1.5)

### PART IV — Modules (Detailed Specifications)
22. Module: Authentication & RBAC
23. Module: Tenant & Multi-Property Management
24. Module: Room Type & Rate Plan
25. Module: Inventory & Central Calendar
26. Module: Reservation Engine
27. Module: Front Desk Operations
28. Module: Housekeeping
29. Module: Night Audit
30. Module: Folio & Cashier
31. Module: Channel Sync Engine
32. Module: Direct Booking Engine
33. Module: Guest CRM
34. Module: F&B / Restaurant POS
35. Module: HR, Roster & Payroll
36. Module: Maintenance & Engineering
37. Module: Marketing Automation
38. Module: Reports & BI
39. Module: SaaS Subscription Billing
40. Module: Payment Gateway Hub
41. Module: Mobile Apps (Staff / Owner / Guest)
42. Module: Compliance & Police Reporting
43. Module: Super-Admin & SaaS Ops
44. Module: Public API & Marketplace
45. Module: AI/ML Services

### PART V — Integrations
46. OTA Integration Specs (Booking.com, Agoda, Expedia, Airbnb, Hotelbeds, ShareTrip, GoZayaan, MakeMyTrip, Trip.com, GDS)
47. Payment Gateway Specs (Stripe, SSLCommerz, bKash, Nagad, Rocket, Razorpay, UPI)
48. Communication Specs (WhatsApp Business, Twilio, SendGrid, FCM/APNS)
49. Accounting Sync (Tally, Zoho Books, QuickBooks, Xero)
50. Door Lock / IoT / Biometric

### PART VI — UI/UX Specifications
51. Design System (Colors, Typography, Components)
52. Screen Inventory (every screen with wireframe description)
53. User Flow Diagrams
54. Localization & RTL Strategy
55. Accessibility (WCAG 2.1 AA)
56. Mobile App Screens

### PART VII — Quality, Testing & Operations
57. Testing Strategy (Unit, Integration, E2E, Load, Security)
58. Performance Budgets & SLOs
59. Observability & Monitoring
60. Incident Response Runbooks
61. Disaster Recovery Plan
62. Security Hardening Checklist

### PART VIII — Compliance & Legal
63. PCI-DSS Scoping
64. GDPR / DPDP Act / Bangladesh Compliance
65. Country Police Reporting Specifications
66. Data Retention & Right-to-Erasure
67. Cookie Policy & Consent

### PART IX — Roadmap & Execution
68. 24-Month Phased Roadmap
69. MVP Sprint-by-Sprint Breakdown (Week 1-26)
70. V1.0 / V1.5 / V2.0 Quarterly Themes
71. Team Structure & Hiring Plan
72. Risk Register & Mitigation

### PART X — Go-to-Market
73. Pricing Tier × Feature Matrix
74. Pilot Program & Bangladesh Launch
75. Sales Process & Implementation Playbook
76. Customer Success Operations
77. Marketing & Content Strategy

### PART XI — Appendices
A. Booking Status Code Reference
B. Error Code Catalog
C. Permission Matrix (RBAC)
D. Email/SMS/WhatsApp Template Library
E. Standard Hotel Report Catalog (35+ reports)
F. Migration Templates (OPERA, eZee, IDS Next)
G. Bangladesh Mushak 6.3 Invoice Spec
H. India GST Invoice Spec
I. OTA XML Sample Payloads
J. Common Pitfalls & Anti-patterns
K. Glossary of Hotel Industry Acronyms

---

# PART I — Foundation

## ১. Vision, Goals & Success Metrics

### Vision Statement
"South Asia-এর hotelier-দের জন্য enterprise-grade channel manager + PMS, যা OTA commission save করে direct booking বাড়ায়, overbooking 100% prevent করে, এবং WhatsApp-নির্ভর local market-এ native চলে — globally SiteMinder/Cloudbeds-এর সাথে competitive।"

### Strategic Goals
1. **Year 1:** 50 paying Bangladesh hotels, BDT 30 lakh MRR
2. **Year 2:** 500 hotels, USD 200K MRR, expand to India/UAE/Indonesia
3. **Year 3:** 2000 hotels, USD 1M MRR, EU pilot, SOC2 certified

### Product Success Metrics (KPI)
- **Customer:** Activation rate (Day 7 channel sync working) > 80%
- **Customer:** Day 30 retention > 90%
- **Customer:** NPS > 50
- **Product:** Channel sync latency p95 < 5 seconds
- **Product:** Booking engine conversion > 3.5%
- **Product:** Zero double-booking incidents per quarter
- **Business:** Gross margin > 75%
- **Business:** CAC payback < 6 months
- **Business:** Net Revenue Retention > 110%

### Non-Goals (MVP)
- Hotel website CMS builder (use embed widget instead)
- POS hardware certification (integrate with existing POS)
- Custom OTA partner certification beyond Tier 1 list
- Native desktop app (web is sufficient)
- Crypto payments

---

## ২. Glossary (Domain Terminology)

| Term | Definition |
|------|-----------|
| **ADR** | Average Daily Rate = Room revenue / Rooms sold |
| **Allotment** | Reserved inventory block per channel per date |
| **ARI** | Availability, Rates, Inventory — the three things synced to OTA |
| **BAR** | Best Available Rate — master rate from which others derive |
| **BCOM** | Booking.com internal jargon for their connectivity |
| **BEO** | Banquet Event Order |
| **CRO** | Central Reservation Office |
| **CTA** | Closed To Arrival — no new arrivals on this date |
| **CTD** | Closed To Departure — no checkouts on this date |
| **EQC** | Expedia QuickConnect — Expedia's API for channel managers |
| **FOM** | Front Office Manager |
| **GDS** | Global Distribution System (Amadeus/Sabre/Travelport) |
| **GIT** | Group Inclusive Tour |
| **GRC** | Guest Registration Card |
| **HK** | Housekeeping |
| **HMS / PMS** | Hotel/Property Management System |
| **HTNG** | Hotel Technology Next Generation (standards body) |
| **KOT** | Kitchen Order Token |
| **LOS** | Length of Stay |
| **MinLOS / MaxLOS** | Min/Max nights required for booking |
| **MICE** | Meetings, Incentives, Conferences, Exhibitions |
| **MUSHAK** | Bangladesh VAT invoice format (6.3 = current standard) |
| **NRF / NRG** | Non-Refundable rate/booking |
| **OCC** | Occupancy % = Rooms sold / Rooms available |
| **OOO / OOS** | Out of Order / Out of Service (room blocked) |
| **OTA** | Online Travel Agency |
| **PAX** | Passengers / Persons (booking party size) |
| **PMS** | Property Management System |
| **POS** | Point of Sale (restaurant/bar/spa billing) |
| **RBAC** | Role-Based Access Control |
| **RevPAR** | Revenue Per Available Room = ADR × OCC |
| **RLS** | Row-Level Security (PostgreSQL feature) |
| **RPLM** | Rate Plan |
| **TA** | Travel Agent |
| **TRevPAR** | Total RevPAR (includes F&B) |
| **VCC** | Virtual Credit Card (OTA-issued for booking payment) |
| **YCS** | Agoda Yield Control System (their API) |

---

## ৩. Tech Stack & Architecture

### ৩.১ Stack Decisions (Locked)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend Framework | Next.js 14 (App Router) | SSR for SEO booking engine; React ecosystem; vercel-deployable |
| Language | TypeScript 5+ strict | Type safety across stack |
| UI Library | shadcn/ui + Radix primitives | Customizable, accessible, no vendor lock |
| Styling | Tailwind CSS | Utility-first, design system friendly |
| Forms | React Hook Form + Zod | Best perf + schema validation |
| Data fetching | TanStack Query | Server state caching |
| Charts | Recharts + ECharts for advanced | Free, performant |
| Backend (App) | NestJS (Node.js, TypeScript) | Modular, DI, enterprise patterns |
| Backend (Sync Engine) | Go 1.22 | Concurrency for OTA polling/push |
| ORM | Prisma | Type-safe, migrations, RLS-compatible with raw queries |
| Database | PostgreSQL 16 | RLS, JSONB, partitioning, ACID |
| Cache & Sessions | Redis 7 | Distributed lock (Redlock), Streams |
| Message Queue | RabbitMQ | Reliable job processing |
| Search | Meilisearch | Faster setup than Elastic; sufficient for Year 1 |
| Object Storage | AWS S3 | Standard |
| CDN | CloudFront | Geographic edge cache |
| Email | SendGrid (primary) + AWS SES (backup) | Deliverability |
| SMS | Twilio (global) + Alpha SMS (BD local) | Local routing cheaper |
| WhatsApp | Meta WhatsApp Business API via Twilio | Official |
| Push Notif | FCM (Android) + APNS (iOS) | Native |
| Mobile | React Native + Expo | Single codebase |
| Container | Docker | Standard |
| Orchestration | AWS ECS Fargate (MVP) → EKS (V1.5+) | Less ops overhead initially |
| IaC | Terraform | Industry standard |
| CI/CD | GitHub Actions | Tight Git integration |
| Observability | Sentry + Grafana Cloud + OpenTelemetry | Errors + metrics + traces |
| Feature Flags | Unleash (self-hosted) | OSS, GDPR-friendly |
| Secrets | AWS Secrets Manager | Auto-rotation |
| WAF | Cloudflare | DDoS + bot |
| Auth (managed option) | AWS Cognito for MVP → custom IDP V1.5 | Reduce initial scope |
| Payments | Stripe + SSLCommerz + bKash + Nagad + UPI | Multi-rail |
| LLM | Anthropic Claude (primary) + GPT-4 (fallback) | Bengali quality |

### ৩.২ High-Level Architecture Diagram (text)

```
                       ┌──────────────────────────────┐
                       │   Cloudflare WAF + CDN       │
                       └──────────────┬───────────────┘
                                      │
        ┌─────────────────────────────┼────────────────────────────────┐
        ▼                             ▼                                ▼
┌────────────────┐         ┌──────────────────┐              ┌──────────────────┐
│ Marketing Site │         │  Dashboard SPA   │              │ Booking Engine   │
│ (Next.js SSG)  │         │  (Next.js SSR)   │              │ (Next.js SSR)    │
└────────────────┘         └─────────┬────────┘              └────────┬─────────┘
                                     │                                │
                                     ▼                                ▼
                       ┌──────────────────────────────────────────────────┐
                       │            API Gateway (NestJS)                  │
                       │  REST + GraphQL (V1.5) + WebSocket               │
                       │  Auth (JWT) + Tenant context + Rate limit        │
                       └──────────┬───────────────────────────────────────┘
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       ▼                          ▼                          ▼
┌──────────────┐         ┌─────────────────┐         ┌──────────────────┐
│ App Services │         │ Channel Sync    │         │ Background Jobs  │
│ (NestJS)     │◄───────►│ Engine (Go)     │◄───────►│ Workers (Node)   │
│  - Bookings  │  Queue  │  - OTA adapters │  Queue  │  - Email/SMS     │
│  - PMS       │         │  - Mapping      │         │  - Report gen    │
│  - Billing   │         │  - Rate parity  │         │  - Night audit   │
│  - etc.      │         │  - Webhooks in  │         │  - Cron tasks    │
└──────┬───────┘         └─────────┬───────┘         └────────┬─────────┘
       │                           │                          │
       └───────────┬───────────────┴──────────────────────────┘
                   ▼
        ┌─────────────────────────────────────────────────────┐
        │  Data Layer                                         │
        │  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐  │
        │  │ PostgreSQL  │ │  Redis   │ │  Meilisearch     │  │
        │  │ (primary +  │ │ (cache,  │ │  (search)        │  │
        │  │ read replica)│ │ lock,   │ │                  │  │
        │  └─────────────┘ │ streams) │ └──────────────────┘  │
        │                  └──────────┘                       │
        │  ┌─────────────┐ ┌────────────────────────────────┐ │
        │  │ S3 (files)  │ │ ClickHouse (analytics — V1.5)  │ │
        │  └─────────────┘ └────────────────────────────────┘ │
        └─────────────────────────────────────────────────────┘
                   │
                   ▼
        ┌─────────────────────────────────────────┐
        │ External Integrations                   │
        │  OTAs · Payment gateways · WhatsApp     │
        │  · Email · SMS · Accounting · Door lock │
        └─────────────────────────────────────────┘
```

### ৩.৩ Service Boundaries (Module Map)

| Service | Repo | Responsibility |
|---------|------|---------------|
| `web-dashboard` | atlas-web | Hotelier admin SPA (Next.js) |
| `web-booking` | atlas-booking | Direct booking engine (Next.js) |
| `web-marketing` | atlas-site | Landing pages (Next.js SSG) |
| `api-gateway` | atlas-api | NestJS REST/GraphQL + auth |
| `sync-engine` | atlas-sync | Go service for OTA push/poll |
| `worker` | atlas-worker | Background jobs (NestJS Bull) |
| `mobile-staff` | atlas-mobile | React Native staff app |
| `mobile-owner` | atlas-mobile | (Same RN repo, separate target) |
| `infra` | atlas-infra | Terraform modules |
| `shared` | atlas-shared | TS types, contracts, validation schemas |

Monorepo (Turborepo / Nx) recommended for shared types.

---

## ৪. Multi-tenancy & Tenant Isolation

### ৪.১ Tenancy Model
- **Basic/Pro tier:** Shared DB + PostgreSQL **Row-Level Security (RLS)**
- **Enterprise tier:** Optional dedicated schema; or fully dedicated DB instance (compliance)

### ৪.২ RLS Pattern (every table)
```sql
-- Every business table has tenant_id
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON reservations
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### ৪.৩ Tenant Context Middleware (NestJS)
```typescript
// Pseudo-code
@Injectable()
export class TenantContextMiddleware {
  use(req, res, next) {
    const tenantId = extractTenantFromJWT(req);
    await pgPool.query(`SET LOCAL app.current_tenant_id = $1`, [tenantId]);
    req.tenantId = tenantId;
    next();
  }
}
```

### ৪.৪ Tenant Hierarchy
```
Tenant (organization/chain)
  └── Property (individual hotel)
       └── Room Type
            └── Room (physical)
       └── Rate Plan
       └── User (with role per property)
```

### ৪.৫ Cross-Tenant Operations
- Super-admin operations bypass RLS via service role (audit-logged)
- Reseller portal aggregates child tenants (parent-child relationship)
- Chain reporting: aggregates across properties under same tenant

---

## ৫. Coding Standards & Conventions

### ৫.১ Naming
- **Files:** kebab-case (`reservation.service.ts`)
- **Classes:** PascalCase (`ReservationService`)
- **Variables/functions:** camelCase (`createReservation`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_PAX_PER_BOOKING`)
- **DB tables:** snake_case plural (`reservations`, `room_types`)
- **DB columns:** snake_case (`created_at`, `tenant_id`)
- **API paths:** kebab-case plural (`/api/v1/reservations`, `/api/v1/room-types`)
- **Env vars:** SCREAMING_SNAKE_CASE (`DATABASE_URL`, `STRIPE_API_KEY`)

### ৫.২ TypeScript Rules
- `strict: true`, `noUncheckedIndexedAccess: true`
- No `any` (eslint enforce); use `unknown` if truly unknown
- DTO with Zod schema for all API inputs
- All async functions return `Promise<Result<T, Error>>` or throw typed exceptions

### ৫.৩ Folder Structure (NestJS service)
```
src/
  modules/
    reservations/
      dto/
      entities/
      services/
      controllers/
      events/
      tests/
      reservations.module.ts
  common/
    decorators/
    guards/
    interceptors/
    pipes/
  config/
  database/
    migrations/
    seeds/
  main.ts
```

### ৫.৪ Frontend Folder Structure (Next.js)
```
app/
  (dashboard)/
    properties/
    reservations/
    calendar/
    reports/
  (booking)/
    [propertySlug]/
  (auth)/
  api/
  layout.tsx
components/
  ui/         # shadcn
  forms/
  layout/
  charts/
lib/
  api-client/
  hooks/
  utils/
features/
  reservation/
  calendar/
  ...
```

### ৫.৫ Commit Message Convention (Conventional Commits)
```
feat(reservations): add walk-in booking flow
fix(sync): handle Booking.com 503 with exponential backoff
docs(api): update reservation endpoint examples
refactor(folio): extract posting logic to service
chore(deps): bump prisma to 5.10
```

### ৫.৬ Comments Policy
- No "what" comments (code self-documents)
- Only "why" comments for non-obvious decisions
- TODO/FIXME with ticket reference: `// TODO(ATLAS-123): handle overbooking edge case`

---

## ৬. Git Workflow & Branching

### ৬.১ Branch Strategy
- `main` — always deployable; production-tracked
- `develop` — integration branch
- `feature/ATLAS-XXX-short-name` — per ticket
- `fix/ATLAS-XXX-short-name` — bug fix
- `release/v1.2.0` — release prep (only for non-trunk strategy)
- `hotfix/ATLAS-XXX` — emergency prod fix from `main`

### ৬.২ Pull Request Rules
- 1+ reviewer approval required
- All CI checks green
- No direct push to `main` / `develop`
- Squash-merge for feature → develop
- PR template includes: summary, screenshots (for UI), test plan, breaking changes

### ৬.৩ Code Review Checklist
- Tests added for new logic
- No secrets / PII in code
- Migration is reversible
- Performance considered (N+1 queries?)
- Accessibility (forms, ARIA)
- i18n strings extracted

---

## ৭. DevOps, CI/CD & Environments

### ৭.১ Environments
| Env | Purpose | URL | Data |
|-----|---------|-----|------|
| local | Dev machine | localhost | Faker seed |
| ephemeral-pr | Per-PR preview | atlas-pr-NNN.dev | Faker seed |
| dev | Integration | dev.atlas.app | Faker + anonymized prod snapshot weekly |
| staging | Pre-prod | staging.atlas.app | Anonymized prod snapshot |
| production | Live | app.atlas.app | Real |

### ৭.২ CI Pipeline (GitHub Actions)
```yaml
On PR:
  - lint (eslint, prettier, golangci-lint)
  - type-check (tsc --noEmit)
  - unit tests (>80% coverage gate)
  - integration tests (against ephemeral PG)
  - security scan (Snyk, Semgrep, gitleaks)
  - build container images
  - deploy ephemeral-pr environment
  - E2E tests (Playwright) against ephemeral
  - accessibility check (axe)
  - bundle size check (size-limit)

On merge to develop:
  - all above
  - deploy to dev
  - smoke test

On merge to main (via release branch or direct):
  - deploy to staging
  - manual approval gate
  - canary deploy to prod (10% → 50% → 100%)
  - auto-rollback on error rate spike
```

### ৭.৩ Deployment Strategy
- **App services:** Blue-green via ECS Service Update with health check gate
- **Sync engine:** Rolling with max-surge=1 (preserve in-flight jobs)
- **DB migrations:** Run separately before app deploy; only backward-compatible
- **Frontend:** Atomic deploy via S3 + CloudFront invalidation

### ৭.৪ Environment Variables (key list)
```
DATABASE_URL
REDIS_URL
RABBITMQ_URL
JWT_SECRET                  (rotated quarterly)
STRIPE_SECRET_KEY
SSLCOMMERZ_STORE_ID
SSLCOMMERZ_STORE_PASSWORD
BKASH_APP_KEY
BKASH_APP_SECRET
SENDGRID_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
WHATSAPP_PHONE_NUMBER_ID
ANTHROPIC_API_KEY
SENTRY_DSN
OPENTELEMETRY_ENDPOINT
AWS_REGION=ap-south-1
S3_BUCKET_DOCUMENTS
S3_BUCKET_BACKUPS
ENCRYPTION_KEY_PII         (KMS key ID)
TENANT_DEFAULT_TIER=basic
NODE_ENV=production
```

---

## ৮. Folder & Repository Structure

(See Section ৫.৩ and ৫.৪ for service-level layouts. Top-level monorepo:)

```
atlas/
├── apps/
│   ├── api/              # NestJS gateway
│   ├── sync/             # Go sync engine
│   ├── worker/           # Background jobs
│   ├── web-dashboard/    # Next.js admin
│   ├── web-booking/      # Next.js booking engine
│   ├── web-marketing/    # Landing
│   └── mobile/           # RN app
├── packages/
│   ├── shared-types/     # Zod schemas + TS types
│   ├── ui-components/    # Shared React components
│   ├── eslint-config/
│   └── tsconfig/
├── infra/                # Terraform
├── docs/
│   ├── adr/              # Architecture Decision Records
│   ├── runbooks/
│   └── api/              # OpenAPI specs
├── .github/workflows/
├── turbo.json
└── package.json
```

---

# PART II — Domain Model

## ৯. Entity Relationship Overview

```
Tenant (1) ─── (N) Property (1) ─── (N) RoomType (1) ─── (N) Room
   │                  │                    │
   │                  ├── (N) RatePlan ────┘
   │                  │
   │                  ├── (N) User
   │                  │
   │                  ├── (N) Channel (subscription per OTA)
   │                  │       └── (N) ChannelMapping (room/rate)
   │                  │
   │                  ├── (N) Reservation
   │                  │       ├── (N) ReservationRoom
   │                  │       ├── (N) Folio
   │                  │       │       └── (N) FolioPosting
   │                  │       └── (N) Payment
   │                  │
   │                  ├── (N) Guest (also tenant-level for chain)
   │                  ├── (N) InventoryDaily
   │                  ├── (N) RateDaily
   │                  └── (N) Restriction
   │
   └── (N) Subscription (SaaS billing)
```

## ১০. Core Tables (with Schema)

### ১০.১ `tenants`
```sql
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('trial','basic','pro','enterprise')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','churned')),
  country         CHAR(2) NOT NULL,
  default_currency CHAR(3) NOT NULL,
  default_locale  TEXT NOT NULL DEFAULT 'bn-BD',
  default_timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  trial_ends_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB NOT NULL DEFAULT '{}'
);
```

### ১০.২ `properties`
```sql
CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT,
  postal_code     TEXT,
  country         CHAR(2) NOT NULL,
  timezone        TEXT NOT NULL,
  currency        CHAR(3) NOT NULL,
  check_in_time   TIME DEFAULT '14:00',
  check_out_time  TIME DEFAULT '12:00',
  star_rating     INT,
  total_rooms     INT,
  contact_email   TEXT,
  contact_phone   TEXT,
  geo_lat         NUMERIC(9,6),
  geo_lng         NUMERIC(9,6),
  policies        JSONB NOT NULL DEFAULT '{}', -- cancellation, pets, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);
CREATE INDEX idx_properties_tenant ON properties(tenant_id);
```

### ১০.৩ `users` & `user_property_roles`
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  email           TEXT NOT NULL,
  phone           TEXT,
  password_hash   TEXT,
  full_name       TEXT NOT NULL,
  preferred_locale TEXT DEFAULT 'bn-BD',
  status          TEXT NOT NULL DEFAULT 'active',
  mfa_secret      TEXT,
  mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
  last_login_at   TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE user_property_roles (
  user_id         UUID NOT NULL REFERENCES users(id),
  property_id     UUID NOT NULL REFERENCES properties(id),
  role            TEXT NOT NULL, -- 'owner','gm','fom','front_desk','hk_supervisor','hk_staff','accountant','read_only'
  PRIMARY KEY (user_id, property_id)
);
```

### ১০.৪ `room_types` & `rooms`
```sql
CREATE TABLE room_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL REFERENCES properties(id),
  code            TEXT NOT NULL, -- e.g. 'DLX', 'SUP'
  name            TEXT NOT NULL,
  description     TEXT,
  base_occupancy  INT NOT NULL DEFAULT 2,
  max_occupancy   INT NOT NULL DEFAULT 2,
  max_adults      INT NOT NULL DEFAULT 2,
  max_children    INT NOT NULL DEFAULT 0,
  extra_bed_allowed BOOLEAN DEFAULT false,
  extra_bed_charge NUMERIC(12,2),
  amenities       JSONB DEFAULT '[]',
  photos          JSONB DEFAULT '[]',
  display_order   INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, code)
);

CREATE TABLE rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL REFERENCES properties(id),
  room_type_id    UUID NOT NULL REFERENCES room_types(id),
  room_number     TEXT NOT NULL,
  floor           TEXT,
  status          TEXT NOT NULL DEFAULT 'clean'
                   CHECK (status IN ('clean','dirty','inspected','out_of_order','out_of_service','occupied')),
  features        JSONB DEFAULT '{}', -- {smoking:false, accessible:false, view:'sea'}
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(property_id, room_number)
);
```

### ১০.৫ `rate_plans`
```sql
CREATE TABLE rate_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL,
  code            TEXT NOT NULL, -- 'BAR', 'BB-NRF', etc.
  name            TEXT NOT NULL,
  description     TEXT,
  meal_plan       TEXT, -- 'RO','BB','HB','FB','AI'
  is_refundable   BOOLEAN DEFAULT true,
  cancellation_policy_id UUID,
  parent_rate_plan_id UUID REFERENCES rate_plans(id),
  derivation_type TEXT, -- 'absolute','percentage','fixed_amount'
  derivation_value NUMERIC(12,4),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, code)
);
```

### ১০.৬ `inventory_daily` (partitioned monthly)
```sql
CREATE TABLE inventory_daily (
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL,
  room_type_id    UUID NOT NULL,
  stay_date       DATE NOT NULL,
  total           INT NOT NULL,
  sold            INT NOT NULL DEFAULT 0,
  blocked         INT NOT NULL DEFAULT 0, -- OOO/OOS/maintenance
  available       INT GENERATED ALWAYS AS (total - sold - blocked) STORED,
  PRIMARY KEY (property_id, room_type_id, stay_date)
) PARTITION BY RANGE (stay_date);
```

### ১০.৭ `rate_daily` & `restrictions_daily`
```sql
CREATE TABLE rate_daily (
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL,
  room_type_id    UUID NOT NULL,
  rate_plan_id    UUID NOT NULL,
  stay_date       DATE NOT NULL,
  rate_amount     NUMERIC(12,2) NOT NULL,
  currency        CHAR(3) NOT NULL,
  PRIMARY KEY (property_id, room_type_id, rate_plan_id, stay_date)
);

CREATE TABLE restrictions_daily (
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL,
  room_type_id    UUID NOT NULL,
  rate_plan_id    UUID NOT NULL,
  stay_date       DATE NOT NULL,
  min_los         INT,
  max_los         INT,
  cta             BOOLEAN DEFAULT false,
  ctd             BOOLEAN DEFAULT false,
  stop_sell       BOOLEAN DEFAULT false,
  min_advance     INT,
  max_advance     INT,
  PRIMARY KEY (property_id, room_type_id, rate_plan_id, stay_date)
);
```

### ১০.৮ `reservations`
```sql
CREATE TABLE reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL,
  reservation_no  TEXT NOT NULL, -- human readable, e.g. RSV-2026-00001
  status          TEXT NOT NULL CHECK (status IN
                   ('inquiry','quote','tentative','confirmed','checked_in',
                    'in_house','checked_out','cancelled','no_show')),
  source          TEXT NOT NULL, -- 'direct','booking_com','agoda','expedia','airbnb','hotelbeds','sharetrip','walk_in','phone','ota_other'
  source_reference TEXT, -- OTA booking ID
  channel_id      UUID, -- FK to channels (if from OTA)
  guest_id        UUID, -- primary guest
  arrival_date    DATE NOT NULL,
  departure_date  DATE NOT NULL,
  nights          INT GENERATED ALWAYS AS (departure_date - arrival_date) STORED,
  adults          INT NOT NULL DEFAULT 1,
  children        INT DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        CHAR(3) NOT NULL,
  payment_status  TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid','partial','paid','refunded'
  special_requests TEXT,
  internal_notes  TEXT,
  cancellation_reason TEXT,
  cancelled_at    TIMESTAMPTZ,
  checked_in_at   TIMESTAMPTZ,
  checked_out_at  TIMESTAMPTZ,
  created_by      UUID, -- user_id
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, reservation_no)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_res_property_dates ON reservations(property_id, arrival_date, departure_date);
CREATE INDEX idx_res_status ON reservations(property_id, status);
CREATE INDEX idx_res_source_ref ON reservations(source, source_reference) WHERE source_reference IS NOT NULL;
```

### ১০.৯ `reservation_rooms` (one row per room per stay)
```sql
CREATE TABLE reservation_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL REFERENCES reservations(id),
  room_type_id    UUID NOT NULL,
  rate_plan_id    UUID NOT NULL,
  room_id         UUID, -- assigned room (nullable until assignment)
  guest_id        UUID, -- main occupant of this room
  adults          INT NOT NULL,
  children        INT DEFAULT 0,
  rate_per_night  NUMERIC(12,2) NOT NULL,
  total_amount    NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'reserved'
);
```

### ১০.১০ `guests`
```sql
CREATE TABLE guests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  date_of_birth   DATE,
  nationality     CHAR(2),
  gender          TEXT,
  id_type         TEXT, -- 'passport','nid','driver_license'
  id_number_encrypted BYTEA, -- field-level encrypted
  address         JSONB,
  preferences     JSONB DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  is_vip          BOOLEAN DEFAULT false,
  is_blacklisted  BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  loyalty_points  INT DEFAULT 0,
  total_stays     INT DEFAULT 0,
  total_spend     NUMERIC(14,2) DEFAULT 0,
  consent         JSONB DEFAULT '{}', -- {marketing:true, sms:true, whatsapp:true, granted_at:...}
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_guests_email ON guests(tenant_id, email);
CREATE INDEX idx_guests_phone ON guests(tenant_id, phone);
```

### ১০.১১ `folios` & `folio_postings`
```sql
CREATE TABLE folios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL,
  reservation_id  UUID REFERENCES reservations(id),
  folio_no        TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'guest', -- 'guest','master','company','permanent'
  status          TEXT NOT NULL DEFAULT 'open', -- 'open','closed'
  currency        CHAR(3) NOT NULL,
  opened_at       TIMESTAMPTZ DEFAULT now(),
  closed_at       TIMESTAMPTZ,
  UNIQUE(property_id, folio_no)
);

CREATE TABLE folio_postings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id        UUID NOT NULL REFERENCES folios(id),
  posting_date    DATE NOT NULL,
  category        TEXT NOT NULL, -- 'room','tax','f_and_b','spa','laundry','minibar','service_charge','discount'
  description     TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  quantity        NUMERIC(10,2) DEFAULT 1,
  tax_breakdown   JSONB DEFAULT '[]',
  is_reversal     BOOLEAN DEFAULT false,
  reversed_by_id  UUID,
  posted_by       UUID, -- user_id
  posted_at       TIMESTAMPTZ DEFAULT now()
);
```

### ১০.১২ `payments`
```sql
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL,
  reservation_id  UUID,
  folio_id        UUID,
  amount          NUMERIC(12,2) NOT NULL,
  currency        CHAR(3) NOT NULL,
  method          TEXT NOT NULL, -- 'card','cash','bkash','nagad','rocket','upi','bank_transfer','vcc','other'
  gateway         TEXT, -- 'stripe','sslcommerz','bkash',...
  gateway_reference TEXT,
  status          TEXT NOT NULL, -- 'pending','authorized','captured','failed','refunded','partial_refund'
  card_brand      TEXT,
  card_last4      TEXT,
  is_refund       BOOLEAN DEFAULT false,
  refunded_payment_id UUID,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### ১০.১৩ `channels` & `channel_mappings`
```sql
CREATE TABLE channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL,
  channel_code    TEXT NOT NULL, -- 'booking_com','agoda','expedia',...
  hotel_id_at_channel TEXT, -- e.g. Booking.com hotel_id
  credentials_encrypted BYTEA,
  is_active       BOOLEAN DEFAULT true,
  last_sync_at    TIMESTAMPTZ,
  last_sync_status TEXT,
  config          JSONB DEFAULT '{}',
  UNIQUE(property_id, channel_code)
);

CREATE TABLE channel_mappings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      UUID NOT NULL REFERENCES channels(id),
  room_type_id    UUID NOT NULL,
  rate_plan_id    UUID NOT NULL,
  channel_room_id TEXT NOT NULL,
  channel_rate_id TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT true
);
```

### ১০.১৪ `sync_jobs` (audit + retry)
```sql
CREATE TABLE sync_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  channel_id      UUID NOT NULL,
  job_type        TEXT NOT NULL, -- 'ari_push','reservation_pull','rate_push','restriction_push','mapping_pull'
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued', -- 'queued','running','succeeded','failed','dead_letter'
  attempt_count   INT DEFAULT 0,
  last_error      TEXT,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
CREATE INDEX idx_sync_jobs_pending ON sync_jobs(status, next_retry_at) WHERE status IN ('queued','failed');
```

### ১০.১৫ Additional Tables (summary list)
- `audit_log` — immutable, hash-chained
- `notifications` — in-app notification queue
- `notification_preferences` — per user
- `subscriptions` — SaaS billing per tenant
- `invoices` — SaaS invoices
- `tax_codes` — jurisdiction tax definitions
- `tax_postings` — applied to folio
- `cancellation_policies`
- `promo_codes`
- `housekeeping_tasks`
- `maintenance_tickets`
- `pos_outlets`, `pos_menu_items`, `pos_orders`, `pos_order_items`
- `staff`, `staff_shifts`, `staff_attendance`, `payroll_runs`
- `vendors`, `purchase_orders`, `stock_items`, `stock_movements`
- `assets`, `amc_contracts`
- `loyalty_tiers`, `loyalty_transactions`
- `reviews_imported` (from Booking/Google/TripAdvisor)
- `feature_flags_tenant_overrides`
- `webhooks_outbound`
- `api_keys`
- `marketing_campaigns`, `marketing_segments`
- `documents_attached`

(Each follows tenant_id + RLS + audit triggers pattern.)

---

## ১১. State Machines

### ১১.১ Reservation State Machine
```
inquiry ──[create_quote]──▶ quote ──[confirm]──▶ tentative ──[deposit_paid]──▶ confirmed
                                                                    │
   ┌────────────────────────────────────────────────────────────────┘
   ▼
confirmed ──[check_in]──▶ checked_in ──[room_assigned]──▶ in_house ──[check_out]──▶ checked_out
   │                          │                                │
   │                          │                                ├──[late_checkout]──▶ in_house
   └──[cancel]──▶ cancelled   ├──[no_show_after_cutoff]──▶ no_show
                              └──[cancel]──▶ cancelled

Allowed transitions enforced by service layer + DB CHECK.
Every transition logged in audit_log with user_id, reason.
```

### ১১.২ Folio State Machine
```
open ──[post_charges, post_payments]──▶ open ──[zero_balance_close]──▶ closed
  │                                                                       │
  └──[transfer_to_other_folio]──▶ open                                    │
                                                                          │
closed ──[manual_reopen_with_audit]──▶ open ◄─────────────────────────────┘
```

### ১১.৩ Channel Sync Job State Machine
```
queued ──[worker_picks]──▶ running ──[success]──▶ succeeded
                              │
                              ├──[transient_error]──▶ failed ──[retry_with_backoff]──▶ queued
                              │                          │
                              │                          └──[max_attempts_reached]──▶ dead_letter
                              │
                              └──[permanent_error]──▶ dead_letter (manual review)
```

### ১১.৪ Payment State Machine
```
pending ──[gateway_authorize]──▶ authorized ──[capture]──▶ captured
   │                                  │                       │
   │                                  └──[void]──▶ voided     ├──[refund]──▶ refunded
   │                                                          └──[partial_refund]──▶ partial_refund
   └──[gateway_fail]──▶ failed
```

---

## ১২. Business Rules & Invariants

### Inventory Invariants
1. `inventory_daily.sold + inventory_daily.blocked ≤ inventory_daily.total` (enforced by trigger)
2. No room can be assigned to two confirmed reservations with overlapping dates
3. Stop-sell channel level overrides allotment level

### Reservation Invariants
1. `departure_date > arrival_date` (CHECK constraint)
2. Cannot cancel `checked_in`, `in_house`, `checked_out` reservations (only "modify" allowed)
3. `total_amount` must equal sum of `reservation_rooms.total_amount`
4. `payment_status = 'paid'` requires sum(payments where captured) ≥ total_amount

### Folio Invariants
1. Folio balance = SUM(postings.amount) - SUM(payments.amount) applied
2. Closing folio requires zero balance OR transfer to another folio
3. Cannot delete a posting; only reverse with new entry

### Rate Plan Invariants
1. Child rate plan derivation referencing parent must not be circular
2. Rate cannot be negative (CHECK)

### Channel Sync Invariants
1. Every booking from OTA must have idempotency key = `source + source_reference`
2. ARI push delta only (compare last known state vs new)
3. Retry on 5xx, do not retry on 4xx (except 429)

---

## ১৩. Event Catalog (Domain Events)

### Event Naming: `{aggregate}.{verb_past_tense}`

| Event | Payload Schema | Subscribers |
|-------|---------------|-------------|
| `reservation.created` | reservation_id, source, total | sync-engine, marketing, analytics |
| `reservation.modified` | reservation_id, changes | sync-engine, analytics |
| `reservation.cancelled` | reservation_id, reason | sync-engine, marketing, refund-handler |
| `reservation.checked_in` | reservation_id, room_id, user_id | hk-module, marketing |
| `reservation.checked_out` | reservation_id, folio_id | accounting, marketing, loyalty |
| `payment.captured` | payment_id, reservation_id, amount | reservation, accounting, notification |
| `payment.refunded` | payment_id, amount | reservation, accounting, notification |
| `inventory.updated` | property_id, room_type_id, date, delta | sync-engine, analytics |
| `rate.updated` | property_id, room_type_id, rate_plan_id, date | sync-engine |
| `restriction.updated` | property_id, room_type_id, rate_plan_id, date | sync-engine |
| `channel.booking_received` | channel_id, source_reference | reservation |
| `channel.sync_failed` | channel_id, job_id, error | super-admin alert, ops |
| `room.status_changed` | room_id, from, to, user_id | reservation (if checked_in) |
| `guest.created` | guest_id | marketing |
| `folio.posted` | folio_id, posting_id, amount | analytics |
| `folio.closed` | folio_id, reservation_id | analytics, loyalty |
| `night_audit.completed` | property_id, business_date | reports |
| `subscription.tier_changed` | tenant_id, old_tier, new_tier | feature_flags |
| `subscription.suspended` | tenant_id | sync-engine (stop syncing) |

### Event Delivery
- **In-process:** Synchronous via NestJS EventEmitter for same-bounded-context
- **Cross-service:** RabbitMQ topic exchange, durable queues, manual ack
- **External (webhooks):** Outbox pattern → dedicated worker → POST to subscriber URL with HMAC signature

---

# PART III — API Design

## ১৪. REST API Conventions

### Base URL
```
https://api.atlas.app/v1
```
Versioning in URL path. Breaking changes → new version. Non-breaking additions allowed in same version.

### Resource Naming
- Plural nouns: `/reservations`, `/properties`
- Nested sparingly: `/properties/:propertyId/rooms` (only for clear hierarchy)
- Actions as sub-resources: `POST /reservations/:id/check-in` instead of `POST /reservations/:id?action=checkin`

### HTTP Methods
| Method | Use |
|--------|-----|
| GET | Read (idempotent, cacheable) |
| POST | Create or non-idempotent action |
| PUT | Full replace (rarely used) |
| PATCH | Partial update (preferred) |
| DELETE | Soft delete (sets deleted_at) |

### Standard Headers
```
Authorization: Bearer <jwt>
X-Tenant-Id: <uuid>            (validated against JWT claim)
X-Request-Id: <uuid>           (echoed in response, used in logs)
X-Idempotency-Key: <uuid>      (required for POST/PATCH on payments, reservations)
Accept-Language: bn-BD          (i18n response)
```

### Response Envelope
**Success (single resource):**
```json
{
  "data": { "id": "...", "...": "..." },
  "meta": { "request_id": "..." }
}
```
**Success (list):**
```json
{
  "data": [ ... ],
  "meta": {
    "request_id": "...",
    "pagination": { "page": 1, "page_size": 50, "total": 234, "has_more": true }
  }
}
```
**Error:**
```json
{
  "error": {
    "code": "RESERVATION_NOT_FOUND",
    "message": "No reservation found with id xyz",
    "details": { "id": "xyz" },
    "request_id": "..."
  }
}
```

---

## ১৫. Authentication & Authorization

### Authentication
- **Login:** `POST /auth/login` { email, password } → returns short-lived **access token (15 min JWT)** + long-lived **refresh token (30 days, rotating)**
- **Refresh:** `POST /auth/refresh` { refresh_token } → new pair
- **MFA:** TOTP — if `mfa_enabled`, after password verify return `mfa_required` challenge, then `POST /auth/mfa/verify`
- **SSO (Enterprise):** SAML 2.0 / OIDC via IDP redirect

### JWT Claims
```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "properties": ["prop1", "prop2"],
  "roles": {"prop1": "gm", "prop2": "front_desk"},
  "tier": "pro",
  "iat": 1700000000,
  "exp": 1700000900
}
```

### Authorization Layer
- **Guards:** NestJS guard validates JWT → loads RBAC permissions → checks against required permission per endpoint
- **Permission format:** `{resource}.{action}` → e.g., `reservation.create`, `reservation.cancel`, `report.financial.view`
- **Property scope:** Every endpoint that operates on a property checks user has role at that property
- **Tenant scope:** Enforced at DB layer via RLS

### API Key Authentication (B2B integrations, public API)
- `POST /api-keys` returns key prefix + secret (only shown once)
- Header: `Authorization: ApiKey <prefix>.<secret>`
- Scopes per key
- Rate-limited per key

---

## ১৬. Error Handling & Status Codes

| HTTP | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation failure |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Authenticated but lacks permission |
| 404 | Not Found | Resource doesn't exist or not accessible |
| 409 | Conflict | State conflict (e.g., overbooking) |
| 422 | Unprocessable | Business rule violation |
| 429 | Too Many Requests | Rate limit hit |
| 500 | Internal Server Error | Unexpected — always logged |
| 502/503/504 | Bad Gateway / Service Unavailable / Gateway Timeout | Upstream issues |

### Error Code Catalog (excerpt; see Appendix B)
- `VALIDATION_FAILED`
- `RESERVATION_NOT_FOUND`
- `INVENTORY_INSUFFICIENT`
- `RATE_NOT_AVAILABLE`
- `RESTRICTION_VIOLATED` (with details: `min_los`, `cta`, `stop_sell`)
- `OVERBOOKING_PREVENTED`
- `PAYMENT_DECLINED`
- `IDEMPOTENCY_KEY_REUSED`
- `CHANNEL_NOT_CONNECTED`
- `SUBSCRIPTION_INACTIVE`
- `TENANT_SUSPENDED`
- `MFA_REQUIRED`
- `PERMISSION_DENIED`

---

## ১৭. Pagination, Filtering, Sorting

### Pagination (cursor-based for performance)
```
GET /reservations?cursor=eyJpZCI6Li4ufQ&page_size=50
```
Response includes `next_cursor` if more results. Offset-based fallback: `?page=1&page_size=50`.

### Filtering
```
GET /reservations?status=in_house&arrival_date_gte=2026-06-01&arrival_date_lte=2026-06-30
GET /reservations?source=booking_com,agoda
```

### Sorting
```
GET /reservations?sort=-created_at,arrival_date    # - prefix = descending
```

### Field Selection (sparse fieldsets)
```
GET /reservations?fields=id,arrival_date,total_amount,guest.full_name
```

---

## ১৮. Rate Limiting & Idempotency

### Rate Limits (Redis token bucket)
- **Anonymous:** 30 req/min per IP
- **Authenticated user:** 600 req/min
- **API key — Basic tier:** 1000 req/hour
- **API key — Pro tier:** 10000 req/hour
- **API key — Enterprise:** 100000 req/hour + burst

Headers returned:
```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 542
X-RateLimit-Reset: 1700000900
```

### Idempotency
- Required header `X-Idempotency-Key` on `POST /reservations`, `POST /payments`, `POST /reservations/:id/check-in`
- Server stores key → response for 24h
- Duplicate key with same body → returns original response
- Duplicate key with different body → 409 with code `IDEMPOTENCY_KEY_CONFLICT`

---

## ১৯. Complete Endpoint Catalog (per module)

### ১৯.১ Auth
```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/mfa/setup
POST   /auth/mfa/verify
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/sso/initiate
GET    /auth/sso/callback
GET    /auth/me                       (current user)
PATCH  /auth/me                       (update profile)
POST   /auth/me/change-password
```

### ১৯.২ Tenant & Properties
```
GET    /tenant                        (current tenant info)
PATCH  /tenant                        (settings)
GET    /properties
POST   /properties                    (create new property)
GET    /properties/:id
PATCH  /properties/:id
DELETE /properties/:id                (soft delete)
GET    /properties/:id/users
POST   /properties/:id/users          (assign user with role)
DELETE /properties/:id/users/:userId
```

### ১৯.৩ Room Type & Rate Plan
```
GET    /properties/:id/room-types
POST   /properties/:id/room-types
PATCH  /properties/:id/room-types/:rtId
DELETE /properties/:id/room-types/:rtId
GET    /properties/:id/room-types/:rtId/rooms
POST   /properties/:id/room-types/:rtId/rooms
PATCH  /properties/:id/rooms/:roomId
GET    /properties/:id/rate-plans
POST   /properties/:id/rate-plans
PATCH  /properties/:id/rate-plans/:rpId
```

### ১৯.৪ Inventory & Rates (Calendar)
```
GET    /properties/:id/inventory?start=YYYY-MM-DD&end=YYYY-MM-DD
PATCH  /properties/:id/inventory       (bulk update)
GET    /properties/:id/rates?start=&end=&rate_plan_id=
PATCH  /properties/:id/rates           (bulk update)
GET    /properties/:id/restrictions?start=&end=
PATCH  /properties/:id/restrictions    (bulk)
POST   /properties/:id/inventory/stop-sell
POST   /properties/:id/inventory/open-sell
```

### ১৯.৫ Reservations
```
GET    /reservations                  (filterable list)
POST   /reservations                  (create — direct/walk-in)
GET    /reservations/:id
PATCH  /reservations/:id
POST   /reservations/:id/cancel
POST   /reservations/:id/check-in
POST   /reservations/:id/check-out
POST   /reservations/:id/no-show
POST   /reservations/:id/rooms/:rrId/assign-room
POST   /reservations/:id/move-room
POST   /reservations/:id/extend-stay
POST   /reservations/:id/early-checkout
GET    /reservations/:id/folio
POST   /reservations/:id/charges       (post folio charge)
POST   /reservations/:id/payments      (record payment)
GET    /reservations/:id/audit-log
GET    /reservations/availability      (date+pax → available room types + rates)
```

### ১৯.৬ Front Desk
```
GET    /front-desk/arrivals?date=
GET    /front-desk/departures?date=
GET    /front-desk/in-house
GET    /front-desk/walk-ins
GET    /front-desk/room-status         (live room status grid)
POST   /front-desk/wake-up-calls
GET    /front-desk/cashier/shifts/current
POST   /front-desk/cashier/shifts/close
```

### ১৯.৭ Housekeeping
```
GET    /housekeeping/rooms?status=
PATCH  /housekeeping/rooms/:id/status
GET    /housekeeping/tasks?assignee_id=&date=
POST   /housekeeping/tasks
PATCH  /housekeeping/tasks/:id
GET    /housekeeping/productivity      (staff perf report)
POST   /housekeeping/lost-and-found
GET    /housekeeping/lost-and-found
```

### ১৯.৮ Night Audit
```
GET    /night-audit/preview            (what will be rolled over)
POST   /night-audit/run                (executes audit)
GET    /night-audit/runs               (history)
GET    /night-audit/runs/:id/report
```

### ১৯.৯ Folio & Cashier
```
GET    /folios/:id
POST   /folios/:id/postings
POST   /folios/:id/postings/:postingId/reverse
POST   /folios/:id/split
POST   /folios/:id/transfer
POST   /folios/:id/close
GET    /folios/:id/print               (PDF stream)
```

### ১৯.১০ Channels
```
GET    /channels                       (connected channels for property)
POST   /channels                       (add new channel)
PATCH  /channels/:id                   (update credentials/config)
DELETE /channels/:id                   (disconnect)
POST   /channels/:id/test-connection
GET    /channels/:id/mappings
POST   /channels/:id/mappings/auto-discover
POST   /channels/:id/mappings          (manual)
PATCH  /channels/:id/mappings/:mId
GET    /channels/:id/sync-jobs?status=
POST   /channels/:id/sync-jobs/:jobId/retry
GET    /channels/:id/rate-parity-report
GET    /channels/:id/commission-report
```

### ১৯.১১ Direct Booking Engine (public — no auth)
```
GET    /booking/:propertySlug/availability?check_in=&check_out=&adults=&children=
GET    /booking/:propertySlug/rates?...
POST   /booking/:propertySlug/quote     (creates inventory hold for 10 min)
POST   /booking/:propertySlug/checkout  (final book)
GET    /booking/:propertySlug/policies
POST   /booking/:propertySlug/promo-codes/validate
```

### ১৯.১২ Guest CRM
```
GET    /guests                         (search, filter)
POST   /guests
GET    /guests/:id
PATCH  /guests/:id
GET    /guests/:id/stays
GET    /guests/:id/communication
POST   /guests/:id/merge               (merge into another guest profile)
POST   /guests/:id/blacklist
DELETE /guests/:id/blacklist
POST   /guests/:id/loyalty/adjust
GET    /guests/segments                (segment definitions)
POST   /guests/segments
```

### ১৯.১৩ F&B / POS
```
GET    /pos/outlets
POST   /pos/outlets/:id/orders
PATCH  /pos/orders/:id
POST   /pos/orders/:id/items
POST   /pos/orders/:id/kot             (print to kitchen)
POST   /pos/orders/:id/settle
GET    /pos/menu
POST   /pos/menu/items
PATCH  /pos/menu/items/:id
GET    /pos/reports/daily-sales
```

### ১৯.১৪ Reports & BI
```
GET    /reports/flash?date=
GET    /reports/pickup?range=7d
GET    /reports/forecast?days=30
GET    /reports/market-segment?from=&to=
GET    /reports/channel-production?from=&to=
GET    /reports/tax?month=
GET    /reports/no-show?from=&to=
GET    /reports/cancellation?from=&to=
GET    /reports/custom                 (saved custom reports)
POST   /reports/custom                 (save custom)
POST   /reports/:id/schedule           (email subscription)
GET    /reports/:id/export?format=pdf|excel|csv
```

### ১৯.১৫ Marketing
```
GET    /marketing/campaigns
POST   /marketing/campaigns
GET    /marketing/campaigns/:id
PATCH  /marketing/campaigns/:id
POST   /marketing/campaigns/:id/send
POST   /marketing/campaigns/:id/test-send
GET    /marketing/templates
POST   /marketing/templates
GET    /marketing/triggers              (auto trigger config)
PATCH  /marketing/triggers/:id
```

### ১৯.১৬ HR / Roster
```
GET    /staff
POST   /staff
PATCH  /staff/:id
GET    /staff/:id/shifts?from=&to=
POST   /staff/shifts                    (create shift)
POST   /staff/shifts/swap-request
POST   /staff/attendance                (manual punch)
GET    /payroll/runs
POST   /payroll/runs                    (process payroll)
GET    /payroll/runs/:id/payslips
```

### ১৯.১৭ Maintenance
```
GET    /maintenance/tickets?status=
POST   /maintenance/tickets
PATCH  /maintenance/tickets/:id
GET    /maintenance/preventive-schedule
POST   /maintenance/work-orders
```

### ১৯.১৮ Subscription Billing (SaaS)
```
GET    /billing/subscription
POST   /billing/subscription/upgrade
POST   /billing/subscription/downgrade
POST   /billing/subscription/cancel
GET    /billing/invoices
GET    /billing/invoices/:id/download
GET    /billing/payment-methods
POST   /billing/payment-methods
```

### ১৯.১৯ Payment Hub
```
POST   /payments/intents                (create gateway-agnostic intent)
GET    /payments/methods-available      (per property/country)
POST   /payments/refunds
```

### ১৯.২০ Super Admin (Internal)
```
GET    /admin/tenants
PATCH  /admin/tenants/:id/suspend
PATCH  /admin/tenants/:id/activate
POST   /admin/tenants/:id/impersonate   (returns scoped JWT, audit logged)
GET    /admin/metrics/mrr
GET    /admin/health/services
GET    /admin/feature-flags
PATCH  /admin/feature-flags/:flag
```

### ১৯.২১ Public API (3rd party)
Same endpoints exposed under `/public/v1/...` with API key auth + stricter rate limits + scopes.

---

## ২০. Webhook Catalog

Tenants can subscribe URLs to events. Outbound POST signed with HMAC-SHA256 using shared secret.

```http
POST <subscriber-url>
Content-Type: application/json
X-Atlas-Event: reservation.created
X-Atlas-Delivery: <uuid>
X-Atlas-Signature: t=<timestamp>,v1=<hmac>
X-Atlas-Timestamp: <epoch>
```

Subscribers must respond 2xx within 10s. Retry: 5min, 30min, 2hr, 12hr, 24hr, then dead-letter.

Events: all events listed in Section ১৩.

---

## ২১. GraphQL Layer (V1.5)

REST remains primary. GraphQL added as facade for complex dashboard queries (avoid waterfall).

```graphql
query DashboardOverview($propertyId: UUID!, $date: Date!) {
  property(id: $propertyId) {
    name
    todayOccupancy(date: $date)
    todayADR(date: $date)
    arrivals(date: $date) { id guestName roomNumber arrivalEta }
    departures(date: $date) { id guestName roomNumber }
    inhouse { count }
    pendingHousekeeping { count }
  }
}
```

---

# PART IV — Module Specifications

> প্রতিটা module-এ structure: **Purpose · User Stories · UI Screens · API used · DB tables · Business rules · Edge cases · Acceptance criteria · Phase tag**

## ২২. Module: Authentication & RBAC **[MVP]**

### Purpose
Secure access to platform; per-property role-based permissions; MFA; SSO for Enterprise.

### User Stories
- US-AUTH-1: As a hotelier, I can sign up with email + password and receive verification email.
- US-AUTH-2: As a returning user, I can log in and stay signed in for 30 days via refresh token.
- US-AUTH-3: As an admin, I can enable 2FA (TOTP) for my account.
- US-AUTH-4: As a property owner, I can invite staff via email with specific role for specific properties.
- US-AUTH-5: As an Enterprise admin, I can configure SAML SSO with Okta/Azure AD.
- US-AUTH-6: As a user, I can reset my password via email link.
- US-AUTH-7: As a user, if I forget my MFA device, I can use backup codes.

### UI Screens
- `/login` — Email + password, "Forgot password?", SSO button if tenant has SSO
- `/login/mfa` — TOTP entry, "Use backup code"
- `/signup` — Tenant name, country, full name, email, password, accept ToS
- `/forgot-password`
- `/reset-password?token=`
- `/sso/callback`
- `/me/security` — MFA setup, backup codes, sessions list, password change

### Business Rules
- Password: min 12 char, 1 upper + 1 lower + 1 digit + 1 symbol
- Lockout: 5 failed attempts → 15 min lockout
- Refresh token rotation: each use issues new, invalidates old
- MFA mandatory for `owner`, `gm`, `accountant` roles (configurable per tenant)

### Edge Cases
- User exists in multiple tenants? — separate accounts; "Account selector" if email matches multiple
- Time skew on TOTP? — accept ±1 window (30s before/after)
- Lost MFA device + backup codes? — Support ticket → identity verification

### Acceptance Criteria
- [ ] Cannot log in after 5 failures within 15 min
- [ ] Refresh token issued only via cookie (HttpOnly, Secure, SameSite=Lax)
- [ ] MFA setup QR code generated server-side; secret never echoed back
- [ ] Audit log entry for every login (success + failure)

---

## ২৩. Module: Tenant & Multi-Property Management **[MVP]**

### Purpose
Manage organization-level settings and multiple hotel properties.

### User Stories
- US-TEN-1: As a tenant admin, I can update tenant-level settings (default currency, locale, timezone).
- US-TEN-2: As a chain owner, I can add a new property with full setup wizard.
- US-TEN-3: As a chain owner, I can switch between properties from a dropdown.
- US-TEN-4: As an admin, I can view consolidated metrics across all properties.

### UI Screens
- `/properties` — Properties list grid (cards with key metrics)
- `/properties/new` — Multi-step wizard (Basic info → Address → Rooms → Rates → Channels → Go-Live checklist)
- `/properties/:id/settings`
- `/properties/:id/policies` (cancellation, child policy, pets, smoking)
- Property switcher in header

### Property Setup Wizard Steps
1. Basic info (name, address, contact, timezone, currency)
2. Room types (with photos)
3. Rooms (numbered)
4. Rate plans (BAR + derived)
5. Tax codes
6. Default cancellation policy
7. Channel connections (optional)
8. Staff invitations
9. Go-live checklist

### Acceptance Criteria
- [ ] Wizard can be saved & resumed
- [ ] Cannot publish property without at least: 1 room type, 1 rate plan, 1 tax code

---

## ২৪. Module: Room Type & Rate Plan **[MVP]**

### Purpose
Define sellable inventory (room types) and pricing (rate plans).

### User Stories
- US-RT-1: Add room type with name, capacity, amenities, photos
- US-RT-2: Add individual rooms under a room type
- US-RT-3: Reorder room types for display
- US-RP-1: Create master BAR rate plan
- US-RP-2: Create derived rate plan (BB = BAR + 500 BDT)
- US-RP-3: Create non-refundable rate plan with cancellation policy

### Rate Derivation
- Absolute: explicit rates per date
- Percentage: parent ± X%
- Fixed: parent ± X amount
- Mealplan inclusion: BB/HB/FB/AI auto-adds meal cost

### Acceptance Criteria
- [ ] Cannot create rate plan with circular parent reference
- [ ] Cannot delete rate plan with active reservations
- [ ] Derived rates auto-recompute when parent changes

---

## ২৫. Module: Inventory & Central Calendar **[MVP]**

### Purpose
Excel-like grid showing inventory, rates, restrictions per room type × date. Bulk operations.

### UI: The Central Calendar
- **Columns:** Date (90+ days horizontal scroll)
- **Rows grouped by:**
  - Room Type → Total / Sold / Available / Blocked
  - Rate Plan → Rate amount
  - Restrictions row → MinLOS / CTA / CTD / Stop-Sell icons
- **Cell editing:** Click → inline edit; drag-select range → bulk modal
- **Color coding:** Green (available), Yellow (low), Red (sold out), Grey (stop sell)
- **Quick filters:** Room type, Channel-specific view

### User Stories
- US-CAL-1: View 30-day occupancy at a glance
- US-CAL-2: Drag-select 7 days → set rate 5000 BDT
- US-CAL-3: Stop-sell channel-specific (only Booking.com for this date range)
- US-CAL-4: Apply MinLOS=3 for weekend dates of next month
- US-CAL-5: Bulk import rates from Excel

### Performance
- Lazy load: load 30 days, prefetch next 30 on scroll
- Optimistic UI: changes appear instantly, sync to backend, revert on error
- WebSocket: live update when other staff makes changes

### Acceptance Criteria
- [ ] 365-day data loads progressively without UI freeze
- [ ] Bulk update of 1000+ cells completes in <2s server-side
- [ ] Concurrent edit by 2 users: last-write-wins with WS notification

---

## ২৬. Module: Reservation Engine **[MVP]**

### Purpose
Core booking creation, modification, lifecycle management.

### Booking Creation Flow
```
1. Check availability (room type × dates × pax)
2. Show available rate plans with prices
3. Capture guest info (existing or new — auto-suggest by phone/email)
4. Calculate total (base + tax + add-ons − discount)
5. Capture payment (or mark "pay at hotel")
6. Confirm → Create reservation, generate confirmation no
7. Decrement inventory (atomic), push to all channels
8. Send confirmation (email + SMS + WhatsApp based on consent)
```

### Modification Flow
- Date change → recalc rates, check availability for new dates
- Pax change → recalc occupancy charge
- Room type change → ditto
- Add room → new reservation_room row
- Cancel → policy-based refund calculation, inventory return, channel push

### Concurrency / Overbooking Prevention
```python
# Pseudo-code in atomic transaction
BEGIN TX
  SELECT FOR UPDATE inventory_daily WHERE property × room_type × date IN dates;
  IF any (total - sold - blocked) < required: ROLLBACK + 409 OVERBOOKING_PREVENTED
  UPDATE inventory_daily SET sold = sold + 1;
  INSERT reservation, reservation_rooms;
  INSERT outbox_event(reservation.created);
COMMIT
```
Redis distributed lock as second guard for cross-instance.

### Edge Cases
- Overlapping channel bookings within ms → first wins, second gets 409 → channel returns "no longer available"
- Partial room assignment (3-night booking, room only available 2 nights)
- Walk-in with no available rooms but expected departures → "waitlist for room" flow
- Booking spanning rate change date (e.g., BAR increased mid-stay): use rate at time of booking unless explicitly overridden

### Acceptance Criteria
- [ ] Cannot create reservation that would cause overbooking even under 1000 concurrent requests
- [ ] Cancellation policy correctly computes refund amount per posted scenarios
- [ ] Source attribution (last-touch) captured

---

## ২৭. Module: Front Desk Operations **[MVP]**

### Daily Operations Dashboard
- Today's arrivals (with ETA, special requests, VIP badge)
- Today's departures (with checkout status)
- In-house guests
- Walk-in availability quick check
- Room status grid (live)
- Pending tasks (HK requests, maintenance tickets)
- Quick search: guest name / phone / room / reservation no

### Check-in Flow
```
1. Search/select reservation
2. Verify guest ID (capture/upload)
3. Assign room (auto-suggest available rooms of type, manual override)
4. Capture payment (if pending)
5. Print registration card (signed copy uploaded)
6. Issue key card (integration trigger or manual)
7. Mark room as 'occupied', reservation → 'checked_in' → 'in_house'
8. If foreign guest: trigger police reporting workflow
9. Send welcome WhatsApp/SMS
```

### Check-out Flow
```
1. View folio balance
2. Mini-bar check (yes/no charges)
3. Late checkout? (charge if applicable)
4. Settle balance (payment or transfer to company folio)
5. Print invoice
6. Generate review request (scheduled for next day)
7. Mark room as 'dirty', reservation → 'checked_out'
8. Loyalty points credit
```

---

## ২৮. Module: Housekeeping **[MVP basic / V1 full]**

### Room Status Flow
```
Dirty → (HK cleans) → Clean → (Supervisor inspects) → Inspected → (Guest checks in) → Occupied
                                                                                          │
                                                                                          ▼
                                                                                       Dirty
OOO/OOS (manual block by HK Supervisor or Maintenance)
```

### Task Assignment
- Auto-assign on departure: room status → dirty, task created, assigned via round-robin or load-balanced
- HK staff mobile app: see assigned rooms, mark status, capture photo, request maintenance

### Productivity Tracking
- Minutes per room average per HK staff
- Inspection pass rate
- Daily summary report

### Lost & Found
- Capture: room, found by, item description, photo
- Claim: contact guest from reservation
- Disposal: timer (30 days), donate/discard with sign-off

---

## ২৯. Module: Night Audit **[MVP]**

### Purpose
Automated end-of-day close: post room charges, process no-shows, advance business date.

### Night Audit Sequence
```
1. Trigger at configured time (default 03:00 local)
2. Lock new postings (briefly)
3. For each in-house reservation:
   a. Post room rate + tax for the night
   b. Calculate any add-ons (extra bed, etc.)
4. Process no-shows:
   a. Reservations with arrival_date = today, status = confirmed, not checked-in by cutoff
   b. Apply no-show charge per policy
   c. Mark status → no_show
5. Generate daily reports (flash, manager, tax, transactions)
6. Advance business date to tomorrow
7. Unlock postings
8. Email reports to configured recipients
9. Archive completed reservation snapshots
```

### Failure Handling
- Idempotent: re-run safe (skip already-posted charges)
- Partial failure: continue with remaining reservations, log errors
- Manual override: GM can force-rerun with reason

### Reports Generated
- Daily Flash
- Manager Report
- Tax Report
- Transaction Listing
- Open Folio Report (warnings)
- Forecast next 7 days

---

## ৩০. Module: Folio & Cashier **[MVP]**

### Folio Types
- **Guest folio:** per reservation, charged to guest
- **Master folio:** group bookings, single bill
- **Company folio:** corporate, charged to company AR
- **Permanent folio:** house accounts (staff, owner use)

### Posting Categories
Room, Tax (sub-types: VAT, Service Charge, Tourism Tax), F&B, Spa, Laundry, Mini-bar, Phone, Other, Discount, Service Charge

### Routing Instructions
"Charge room + tax to company folio; charge incidentals to guest folio."
Implemented as posting routing rules attached to reservation.

### Cashier Shift
- Open shift: opening balance entered
- Postings during shift tagged with `shift_id`
- Close shift: cash count → variance report → supervisor approval if variance > threshold

### Acceptance Criteria
- [ ] Posting reversal creates new entry, never deletes
- [ ] Folio close blocked if non-zero balance (unless transfer)
- [ ] Tax recalculates correctly when discount applied (pre-tax vs post-tax configurable)

---

## ৩১. Module: Channel Sync Engine **[MVP]**

### Architecture
- Go service, horizontally scalable
- Per-channel adapter (interface):
  ```go
  type ChannelAdapter interface {
    PushARI(ctx, channel, ariDelta) error
    PullReservations(ctx, channel, since) ([]Reservation, error)
    HandleWebhook(ctx, channel, payload) error
    TestConnection(ctx, channel) error
  }
  ```
- Adapters: BookingComAdapter, AgodaAdapter, ExpediaAdapter, AirbnbAdapter, HotelbedsAdapter, ShareTripAdapter, GoZayaanAdapter, ...

### Sync Patterns
| Channel | Inbound | Outbound |
|---------|---------|----------|
| Booking.com | Push webhook + Pull retrieveBookings | XML push ARI |
| Agoda (YCS) | Pull bookings poll every 2 min | YCS push |
| Expedia EQC | Webhook + Pull | EQC ARI push |
| Airbnb | Webhook | API push |
| Hotelbeds | Pull bookings every 5 min | ARI push |

### Push ARI Algorithm
```
1. Listen to inventory.updated / rate.updated / restriction.updated events
2. Debounce: batch updates per channel per 2-second window
3. Compute delta vs last known state per channel (stored in Redis)
4. For each channel with mappings:
   a. Translate to channel-specific format (XML/JSON)
   b. Sign request (channel auth)
   c. POST to channel endpoint
   d. On 2xx: update last known state, mark success
   e. On 5xx/429: retry with exponential backoff
   f. On 4xx (non-429): log + dead-letter
5. Update sync_jobs table
```

### Reservation Ingestion
```
1. Webhook received (or poll fetches new booking)
2. Validate HMAC signature
3. Translate channel format → internal Reservation DTO
4. Map channel room_id → internal room_type_id (via channel_mappings)
5. Deduplication: check existing by (source, source_reference)
6. If new: create reservation (with idempotency key = source + source_ref)
7. If modification: update existing reservation
8. If cancellation: cancel internal reservation
9. Acknowledge webhook (2xx)
10. Emit reservation.created event
```

### Rate Parity Monitor (daily job)
- Fetch public rates from each channel via scraping or rate-shopping API
- Compare to direct rate
- Alert if delta > threshold

### Channel Mapping Wizard
- Auto-discover: GET listed rooms from channel API
- Suggest mapping: name + capacity similarity
- Manual confirm
- Test sync: dummy push

### Acceptance Criteria
- [ ] Booking from Booking.com appears in PMS within 10 seconds
- [ ] ARI push completes within 5s under normal load
- [ ] Overbooking prevented even on dual-channel simultaneous sale
- [ ] Failed sync surfaces in dashboard with retry button

---

## ৩২. Module: Direct Booking Engine **[MVP]**

### Public-facing Booking Flow
```
1. Property landing page (SEO)
   - URL: hotelname.atlas.app or whitelabel.com
2. Search widget: dates + pax → submit
3. Results page: available room types with starting prices
4. Room type detail: photos, amenities, rate plans
5. Select rate plan → add to cart
6. Add-ons page: breakfast upgrade, late checkout, transfer
7. Guest details form
8. Payment selection (Card / bKash / Nagad / Pay at hotel)
9. Review & confirm
10. Confirmation page with booking ref + email/SMS sent
```

### Inventory Hold
- Quote API creates 10-minute hold (decrements available_count temporarily)
- Cleanup job releases expired holds
- Successful payment converts hold → reservation

### Conversion Optimizations
- Single-page checkout option
- Saved card for returning users
- Guest-as-guest (no forced signup)
- Booking abandonment email (1hr, 24hr)
- Schema.org markup
- Google Hotel Ads free booking links
- Trust badges (reviews, secure payment)

### Embeddable Widget
- Iframe + JS SDK options
- White-label color scheme per property
- WordPress plugin (V1)

### Multi-language Support
- bn-BD, en-US (Default) at launch
- Right-to-Left support for ar-AE (V2)

---

## ৩৩. Module: Guest CRM **[MVP basic / V1 full]**

### Guest 360 View Tabs
- Profile (contact, ID, nationality, DOB)
- Preferences (room type, floor, amenities, dietary, allergies)
- Stays (chronological history with revenue per stay)
- Communication (emails, SMS, WhatsApp threads)
- Folio history
- Reviews left
- Loyalty (tier, points balance, transactions)
- Notes (internal staff notes)
- Documents (ID copies, signed registration cards)

### Profile Merge
- Trigger: 2 profiles with same phone/email/passport
- Merge wizard: side-by-side fields, pick or combine
- Audit: original profiles preserved for rollback

### Segmentation
- Static: rule-based (e.g., "Booked > 3 times last year")
- Dynamic: auto-update membership
- Used in: Marketing campaigns, VIP detection

### Loyalty
- Tier: Silver / Gold / Platinum (configurable thresholds)
- Earning: % of room revenue (excl. tax)
- Redemption: Discount on direct booking, F&B credit
- Expiry: 24 months from last activity

---

## ৩৪. Module: F&B / Restaurant POS **[V1]**

### Outlets
- Multiple restaurants, bars, banquet halls, room service
- Per outlet: menu, tax rules, opening hours, table layout

### Order Flow
```
1. Open table / select walk-in / select room (for room service)
2. Add items from menu (modifiers: spicy level, extra cheese, etc.)
3. Send to kitchen (KOT printed/displayed)
4. Modify / void with manager PIN
5. Settle: cash / card / charge to room / company AR
6. If charge to room: post to guest folio with category 'f_and_b'
```

### KOT (Kitchen Order Token)
- Auto-prints to kitchen printer (ESC/POS) by section (hot kitchen / cold / bar)
- KDS option for screen-based kitchen display

### Banquet / Event
- BEO (Banquet Event Order): pre-confirmed menu, headcount, AV, decoration
- Function diary: calendar of events per hall
- Pre-payment, final settlement

### Reports
- Daily F&B revenue
- Item-wise sales
- Server performance
- Cover analysis

---

## ৩৫. Module: HR, Roster & Payroll **[V1]**

### Staff Master
- Personal info, NID/passport copy, emergency contact
- Department, designation, employment type (permanent/contract)
- Joining date, probation end, contract expiry
- Salary structure (basic + allowances)
- Bank account for salary

### Roster
- Weekly view: drag-drop staff to shifts
- Shift templates (morning/evening/night)
- Conflicts warning (overtime, back-to-back)
- Swap requests (employee initiates, supervisor approves)

### Attendance
- Biometric integration (ZKTeco/ESSL): pull device punches via API/SDK
- Manual punch (with reason if no biometric)
- Daily summary: late / early / overtime / absent
- Leave management (apply, approve, balance)

### Payroll
- Process monthly: gross calc → deductions (PF/ESI/Tax/Loan) → net
- Payslip PDF generation (per country format)
- Bank file generation (NEFT/RTGS/ACH)
- Statutory reports (BD: VAT, India: PF/ESI/TDS)

---

## ৩৬. Module: Maintenance & Engineering **[V1]**

### Preventive Maintenance
- Schedule: AC service quarterly, fire equipment annual, etc.
- Auto-create work orders on due date
- Assign to engineer
- Track completion + cost

### Reactive (Tickets)
- Created by: guest complaint, HK, FD, manager
- Severity: low/medium/high/critical
- Auto-routing to engineer based on category
- Mobile app for engineers: see ticket, update status, photo proof

### Assets
- Asset register: name, type, location, purchase date, cost, depreciation method
- Warranty + AMC contracts
- Maintenance history per asset

---

## ৩৭. Module: Marketing Automation **[V1]**

### Campaign Builder
- Audience: segment selection or upload list
- Channel: email / SMS / WhatsApp / push
- Template: drag-drop builder with personalization tokens `{{guest_name}}, {{property_name}}, {{check_in_date}}`
- Schedule: send now / scheduled / triggered
- A/B test: split audience, compare open/click

### Triggers (Pre-built workflows)
| Trigger | Default channel | Default delay |
|---------|----------------|---------------|
| Booking confirmed | Email + WhatsApp | Immediate |
| Pre-arrival | Email + WhatsApp | 48h before arrival |
| Day of arrival | WhatsApp | 9am day of arrival |
| Mid-stay | Email | Day 2 of stay (3+ night stays only) |
| Departure | Email | 11am on departure day |
| Post-stay review | Email | 24h after checkout |
| Win-back | Email | 60/180/365 days post-stay |
| Birthday | Email | Day of |
| Abandoned booking | Email | 1h, 24h after abandonment |

### Deliverability
- SPF, DKIM, DMARC setup per tenant subdomain
- Unsubscribe link mandatory (CAN-SPAM/GDPR)
- Bounce/complaint handling → auto-suppress

### WhatsApp Specifics
- Pre-approved template messages (Meta requires approval)
- Reply-window (24h after user message) for free-form
- Media support (image, document)
- Bengali + English templates

---

## ৩৮. Module: Reports & BI **[MVP basic / V1 full]**

### Standard Reports
(See Appendix E for full 35+ report catalog. All exportable PDF/Excel/CSV. All schedulable via email.)

### Custom Report Builder **[V1]**
- Visual query builder: pick fields, filters, group-by, sort
- Saved per user, sharable
- Email subscription with frequency

### Embedded Analytics Dashboards **[V1.5]**
- Metabase embedded (single sign-on via JWT)
- Pre-built dashboards: Revenue, Distribution, Operations, Guest

### Data Warehouse Sync **[V1.5]**
- dbt models transform OLTP → analytics tables in ClickHouse
- Hourly sync

---

## ৩৯. Module: SaaS Subscription Billing **[MVP]**

### Subscription Lifecycle
- Trial: 14 days, no card required
- Convert: select tier → enter card → activate
- Renewal: auto-charge on cycle date
- Failed payment: smart retry (1d, 3d, 7d) → grace period 7 days → suspend
- Upgrade: prorate immediately
- Downgrade: at end of current cycle
- Cancel: at end of current cycle (or immediate with refund prorate)

### Invoicing
- Auto-generate on cycle close
- PDF with tax breakdown
- Email + dashboard download
- Tax behaviour per tenant country

### Add-ons
- Per-channel beyond tier limit
- Per-room beyond tier limit
- Per-booking add-on for usage-based pricing

---

## ৪০. Module: Payment Gateway Hub **[MVP]**

### Abstraction Layer
```typescript
interface PaymentProvider {
  createIntent(amount, currency, metadata): PaymentIntent
  capture(intentId): PaymentResult
  refund(paymentId, amount): RefundResult
  webhook(payload): Event[]
}
```
Implementations: StripeProvider, SSLCommerzProvider, BkashProvider, NagadProvider, RazorpayProvider.

### Selection Logic
- Per property: configure preferred gateways per currency
- For booking engine: show all supported methods, user selects
- For folio settlement: select method, route to gateway

### Refunds
- Full or partial
- Gateway-specific timelines (bKash 24h, Stripe 5-10 business days)
- Reflected in folio + reservation payment_status

---

## ৪১. Module: Mobile Apps **[V1 staff / V1.5 owner & guest]**

### Staff App (React Native + Expo)
**Screens:**
- Login (biometric)
- Today dashboard
- Arrivals/Departures
- Quick check-in
- Room status grid
- HK tasks (for HK role)
- Maintenance tickets
- Reports (summary)
- Profile

**Capabilities:**
- Offline-first with sync queue
- Push notifications
- Camera (ID scan, room damage)
- NFC (key card programming where supported)

### Owner App
- Multi-property revenue overview
- Today's KPIs (Occ, ADR, RevPAR, Pickup)
- Approve refunds
- Receive alerts

### Guest PWA
- Mobile online check-in (pre-arrival)
- Digital key
- Room service order
- Hotel info
- Late checkout request
- Chat with concierge

---

## ৪২. Module: Compliance & Police Reporting **[MVP for BD]**

### Bangladesh Foreigner Registration
- Trigger: Check-in of guest with non-BD nationality
- Form: Special Branch (SB) format with fields:
  - Full name, passport no, visa no, visa type, visa validity
  - Date of arrival in Bangladesh, port of entry
  - Purpose of visit
  - Local address, contact
  - Departure plan
- Generation: Auto-fill from guest profile + reservation
- Submission: PDF + electronic transmission (where SB API available)
- Audit: Submission timestamp logged

### India Form-C **[V1.5]**
- State-wise variations (Maharashtra, Kerala, Goa have unique formats)
- Electronic submission to state portal where applicable

### Data Retention
- 7 years for tax-relevant
- 3 years for guest data unless deletion requested (GDPR/DPDP)
- 1 year for sync logs

---

## ৪৩. Module: Super-Admin & SaaS Ops **[MVP]**

### Internal Dashboard (atlas-admin.app)
- Tenant list with health metrics
- MRR/ARR live, churn rate
- Service health (per microservice green/yellow/red)
- Recent sign-ups
- Recent churns
- Tickets queue

### Tenant Operations
- Impersonate (audit logged, banner shown to internal user)
- Suspend / Activate
- Upgrade tier manually
- Refund SaaS charge
- Export tenant data (GDPR request)
- Delete tenant data (GDPR right-to-erasure)

### Feature Flags
- Per tenant override
- Percentage rollout
- Targeted (by tier, country, custom attribute)

---

## ৪৪. Module: Public API & Marketplace **[V1.5]**

### Public API
- Subset of internal API exposed under `/public/v1`
- API key auth
- Rate limited
- Documented via OpenAPI + Mintlify portal

### SDKs
- JavaScript / TypeScript
- Python
- PHP (popular among hotel website developers)

### Webhooks
- Tenants subscribe to events
- HMAC signed
- Retry logic with dead-letter visibility

### Marketplace **[V2]**
- 3rd party devs publish plugins (custom integrations, reports)
- Revenue share 70/30
- Review & approval process

---

## ৪৫. Module: AI/ML Services **[V1 light / V1.5 full]**

### Service Architecture
- Separate Python FastAPI service
- Model serving via BentoML
- Feature store: self-hosted Feast
- Model registry: MLflow

### Use Cases (mapped to phase)
| Use case | Phase | Approach |
|---|---|---|
| Review reply suggestion | V1 | Claude API + property context prompt |
| Sentiment analysis of reviews | V1 | Pre-trained transformer |
| Guest chatbot (WhatsApp) | V2 | Claude API + RAG over hotel docs |
| Dynamic pricing recommendation | V1.5 | Gradient boosting on historical bookings |
| Demand forecasting | V1.5 | Prophet + holidays calendar |
| Overbooking calculator | V2 | Bayesian no-show prediction |
| Churn prediction (SaaS) | V1.5 | XGBoost |
| OCR for ID documents | V2 | Cloud Vision API or self-hosted Tesseract |

### LLM Integration Pattern
- Anthropic Claude API as primary
- Prompt templates versioned in Git
- Structured output (JSON schema enforced)
- PII redaction before send
- Cost tracking per tenant
- Cache common queries (Redis)
- Fallback to GPT-4 on outage

---

# PART V — Integrations

## ৪৬. OTA Integration Specs

### Booking.com (Connectivity Partner)
- **Cert process:** 3-month engagement; XML push/pull cert checklist; 99% uptime SLA req
- **Endpoints:** ARI push (`OTA_HotelAvailNotifRQ`), reservation pull (`OTA_HotelResRQ`), modification (`OTA_HotelResModifyRQ`)
- **Auth:** Username/password + IP whitelist
- **Format:** OTA XML 2003B
- **Quirks:** Rate parity enforced; commission deducted in reporting; instant confirmation required
- **Webhook:** Yes (push reservation as XML POST)
- **Sample push payload:** See Appendix I

### Agoda YCS
- **Format:** JSON over HTTPS
- **Auth:** API key per property
- **Endpoints:** `/inventory`, `/rates`, `/restrictions`, `/bookings/pull`
- **Polling:** 2-min interval for new bookings
- **Quirks:** Rate plans must match exactly by name; no support for derived rates (must push absolute)

### Expedia EQC
- **Cert:** EQC certification with sandbox
- **Format:** XML
- **Auth:** Basic auth
- **Quirks:** Supports Expedia Collect (Expedia bills guest, pays hotel after stay) and Hotel Collect (hotel bills guest)

### Airbnb
- **Format:** REST JSON
- **Auth:** OAuth 2.0 per property
- **Quirks:** Inventory must include MaxLOS; cancellation policies mapped to Airbnb's 5 tiers

### Hotelbeds
- **Format:** SOAP (legacy) + REST
- **Auth:** API key + signature
- **Quirks:** Wholesale rates (typically 25% lower than BAR)

### ShareTrip / GoZayaan (Bangladesh)
- **Format:** REST JSON
- **Auth:** API key
- **Local support:** Direct partnership recommended for onboarding help

### MakeMyTrip
- **Format:** XML/JSON
- **Auth:** Property credentials
- **Quirks:** GST handling required for India

### Trip.com
- **Format:** REST JSON
- **Auth:** OAuth
- **Multi-language:** Chinese support required for content

### GDS (Amadeus/Sabre/Travelport) — via DerbySoft initially
- **Approach:** Use DerbySoft as switch instead of direct GDS cert (cert takes 6-12 months)
- **Format:** DerbySoft proprietary; translates to GDS

### Channel Integration Checklist (per channel)
- [ ] Cert sandbox access obtained
- [ ] Adapter implemented + unit tested
- [ ] Mapping wizard tested
- [ ] Push ARI verified
- [ ] Pull reservation verified
- [ ] Modification + cancellation verified
- [ ] Edge cases tested (overbooking attempt, rate parity)
- [ ] Cert submitted + approved
- [ ] Production credentials configured
- [ ] First customer pilot

---

## ৪৭. Payment Gateway Specs

### Stripe
- Stripe Connect (multi-tenant) — each property is a connected account
- Supports cards, Apple/Google Pay, Stripe Link
- Webhooks: payment_intent.succeeded, charge.refunded, dispute.created
- 3DS for SCA (EU)

### SSLCommerz (Bangladesh)
- Multi-method gateway (cards, bKash, Nagad, Rocket via single integration)
- Hosted checkout page (PCI scope reduction)
- IPN webhook for status updates

### bKash (Direct API)
- Use when SSLCommerz not preferred
- Tokenized payment flow
- Sandbox + production credentials

### Nagad / Rocket (Direct)
- Similar pattern to bKash
- Bangladesh Bank-licensed mobile financial services

### Razorpay (India)
- Cards + UPI + Wallets
- Webhooks for all events
- Settlement to bank account

### UPI (India direct)
- Via Razorpay or direct bank integration
- Collect request via UPI ID

---

## ৪৮. Communication Specs

### WhatsApp Business API (via Twilio or Meta direct)
- **Template messages:** Pre-approved by Meta; required for outside 24h window
- **Categories:** Utility (booking confirm), Marketing (offers), Authentication (OTP)
- **Bengali templates:** All must include translation in approval
- **Media:** Image, document, location
- **Reply window:** Free-form within 24h of user message

### Twilio (SMS)
- Global SMS routing
- Alpha sender ID where supported
- Long codes / short codes per region

### Alpha SMS (Bangladesh)
- Cheaper than Twilio for BD
- Local masking sender ID
- Bengali Unicode support

### SendGrid (Email)
- Domain authentication per tenant subdomain
- Dynamic templates
- Event webhooks (open, click, bounce)
- Suppression list management

### Firebase Cloud Messaging (Push — Android)
- Topic-based + device token-based
- Multi-language payload

### APNS (Push — iOS)
- Apple Push Notification service
- Token-based auth

---

## ৪৯. Accounting Sync **[V1.5]**

### Tally Prime (Bangladesh + India)
- Integration via TallyConnect SDK
- Sync: daily journal entries (revenue, tax)
- Mapping: ledger codes configured per property

### Zoho Books
- API-based
- Webhooks for invoice events

### QuickBooks Online
- OAuth 2.0
- API rate limit 500/min

### Xero
- OAuth 2.0
- Bank reconciliation via Xero feed

---

## ৫০. Door Lock / IoT / Biometric **[V1.5 / V2]**

### Door Locks
- **Assa Abloy:** VingCard / Mobile Access via Visionline
- **Salto:** KS API
- **Onity:** OnPortal
- Integration: room assignment → key card encoding → BLE / RFID

### Biometric Attendance
- **ZKTeco:** SDK or API pull
- **ESSL:** API
- Sync: punches → attendance table

### IoT (V2)
- Occupancy sensor: control AC/lights
- Smart TV checkout
- Mini-bar sensor

---

# PART VI — UI/UX Specifications

## ৫১. Design System

### Colors (semantic tokens)
```
primary:   #1E40AF (blue-800)
secondary: #0EA5E9 (sky-500)
success:   #16A34A (green-600)
warning:   #F59E0B (amber-500)
danger:    #DC2626 (red-600)
neutral:   gray-50 to gray-950 scale
```
Dark mode: invert lightness via CSS variables.

### Typography
- **English:** Inter (system fallback)
- **Bengali:** Hind Siliguri / Noto Sans Bengali
- **Hindi:** Noto Sans Devanagari
- Scale: 12/14/16/18/20/24/30/36/48 px
- Weights: 400/500/600/700

### Spacing Scale
4/8/12/16/24/32/48/64 px

### Component Library
shadcn/ui base: Button, Input, Select, Combobox, DataTable, Dialog, Drawer, Toast, Tooltip, Tabs, Accordion, Calendar, DatePicker, Form (with React Hook Form integration), Avatar, Badge, Card, Sheet.

### Patterns
- **Empty states:** Illustration + CTA
- **Loading:** Skeleton (not spinner) for content; spinner only for buttons
- **Error states:** Inline (field) + Toast (action) + Page-level (404/500)
- **Confirmation:** Dialog for destructive; toast for non-destructive
- **Success feedback:** Toast with action (undo)

---

## ৫২. Screen Inventory

### Hotelier Dashboard (Next.js Web)

#### Auth Module
- /login
- /login/mfa
- /signup
- /signup/verify-email
- /forgot-password
- /reset-password
- /sso/initiate
- /sso/callback

#### Setup / Property
- /onboarding (wizard)
- /properties (list)
- /properties/new
- /properties/:id (overview)
- /properties/:id/settings
- /properties/:id/policies
- /properties/:id/tax-codes
- /properties/:id/rate-plans
- /properties/:id/rate-plans/:rpId
- /properties/:id/room-types
- /properties/:id/room-types/:rtId
- /properties/:id/rooms
- /properties/:id/users
- /properties/:id/channels
- /properties/:id/channels/:chId/mappings
- /properties/:id/booking-engine

#### Operations
- /dashboard (today overview)
- /calendar (central grid)
- /reservations (list + filters)
- /reservations/new
- /reservations/:id (detail + folio + payments + audit)
- /front-desk/arrivals
- /front-desk/departures
- /front-desk/in-house
- /front-desk/walk-in
- /front-desk/cashier
- /housekeeping (room status grid)
- /housekeeping/tasks
- /housekeeping/lost-and-found
- /housekeeping/productivity
- /night-audit
- /maintenance/tickets
- /maintenance/preventive-schedule

#### Guest CRM
- /guests
- /guests/:id (360 view)
- /guests/segments
- /guests/loyalty

#### F&B
- /pos/outlets
- /pos/outlets/:id (live POS)
- /pos/menu
- /pos/banquet/events
- /pos/reports

#### HR
- /hr/staff
- /hr/roster
- /hr/attendance
- /hr/payroll/runs

#### Marketing
- /marketing/campaigns
- /marketing/templates
- /marketing/triggers
- /marketing/segments

#### Reports
- /reports/flash
- /reports/pickup
- /reports/forecast
- /reports/channel-production
- /reports/market-segment
- /reports/tax
- /reports/no-show
- /reports/cancellation
- /reports/custom
- /reports/custom/new (builder)

#### Account & Billing
- /billing/subscription
- /billing/invoices
- /billing/payment-methods
- /me/profile
- /me/security
- /me/notifications

### Direct Booking Engine (separate Next.js app)
- /:propertySlug (search widget + property info)
- /:propertySlug/results
- /:propertySlug/rooms/:roomTypeId
- /:propertySlug/checkout
- /:propertySlug/confirmation/:bookingRef
- /:propertySlug/policies
- /:propertySlug/manage-booking?ref=

### Super Admin
- /admin/tenants
- /admin/tenants/:id
- /admin/metrics
- /admin/health
- /admin/feature-flags
- /admin/audit-log
- /admin/support-tickets

---

## ৫৩. User Flow Diagrams (text)

### New Tenant Sign-up to Go-Live
```
Sign-up → Verify Email → Onboarding Wizard (Property setup)
  → Add Rooms → Add Rate Plans → Tax Setup
  → Connect Channels (optional) → Invite Staff
  → Go-Live Checklist → Live
```

### Direct Booking
```
Land → Search → Results → Room Detail → Add-ons → Guest Info
  → Payment → Confirmation
```

### Walk-in to Check-in
```
Front Desk → Walk-in → Availability Check → Select Room Type
  → Guest Info (new/existing) → Rate Selection → Payment
  → Assign Room → Print Registration → Issue Key → Welcome
```

### Check-out
```
Front Desk → Search Reservation → View Folio → Mini-bar check
  → Late checkout charge? → Settle Balance → Print Invoice
  → Mark Room Dirty → Schedule Review Request → Done
```

---

## ৫৪. Localization & RTL Strategy
- All strings in i18n files (no hardcoded text)
- Translation files: `locales/{lang}/{namespace}.json`
- Translators use Crowdin / Lokalise
- RTL: `dir="rtl"` on `<html>` toggled per locale; Tailwind RTL plugin

---

## ৫৫. Accessibility (WCAG 2.1 AA)
- Keyboard nav for all interactive
- Focus visible (custom focus ring matching design)
- ARIA labels on icon-only buttons
- Form errors associated via `aria-describedby`
- Skip-to-content link
- Color contrast ≥ 4.5:1 for text
- No content depends on color alone (also use icons)
- Screen reader test (NVDA / VoiceOver) per release
- Automated checks: axe-core in CI

---

## ৫৬. Mobile App Screens
(See Section ৪১ for app overview.)

#### Staff App
- Login (with biometric)
- Today Dashboard
- Arrivals
- Departures
- In-house
- Walk-in (quick book)
- Room Status Grid
- Room Detail
- HK Tasks
- Task Detail (with photo capture)
- Maintenance Tickets
- Reports Summary
- Profile / Settings

#### Owner App
- Multi-property selector
- KPI Dashboard
- Property Detail
- Revenue Breakdown
- Alerts
- Refund Approval

#### Guest PWA
- Welcome / Property Info
- My Booking
- Online Check-in Form
- Digital Key
- Room Service Menu
- Order Cart
- Concierge Chat
- Late Checkout Request

---

# PART VII — Quality, Testing & Operations

## ৫৭. Testing Strategy

### Test Pyramid Targets
- **Unit:** >80% line coverage gate (CI fails below)
- **Integration:** Cover service layer + DB; ~30% of test suite
- **E2E:** Critical user journeys only (booking, check-in, sync); ~10%
- **Load:** Channel sync engine 1000 events/sec; booking flow 100 concurrent
- **Security:** OWASP ZAP nightly
- **Accessibility:** axe-core in CI; manual screen reader monthly
- **Visual regression:** Chromatic on Storybook

### Critical E2E Scenarios (Playwright)
1. Sign-up to property creation
2. Booking creation (direct engine)
3. Walk-in check-in to check-out
4. Channel mapping wizard
5. OTA booking ingestion → check-in
6. Night audit run
7. Subscription upgrade

### Test Data
- Faker.js seeds for dev
- Anonymized prod snapshot for staging
- Per-test ephemeral PostgreSQL via testcontainers

---

## ৫৮. Performance Budgets & SLOs

### Frontend Performance
- LCP < 2.5s on 4G
- INP < 200ms
- CLS < 0.1
- JS bundle initial < 200KB gzipped

### API Performance
- p50 < 100ms
- p95 < 500ms
- p99 < 2s

### Channel Sync
- ARI push latency p95 < 5s
- Reservation ingestion p95 < 10s

### Availability SLO
- Booking flow: 99.95%
- Dashboard: 99.9%
- Sync engine: 99.9%

### Error Budget
- 99.95% SLO = 21.6 min downtime/month allowed

---

## ৫৯. Observability & Monitoring

### Logging
- Structured JSON logs (Pino in Node, slog in Go)
- Correlation ID propagated (X-Request-Id)
- PII redaction filter

### Metrics (Prometheus)
- HTTP request rate / errors / duration (RED)
- DB connection pool utilization
- Queue depth + processing rate
- Channel sync success/fail rate per channel
- Business metrics: bookings/sec, revenue/min

### Traces (OpenTelemetry → Tempo/Datadog)
- Distributed tracing across services
- Sampling: 100% errors, 10% success

### Alerts (PagerDuty)
- P1: Booking engine down, payment gateway down, DB master down
- P2: Sync engine degraded, error rate > 1%
- P3: Disk > 80%, queue backlog growing

### Dashboards (Grafana)
- Service health
- Business KPIs
- Per-channel sync health
- Per-tenant usage

---

## ৬০. Incident Response Runbooks

### Runbook: Channel Sync Failure
```
Symptom: Sync error rate > 5% for channel X
Severity: P2

Steps:
1. Check status page of channel X (their incident?)
2. Check sync_jobs table: SELECT last_error FROM sync_jobs WHERE channel_id = X AND status='failed' ORDER BY created_at DESC LIMIT 10
3. Common causes:
   a. Credentials expired → notify customer
   b. Schema change in channel → adapter update needed
   c. Rate limit hit → throttle our pushes
4. Mitigation: pause sync via feature flag; manual ARI push if critical
5. Resolution: deploy fix, retry dead-letter, monitor for 1h
6. Postmortem within 48h if customer-impacting
```

### Runbook: Overbooking Detected
```
Symptom: Customer reports double booking
Severity: P1

Steps:
1. Identify reservations involved (same room, same dates)
2. Check audit log: which booking came first, what was inventory at that time
3. Determine root cause:
   a. Race condition? — check transaction log
   b. Channel sync delay? — check sync_jobs
   c. Manual override? — check user action
4. Resolution:
   a. Move one guest (upgrade if possible)
   b. Refund or compensate per policy
   c. Apologize via personalized communication
5. Engineering: write regression test for the scenario
```

### Runbook: Payment Gateway Down
```
Symptom: Bookings failing with payment errors
Severity: P1

Steps:
1. Verify with provider status page
2. Failover to alternate gateway if configured
3. Communicate: status page banner, support proactive message
4. For direct booking: offer "pay at hotel" if not normally enabled (manual approval)
```

### Other Runbooks
- DB primary failover
- Redis outage (cache miss storm prevention)
- DDoS attack (Cloudflare ramp up)
- Data leak (notification + legal + customers within 72h GDPR)

---

## ৬১. Disaster Recovery Plan

### Backup Strategy
- PostgreSQL: continuous WAL archival to S3 + daily snapshot
- PITR (Point-In-Time Recovery) tested monthly
- RPO (Recovery Point Objective): 5 minutes
- RTO (Recovery Time Objective): 1 hour

### Multi-AZ
- All prod resources in 3 AZs in ap-south-1
- Primary RDS instance with synchronous replica

### Multi-region **[V2]**
- Active-active in ap-south-1 + eu-central-1
- Aurora Global Database
- Latency-based DNS routing

### Test Frequency
- Failover drill: quarterly
- Full DR drill: semi-annually
- Backup restore drill: monthly

---

## ৬২. Security Hardening Checklist

- [ ] All endpoints behind WAF
- [ ] DDoS protection enabled
- [ ] Rate limiting per IP/user/endpoint
- [ ] TLS 1.3, HSTS preload
- [ ] CSP, X-Frame-Options, X-Content-Type-Options headers
- [ ] PCI scope: card data via Stripe Elements/SSLCommerz hosted (never touches server)
- [ ] PII field-level encryption (passport, NID) with KMS
- [ ] Database access via IAM roles (no static creds)
- [ ] Secrets in AWS Secrets Manager, never in code/env files committed
- [ ] Dependency scanning (Snyk) blocking on high+ vulnerabilities
- [ ] SAST (Semgrep) in CI
- [ ] DAST (OWASP ZAP) nightly
- [ ] Annual pentest
- [ ] Bug bounty (V1.5+)
- [ ] Mandatory MFA for admin/owner roles
- [ ] Session: idle 30min, absolute 12hr, concurrent limit 3
- [ ] Audit log immutable + hash-chained
- [ ] Backup encryption with separate KMS key
- [ ] Quarterly key rotation

---

# PART VIII — Compliance & Legal

## ৬৩. PCI-DSS Scoping

### Strategy: Minimize Scope
- Never store, process, or transmit PAN in our systems
- Use Stripe Elements / SSLCommerz hosted checkout — card data goes direct from browser to gateway
- Store only: token + last4 + brand + expiry (non-sensitive)
- VCC handling (OTA-issued): one-time charge via Stripe Issuing or manual entry only at locked terminal

### SAQ Type
- **SAQ-A** (lowest scope) for Pro/Basic tiers
- **SAQ-A-EP** if any card-handling JS hosted by us

### Annual Requirements
- Self-Assessment Questionnaire submitted
- Quarterly ASV scan
- Penetration test

---

## ৬৪. GDPR / DPDP Act / Bangladesh Compliance

### GDPR (EU residents)
- Lawful basis: Contract (for booking) + Consent (marketing)
- DPA (Data Processing Agreement) with all sub-processors
- Right to access: data export within 30 days
- Right to erasure: anonymize after 30-day grace
- Right to rectification: self-serve in dashboard
- Data Protection Officer (DPO): designated (V1.5)
- Breach notification: 72 hours to supervisory authority

### India DPDP Act 2023
- Consent manager integration
- Significant Data Fiduciary obligations if scaled
- Data Protection Board notification

### Bangladesh
- No comprehensive data protection law yet (as of 2026 — verify before launch)
- Bangladesh Bank Cybersecurity Guidelines for financial data
- Telecom Regulatory Commission (BTRC) for SMS/marketing

---

## ৬৫. Country Police Reporting

### Bangladesh (Special Branch)
- Foreigner Registration Form fields:
  - Name, nationality, passport no, visa
  - Arrival date in BD, port of entry
  - Local address, purpose, contact
  - Stay duration, planned departure
- Submission: PDF via Special Branch portal (manual upload as of 2026); auto-API when available

### India (Form-C)
- State-wise portals (Maharashtra: foreigner.maharashtra.gov.in)
- Fields similar to BD + visa details
- Penalty for non-submission

### Italy (Alloggiati Web)
- Within 24h of check-in
- Polizia di Stato portal
- All guests (including Italian)

### Spain (Hospederías)
- Guardia Civil portal
- All guests
- 24h after check-in

---

## ৬৬. Data Retention & Right-to-Erasure
- Reservations: 7 years (tax requirement)
- Guest PII: 3 years after last activity or until erasure request
- Payment data: per PCI requirement
- Logs: 1 year hot, 5 years cold
- On erasure request: anonymize (replace PII with hashes), preserve aggregate analytics

---

## ৬৭. Cookie Policy & Consent
- Booking engine: Cookie banner with granular consent (necessary / analytics / marketing)
- Dashboard: necessary only (logged-in session)
- GA4 with Consent Mode v2
- TCF v2.2 framework for EU

---

# PART IX — Roadmap & Execution

## ৬৮. 24-Month Phased Roadmap (summary)

(Full detail in v6 carried forward; phase tags also embedded per module above.)

| Phase | Months | Goal |
|---|---|---|
| MVP | 1-6 | Bangladesh launch — 10 pilot hotels |
| V1.0 | 7-12 | Operational depth + 50 hotels (BD + Eastern India) |
| V1.5 | 13-18 | Enterprise features + 200 hotels (South Asia + ME) |
| V2.0 | 19-24 | Next-gen AI + 500 hotels (Global pilot) |

---

## ৬৯. MVP Sprint-by-Sprint Breakdown (Week 1-26)

### Sprint Cadence
- 2-week sprints (13 sprints over 26 weeks)
- Team: 8 (1 PM, 1 Designer, 2 Backend NestJS, 1 Backend Go, 2 Frontend, 1 DevOps, 1 QA)

### Sprint 1 — Foundation (Week 1-2)
- Repos + monorepo setup
- AWS account + Terraform skeleton
- CI/CD pipelines
- Auth basic (signup/login/JWT/refresh)
- DB schema: tenants, users, properties
- RLS middleware
- Tenant context middleware
- Sentry + structured logs

### Sprint 2 — Tenant & Property Setup (Week 3-4)
- Property CRUD UI + API
- Room type + Room CRUD
- Rate plan CRUD (basic — no derivation yet)
- Tax codes
- User invitations + RBAC roles

### Sprint 3 — Central Calendar Foundation (Week 5-6)
- inventory_daily table with partitioning
- rate_daily + restrictions_daily tables
- Calendar UI v1 (read-only)
- Inventory seed logic (per room type create rows)
- Calendar bulk update API

### Sprint 4 — Calendar Operations (Week 7-8)
- Calendar UI: edit cells, drag-select bulk modal
- WebSocket live updates
- Rate plan derivation logic
- Restriction logic (MinLOS/CTA/CTD)
- Stop-sell

### Sprint 5 — Reservation Engine Core (Week 9-10)
- Reservation CRUD with state machine
- Concurrency control (FOR UPDATE + Redis lock)
- Folio table + posting basic
- Reservation availability API
- Reservation list UI + detail

### Sprint 6 — Front Desk (Week 11-12)
- Arrivals/Departures/In-house screens
- Walk-in flow
- Check-in flow (with ID upload)
- Room assignment
- Check-out flow
- Folio settle

### Sprint 7 — Housekeeping Basic + Night Audit (Week 13-14)
- Room status flow
- HK assignment basic
- Night audit job
- Daily reports (Flash, Manager)
- HK productivity report

### Sprint 8 — Channel Sync Engine MVP (Week 15-16)
- Go service skeleton
- Channel + ChannelMapping tables
- Channel CRUD UI
- Booking.com adapter (push ARI + pull bookings)
- Sync jobs table + retry logic
- Sync status dashboard

### Sprint 9 — Channel Sync Tier 1 (Week 17-18)
- Agoda adapter
- Expedia adapter
- Airbnb adapter
- ShareTrip + GoZayaan adapters
- Hotelbeds adapter
- Mapping wizard

### Sprint 10 — Direct Booking Engine (Week 19-20)
- Public booking engine app
- Search → results → checkout
- Stripe + SSLCommerz integration
- bKash + Nagad integration
- Booking confirmation email + SMS + WhatsApp template
- Embed widget

### Sprint 11 — SaaS Billing + Super Admin (Week 21-22)
- Subscription tiers
- Stripe billing integration
- Trial logic
- Invoice generation
- Super-admin internal dashboard
- Tenant suspend/activate
- Feature flags

### Sprint 12 — Compliance + Polish (Week 23-24)
- Bangladesh foreigner registration form
- Mushak 6.3 invoice format
- Tax engine (BD VAT + Service Charge)
- WCAG audit fixes
- Audit log immutable
- 2FA mandatory for admin

### Sprint 13 — Pilot Onboarding + Hardening (Week 25-26)
- Onboarding wizard polish
- Help center seed content (Bengali)
- Performance optimization (calendar load, sync engine throughput)
- Load testing
- Security review fixes
- 10 pilot hotels onboarded

### Sprint Ceremonies
- Sprint planning (Monday week 1, 2h)
- Daily standup (15 min)
- Sprint review (Friday week 2, 1h)
- Retrospective (Friday week 2, 1h)
- Backlog grooming (Wednesday week 2, 1h)

---

## ৭০. V1.0 / V1.5 / V2.0 Quarterly Themes

### V1.0 (Q3-Q4 of Year 1)
**Q3:** Mobile staff app, Group bookings, F&B POS basic, Marketing automation, Guest 360 CRM, Tier 2 channels
**Q4:** Reputation management, Rate shopper, Custom reports, HR/Payroll, Maintenance module, Public API + Webhooks, Reseller portal

### V1.5 (Q1-Q2 of Year 2)
**Q1:** Tier 3 channels + GDS via DerbySoft, AI dynamic pricing, ERP accounting, SSO/SAML, Data warehouse
**Q2:** B2B corporate portal, Multi-language (Hindi), Hotel chain features, Spa/Wellness, Procurement, Sustainability dashboard, India Form-C, ISO 27001 prep

### V2.0 (Q3-Q4 of Year 2)
**Q3:** VCC automation, Contactless check-in + OCR, AI chatbot WhatsApp, Smart Quiz onboarding, WebRTC video support
**Q4:** EU compliance full, IoT/Smart locks, Multi-region active-active, SOC 2 cert, Marketplace launch, AR/VR tour

---

## ৭১. Team Structure & Hiring Plan

| Phase | Total | New Hires |
|---|---|---|
| MVP | 8 | 1 PM, 1 Designer, 2 BE-Node, 1 BE-Go, 2 FE, 1 DevOps, 1 QA |
| V1.0 | 11 | +1 Mobile (RN), +1 Backend, +1 CS Manager |
| V1.5 | 15 | +1 ML Eng, +1 Backend, +1 Sales, +1 Impl. Engineer |
| V2.0 | 19 | +1 Security Eng, +1 Frontend, +2 Sales |

### Org Structure (V1.5+)
```
CEO
├── CTO ─ Engineering (BE, FE, Mobile, ML, Sec, DevOps, QA)
├── CPO ─ Product (PM, Design)
├── CCO ─ Customer (Sales, CS, Support, Implementation)
└── CFO ─ Finance + HR + Legal
```

---

## ৭২. Risk Register & Mitigation

| Risk | Prob | Impact | Mitigation |
|---|---|---|---|
| OTA API breaking change | High | High | Versioned adapter, abstraction, sandbox cert |
| OTA contract revocation | Med | Critical | Multi-OTA diversification, direct push |
| PCI breach | Low | Critical | Never store PAN, annual QSA, cyber insurance |
| Key staff churn | Med | High | Documentation culture, bus factor > 2 |
| Funding gap | Med | Critical | Revenue from M4, conservative burn |
| BDT/INR depreciation | High | Med | Multi-currency pricing, USD for Enterprise |
| Regulatory change (DPDP/GDPR) | Med | High | Quarterly legal review |
| Competitor undercut | Med | High | BD-first depth, local pricing, better support |
| AI hallucination | Med | Med | Human review queue first 30 days/property |
| Hotel cyber attack via integration | Med | High | Tenant isolation, network seg, least privilege |
| Channel cert delay (Booking.com 3+ months) | High | Med | Start cert in Sprint 1; alternate channel first |
| Mobile app review rejection | Low | Med | Compliance review pre-submit |
| WhatsApp template rejection | Med | Low | Pre-approve all templates; multi-language drafts |

---

# PART X — Go-to-Market

## ৭৩. Pricing Tier × Feature Matrix

| Feature | Basic | Pro | Enterprise |
|---|:---:|:---:|:---:|
| Properties | 1 | up to 5 | unlimited |
| Rooms | up to 30 | up to 150 | unlimited |
| Channels | 5 | 15 | all + GDS |
| Direct booking engine | ✓ | ✓ | ✓ |
| Central calendar | ✓ | ✓ | ✓ |
| Standard reports | ✓ | ✓ | ✓ |
| Front Desk + HK + Night Audit | ✓ | ✓ | ✓ |
| Bangladesh police reporting | ✓ | ✓ | ✓ |
| Email + SMS + WhatsApp | basic templates | ✓ | ✓ |
| Mobile staff app | – | ✓ | ✓ |
| Group bookings + Folio mgmt | – | ✓ | ✓ |
| F&B POS | – | ✓ | ✓ |
| Marketing automation | – | ✓ | ✓ |
| Advanced reports + Custom builder | – | ✓ | ✓ |
| Reputation Mgmt + AI reply | – | ✓ | ✓ |
| HR + Payroll | – | ✓ | ✓ |
| Public API + Webhooks | – | basic | full |
| AI Dynamic Pricing | – | – | ✓ |
| ERP Accounting | – | – | ✓ |
| B2B Corporate portal | – | – | ✓ |
| SSO/SAML | – | – | ✓ |
| Hotel chain features | – | – | ✓ |
| Custom integrations | – | – | ✓ |
| Dedicated CSM | – | – | ✓ |
| SLA (response time) | best effort | 8h | 1h business hour, 15m P1 |
| White-label / Reseller | – | – | ✓ |

### Suggested Pricing (Bangladesh)
- Basic: BDT 5,000–15,000/month
- Pro: BDT 25,000–40,000/month
- Enterprise: Custom (80,000+/month)
- Free trial: 14 days
- Setup fee: Waived first 50 customers; standard BDT 25,000

---

## ৭৪. Pilot Program & Bangladesh Launch
- 10 pilots: 5 Cox's Bazar, 3 Sylhet, 2 Dhaka
- 6 months free for pilots in exchange for feedback + case study + testimonial
- Weekly check-in + dedicated Slack
- Pilot success metric: 30%+ direct booking increase, zero overbooking

---

## ৭৫. Sales Process & Implementation Playbook

### Sales Stages
1. Lead (inbound + outbound)
2. Qualified Demo
3. Proposal
4. Negotiation
5. Closed Won → Implementation
6. Closed Lost (reason captured)

### Implementation Playbook (4-week target)
**Week 1:** Kick-off, data collection (rooms, rates, historical bookings)
**Week 2:** Configuration, channel mapping, sandbox testing
**Week 3:** Staff training (FD, HK, GM), soft launch
**Week 4:** Full go-live, hand-holding daily, 30-day check-in scheduled

---

## ৭৬. Customer Success Operations

### Onboarding (Day 0-90)
- Day 1: Welcome call + kickoff
- Day 7: Channel sync verification
- Day 14: First training session
- Day 30: Adoption check + NPS
- Day 60: Optimization review
- Day 90: QBR + expansion conversation

### Health Score Components
- Logins/week
- Channels connected (% of available)
- Bookings synced (vs expected)
- Support tickets (count + severity)
- Days since last login
- Payment status
- NPS score

### Health → Action Mapping
- Green: monthly check-in
- Yellow: bi-weekly check-in + targeted training
- Red: CSM escalation + retention play

### Support Tiers
| Tier | Channels | Hours | SLA |
|---|---|---|---|
| Basic | Email + KB + community | Business hr | Best effort |
| Pro | + Chat | Extended | 8h response |
| Enterprise | + Phone + Slack | 24/7 | 1h business / 15m P1 |

---

## ৭৭. Marketing & Content Strategy

### Content
- Bengali blog: SEO topics on RevPAR, OTA optimization, direct booking
- YouTube: Bengali product tutorials + customer interviews
- Webinar: Monthly topics
- Case studies: pilots first, expand

### Channels
- LinkedIn (B2B reach to GMs)
- Facebook (broader reach in BD)
- Google Ads (high-intent keywords)
- Industry events (PATA, BD Tourism Board events)
- Partnership marketing (ShareTrip co-marketing)

### Lead Magnets
- Free RevPAR calculator
- OTA commission comparison tool
- "Bangladesh Hotel Distribution Guide" e-book

---

# PART XI — Appendices

## Appendix A. Booking Status Code Reference
| Code | Display | Allowed From | Allowed To |
|---|---|---|---|
| inquiry | Inquiry | — | quote, cancelled |
| quote | Quote | inquiry | tentative, cancelled |
| tentative | Tentative | quote | confirmed, cancelled |
| confirmed | Confirmed | tentative, (direct create) | checked_in, no_show, cancelled |
| checked_in | Checked-In | confirmed | in_house |
| in_house | In House | checked_in | checked_out |
| checked_out | Checked-Out | in_house | (terminal) |
| cancelled | Cancelled | inquiry, quote, tentative, confirmed | (terminal) |
| no_show | No Show | confirmed | (terminal) |

---

## Appendix B. Error Code Catalog
```
VALIDATION_FAILED              400
TENANT_NOT_FOUND               404
TENANT_SUSPENDED               403
PROPERTY_NOT_FOUND             404
RESERVATION_NOT_FOUND          404
RESERVATION_INVALID_STATE      422
INVENTORY_INSUFFICIENT         409
RATE_NOT_AVAILABLE             422
RESTRICTION_VIOLATED           422
OVERBOOKING_PREVENTED          409
PAYMENT_DECLINED               402
PAYMENT_GATEWAY_ERROR          502
PAYMENT_AMOUNT_MISMATCH        422
IDEMPOTENCY_KEY_REUSED         409
IDEMPOTENCY_KEY_CONFLICT       409
CHANNEL_NOT_CONNECTED          422
CHANNEL_SYNC_FAILED            502
SUBSCRIPTION_INACTIVE          402
SUBSCRIPTION_LIMIT_EXCEEDED    402
MFA_REQUIRED                   401
MFA_INVALID                    401
PERMISSION_DENIED              403
ROOM_NOT_ASSIGNED              422
FOLIO_HAS_BALANCE              422
FOLIO_ALREADY_CLOSED           422
RATE_LIMIT_EXCEEDED            429
INTERNAL_ERROR                 500
SERVICE_UNAVAILABLE            503
```

---

## Appendix C. Permission Matrix (RBAC)

| Permission | Owner | GM | FOM | Front Desk | HK Sup | HK Staff | Accountant | Read Only |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| property.manage | ✓ | ✓ | – | – | – | – | – | – |
| user.invite | ✓ | ✓ | – | – | – | – | – | – |
| reservation.create | ✓ | ✓ | ✓ | ✓ | – | – | – | – |
| reservation.cancel | ✓ | ✓ | ✓ | – | – | – | – | – |
| reservation.view | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ |
| reservation.check_in | ✓ | ✓ | ✓ | ✓ | – | – | – | – |
| reservation.check_out | ✓ | ✓ | ✓ | ✓ | – | – | – | – |
| folio.post_charge | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | – |
| folio.reverse | ✓ | ✓ | ✓ | – | – | – | ✓ | – |
| folio.close | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | – |
| rate.update | ✓ | ✓ | – | – | – | – | – | – |
| inventory.update | ✓ | ✓ | ✓ | – | – | – | – | – |
| restriction.update | ✓ | ✓ | – | – | – | – | – | – |
| channel.manage | ✓ | ✓ | – | – | – | – | – | – |
| housekeeping.assign | ✓ | ✓ | – | – | ✓ | – | – | – |
| room.status_update | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | – |
| night_audit.run | ✓ | ✓ | ✓ | ✓ | – | – | – | – |
| report.financial.view | ✓ | ✓ | – | – | – | – | ✓ | – |
| report.operational.view | ✓ | ✓ | ✓ | ✓ | ✓ | – | – | ✓ |
| billing.manage | ✓ | – | – | – | – | – | ✓ | – |
| payment.refund | ✓ | ✓ | – | – | – | – | ✓ | – |
| guest.merge | ✓ | ✓ | – | – | – | – | – | – |
| guest.blacklist | ✓ | ✓ | ✓ | – | – | – | – | – |

---

## Appendix D. Email/SMS/WhatsApp Template Library (excerpt)

### Booking Confirmation (English)
**Subject:** Booking Confirmed — {{property_name}}
**Body:**
```
Hi {{guest_name}},

Your booking at {{property_name}} is confirmed!

Booking Reference: {{booking_ref}}
Check-in: {{arrival_date}} after {{check_in_time}}
Check-out: {{departure_date}} by {{check_out_time}}
Room: {{room_type_name}}
Total: {{currency_symbol}}{{total_amount}}

If you need to modify or cancel, click here: {{manage_booking_url}}

We look forward to welcoming you.
{{property_name}} Team
{{property_phone}}
```

### Booking Confirmation (Bengali)
```
প্রিয় {{guest_name}},

{{property_name}}-এ আপনার বুকিং নিশ্চিত হয়েছে!

বুকিং রেফারেন্স: {{booking_ref}}
চেক-ইন: {{arrival_date}} (সময়: {{check_in_time}} পর)
চেক-আউট: {{departure_date}} (সময়: {{check_out_time}} এর মধ্যে)
রুম: {{room_type_name}}
মোট: {{currency_symbol}}{{total_amount}}

বুকিং পরিবর্তন বা বাতিল করতে: {{manage_booking_url}}

আপনাকে স্বাগত জানাতে আমরা অপেক্ষায় আছি।
{{property_name}} টিম
{{property_phone}}
```

### Pre-arrival (WhatsApp template — must be Meta-approved)
```
Hi {{1}}, just 2 days until your stay at {{2}}!
Want to make your stay special? Reply with:
1️⃣ Airport transfer
2️⃣ Early check-in
3️⃣ Room upgrade
4️⃣ Late checkout
Looking forward to seeing you! 🌴
```

### Review Request (Email — 24h post-stay)
**Subject:** How was your stay at {{property_name}}?
**Body:** [Includes star rating widget + text feedback]

### Win-back (60 days)
**Subject:** We miss you, {{guest_name}}! Special offer inside
**Body:** [Personalized discount based on previous stay]

(Full library includes 30+ templates per language.)

---

## Appendix E. Standard Hotel Report Catalog (full 35+ list)
1. Daily Flash Report
2. Manager Report
3. Pickup Report (Today/7-day/30-day)
4. Forecast Report (30/60/90 day)
5. Forecast Pace
6. Forecast Accuracy
7. Market Segment Analysis
8. Source of Business
9. Channel Production
10. Channel ROI (after commission)
11. Rate Comparison (vs competitors)
12. Lead Time Analysis
13. Length of Stay
14. Cancellation Report (with reasons)
15. No-show Report
16. Walk-in Report
17. Repeat Guest %
18. Country/Nationality Mix
19. Tax Report (per jurisdiction)
20. Daily Cashier Closing
21. Per-shift Cash Reconciliation
22. Open Folio Report
23. Guest Ledger
24. City Ledger (corporate AR)
25. HK Productivity
26. F&B Revenue (per outlet)
27. Outlet POS Report
28. Inventory Consumption (stock)
29. Vendor Aging (AP)
30. Forecast vs Budget
31. RevPAR / ADR / Occupancy trend
32. TRevPAR (total RevPAR with F&B)
33. Booking Window Distribution
34. Reservation Source Funnel
35. Promo Code Performance
36. Loyalty Activity
37. Review Sentiment
38. Service Recovery (incident-to-resolution)
39. Maintenance Cost
40. Energy Consumption (V2 with IoT)

---

## Appendix F. Migration Templates

### From OPERA PMS
- Export: standard CSV exports
- Mapping: provided template
- Test import via dry-run

### From eZee Absolute
- API pull
- Mapping wizard

### From Hotelogix / IDS Next
- Excel template

### Generic (small properties)
- Guided CSV import for guests, bookings history

---

## Appendix G. Bangladesh Mushak 6.3 Invoice Spec

Required fields per Mushak 6.3 (current as of 2026):
- VAT registration no (BIN)
- Mushak no (sequential)
- Date of issue
- Buyer name, address
- Item description, quantity, unit price
- Total excluding VAT
- VAT amount (15% standard)
- Total including VAT
- Authorized signature space

Format: PDF, A4. NBR-prescribed layout.

---

## Appendix H. India GST Invoice Spec

- GSTIN of supplier + recipient
- Invoice no (sequential per GSTIN per FY)
- Date
- HSN/SAC code per item
- Taxable value
- CGST + SGST (intra-state) OR IGST (inter-state)
- Place of supply
- Reverse charge applicability

---

## Appendix I. OTA XML Sample Payloads

### Booking.com OTA_HotelAvailNotifRQ (ARI push excerpt)
```xml
<OTA_HotelAvailNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" Version="2.1">
  <Authentication Username="..." Password="..."/>
  <AvailStatusMessages HotelCode="123456">
    <AvailStatusMessage BookingLimit="5">
      <StatusApplicationControl Start="2026-07-01" End="2026-07-31"
                                InvTypeCode="DLX" RatePlanCode="BAR"/>
      <RestrictionStatus Restriction="Master" Status="Open"/>
    </AvailStatusMessage>
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>
```

### Booking.com retrieveBookings response excerpt
```xml
<reservations>
  <reservation id="BCOM-12345" status="new">
    <customer>
      <firstName>John</firstName><lastName>Doe</lastName>
      <email>john@example.com</email>
    </customer>
    <room id="DLX" arrivalDate="2026-07-15" departureDate="2026-07-18">
      <ratePlan id="BAR"/>
      <guests adults="2" children="0"/>
      <price currency="USD">450.00</price>
    </room>
  </reservation>
</reservations>
```

(Full sample library provided in `docs/integrations/`.)

---

## Appendix J. Common Pitfalls & Anti-patterns

1. **Storing card numbers** — never; use tokenization
2. **No idempotency on payment endpoints** — duplicate charges
3. **Sync ARI on every event without debounce** — channel rate limits hit
4. **Trusting OTA timestamps for ordering** — clock skew; use server receive time
5. **Hard-coding tax %** — jurisdiction varies; use tax engine
6. **Single timezone assumption** — chain hotels span TZ
7. **Eager-loading folio postings** — N+1 query disaster; paginate
8. **No tenant_id filter in raw SQL** — RLS bypass risk; always include
9. **Storing decimals as float** — money loss; use NUMERIC
10. **Blocking sync on UI** — show optimistic; sync in background
11. **No retry on transient OTA errors** — bookings missed
12. **Retry on 4xx** — infinite retry; only retry 5xx/429
13. **No max retry** — dead-letter accumulates
14. **Same idempotency key for different operations** — silent overrides
15. **No audit log on impersonation** — compliance risk
16. **Mutable audit log** — defeats purpose
17. **Sending PII to LLM** — privacy breach; redact first
18. **Not testing during ramadan / festival pricing** — special date edge cases
19. **Mixing storage of Gregorian + Bengali dates** — confusion; always store ISO, display locale
20. **Free-text country names** — use ISO 3166 codes
21. **No graceful degradation when WhatsApp template rejected** — fall back to SMS
22. **Hard delete user data** — accounting/audit gone; soft delete only

---

## Appendix K. Glossary of Hotel Industry Acronyms
(Already covered in Section ২. Additional specialized:)
- **NRG:** Non-Refundable Guarantee
- **CXL:** Cancellation
- **SOP:** Standard Operating Procedure
- **DBR:** Daily Business Report
- **FIT:** Free Independent Traveler
- **GIT:** Group Inclusive Tour
- **CRS:** Central Reservation System
- **CRO:** Central Reservation Office
- **PMS:** Property Management System
- **CRM:** Customer Relationship Management
- **RM:** Revenue Management / Revenue Manager
- **DOSM:** Director of Sales & Marketing
- **F&B:** Food & Beverage
- **HK:** Housekeeping
- **FO:** Front Office
- **FOM:** Front Office Manager
- **GM:** General Manager
- **DOR:** Director of Revenue
- **STR:** Smith Travel Research (industry benchmark)
- **MPI:** Market Penetration Index
- **ARI:** Average Rate Index
- **RGI:** Revenue Generation Index

---

# ✅ Document Completion Check

এই blueprint থেকে:
- **Architect** → Section ৩, ৪, ৯, Appendix architecture থেকে full design
- **Backend Dev** → Section ১০-২১, Module specs (২২-৪৫), Appendix B
- **Frontend Dev** → Section ৫১-৫৬, Module UI specs
- **Mobile Dev** → Section ৪১, ৫৬
- **DevOps** → Section ৭, ৫৯, ৬০, ৬১
- **QA** → Section ৫৭, ৫৮, ৬২
- **PM** → Section ১, ২২-৪৫ user stories + acceptance criteria, ৬৯ sprint plan
- **Designer** → Section ৫১-৫৬
- **Compliance/Legal** → Section ৬৩-৬৭
- **Sales/CS/Marketing** → Section ৭৩-৭৭
- **Founder/CEO** → Section ১, ৬৮, ৭১, ৭২

**এই ডকুমেন্ট স্ব-নির্ভর (self-contained):** development team এটি পড়ে directly code শুরু করতে পারবে, প্রতিদিন reference করবে — অন্য কোনো ডকুমেন্ট খুঁজতে হবে না।

**Living document:** প্রতি sprint শেষে যা শেখা হবে, যেখানে inaccuracy পাওয়া যাবে, যেখানে decision নতুন করে নিতে হবে — সেগুলো এখানেই update হবে। `docs/adr/` (Architecture Decision Records) folder-এ major decisions log রাখবে।

---

**শেষ কথা:** যদি এই ডকুমেন্টে কিছু পান যা missing মনে হয় (specific OTA quirk, country regulation, technical edge case), সেটা log করুন `docs/gaps.md`-এ — পরের update cycle-এ যোগ করব। কিন্তু core blueprint হিসেবে এটাই MVP থেকে V2 পর্যন্ত সম্পূর্ণ মানচিত্র।

---

# 📚 EXTENDED APPENDICES (L–Z) — Implementation Depth

আরও বেশি practical implementation detail — যাতে developer code লিখতে গিয়ে assumption না করতে হয়।

---

## Appendix L. Critical Algorithm Pseudo-code

### L.1 Overbooking-Safe Reservation Creation
```typescript
async function createReservation(input: ReservationInput, idempotencyKey: string) {
  // 1. Idempotency check
  const cached = await redis.get(`idem:${idempotencyKey}`);
  if (cached) return JSON.parse(cached);

  // 2. Distributed lock per property+date-range (prevent cross-instance race)
  const lockKey = `lock:reservation:${input.propertyId}:${input.arrivalDate}:${input.departureDate}`;
  const lock = await redlock.acquire([lockKey], 5000); // 5s TTL

  try {
    return await db.transaction(async (tx) => {
      // 3. SELECT FOR UPDATE on affected inventory_daily rows
      const inventoryRows = await tx.$queryRaw`
        SELECT property_id, room_type_id, stay_date, total, sold, blocked
        FROM inventory_daily
        WHERE property_id = ${input.propertyId}
          AND room_type_id = ${input.roomTypeId}
          AND stay_date >= ${input.arrivalDate}
          AND stay_date < ${input.departureDate}
        FOR UPDATE
      `;

      // 4. Validate availability for every night
      for (const row of inventoryRows) {
        const available = row.total - row.sold - row.blocked;
        if (available < input.roomCount) {
          throw new BusinessError('INVENTORY_INSUFFICIENT', { date: row.stay_date, available });
        }
      }

      // 5. Validate restrictions (MinLOS, CTA, CTD, Stop-sell)
      await validateRestrictions(tx, input);

      // 6. Compute total with rates + taxes
      const pricing = await computePricing(tx, input);

      // 7. Insert reservation + reservation_rooms
      const reservation = await tx.reservations.create({ ...input, ...pricing });

      // 8. UPDATE inventory (decrement sold)
      await tx.$executeRaw`
        UPDATE inventory_daily
        SET sold = sold + ${input.roomCount}
        WHERE property_id = ${input.propertyId}
          AND room_type_id = ${input.roomTypeId}
          AND stay_date >= ${input.arrivalDate}
          AND stay_date < ${input.departureDate}
      `;

      // 9. Outbox event (transactional with main writes)
      await tx.outbox.create({ event: 'reservation.created', payload: reservation });

      // 10. Cache idempotency result
      await redis.setex(`idem:${idempotencyKey}`, 86400, JSON.stringify(reservation));

      return reservation;
    });
  } finally {
    await lock.release();
  }
}
```

### L.2 ARI Delta Computation (Channel Sync)
```typescript
async function computeARIDelta(channelId: string): Promise<ARIDelta> {
  const lastState = await redis.hgetall(`ari:state:${channelId}`); // last known per-date state
  const currentState = await db.query.inventory_daily_for_channel(channelId);

  const delta: ARIDelta = { inventory: [], rates: [], restrictions: [] };

  for (const cell of currentState) {
    const key = `${cell.roomTypeId}:${cell.stayDate}`;
    const lastInventory = lastState[`inv:${key}`];
    if (lastInventory !== cell.available.toString()) {
      delta.inventory.push({ roomTypeId, stayDate, value: cell.available });
    }
    // same for rate + restriction
  }
  return delta;
}

// Then push only the delta, not full state — reduces channel load + faster
```

### L.3 Pricing & Tax Calculation
```typescript
function computeReservationTotal(input): PricingBreakdown {
  let subtotal = 0;
  const nightlyBreakdown = [];

  for (let date = arrival; date < departure; date.addDay()) {
    const baseRate = getRateDaily(roomType, ratePlan, date);
    const adjustedRate = applyOccupancyAdjustment(baseRate, input.adults, input.children, roomType);
    nightlyBreakdown.push({ date, rate: adjustedRate });
    subtotal += adjustedRate;
  }

  // Add-ons (extra bed, breakfast upgrade, etc.)
  const addOnsTotal = input.addOns.reduce((sum, a) => sum + a.price * a.quantity, 0);

  // Discounts (promo code, member discount, package)
  // Discount stacking rule: only one promo + one member discount; max combined 30%
  const discounts = applyDiscounts(subtotal + addOnsTotal, input.promoCode, input.loyaltyTier);

  const preTax = subtotal + addOnsTotal - discounts;

  // Tax: jurisdiction-aware, multi-line
  // Bangladesh example: VAT 15% on (base + service charge), Service Charge 10% on base
  const taxes = [];
  if (property.country === 'BD') {
    const serviceCharge = preTax * 0.10;
    taxes.push({ name: 'Service Charge', rate: 0.10, amount: serviceCharge });
    const vatBase = preTax + serviceCharge;
    const vat = vatBase * 0.15;
    taxes.push({ name: 'VAT', rate: 0.15, amount: vat });
  }
  // India example: GST 12% or 18% depending on rate
  // EU example: VAT per country (5–25%)

  const taxTotal = taxes.reduce((sum, t) => sum + t.amount, 0);
  const grandTotal = preTax + taxTotal;

  return { nightlyBreakdown, subtotal, addOnsTotal, discounts, taxes, taxTotal, grandTotal };
}
```

### L.4 Cancellation Refund Calculation
```typescript
function computeCancellationRefund(reservation, cancelledAt): RefundCalc {
  const policy = getCancellationPolicy(reservation);
  const hoursToArrival = (reservation.arrivalDate - cancelledAt) / (1000 * 60 * 60);

  for (const tier of policy.tiers) {
    // tier example: { minHoursBefore: 48, refundPercentage: 100 }
    if (hoursToArrival >= tier.minHoursBefore) {
      return {
        refundAmount: reservation.totalAmount * (tier.refundPercentage / 100),
        penaltyAmount: reservation.totalAmount * (1 - tier.refundPercentage / 100),
        rule: tier.label,
      };
    }
  }
  // Fallback: no refund (within cutoff)
  return { refundAmount: 0, penaltyAmount: reservation.totalAmount, rule: 'no_refund_window' };
}
```

### L.5 Night Audit Step-by-step
```typescript
async function runNightAudit(propertyId, businessDate) {
  await acquireNightAuditLock(propertyId, businessDate); // idempotent

  // Step 1: Process no-shows
  const noShows = await db.reservations.findMany({
    where: {
      propertyId,
      status: 'confirmed',
      arrivalDate: businessDate,
      checkedInAt: null,
    }
  });
  for (const res of noShows) {
    await markNoShow(res); // posts no-show charge per policy
  }

  // Step 2: Post room + tax for in-house guests
  const inHouse = await db.reservations.findMany({
    where: { propertyId, status: 'in_house' }
  });
  for (const res of inHouse) {
    const ratePosting = await postRoomCharge(res, businessDate);
    const taxPostings = await postTaxes(res.folioId, ratePosting);
  }

  // Step 3: Generate daily reports
  const reports = await Promise.all([
    generateFlashReport(propertyId, businessDate),
    generateManagerReport(propertyId, businessDate),
    generateTaxReport(propertyId, businessDate),
    generateForecast(propertyId, businessDate, 7),
  ]);

  // Step 4: Advance business date
  await db.properties.update({
    where: { id: propertyId },
    data: { businessDate: businessDate.addDay() }
  });

  // Step 5: Archive snapshot
  await archiveDailySnapshot(propertyId, businessDate);

  // Step 6: Email reports
  await emailReports(propertyId, reports, businessDate);

  await releaseNightAuditLock(propertyId, businessDate);
}
```

### L.6 Booking Engine Availability Search (Optimized)
```typescript
// Query path: minimize round-trips
async function searchAvailability(propertyId, checkIn, checkOut, adults, children) {
  // Single query: room types × dates × rate plans with restrictions check
  const result = await db.$queryRaw`
    SELECT
      rt.id, rt.name, rt.photos,
      rp.id as rate_plan_id, rp.name as rate_plan_name,
      MIN(inv.total - inv.sold - inv.blocked) as min_available,
      SUM(rd.rate_amount) as total_rate,
      COUNT(DISTINCT inv.stay_date) as nights,
      BOOL_OR(COALESCE(rest.cta, false) AND inv.stay_date = ${checkIn}::date) as cta_blocked,
      BOOL_OR(COALESCE(rest.ctd, false) AND inv.stay_date = ${checkOut}::date - 1) as ctd_blocked,
      BOOL_OR(COALESCE(rest.stop_sell, false)) as stopped,
      MAX(COALESCE(rest.min_los, 0)) as max_min_los
    FROM room_types rt
    JOIN inventory_daily inv ON inv.room_type_id = rt.id
    JOIN rate_plans rp ON rp.property_id = rt.property_id
    JOIN rate_daily rd ON rd.room_type_id = rt.id AND rd.rate_plan_id = rp.id AND rd.stay_date = inv.stay_date
    LEFT JOIN restrictions_daily rest ON rest.room_type_id = rt.id AND rest.rate_plan_id = rp.id AND rest.stay_date = inv.stay_date
    WHERE rt.property_id = ${propertyId}
      AND inv.stay_date >= ${checkIn}::date
      AND inv.stay_date < ${checkOut}::date
      AND rt.max_occupancy >= ${adults + children}
      AND rt.is_active = true
    GROUP BY rt.id, rt.name, rt.photos, rp.id, rp.name
    HAVING MIN(inv.total - inv.sold - inv.blocked) > 0
       AND NOT BOOL_OR(COALESCE(rest.stop_sell, false))
       AND NOT BOOL_OR(COALESCE(rest.cta, false) AND inv.stay_date = ${checkIn}::date)
       AND NOT BOOL_OR(COALESCE(rest.ctd, false) AND inv.stay_date = ${checkOut}::date - 1)
       AND COUNT(DISTINCT inv.stay_date) >= MAX(COALESCE(rest.min_los, 0))
    ORDER BY rt.display_order, total_rate ASC
  `;

  return result;
}
```

### L.7 Inventory Hold (Quote)
```typescript
async function createQuoteHold(input): Promise<QuoteHold> {
  const holdId = uuid();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.transaction(async (tx) => {
    // Decrement available via "blocked" delta in inventory
    await tx.$executeRaw`
      UPDATE inventory_daily
      SET blocked = blocked + ${input.roomCount}
      WHERE property_id = ${input.propertyId}
        AND room_type_id = ${input.roomTypeId}
        AND stay_date >= ${input.arrivalDate}
        AND stay_date < ${input.departureDate}
    `;
    await tx.quote_holds.create({ id: holdId, ...input, expiresAt });
  });

  // Schedule cleanup
  await rabbitmq.publishDelayed('hold.expire', { holdId }, 10 * 60 * 1000);

  return { holdId, expiresAt };
}

// Cron + delayed job releases expired holds
async function releaseExpiredHolds() {
  const expired = await db.quote_holds.findMany({
    where: { expiresAt: { lt: new Date() }, status: 'active' }
  });
  for (const hold of expired) {
    await releaseHold(hold); // decrement blocked back
  }
}
```

### L.8 Rate Parity Check
```typescript
async function checkRateParityForProperty(propertyId, date) {
  const directRate = await getDirectRate(propertyId, date);
  const channelRates = await Promise.all(
    propertyChannels.map(ch => fetchPublicRate(ch, propertyId, date))
  );

  const violations = [];
  for (const cr of channelRates) {
    if (Math.abs(cr.rate - directRate) / directRate > 0.02) { // 2% threshold
      violations.push({ channel: cr.channel, direct: directRate, channel_rate: cr.rate });
    }
  }

  if (violations.length > 0) {
    await emitAlert('rate_parity_violation', { propertyId, date, violations });
  }
}
```

### L.9 Loyalty Points Calculation
```typescript
function calculateLoyaltyPoints(reservation, guest) {
  const tier = getLoyaltyTier(guest.totalSpendLast12Months);
  const earnRate = { silver: 0.05, gold: 0.08, platinum: 0.12 }[tier];

  // Only on direct bookings; only on room revenue (not tax/F&B)
  if (reservation.source !== 'direct') return 0;

  const roomRevenue = reservation.totalAmount - reservation.taxAmount - reservation.addOnsAmount;
  const points = Math.floor(roomRevenue * earnRate);

  return points;
}
```

---

## Appendix M. Sample API Payloads (JSON)

### M.1 POST /reservations request
```json
{
  "propertyId": "prop-uuid-1",
  "source": "direct",
  "arrivalDate": "2026-07-15",
  "departureDate": "2026-07-18",
  "rooms": [
    {
      "roomTypeId": "rt-uuid-deluxe",
      "ratePlanId": "rp-uuid-bar",
      "adults": 2,
      "children": 1,
      "extraBed": false
    }
  ],
  "guest": {
    "fullName": "Md Karim Ahmed",
    "email": "karim@example.com",
    "phone": "+8801712345678",
    "nationality": "BD",
    "idType": "nid",
    "idNumber": "1234567890"
  },
  "specialRequests": "Late arrival around 11 PM, vegetarian breakfast preferred",
  "addOns": [
    { "code": "airport_transfer", "quantity": 1 }
  ],
  "promoCode": "SUMMER10",
  "payment": {
    "method": "bkash",
    "amount": 8500.00,
    "currency": "BDT"
  }
}
```

### M.2 POST /reservations response
```json
{
  "data": {
    "id": "res-uuid-1",
    "reservationNo": "RSV-2026-00123",
    "status": "confirmed",
    "source": "direct",
    "arrivalDate": "2026-07-15",
    "departureDate": "2026-07-18",
    "nights": 3,
    "adults": 2,
    "children": 1,
    "rooms": [
      {
        "id": "rr-uuid-1",
        "roomTypeId": "rt-uuid-deluxe",
        "roomTypeName": "Deluxe Sea View",
        "ratePlanId": "rp-uuid-bar",
        "ratePerNight": 2500.00,
        "totalAmount": 7500.00
      }
    ],
    "pricing": {
      "subtotal": 7500.00,
      "addOnsTotal": 1500.00,
      "discounts": 900.00,
      "preTax": 8100.00,
      "taxes": [
        { "name": "Service Charge", "rate": 0.10, "amount": 810.00 },
        { "name": "VAT", "rate": 0.15, "amount": 1336.50 }
      ],
      "taxTotal": 2146.50,
      "grandTotal": 10246.50,
      "currency": "BDT"
    },
    "paymentStatus": "paid",
    "guest": { "id": "guest-uuid-1", "fullName": "Md Karim Ahmed", "email": "..." },
    "createdAt": "2026-06-04T10:23:45Z"
  },
  "meta": { "requestId": "req-uuid-1" }
}
```

### M.3 Webhook payload: reservation.created
```json
{
  "event": "reservation.created",
  "occurredAt": "2026-06-04T10:23:45Z",
  "tenantId": "tenant-uuid",
  "data": {
    "reservationId": "res-uuid-1",
    "reservationNo": "RSV-2026-00123",
    "propertyId": "prop-uuid-1",
    "source": "direct",
    "arrivalDate": "2026-07-15",
    "departureDate": "2026-07-18",
    "totalAmount": 10246.50,
    "currency": "BDT",
    "guest": { "id": "guest-uuid-1", "fullName": "...", "email": "..." }
  }
}
```

### M.4 OTA inbound mapping example (Booking.com → internal)
```
BCOM XML field          → Internal field
─────────────────────────────────────────
reservation.id          → source_reference
customer.firstName + lastName → guest.full_name
customer.email          → guest.email
customer.telephone      → guest.phone
room.arrivalDate        → arrival_date
room.departureDate      → departure_date
room.guests.adults      → adults
room.guests.children    → children
room.id                 → channel_mapping → room_type_id
room.ratePlan.id        → channel_mapping → rate_plan_id
room.price              → total_amount
reservation.status      → "new" → confirmed, "modified" → modify, "cancelled" → cancel
```

### M.5 Tenant signup payload
```json
{
  "tenant": {
    "name": "Sea View Hotels Ltd",
    "country": "BD",
    "defaultCurrency": "BDT",
    "defaultLocale": "bn-BD",
    "defaultTimezone": "Asia/Dhaka"
  },
  "owner": {
    "fullName": "Rahim Khan",
    "email": "rahim@seaview.com",
    "password": "...",
    "phone": "+8801711122233"
  },
  "acceptTermsVersion": "2026-01-01"
}
```

---

## Appendix N. Field Validation Rules

### Common fields
| Field | Rules |
|---|---|
| Email | RFC 5322 + valid MX (optional check); max 254 chars |
| Phone | E.164 format via libphonenumber; required country code |
| Full name | 2–100 chars; trim; reject leading/trailing space, double space |
| Currency | ISO 4217 (3 char uppercase) |
| Date | ISO 8601 `YYYY-MM-DD` |
| DateTime | ISO 8601 with TZ `YYYY-MM-DDTHH:mm:ssZ` |
| UUID | RFC 4122 v4 |
| Password | min 12 chars, upper+lower+digit+symbol, not in HIBP top 1M |

### Reservation-specific
| Field | Rules |
|---|---|
| arrivalDate | >= today property TZ; <= 2 years out |
| departureDate | > arrivalDate; nights <= 365 |
| adults | >= 1; <= room_type.max_adults |
| children | >= 0; <= room_type.max_children |
| rooms count | >= 1; <= 9 per reservation (UI cap) |
| total_amount | > 0; max 10^10; 2 decimal places |
| promo_code | alphanumeric, 3-20 chars, uppercase |

### Country-specific
| Field | Country | Rules |
|---|---|---|
| NID | BD | 10 or 13 or 17 digits |
| Passport | Any | Alphanumeric 6-15, uppercase |
| Aadhaar | IN | 12 digits (with Verhoeff check) |
| GSTIN | IN | 15 chars per format `[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}` |
| BIN | BD | 9 or 13 digits (VAT registration) |

### Currency rounding
| Currency | Decimal places |
|---|---|
| BDT, INR, USD, EUR, GBP | 2 |
| JPY, KRW, VND | 0 |
| BHD, KWD | 3 |

Always store in smallest unit if working with cents; display per locale.

---

## Appendix O. Sample Report SQL

### Daily Flash Report
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'in_house') AS occupied_rooms,
  (SELECT SUM(total) FROM inventory_daily WHERE property_id = $1 AND stay_date = $2) AS available_rooms,
  COUNT(*) FILTER (WHERE arrival_date = $2 AND status = 'checked_in') AS arrivals_today,
  COUNT(*) FILTER (WHERE departure_date = $2 AND status = 'checked_out') AS departures_today,
  COUNT(*) FILTER (WHERE arrival_date = $2 AND status = 'no_show') AS no_shows,
  SUM(total_amount) FILTER (WHERE DATE(checked_in_at) = $2) AS today_revenue,
  AVG(total_amount / nights) FILTER (WHERE status IN ('in_house','checked_out')) AS adr,
  SUM(total_amount) / NULLIF((SELECT SUM(total) FROM inventory_daily WHERE property_id=$1 AND stay_date=$2), 0) AS revpar
FROM reservations
WHERE property_id = $1
  AND status IN ('checked_in','in_house','checked_out','no_show')
  AND $2 BETWEEN arrival_date AND departure_date - INTERVAL '1 day';
```

### Pickup Report (7-day rolling)
```sql
SELECT
  DATE(created_at) AS booking_date,
  COUNT(*) AS bookings,
  SUM(nights) AS room_nights,
  SUM(total_amount) AS revenue
FROM reservations
WHERE property_id = $1
  AND created_at >= NOW() - INTERVAL '7 days'
  AND status IN ('confirmed','checked_in','in_house','checked_out')
GROUP BY DATE(created_at)
ORDER BY booking_date;
```

### Channel Production Report
```sql
SELECT
  source,
  COUNT(*) AS bookings,
  SUM(nights) AS room_nights,
  SUM(total_amount) AS gross_revenue,
  SUM(total_amount * COALESCE(c.commission_rate, 0)) AS commission,
  SUM(total_amount * (1 - COALESCE(c.commission_rate, 0))) AS net_revenue
FROM reservations r
LEFT JOIN channels c ON c.channel_code = r.source AND c.property_id = r.property_id
WHERE r.property_id = $1
  AND r.created_at BETWEEN $2 AND $3
  AND r.status NOT IN ('cancelled','no_show')
GROUP BY source
ORDER BY net_revenue DESC;
```

### Occupancy & RevPAR Trend
```sql
WITH daily AS (
  SELECT
    stay_date,
    SUM(total) AS total_rooms,
    SUM(sold) AS sold_rooms
  FROM inventory_daily
  WHERE property_id = $1 AND stay_date BETWEEN $2 AND $3
  GROUP BY stay_date
),
revenue AS (
  SELECT
    gs::date AS stay_date,
    SUM(r.total_amount / r.nights) AS room_revenue
  FROM generate_series($2::date, $3::date, '1 day') gs
  LEFT JOIN reservations r ON gs::date BETWEEN r.arrival_date AND r.departure_date - INTERVAL '1 day'
    AND r.property_id = $1
    AND r.status IN ('confirmed','checked_in','in_house','checked_out')
  GROUP BY gs::date
)
SELECT
  d.stay_date,
  d.total_rooms,
  d.sold_rooms,
  ROUND(d.sold_rooms::NUMERIC / NULLIF(d.total_rooms, 0) * 100, 2) AS occupancy_pct,
  ROUND(r.room_revenue / NULLIF(d.sold_rooms, 0), 2) AS adr,
  ROUND(r.room_revenue / NULLIF(d.total_rooms, 0), 2) AS revpar
FROM daily d
JOIN revenue r ON r.stay_date = d.stay_date
ORDER BY d.stay_date;
```

### Lead Time Analysis
```sql
SELECT
  CASE
    WHEN arrival_date - created_at::date <= 0 THEN 'same_day'
    WHEN arrival_date - created_at::date <= 7 THEN '1-7_days'
    WHEN arrival_date - created_at::date <= 30 THEN '8-30_days'
    WHEN arrival_date - created_at::date <= 90 THEN '31-90_days'
    ELSE '90+_days'
  END AS booking_window,
  COUNT(*) AS bookings,
  SUM(total_amount) AS revenue
FROM reservations
WHERE property_id = $1 AND created_at BETWEEN $2 AND $3
  AND status NOT IN ('cancelled')
GROUP BY booking_window
ORDER BY MIN(arrival_date - created_at::date);
```

---

## Appendix P. Configuration Templates

### P.1 docker-compose.yml (local dev)
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: atlas
      POSTGRES_PASSWORD: atlas_dev
      POSTGRES_DB: atlas
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]

  meilisearch:
    image: getmeili/meilisearch:v1.6
    environment:
      MEILI_MASTER_KEY: dev_master_key
    ports: ["7700:7700"]

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgres://atlas:atlas_dev@postgres:5432/atlas
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://rabbitmq
    ports: ["3000:3000"]
    depends_on: [postgres, redis, rabbitmq]

  sync:
    build: ./apps/sync
    environment:
      DATABASE_URL: ${DATABASE_URL}
      RABBITMQ_URL: amqp://rabbitmq
    depends_on: [postgres, rabbitmq]

volumes:
  pgdata:
```

### P.2 GitHub Actions CI workflow (excerpt)
```yaml
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
      redis:
        image: redis:7
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test --coverage
      - uses: codecov/codecov-action@v4
      - run: pnpm test:e2e
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379
      - name: Security scan
        run: |
          pnpm dlx snyk test --severity-threshold=high
          pnpm dlx semgrep ci
```

### P.3 Terraform module (RDS example)
```hcl
module "rds_primary" {
  source = "terraform-aws-modules/rds/aws"

  identifier = "atlas-prod-primary"
  engine     = "postgres"
  engine_version = "16.1"
  instance_class = "db.r6g.large"

  allocated_storage = 100
  max_allocated_storage = 1000
  storage_encrypted = true
  kms_key_id = aws_kms_key.rds.arn

  db_name  = "atlas"
  username = "atlas_app"
  manage_master_user_password = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.atlas.name

  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "Sun:04:30-Sun:05:30"

  multi_az = true

  performance_insights_enabled = true
  performance_insights_retention_period = 7

  enabled_cloudwatch_logs_exports = ["postgresql"]

  parameters = [
    { name = "shared_preload_libraries", value = "pg_stat_statements" },
    { name = "log_min_duration_statement", value = "1000" }
  ]

  tags = { Environment = "production", Project = "atlas" }
}
```

### P.4 Tailwind config (semantic tokens)
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: { 50: '#EFF6FF', 500: '#3B82F6', 700: '#1D4ED8', 900: '#1E3A8A' },
        success: { 500: '#16A34A' },
        warning: { 500: '#F59E0B' },
        danger:  { 500: '#DC2626' },
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'Noto Sans Bengali', 'sans-serif'],
        bn:   ['Hind Siliguri', 'SolaimanLipi', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('tailwindcss-rtl')],
}
```

---

## Appendix Q. Tenant / Property / User Settings Catalog

### Tenant-level settings
- Default currency
- Default locale + timezone
- Default invoice template style
- Audit log retention years
- Allowed login methods (email/SSO/both)
- MFA enforcement (off / for admins / for all)
- Session timeout
- Concurrent session limit
- Sub-processor list (for DPA)
- Branding (logo, primary color, custom domain)

### Property-level settings
- Check-in / check-out time
- Cancellation policy default
- Child age cutoff
- Pet policy
- Smoking policy
- Tax codes applicable + computation order
- Service charge inclusion
- Currency display position (prefix/suffix)
- Date format display
- Night audit time
- No-show charge policy
- Cashier reconciliation tolerance
- Auto-assign room on check-in (on/off)
- Auto-stop sell at low inventory threshold
- Direct booking engine on/off + custom CSS
- WhatsApp / SMS templates per language
- Police reporting toggle + format
- Loyalty tier thresholds
- F&B post to room cutoff time

### User preferences
- UI language
- Timezone (for notifications)
- Notification channels enabled per event type
- Quiet hours
- Default dashboard
- Default property
- Date format preference
- Number format preference
- Theme (light/dark/auto)
- Keyboard shortcut cheat sheet visibility

---

## Appendix R. Notification Templates (Extended)

### R.1 Booking Modification Confirmation (Bengali)
```
আপনার বুকিং পরিবর্তন হয়েছে — {{property_name}}
বুকিং রেফ: {{booking_ref}}
পরিবর্তিত: {{change_summary}}
নতুন মোট: {{currency_symbol}}{{new_total}}
পার্থক্য: {{currency_symbol}}{{diff_amount}} ({{diff_direction}})
```

### R.2 Payment Received
```
Subject: Payment received — {{currency}}{{amount}}
Hi {{guest_name}}, we've received your payment of {{currency}}{{amount}} for booking {{booking_ref}}.
Receipt: {{receipt_url}}
```

### R.3 Refund Processed
```
Subject: Refund of {{currency}}{{amount}} processed
Hi {{guest_name}}, your refund has been issued. Allow 5–10 business days for it to appear (3–5 for bKash/Nagad). Reference: {{refund_ref}}
```

### R.4 Password Reset
```
Subject: Reset your Atlas password
Click here to reset: {{reset_url}}
Link expires in 1 hour. If you didn't request this, ignore this email.
```

### R.5 Staff Invitation
```
Subject: {{inviter_name}} invited you to {{property_name}} on Atlas
You've been invited as {{role}} at {{property_name}}.
Accept invitation: {{accept_url}}
Expires in 7 days.
```

### R.6 Daily Manager Report (Email)
```
Subject: Manager Report — {{property_name}} — {{business_date}}

Occupancy: {{occupancy_pct}}%  ({{occupied}}/{{total}})
ADR: {{currency}}{{adr}}
RevPAR: {{currency}}{{revpar}}
Today's Revenue: {{currency}}{{revenue}}
Arrivals: {{arrivals}}  · Departures: {{departures}}  · No-shows: {{no_shows}}
Pickup (7d): {{pickup_7d}}
Forecast next 7d Occupancy: {{forecast_occ_7d}}%

Open Folios: {{open_folio_count}} (total balance {{currency}}{{open_folio_balance}})

Top Channels Today:
{{#channels}}
- {{name}}: {{count}} bookings, {{currency}}{{revenue}}
{{/channels}}

Attached: Flash Report PDF, Tax Report PDF
```

### R.7 WhatsApp Templates (must be Meta-approved categories: UTILITY / MARKETING)

**Template: `booking_confirmed_bn` (UTILITY)**
```
আপনার বুকিং নিশ্চিত! {{1}} — {{2}} (চেক-ইন: {{3}}) — রেফ {{4}}
```

**Template: `pre_arrival_upsell_bn` (MARKETING)**
```
{{1}}, আপনার {{2}}-এ ভ্রমণের আর {{3}} দিন বাকি! এই অফারগুলো দেখে নিন:
1️⃣ Airport transfer
2️⃣ Early check-in
3️⃣ Room upgrade
উত্তর দিন 1/2/3
```

---

## Appendix S. Tech Stack Decision Matrix

| Choice | Alternatives Considered | Decision Rationale |
|---|---|---|
| NestJS (Node) | Express, Fastify, Django, Rails | DI + modular; TS native; large ecosystem; enterprise patterns built-in |
| Go for sync engine | Rust, Node | Concurrency primitives; fast; smaller binary; easier hiring than Rust |
| PostgreSQL | MySQL, MongoDB | RLS for multi-tenancy; JSONB; partitioning; ACID; better tooling |
| Prisma | TypeORM, raw SQL | Best TS DX; introspection; migration UX; but raw SQL for RLS-critical paths |
| Next.js | Remix, Nuxt | SSR for booking SEO; biggest community; Vercel option for SaaS |
| React Native + Expo | Flutter, native | TS shared with web; faster hiring; Expo speeds setup |
| Meilisearch | Elasticsearch, Algolia, Typesense | Easy ops; sufficient for Year 1; Algolia too expensive at scale |
| Redis | KeyDB, DragonflyDB | Most stable; battle-tested locking (Redlock) |
| RabbitMQ | Kafka, SQS | Better routing for our jobs; sufficient throughput; Kafka overkill at our scale |
| Stripe | Adyen, Braintree | Best DX; Stripe Connect for multi-tenant; Bangladesh via SSLCommerz parallel |
| Anthropic Claude | OpenAI GPT-4 | Better Bengali; better long-context; Claude for primary, GPT for fallback |
| ClickHouse (V1.5) | BigQuery, Snowflake | Self-hosted control; cheaper at scale; column store for analytics |
| Meilisearch over Algolia | — | Algolia pricing prohibitive (per record + per search) |
| ECS Fargate (MVP) → EKS (V1.5+) | EC2, Lambda, App Runner | Less ops at start; K8s when scale demands |

(Architecture Decision Records (ADR) in `docs/adr/`: 0001-language-choice.md, 0002-multi-tenancy-strategy.md, etc.)

---

## Appendix T. Cost Model / Unit Economics

### Per-Tenant Monthly Infra Cost Estimate (USD)

**Basic tier (1 property, 30 rooms, ~150 bookings/month):**
| Item | Cost |
|---|---|
| Shared DB share | $2 |
| Shared compute share | $4 |
| Storage (avg 500MB) | $0.05 |
| Bandwidth (10 GB) | $0.90 |
| Email (200 messages via SendGrid Essentials share) | $0.50 |
| SMS (50 messages — local BD via Alpha SMS) | $0.50 |
| WhatsApp (100 utility messages × $0.0085) | $0.85 |
| Channel sync (5 channels, bundled) | $0.50 |
| LLM (10 review replies × ~1000 tokens) | $0.05 |
| Misc (Sentry, monitoring share) | $1.00 |
| **Total** | **~$10/month** |
| **Sell price (BDT 8000 ≈ $70)** | — |
| **Gross margin** | **~85%** |

**Pro tier (3 properties, 100 rooms, ~700 bookings/month):**
| Item | Cost |
|---|---|
| Higher DB/compute share | $20 |
| Storage (2GB) | $0.20 |
| Bandwidth (40 GB) | $3.60 |
| Email (1000) | $2.50 |
| SMS (300) | $3.00 |
| WhatsApp (600 messages incl. marketing) | $6.00 |
| Channel sync (15 channels) | $1.50 |
| LLM (50 review replies + chatbot use) | $0.50 |
| Mobile push (FCM/APNS free) | $0 |
| Monitoring share | $3 |
| **Total** | **~$40/month** |
| **Sell price (BDT 35000 ≈ $300)** | — |
| **Gross margin** | **~87%** |

**Enterprise tier:** Variable; target gross margin 80%+ even with dedicated support.

### CAC (Customer Acquisition Cost)
- Pilot: ~$200 (mostly time)
- Inbound (post-launch): $300–500
- Outbound sales: $800–1500
- **Target: CAC payback < 6 months**

### LTV
- Avg tenure target: 36 months
- Pro tier LTV: $300 × 36 = $10,800; gross profit (87%): $9,400
- LTV:CAC target: 5:1 for inbound, 4:1 for outbound

---

## Appendix U. OTA-Specific Quirks Catalog

### Booking.com
- Rate must be inclusive of all taxes (in their system)
- Commission deducted from your invoice, not at booking time
- Genius rate (-10%) and Mobile rate (-10%) need separate rate plans or special flags
- Free cancellation refundable rate plan is mandatory (their policy)
- Children policy enforced by them; must mirror
- Stop-sell can be at room or rate level; rate-level is finer
- Their "Closed to Departure" applies to checkout date, not stay date — confusing
- They send "MODIFY" instead of CANCEL + CREATE for date changes

### Agoda (YCS)
- Time zone: UTC always; convert to property TZ
- Rate plans must match by name (no IDs); rename = re-mapping required
- Allotment model preferred over pooled (their default expectation)
- Cancellation policy expressed in hours-before-arrival
- Booking confirmation slower than Booking.com (often 5-10 min)

### Expedia
- EQC vs EPS: EQC is hotel-collect, EPS is Expedia-collect with VCC
- VCC card details sent in reservation; charge on date specified
- Their rate is "AVG/NIGHT" not "TOTAL" — beware
- Pet allowance separate flag
- Booking statuses richer: pending, confirmed, modified, cancelled, refunded

### Airbnb
- Strict cancellation policy mapping (Flexible/Moderate/Firm/Strict/Super Strict)
- Instant Book vs Request to Book — channel manager works with Instant Book
- Long-stay discount (7+ / 28+) needs separate handling
- Cleaning fee is per-stay add-on, not per-night
- Children count differently (no fixed ages — host configures)

### Hotelbeds
- Wholesale model: contracted net rate, not retail
- Allotment-based; release period before stay
- Their rates often 25-30% below BAR (wholesale discount)
- Pay-later vs Pay-now contracts

### ShareTrip / GoZayaan (BD)
- Newer APIs, may have higher error rates
- Customer support availability in Bangla
- Mobile-first traffic; commissions negotiable
- Settlement weekly via bank transfer

### MakeMyTrip / Goibibo (now merged)
- Single Connect API serves both
- Hourly bookings supported (transit hotels)
- Pay-at-hotel option common
- Indian guest IDs (Aadhaar) must be capturable

### Trip.com
- Multilingual descriptions important (Chinese-Simplified, Korean, Japanese)
- Different payment cycles per market

### GDS (Amadeus/Sabre/Travelport via DerbySoft)
- Corporate rate codes
- Negotiated rates per company
- Commission to TA configurable
- Static rate caching at GDS (refresh delay)

---

## Appendix V. Scheduled Jobs / Cron Catalog

| Job | Cadence | Purpose |
|---|---|---|
| `nightAudit` | Per-property at 03:00 local TZ | Daily close |
| `releaseExpiredQuoteHolds` | Every 1 minute | Cleanup inventory holds |
| `syncRetryDeadLetter` | Every 5 min | Re-attempt failed channel sync jobs |
| `rateParityCheck` | Daily 09:00 UTC | Compare direct vs OTA rates |
| `forecastRefresh` | Daily 04:00 local | Update demand forecast |
| `loyaltyExpiryReminder` | Daily 09:00 local | Email guests about expiring points |
| `triggerPreArrival` | Every 1 hour | Find bookings hitting 48h-before-arrival mark |
| `triggerPostStay` | Every 1 hour | Find checkouts hitting 24h post mark |
| `marketingAbandonedBooking` | Every 15 min | Find abandoned carts 1h/24h |
| `archiveCompletedReservations` | Weekly | Move old reservations to cold storage |
| `dbVacuum` | Weekly Sunday 03:00 | PostgreSQL maintenance |
| `backupHealthCheck` | Daily 06:00 | Verify backup integrity |
| `subscriptionRenewal` | Daily 02:00 UTC | Charge SaaS subscriptions due today |
| `invoiceGenerate` | Daily 01:00 UTC | Generate SaaS invoices |
| `usageReset` | Monthly 1st 00:00 | Reset usage counters per tenant |
| `churnRiskScoring` | Weekly Monday 07:00 | Update health scores |
| `policeReportingSubmit` | Every 1 hour | Submit pending Form-C / SB Foreigner forms |
| `taxFilingPrep` | Monthly | Generate tax filing exports |
| `kpiSnapshot` | Hourly | Capture metrics for internal dashboard |
| `secretRotation` | Quarterly | JWT secret, KMS keys |
| `dependencyAudit` | Weekly | Dependabot/Snyk reports |
| `prCleanup` | Daily | Delete ephemeral envs for closed PRs |
| `cacheWarming` | Daily 05:00 | Pre-warm calendar cache for next 30 days |

---

## Appendix W. Cache Keys Naming Convention

```
{namespace}:{entity}:{id}[:variant]

Examples:
inv:state:{channelId}              # last known ARI state per channel
rate:cache:{propertyId}:{date}     # rate snapshot
session:{userId}:{deviceId}        # session token
lock:reservation:{propertyId}:{arrival}:{departure}    # distributed lock
idem:{key}                         # idempotency response cache
ratelimit:{userId}:{endpoint}      # token bucket
hold:{holdId}                      # inventory hold
search:result:{queryHash}          # search cache
feature_flag:{tenantId}:{flag}     # FF cache
sync:debounce:{channelId}          # debounce timer

TTLs:
- Sessions: sliding 15 min (token), 30 days (refresh)
- Inventory cache: 60s
- Rate cache: 5 min
- Search results: 30s
- Idempotency: 24h
- Distributed lock: 5s default, renewable
- Feature flags: 60s
```

Cache invalidation triggers:
- `reservation.created/cancelled` → invalidate `inv:state` for property × dates
- `rate.updated` → invalidate `rate:cache` for date range
- `restriction.updated` → invalidate `inv:state`
- `feature_flag updated` → publish to Redis channel → all instances refresh

---

## Appendix X. Date / Time / Currency Edge Cases

### Time Zone
- **Store:** ISO 8601 UTC always (`TIMESTAMPTZ`)
- **Display:** Per user's preferred TZ (fallback property TZ)
- **Business date:** Per property TZ (night audit advances this)
- **Stay date:** "Local" date — `arrival_date` is a `DATE`, no TZ — it means "this calendar date at this property"

### DST Transitions
- Property in DST zone: night audit at 03:00 local — handle "spring forward" (might skip 02:00) and "fall back" (might run twice — idempotent)
- Reservation arriving on DST day: 1 night = 23 or 25 hours; charge by night count, not duration

### Leap Year
- Feb 29 — system must allow bookings; some tax periods adjust
- Birthday Feb 29: store as Feb 29; for non-leap year, treat as Mar 1 for reminders (configurable)

### Currency Rounding
- Always store as integer minor units (`cents`, `paisa`)
- Display with proper decimals per ISO 4217
- Bangladesh: BDT has 100 poisha but practically rounded to whole BDT — configurable
- Half-up rounding (banker's rounding optional)

### Multi-currency edge cases
- Reservation in USD, payment in BDT: FX rate locked at payment time
- Refund: refund in original payment currency
- Tax: calculated in property currency, displayed in guest's currency

### Bengali Calendar
- For festival pricing only (Pohela Boishakh, Pohela Falgun)
- Use library: bengali-calendar (npm) or implement conversion table
- Don't store Bengali date — store Gregorian + compute display

### Hijri Calendar
- For Eid pricing
- Use moment-hijri or umm-al-qura calendar
- Hijri date varies regionally; let property choose method

### Negative Balance
- Guest folio can have negative balance if pre-paid > total (e.g., refund pending)
- Display "Credit BDT 500" instead of "-500"
- Refund workflow auto-triggered if balance < threshold at checkout

---

## Appendix Y. Customization & Extension Points

### Custom Fields (per tenant)
- Defined in tenant settings
- Applied to: Reservation, Guest, Property, Room
- Field types: text, number, date, dropdown, multi-select, checkbox, file
- Reportable + searchable
- API exposes via `customFields: {}` on entity

### Custom Tax Rules
- Tax code definition: name, rate, applicability (room/F&B/all), compounding (on which other taxes)
- Multi-line with computation order
- Country presets (BD, IN, AE, EU)

### Custom Cancellation Policies
- Multiple tiers (e.g., "Free if 48h before, 50% if 24h, 100% if same day")
- Optional: % vs flat
- Optional: first-night-only

### Custom Promo Codes
- Type: percentage / fixed / first-night-free / add-on
- Conditions: min nights, min spend, channels eligible, dates of stay, booking dates, guest segments
- Limits: total uses, per-guest uses
- Stacking rules: with other discounts

### Custom Workflow Hooks
- Event triggers (e.g., on reservation.created → call custom URL)
- Webhook subscription per tenant
- Conditional logic (e.g., only for VIP guests)

### Custom Reports
- Visual builder
- Save + share within tenant
- Schedule email delivery

### Custom Email/SMS Templates
- Override default templates per property
- Multi-language
- A/B test option

### Custom Branding
- Logo, primary color, footer text in booking engine + emails
- White-label option for Enterprise + Reseller

### Custom Plugins (V2 Marketplace)
- 3rd party devs build on Public API + Webhooks
- Submit for review
- Listed in marketplace
- Revenue share 70/30

---

## Appendix Z. Sprint 1 Detailed Task Breakdown

Concrete first-2-week tasks so Day 1 development is unblocked.

### Sprint 1 Goals
- Monorepo + CI/CD foundation
- Auth (signup/login/refresh/MFA basic)
- Tenant + Property base schema with RLS
- Logging + error tracking
- Dev environment running for all engineers

### Tickets (ATLAS-001 to ATLAS-035)

**Infrastructure (DevOps)**
- ATLAS-001: Create AWS account, set up IAM users + roles
- ATLAS-002: Create Terraform skeleton, VPC + subnets + SG
- ATLAS-003: Provision RDS PostgreSQL 16 (dev + staging)
- ATLAS-004: Provision ElastiCache Redis (dev + staging)
- ATLAS-005: Provision Amazon MQ for RabbitMQ
- ATLAS-006: Setup S3 buckets (atlas-docs, atlas-backups)
- ATLAS-007: Configure Route53 + ACM cert for *.atlas.app
- ATLAS-008: Setup CloudFront for static assets
- ATLAS-009: Configure Cloudflare WAF in front of API

**Monorepo & Tooling (Backend Lead)**
- ATLAS-010: Setup Turborepo monorepo
- ATLAS-011: Shared TS config + ESLint config + Prettier
- ATLAS-012: Shared types package (initial Zod schemas)
- ATLAS-013: GitHub Actions CI workflow
- ATLAS-014: Sentry projects + DSN distribution
- ATLAS-015: OpenTelemetry collector + Grafana Cloud config

**Database (Backend)**
- ATLAS-016: Setup Prisma schema (initial: tenants, users, user_property_roles, properties)
- ATLAS-017: Implement RLS policies for above tables
- ATLAS-018: Migration script with rollback test
- ATLAS-019: Seed script with Faker data

**Backend — Auth Module (Backend)**
- ATLAS-020: Signup endpoint + email verification
- ATLAS-021: Login endpoint with JWT + refresh
- ATLAS-022: Refresh endpoint with rotation
- ATLAS-023: Logout + session revocation
- ATLAS-024: Forgot password + reset
- ATLAS-025: MFA setup + verify endpoints
- ATLAS-026: Tenant context middleware (RLS injection)
- ATLAS-027: Guards for permission-based access

**Backend — Properties Module**
- ATLAS-028: Property CRUD endpoints
- ATLAS-029: User-property role assignment endpoints

**Frontend (Frontend)**
- ATLAS-030: Next.js app skeleton + Tailwind + shadcn
- ATLAS-031: Auth pages (signup, login, MFA, forgot)
- ATLAS-032: Property list + create form
- ATLAS-033: Settings page foundation
- ATLAS-034: i18n setup with bn-BD + en-US

**QA**
- ATLAS-035: E2E test for signup → property creation
- ATLAS-036: API contract tests setup
- ATLAS-037: Coverage gate in CI

### Sprint 1 Definition of Done
- [ ] Engineer can clone repo, run `pnpm install + docker-compose up + pnpm dev` and have local env working in < 15 min
- [ ] Signup → email verify → login → create property → assign user — end-to-end works
- [ ] CI green on all PRs
- [ ] Sentry receiving errors from dev env
- [ ] Coverage report visible in PRs

---

# 🎯 FINAL CHECKLIST — Blueprint Completeness

| Layer | Section(s) | Complete? |
|---|---|---|
| Vision / Business goals | 1, 73-77 | ✅ |
| Glossary | 2, App K | ✅ |
| Tech stack rationale | 3, App S | ✅ |
| Architecture diagram | 3.2 | ✅ |
| Multi-tenancy strategy | 4 | ✅ |
| Coding standards | 5 | ✅ |
| Git workflow | 6 | ✅ |
| DevOps / CI/CD | 7, App P, P.2 | ✅ |
| Repo structure | 8 | ✅ |
| ERD | 9 | ✅ |
| DB schema (DDL) | 10 | ✅ |
| State machines | 11 | ✅ |
| Business invariants | 12 | ✅ |
| Domain events | 13 | ✅ |
| REST conventions | 14 | ✅ |
| Auth/Authz | 15 | ✅ |
| Error codes | 16, App B | ✅ |
| Pagination / filters | 17 | ✅ |
| Rate limit / idempotency | 18 | ✅ |
| Complete endpoint catalog | 19 | ✅ |
| Webhook catalog | 20 | ✅ |
| GraphQL plan | 21 | ✅ |
| Module specs (24 modules) | 22-45 | ✅ |
| OTA integration specs | 46, App I, U | ✅ |
| Payment gateway specs | 47 | ✅ |
| Comms (WhatsApp/SMS/Email) | 48, App D, R | ✅ |
| Accounting sync | 49 | ✅ |
| Door lock / IoT | 50 | ✅ |
| Design system | 51 | ✅ |
| Screen inventory (100+) | 52 | ✅ |
| User flows | 53 | ✅ |
| Localization / RTL | 54, App X | ✅ |
| Accessibility WCAG | 55 | ✅ |
| Mobile screens | 56 | ✅ |
| Testing strategy | 57 | ✅ |
| Performance SLO | 58 | ✅ |
| Observability | 59 | ✅ |
| Runbooks | 60 | ✅ |
| DR plan | 61 | ✅ |
| Security hardening | 62 | ✅ |
| PCI scoping | 63 | ✅ |
| GDPR / DPDP / BD compliance | 64 | ✅ |
| Police reporting | 65, 42 | ✅ |
| Data retention | 66 | ✅ |
| Cookie consent | 67 | ✅ |
| Roadmap (24 month) | 68 | ✅ |
| Sprint plan MVP (13 sprints) | 69, App Z | ✅ |
| V1/V1.5/V2 themes | 70 | ✅ |
| Team / hiring | 71 | ✅ |
| Risk register | 72 | ✅ |
| Pricing matrix | 73 | ✅ |
| Pilot program | 74 | ✅ |
| Sales process | 75 | ✅ |
| Customer success | 76 | ✅ |
| Marketing | 77 | ✅ |
| Algorithms pseudo-code | App L | ✅ |
| Sample payloads (JSON) | App M | ✅ |
| Field validation | App N | ✅ |
| Report SQL | App O | ✅ |
| Config templates (docker/TF/GHA) | App P | ✅ |
| Settings catalog | App Q | ✅ |
| Email/SMS/WA templates | App D, R | ✅ |
| Cost model | App T | ✅ |
| OTA quirks | App U | ✅ |
| Cron catalog | App V | ✅ |
| Cache keys | App W | ✅ |
| Date/TZ/currency edge cases | App X | ✅ |
| Customization extension points | App Y | ✅ |
| Sprint 1 ticket-level breakdown | App Z | ✅ |

---

**এই blueprint দিয়ে যা যা করা যাবে:**
- Day 1: Sprint 1 tickets (App Z) directly Jira/Linear-এ create
- Backend dev → DB schema (Section 10) + endpoints (19) → Code
- Frontend dev → Screen list (52) + API contracts → Code
- DevOps → Terraform (App P.3) + CI (App P.2) → Provision
- QA → E2E scenarios (Section 57) + acceptance criteria per module → Test plan
- Designer → Design system (51) + screens (52) → Figma
- PM → User stories per module + Sprint 1 plan → Standups
- CS/Sales → Pricing (73) + Implementation playbook (75) → Outreach
- Founder → Cost model (App T) + Risk (72) → Fund-raising deck

**Maintenance protocol:**
- Decisions changing → update `docs/adr/` AND relevant section here
- New gaps discovered → log in `docs/gaps.md` → integrate next monthly cycle
- Field/Schema changes → migration + update App N (validation) + relevant section

---

---

# 🏪 PART XII — Multi-Outlet, Retail & Specialized Operations (Addendum)

User question follow-up: hotel-এ room ছাড়াও অনেক revenue stream + operational module আছে। নিচে সবগুলো explicitly cover করা হলো একটা **unified Outlet Framework**-এর মাধ্যমে, যাতে নতুন outlet type যোগ করা trivial থাকে।

---

## ৭৮. Generalized Outlet Framework **[V1 core, V1.5 specialized]**

### Concept
**Outlet** = যেকোনো revenue-generating cost center within property — Restaurant, Bar, Spa, Gym, Gift Shop, Entry Ticket counter, Laundry, Banquet Hall, Pool Bar, Mini Bar, Business Center, Parking — সব same pattern এ চলে।

### Unified Data Model
```sql
CREATE TABLE outlets (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  property_id     UUID NOT NULL,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  outlet_type     TEXT NOT NULL CHECK (outlet_type IN (
                    'restaurant','bar','room_service','banquet','spa','gym',
                    'gift_shop','retail','attraction','laundry','minibar',
                    'business_center','parking','transport','event_venue','other'
                  )),
  is_active       BOOLEAN DEFAULT true,
  operating_hours JSONB,           -- {mon: [09:00-22:00], ...}
  tax_codes       UUID[],
  service_charge_applicable BOOLEAN,
  default_revenue_account TEXT,    -- for accounting sync
  config          JSONB DEFAULT '{}', -- outlet-type specific settings
  UNIQUE(property_id, code)
);

CREATE TABLE outlet_items (
  id              UUID PRIMARY KEY,
  outlet_id       UUID NOT NULL REFERENCES outlets(id),
  sku             TEXT NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT,
  unit_price      NUMERIC(12,2) NOT NULL,
  cost_price      NUMERIC(12,2),
  tax_codes       UUID[],
  modifiers       JSONB DEFAULT '[]',  -- e.g., spice level, size, with/without
  stock_managed   BOOLEAN DEFAULT false,
  current_stock   NUMERIC(10,2),
  reorder_level   NUMERIC(10,2),
  recipe          JSONB,               -- for F&B with ingredient breakdown
  is_active       BOOLEAN DEFAULT true,
  metadata        JSONB DEFAULT '{}',
  UNIQUE(outlet_id, sku)
);

CREATE TABLE outlet_orders (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  outlet_id       UUID NOT NULL,
  order_no        TEXT NOT NULL,
  type            TEXT NOT NULL, -- 'dine_in','takeaway','room_service','walk_in','event','online','vendor'
  table_no        TEXT,
  room_no         TEXT,
  reservation_id  UUID,            -- if charging to room
  guest_id        UUID,
  status          TEXT NOT NULL,   -- 'open','kitchen','served','settled','void'
  subtotal        NUMERIC(12,2),
  tax_total       NUMERIC(12,2),
  service_charge  NUMERIC(12,2),
  total           NUMERIC(12,2),
  currency        CHAR(3),
  payment_method  TEXT,
  shift_id        UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  settled_at      TIMESTAMPTZ
);

CREATE TABLE outlet_order_items (
  id              UUID PRIMARY KEY,
  order_id        UUID NOT NULL,
  outlet_item_id  UUID NOT NULL,
  quantity        NUMERIC(10,2),
  unit_price      NUMERIC(12,2),
  modifiers       JSONB DEFAULT '[]',
  discount        NUMERIC(12,2) DEFAULT 0,
  line_total      NUMERIC(12,2),
  status          TEXT,            -- 'ordered','in_kitchen','ready','served','voided'
  notes           TEXT
);
```

### Why This Pattern?
- One framework → 10+ outlet types covered with config differences
- Same KOT mechanism for Restaurant + Room Service + Spa (treatment order)
- Same room-charge mechanism for all outlets (post to folio)
- Same shift/cashier reconciliation
- Same reports (per outlet, per category, per server)

---

## ৭৯. F&B / Restaurant POS (revisited with full depth) **[V1]**

(Section 34-এর extension)

### Table Layout Designer
- Drag-drop table arrangement per outlet
- Statuses: vacant / occupied / reserved / dirty / blocked
- Table merge for groups
- Color coding

### Menu Engineering
- Item categorization: Stars (high margin + high volume), Plowhorses (low margin + high volume), Puzzles (high margin + low volume), Dogs (low both)
- Recipe management:
  ```
  Menu item "Chicken Biryani" → 
    Ingredients: Basmati 200g, Chicken 250g, Spices 50g, Oil 30ml
    Recipe cost: BDT 180
    Sell price: BDT 450
    Gross margin: 60%
  ```
- Auto-decrement stock on sale
- Wastage tracking with reason

### Kitchen Display System (KDS)
- Color-coded by elapsed time
- Section routing (hot kitchen / cold / bar / tandoor)
- Bump-bar / touchscreen support
- Print fallback to thermal printer

### Reservations (Restaurant)
- Table reservation system (separate from room reservation)
- Online reservation widget
- SMS/WhatsApp confirmation
- No-show fee policy

### Reports
- Daily F&B revenue per outlet
- Item-wise sales + margin
- Server performance + tips
- Cover count + average check
- Cost of goods sold (COGS)
- Wastage report
- Menu engineering matrix

---

## ৮০. Banquet, Event & Conference Management **[V1.5]**

### Distinct from Room Bookings
- Standalone events (wedding, conference, exhibition) WITHOUT room block
- OR combined (room block + banquet)

### Module Components
- **Function Diary:** Calendar view per banquet hall + meeting room
- **Inquiry → Proposal → Confirmation pipeline:**
  ```
  Inquiry → Site visit scheduled → Menu tasting → Proposal sent
    → Negotiation → Contract signed (deposit) → Pre-event meeting
    → Event day → Final settlement → Feedback survey
  ```
- **BEO (Banquet Event Order):**
  - Event date, hall, headcount (min/expected/max)
  - Menu (selected packages)
  - Setup style (theater, classroom, U-shape, round tables)
  - Equipment (AV, mic, projector, stage)
  - Decoration
  - Staff allocation
  - Special requirements
- **Function Sheet:** Day-of-event ops sheet for all departments
- **Pricing:** Per-head menu × headcount + add-ons + tax + service charge
- **Payment terms:** Deposit %, final due dates
- **Vendor coordination:** External caterer, DJ, decorator, photographer

### Event Types Supported
- Wedding (with rituals like Mehendi, Holud, Reception — multi-day package)
- Corporate conference / Seminar
- Exhibition / Trade show
- Birthday / Anniversary
- Funeral / Memorial
- Religious event (Iftar, Janaza, etc. — local BD context)
- Government / Diplomatic event (additional security workflow)

### Reports
- Function pipeline (inquiry → confirmation conversion)
- Hall utilization %
- Revenue per event type
- Lost business reasons
- Vendor performance

---

## ৮১. Spa, Wellness, Gym & Wellness Outlets **[V1.5]**

### Spa Module
- Treatment menu (catalog with duration, therapist requirement, room type)
- Therapist roster (skills, availability, commission %)
- Appointment booking calendar (slot-based)
- Treatment room assignment
- Pre-treatment consultation form (allergies, medical history)
- Couples / group bookings
- Package deals (3-day detox, honeymoon spa)
- Retail products (oils, creams — Gift Shop integration)
- Membership programs (monthly unlimited, package of 10)

### Gym Module
- Member registration (Day pass / Monthly / Annual)
- Access control (RFID/QR — V2 IoT)
- Personal trainer booking
- Class schedule (yoga, zumba, etc.) with capacity
- Equipment usage tracking
- Personal training packages

### Other Wellness
- Pool (day pass, swimming lessons)
- Salon (hair, nails, beauty)
- Sauna / Steam (time slot)

### Shared Patterns
- Service catalog → Booking → Resource (therapist/trainer/room) → Folio post → Tip workflow → Commission calc

---

## ৮২. Gift Shop / Retail Outlet **[V1]**

### Purpose
Hotel boutique, souvenir shop, mini-mart, branded merchandise।

### Features
- Product catalog with photos, SKU, barcode
- Stock management with reorder alerts
- Multi-supplier with PO-based replenishment
- Pricing (cost price + margin → sell price)
- Discount rules (member discount, bulk discount)
- Settle options:
  - Cash / card (walk-in or in-house guest)
  - **Charge to room** (in-house guest — auto-post to folio category 'gift_shop')
- Barcode scanner integration (Bluetooth scanner via Web Bluetooth API or Android keyboard input)
- Receipt printing (thermal)
- Returns / exchanges with reason
- Stock-take (cycle count)

### Reports
- Daily sales
- Best-seller items
- Slow-moving stock
- Stock valuation
- Margin analysis

---

## ৮৩. Entry Ticket / Attraction Management **[V1.5]**

### Use Cases
- Resort entry ticket (day visitor)
- Pool day pass (non-guest)
- Beach access fee
- Heritage hotel museum entry
- Theme park / amusement attached
- Garden / Nature park entry
- Cultural show ticket

### Features
- Ticket types (Adult, Child, Senior, Group, Resident discount)
- Time-slot capacity (peak vs off-peak)
- Online sale via property landing page
- QR code ticket generation (email/WhatsApp delivery)
- QR scan at gate (mobile app for guard)
- Re-entry tracking (single vs multi-entry)
- Group bookings (school trip)
- Combo tickets (entry + meal + souvenir)

### Reports
- Daily entry count
- Revenue per ticket type
- Hourly demand pattern (for staffing)

---

## ৮৪. Laundry Management (In-house + Outsourced + Guest) **[V1]**

### Three Distinct Flows

#### A. Hotel Linen (in-house operation)
- Linen pool tracking (sheets, towels, blankets per type)
- Room → laundry → washed → ironed → ready cycle
- Wastage / damage tracking
- Daily consumption per room
- Linen procurement

#### B. Outsourced Laundry Vendor
- Vendor management (rates per piece type)
- Pickup schedule (daily/weekly)
- Pickup voucher (count per item type)
- Return reconciliation (count matches, damages noted)
- Monthly billing
- Per-piece-type pricing tracking

#### C. Guest Laundry Service
- Service menu (Wash, Iron, Dry-clean, Express service)
- Per-item pricing
- Pickup from room (HK request)
- Tracking: collected → washed → ready → delivered
- Charge to room folio (category 'laundry')
- Express service surcharge
- Damage liability policy
- Express delivery promise tracking

### Mobile App (HK staff)
- Collect laundry → photo + item count
- Status updates
- Delivery confirmation

---

## ৮৫. Mini-bar Management **[V1]**

### Two Operation Modes

#### Manual (most common in BD/India)
- HK staff checks mini-bar at checkout
- Mark consumed items via mobile app
- Auto-post to folio with category 'minibar'
- Daily replenishment list per room

#### Sensor-based (V2 IoT)
- Smart mini-bar with weight sensors
- Auto-detect consumption
- Real-time post to folio

### Menu Management
- Item catalog per mini-bar (different per room category sometimes)
- Pricing
- Restocking workflow

---

## ৮৬. Business Center, Transport, Parking, Other Services **[V1.5]**

### Business Center
- Print/scan/copy charge
- Meeting room (small) hourly rental
- Stationery sale
- Internet access (premium)

### Transport
- Airport pickup/drop-off
- Local taxi booking
- Long-distance car rental
- Driver management
- Per-trip pricing
- Reservation hours before
- Post to folio (category 'transport')

### Parking
- Valet parking
- Per-day charge (in-house guest free vs paid configurable)
- Walk-in parking
- Long-stay package

### Other (Generic Outlet Framework)
- Pet boarding fee
- Late checkout charge
- Excess baggage storage
- Newspaper subscription
- Wake-up call service (premium)
- Photography service
- Cultural performance booking

---

## ৮৭. Commission Management (Full Depth) **[MVP basic, V1 full]**

### Commission Types Covered

#### A. OTA Commission (we pay to OTA)
- Per channel: % of booking value
- Auto-track per reservation
- Monthly reconciliation against OTA invoice
- Variance investigation workflow
- App I + Section 4.3 covered this

#### B. Travel Agent Commission (we pay to TA)
- TA master with negotiated rates
- Per booking commission calculation
- Monthly TA statement generation
- Payment workflow (bank transfer / cheque)
- TA portal for self-service (V1.5)

#### C. Affiliate / Referral Commission (we pay)
- Affiliate signup
- Tracking link with attribution
- Booking attribution (cookie/URL param)
- Payout schedule

#### D. Internal Sales Commission (we pay sales staff)
- Sales team commission rules
- Per-booking or per-revenue target
- Monthly payout calculation

#### E. Vendor Commission (we receive — for selling vendor services)
- Spa partner who shares revenue
- Transport partner
- Tour operator

### Commission Engine Configuration
```json
{
  "commission_rules": [
    {
      "type": "ota",
      "channel": "booking_com",
      "rate": 0.15,
      "base": "net_room_revenue",  // exclude tax + extras
      "calculation_time": "at_booking",
      "settlement": "monthly_invoice"
    },
    {
      "type": "travel_agent",
      "agent_id": "ta-uuid",
      "rate": 0.10,
      "base": "net_room_revenue",
      "minimum_booking_value": 5000,
      "calculation_time": "post_stay",
      "settlement": "biweekly_bank_transfer"
    }
  ]
}
```

### Commission Reports
- Per OTA payable + variance
- Per TA payable
- Affiliate payouts
- Sales commission accruals
- Vendor revenue receivable

---

## ৮৮. Package Management (Full Depth) **[V1]**

### Package Types

#### A. Inclusive Package (single price for bundle)
- "Honeymoon Package" = 2 nights Deluxe + Candlelight dinner + Spa for 2 + Airport pickup
- Single price displayed
- Components priced internally for accounting

#### B. Add-on Package (room + selectable add-ons)
- "Weekend Family Package" = Room + Breakfast (always) + Optional: pool access + activities
- Modular pricing

#### C. Long-stay Package
- "7 nights for price of 6"
- Auto-applied based on LOS

#### D. Seasonal Package
- "Pohela Boishakh Package"
- "Eid Special"
- Date-bound

#### E. Corporate Package
- Negotiated rates
- Pre-approved companies
- Net rate + agreed terms

### Configuration
```sql
CREATE TABLE packages (
  id              UUID PRIMARY KEY,
  property_id     UUID NOT NULL,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  type            TEXT, -- 'inclusive','add_on','long_stay','seasonal','corporate'
  rate_plan_id    UUID, -- linked rate plan for room component
  components      JSONB,  -- [{type:'breakfast', qty_per_night:2}, {type:'spa_credit', amount:2000}, ...]
  pricing_strategy TEXT,  -- 'fixed','room_plus_addons'
  fixed_price     NUMERIC(12,2),
  validity_start  DATE,
  validity_end    DATE,
  blackout_dates  DATE[],
  min_los         INT,
  max_los         INT,
  max_uses        INT,
  used_count      INT DEFAULT 0,
  visible_to      TEXT[] DEFAULT '{public}', -- 'public','members_only','corporate','agent'
  channels_eligible TEXT[]
);
```

### Booking Flow with Package
- User selects package → components auto-added to cart
- Room rate from linked rate plan
- Add-on components added as folio postings on stay
- Tax computed per component category

---

## ৮৯. Business Source Management **[V1]**

(Section 26-এর extension)

### Source Hierarchy
```
Source Type (Direct/OTA/TA/Corporate/Walk-in/Phone/Wholesaler)
  └── Source Channel (Booking.com, Specific Agent, Specific Company)
       └── Sub-source / Campaign (Google Ad campaign X, Promo Y)
```

### Tracking Capture
- Direct: UTM params on landing → cookie → attribution
- OTA: Source field from API
- TA: TA selection at booking
- Corporate: Company selection at booking
- Walk-in: Manual capture by FD
- Phone: Manual capture + caller ID integration

### Market Segment Mapping
Configurable mapping: Source → Market Segment → Revenue Account
- Example: "Booking.com Genius" → OTA → Leisure
- Example: "Corporate XYZ" → Corporate → Business

### Reports
- Source production (already in App E)
- Market segment analysis
- ROI per source (revenue / acquisition cost)
- Source contribution to RevPAR

---

## ৯০. Outlet Settings Catalog Addition

Each outlet type has additional settings:

**Restaurant:**
- Menu sections, KOT routing, table layout, reservation policy

**Spa:**
- Treatment menu, therapist commission %, room/bed count, blocking buffer between appointments

**Gym:**
- Membership tier configuration, access hours, class capacity

**Gift Shop:**
- Auto-charge-to-room enabled, barcode required, return window (days)

**Entry Ticket:**
- Ticket types, time slot capacity, QR validity

**Laundry:**
- Service menu, vendor mapping (if outsourced), express delivery hours

**Banquet:**
- Hall capacity, setup styles available, AV inventory, deposit %

---

## ৯১. Mapping: User's Question → Module Coverage

| User-asked Module | v7 Section | Status |
|---|---|---|
| Hotel management | Whole doc | ✅ Full |
| Accounting | 5.1, 4.4, App G/H | ✅ Full |
| Front Office | 22, 27, App C | ✅ Full |
| Reservation | 26, App L.1 | ✅ Full |
| F&B / POS | 34, 79 | ✅ Full |
| **Gift shop** | **82 (NEW)** | ✅ Added |
| **Entry Ticket** | **83 (NEW)** | ✅ Added |
| Banquet | 34, **80 (expanded)** | ✅ Full |
| Event management | **80 (expanded)** | ✅ Full |
| Business source | 26, **89 (expanded)** | ✅ Full |
| Commission management | 4.3, **87 (full depth)** | ✅ Full |
| Package management | 32, **88 (full depth)** | ✅ Full |
| Rate management | 24, 25, App L.3 | ✅ Full |
| Spa management | 6.2, **81 (full)** | ✅ Full |
| **Gym management** | **81 (full)** | ✅ Added depth |
| Maintenance | 36 | ✅ Full |
| Housekeeping (in-house) | 28 | ✅ Full |
| **Laundry (in-house + outsource + guest)** | **84 (NEW)** | ✅ Added |
| **Mini-bar** | **85 (NEW)** | ✅ Added |
| **Business Center / Transport / Parking** | **86 (NEW)** | ✅ Added |

### Generalized Framework Benefit
Section 78-এর **Outlet Framework** এর কারণে — future-এ যেকোনো নতুন outlet (Pet care, Photography studio, Tour desk, Pharmacy ইত্যাদি) **শুধু configuration দিয়ে** যোগ করা যাবে — কোনো code change লাগবে না।

---

## ✅ Coverage Confirmation

আপনার তালিকার সব module **এখন v7-এ explicitly cover করা হয়েছে**:

**Core PMS:** Hotel mgmt, Accounting, Front Office, Reservation, Rate, Package, Business Source, Commission, Maintenance, Housekeeping — সব ✅

**Revenue Outlets:** F&B POS, Banquet, Event, Spa, Gym, Gift Shop, Entry Ticket, Mini-bar, Business Center, Transport, Parking — সব ✅

**Service Outlets:** Laundry (in-house + outsource + guest), Wellness, Salon — সব ✅

**SaaS Platform:** Multi-tenancy, Billing, Channel sync, Booking engine, CRM, Marketing, Mobile apps, Reports, AI — সব ✅

**Compliance:** PCI, GDPR, Bangladesh police reporting, India Form-C, Tax (Mushak/GST) — সব ✅

---

# 🏛️ PART XIII — Full ERP Modules (Standalone-Quality, No External Software Needed)

**Goal:** Tally, QuickBooks, Zoho People, BambooHR, Loginext-এর মতো standalone software-এর alternative এই platform-এর ভেতরেই থাকবে। User-কে আর কোনো external accounting/HR/payroll/transport software কিনতে হবে না।

---

## ৯২. Full Accounting / Finance / ERP Module **[V1.5 core, V2 advanced]**

### ৯২.১ Chart of Accounts (COA)
Multi-level hierarchical COA template per country:

```
ASSETS (1xxxx)
  Current Assets (11xxx)
    Cash on Hand (11001)
    Bank Accounts (11100-11199)
      Operating Account (11101)
      Payroll Account (11102)
    Accounts Receivable (11200-11299)
      Guest Ledger (11201)
      City Ledger (11202)
      Travel Agent AR (11203)
    Inventory (11300-11399)
      F&B Stock (11301)
      Linen Stock (11302)
      Mini-bar Stock (11303)
    Prepaid Expenses (11400)
  Fixed Assets (12xxx)
    Land & Building (12100)
    Furniture & Fixtures (12200)
    Plant & Equipment (12300)
    Accumulated Depreciation (12900)
  
LIABILITIES (2xxxx)
  Current Liabilities (21xxx)
    Accounts Payable (21100)
    VAT Payable (21201)
    Service Charge Payable (21202)
    TDS Payable (21203)
    Salary Payable (21300)
    PF Payable (21401) [India]
    ESI Payable (21402) [India]
    Tourism Tax Payable (21501) [BD]
  Long-term Liabilities (22xxx)
    Bank Loan (22100)
    Owner Loan (22200)

EQUITY (3xxxx)
  Capital (31100)
  Retained Earnings (31200)
  Current Year Profit (31300)

REVENUE (4xxxx)
  Room Revenue (41xxx)
    Direct Booking (41100)
    OTA Bookings (41200-41299, sub-account per OTA)
    Travel Agent (41300)
    Corporate (41400)
    Walk-in (41500)
  F&B Revenue (42xxx)
    Restaurant (42100)
    Bar (42200)
    Room Service (42300)
    Banquet (42400)
  Other Revenue (43xxx)
    Spa (43100)
    Laundry - Guest (43200)
    Mini-bar (43300)
    Telephone (43400)
    Gift Shop (43500)
    Transport (43600)
    Banquet Hall Rent (43700)

EXPENSES (5xxxx)
  Cost of Goods Sold (51xxx)
    F&B Cost (51100)
    Linen Cost (51200)
    Amenities (51300)
  Payroll Expenses (52xxx)
    Salaries & Wages (52100)
    Overtime (52200)
    Bonus (52300)
    Staff Welfare (52400)
    Training (52500)
  Operating Expenses (53xxx)
    Utilities (53100-53199)
      Electricity (53101)
      Water (53102)
      Gas (53103)
      Internet (53104)
    Marketing (53200)
    OTA Commission (53300-53399 per OTA)
    Maintenance & Repairs (53400)
    Insurance (53500)
    Property Tax (53600)
    Rent (53700)
  Administrative Expenses (54xxx)
    Office Supplies (54100)
    Legal & Professional (54200)
    Travel (54300)
    Communication (54400)
  Financial Expenses (55xxx)
    Bank Charges (55100)
    Interest Expense (55200)
    Payment Gateway Charges (55300)
  Depreciation (56xxx)
```

**Customizable per tenant:** Add/rename accounts, sub-accounts (with audit), but core groups (Assets/Liabilities/Equity/Revenue/Expense) are immutable for reporting integrity.

### ৯২.২ Multi-Entity / Multi-Company **[V1.5]**
- Chain operator has 5 hotels → 5 separate legal entities OR 1 parent + 5 subsidiaries
- Each entity has own COA, books, tax registration
- Inter-company transactions tracked (e.g., shared services billed across)
- Consolidated reporting across entities
- Inter-entity eliminations for consolidation

### ৯২.৩ Journal Entry Engine
Every business transaction → automatic journal entry:

```typescript
// Pseudo-code: Room revenue posting on night audit
async function postRoomRevenueJournal(reservation, businessDate) {
  const rateAmount = reservation.ratePerNight;
  const serviceCharge = rateAmount * 0.10;
  const vat = (rateAmount + serviceCharge) * 0.15;
  const totalCharge = rateAmount + serviceCharge + vat;

  await createJournalEntry({
    date: businessDate,
    reference: `RES-${reservation.id}-${businessDate}`,
    description: `Room revenue - ${reservation.reservationNo}`,
    lines: [
      // Debit: Guest folio (AR)
      { account: '11201', debit: totalCharge },
      // Credit: Room revenue (by source)
      { account: getRevenueAccountBySource(reservation.source), credit: rateAmount },
      // Credit: Service charge payable
      { account: '21202', credit: serviceCharge },
      // Credit: VAT payable
      { account: '21201', credit: vat },
    ]
  });
}
```

**Auto-post triggers:**
- Reservation creation → Reservation deposit
- Night audit → Room revenue + tax
- F&B order settle → F&B revenue + cost
- Check-out → Folio settle, AR reversal, cash/card debit
- Vendor invoice receive → AP credit, expense debit
- Vendor payment → AP debit, bank credit
- Salary processing → Salary expense + statutory liabilities + bank credit
- Asset depreciation (monthly) → Depreciation expense + Accumulated depreciation
- Bank charge → Bank charges expense + bank credit

**Manual journal entry:**
- Adjustment entries (with approval workflow above threshold)
- Opening balances
- Year-end adjustments
- Reversal entries

### ৯২.৪ Accounts Payable (AP) — Vendor / Supplier Management

#### Vendor Master
```sql
CREATE TABLE vendors (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  vendor_code     TEXT NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT, -- 'food','beverage','linen','utility','professional','equipment'
  tax_id          TEXT, -- BIN/GSTIN
  address         JSONB,
  contact         JSONB,
  payment_terms   TEXT, -- 'net_30','net_15','advance','cod'
  credit_limit    NUMERIC(14,2),
  bank_account    JSONB,
  is_active       BOOLEAN DEFAULT true,
  rating          INT,
  documents       JSONB DEFAULT '[]', -- attached docs (trade license, tax cert)
  UNIQUE(tenant_id, vendor_code)
);
```

#### AP Workflow
```
Purchase Indent (department raises) → Approval (manager)
  → Purchase Order (with vendor selection) → Vendor confirmation
  → Goods Received Note (GRN) — stock incremented
  → Vendor Invoice Received → 3-way matching (PO + GRN + Invoice)
  → Approval (variance > 5% → escalation)
  → AP recorded → Payment due date scheduled
  → Payment processed → AP cleared
```

#### AP Aging Report
- 0-30 / 31-60 / 61-90 / 90+ buckets
- Per vendor outstanding
- Disputed invoices flagged

#### Payment Methods
- Bank transfer (NEFT/RTGS/ACH file generation per country format)
- Cheque (with printing template)
- Cash (with limit)
- Credit card (for small recurring)

### ৯২.৫ Accounts Receivable (AR)

#### AR Buckets
- **Guest Ledger:** In-house guest folios + checked-out unpaid
- **City Ledger:** Corporate accounts, Travel Agents (post-stay billing)
- **Other AR:** Banquet payments pending, Spa membership dues

#### City Ledger Workflow
```
Corporate stay → Folio routed to company → Folio close → 
  Invoice generation → Email to company AP → 
  Follow-up reminders (15/30/45/60 days) → 
  Payment received → AR cleared
```

#### Statements
- Monthly customer statement auto-generated
- Aging report (0-30/31-60/61-90/90+)
- Dispute tracking
- Bad debt write-off workflow (with approval)

### ৯২.৬ Banking & Bank Reconciliation

#### Bank Account Master
- Multiple bank accounts (Operating, Payroll, Tax, Fixed Deposit)
- Per account currency
- Opening balance + signatories

#### Daily Bank Reconciliation
- Import bank statement (CSV, MT940, or via Open Banking API where available)
- Auto-match transactions with system entries
- Unmatched items flagged for review
- Reconciliation summary report

#### Cash Management
- Daily cash count vs system
- Petty cash management (impressed amount + reimbursement)
- Cash deposit slip generation

### ৯২.৭ Fixed Asset Register & Depreciation

```sql
CREATE TABLE fixed_assets (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  property_id     UUID,
  asset_code      TEXT NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT,  -- 'land','building','furniture','equipment','vehicle','it'
  location        TEXT,
  purchase_date   DATE,
  purchase_cost   NUMERIC(14,2),
  vendor_id       UUID,
  useful_life_years NUMERIC(5,2),
  depreciation_method TEXT, -- 'straight_line','wdv','sum_of_years'
  salvage_value   NUMERIC(14,2) DEFAULT 0,
  current_book_value NUMERIC(14,2),
  accumulated_depreciation NUMERIC(14,2) DEFAULT 0,
  status          TEXT DEFAULT 'active', -- 'active','disposed','written_off'
  disposed_date   DATE,
  disposal_value  NUMERIC(14,2),
  documents       JSONB DEFAULT '[]'
);
```

#### Monthly Depreciation
- Auto-calculate per asset per month
- Post journal entry (Dep expense debit / Accumulated dep credit)
- Adjustment for mid-month additions

#### Disposal Workflow
- Asset transfer
- Sale (with capital gain/loss calc)
- Write-off (lost/damaged)
- Donation

### ৯২.৮ Cost Centers & Department Accounting
- Cost center = Department (Front Office, F&B, HK, Spa, etc.)
- Every transaction tagged with cost center
- Departmental P&L
- Manager accountability reports

### ৯২.৯ Budget Management & Variance Analysis
- Annual budget upload per cost center per account
- Monthly budget vs actual
- Variance % + amount
- Drill-down to transaction level
- Reforecast workflow

### ৯২.১০ Financial Reports

**Statutory / Mandatory:**
- Trial Balance (period-bound)
- Profit & Loss / Income Statement (departmental, consolidated)
- Balance Sheet
- Cash Flow Statement (direct + indirect method)
- Statement of Changes in Equity
- General Ledger (account-wise)
- Sub-ledger details

**Management:**
- Daily Revenue Report (USALI-aligned)
- Department-wise P&L
- Cost analysis report
- Vendor spend analysis
- Customer profitability
- Project profitability (per banquet event)
- Cash position report
- Bank balance summary

**Hospitality Industry Standard (USALI 11th Edition):**
- Schedule 1: Rooms Department
- Schedule 2: Food & Beverage
- Schedule 3-15: Other operated departments
- Summary Operating Statement
- Industry benchmark comparison

**Tax Reports:**
- VAT Return (BD Mushak 9.1, monthly)
- GST Return (India GSTR-1, GSTR-3B)
- TDS Return (India 26Q, 24Q)
- Withholding tax summary
- Service charge summary
- Tourism tax summary

### ৯২.১১ Accounting Compliance Features

**Bangladesh:**
- BIN registration linked
- Mushak 6.3 invoice format (App G)
- Mushak 9.1 VAT return prep
- TIN management
- NBR audit trail format
- IFRS-compatible reports

**India:**
- GSTIN handling per state
- HSN/SAC code mapping
- E-invoice (IRN generation via IRP)
- E-way bill (where applicable)
- GSTR-1, GSTR-3B preparation export
- TDS u/s 194C, 194I (rent), 194J (professional)
- Form 16, 16A
- Income tax slab handling

**Audit Trail Required by Tax Authorities:**
- Immutable journal log
- Edit log preserves before/after
- Approval workflow audit
- User action history

### ৯২.১২ Multi-Currency
- Multiple currency support per tenant
- FX rate management (daily download from OXR/XE)
- Realized FX gain/loss on payment
- Unrealized FX gain/loss on period-end revaluation
- Functional currency conversion for reporting

### ৯২.১৩ Year-End / Period Close

```
Period close checklist:
- [ ] All bookings posted
- [ ] All vendor invoices entered
- [ ] Bank reconciled
- [ ] Inventory count uploaded
- [ ] Depreciation posted
- [ ] Accruals posted (utilities estimated, etc.)
- [ ] Prepayments amortized
- [ ] Tax computed and posted
- [ ] Inter-company eliminated
- [ ] Trial balance balanced
- [ ] Period locked (no further posting)
```

Year-end: Roll forward balances, close P&L → retained earnings, archive period, statutory return prep.

---

## ৯৩. Full HR Management Module **[V1 core, V1.5 advanced]**

### ৯৩.১ Recruitment & Applicant Tracking System (ATS)

#### Job Posting
- Job description template library
- Multi-channel posting (career site, LinkedIn, BD job sites: bdjobs.com)
- Application form builder

#### Applicant Pipeline
```
Applied → Shortlisted → Interview Round 1 → Interview Round 2 → 
Reference Check → Offer Made → Offer Accepted → Onboarded
                                ↓
                            Rejected (with reason)
```

#### Features
- Resume parsing (extract name, email, experience, skills)
- Scoring rubric per role
- Interview scheduler (calendar integration)
- Interview feedback collection
- Offer letter generator (with merge tags)
- Background check vendor integration

### ৯৩.২ Onboarding Workflow
```
Offer accepted → 
  Pre-joining: Document collection, Bank account, Photo, References
  Day 1: System access provisioning, ID card, Uniform, HR orientation
  Day 2-7: Department-specific training
  Day 30: Probation review
  Day 90: Confirmation
```
Checklist template per role, automatic task assignment to HR/IT/Department.

### ৯৩.৩ Employee Master Data

```sql
CREATE TABLE employees (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  property_id     UUID,
  employee_code   TEXT NOT NULL,
  
  -- Personal
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  preferred_name  TEXT,
  date_of_birth   DATE,
  gender          TEXT,
  marital_status  TEXT,
  nationality     CHAR(2),
  blood_group     TEXT,
  photo_url       TEXT,
  
  -- Contact
  email_personal  TEXT,
  email_work      TEXT,
  phone           TEXT,
  emergency_contact JSONB,
  current_address JSONB,
  permanent_address JSONB,
  
  -- IDs
  nid_or_passport_encrypted BYTEA,
  tin             TEXT,
  pan             TEXT,         -- India
  aadhaar_last4   TEXT,         -- India (full encrypted)
  pf_account      TEXT,         -- India
  esi_account     TEXT,         -- India
  
  -- Employment
  joining_date    DATE NOT NULL,
  designation     TEXT,
  department_id   UUID,
  reporting_to    UUID,
  employment_type TEXT, -- 'permanent','contract','probation','intern','part_time','consultant'
  probation_end   DATE,
  confirmation_date DATE,
  work_location   TEXT,
  shift_type      TEXT,
  
  -- Compensation
  current_ctc     NUMERIC(14,2),
  pay_frequency   TEXT, -- 'monthly','weekly','daily'
  
  -- Status
  status          TEXT DEFAULT 'active', -- 'active','on_leave','suspended','terminated','resigned','retired'
  termination_date DATE,
  termination_reason TEXT,
  
  -- Bank
  bank_name       TEXT,
  bank_account    TEXT,
  ifsc_or_routing TEXT,
  
  -- Documents
  documents       JSONB DEFAULT '[]',  -- [{type:'nid',url,expires}, {type:'training_cert',...}]
  
  -- Skills/Tags
  skills          TEXT[],
  certifications  JSONB DEFAULT '[]',
  languages       JSONB DEFAULT '[]',
  
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### ৯৩.৪ Org Chart
- Visual tree of reporting hierarchy
- Filterable by department, property
- Drag-drop to restructure (with approval)

### ৯৩.৫ Leave Management

#### Leave Types (configurable per country)
| Type | Default Quota | Carry Forward | Encashable |
|---|---|---|---|
| Casual Leave (CL) | 10 days/year | No | No |
| Sick Leave (SL) | 14 days/year | No | No |
| Earned Leave (EL/PL) | 18 days/year | Yes (max 30) | Yes (at exit) |
| Maternity Leave | 16 weeks | — | — |
| Paternity Leave | 7 days | — | — |
| Marriage Leave | 5 days | — | — |
| Bereavement | 3 days | — | — |
| Compensatory Off | Per OT | 3 months | No |
| Loss of Pay (LOP) | Unlimited | — | — |
| Religious holiday | Per calendar | — | — |

#### Leave Workflow
```
Apply → Manager Approval → HR Approval (if > 5 days)
  → Balance deducted → Calendar updated → Payroll impact
```

#### Features
- Leave balance per employee
- Accrual rules (monthly/quarterly/annual)
- Carry-forward rules
- Encashment at exit
- Half-day leave
- Compensatory off auto-created from approved OT
- Leave calendar (department view)
- Manager approval mobile
- Auto-approve rules (e.g., < 1 day)
- Blackout period (festival season — no leave for FD)

### ৯৩.৬ Attendance Management

#### Punch Methods
- **Biometric (ZKTeco/ESSL):** SDK pull every 30 min
- **Mobile geo-fenced:** Punch from app within property GPS
- **Web punch:** From dashboard (with IP whitelist)
- **Manual:** Supervisor entry with reason

#### Daily Processing
- Match in/out punches
- Calculate worked hours
- Late mark (with grace period)
- Early go
- Overtime calculation
- Status: Present / Absent / Half-day / Leave / Holiday / Week-off

#### Shift Management
- Shift definitions (Morning, Evening, Night, Split)
- Roster assignment (drag-drop calendar — already in 35.2)
- Shift swap requests with peer + supervisor approval
- Auto-roster generator (rule-based)

### ৯৩.৭ Performance Management

#### Goal Setting (KRA/KPI)
- Cascading goals from property → department → individual
- SMART goal template
- Weightage per goal

#### Review Cycle
- Self-appraisal
- Manager review
- HR review
- 360° feedback (peers + subordinates) — V1.5
- Calibration meeting

#### Rating
- Configurable scale (1-5 or A-E)
- Forced distribution option
- Linked to bonus + increment

#### PIP (Performance Improvement Plan)
- For underperformers
- Time-bound goals
- Mid-review

### ৯৩.৮ Training & Development

#### Training Management
- Training calendar
- Categories (compliance, skill, leadership, customer service)
- Enrollment workflow
- Internal + External trainers
- Cost tracking per training

#### LMS Lite (Smart Quiz already mentioned in 6.12)
- Course catalog
- Video lessons
- Quiz with scoring
- Certification on completion
- Mandatory training tracking (Fire safety, Food safety, Customer service)
- Certification expiry alerts

### ৯৩.৯ Disciplinary Tracking
- Warning letters (verbal, written 1st, written 2nd, suspension, termination)
- Incident log
- Investigation workflow
- Appeals process
- Outcomes recorded

### ৯৩.১০ Loans & Advances
- Employee loan request workflow
- Auto-deduction from monthly salary
- Interest calculation (if applicable)
- Outstanding ledger per employee
- Salary advance with payback schedule

### ৯৩.১১ Reimbursements & Claims
- Categories (Travel, Mobile, Meal, Medical)
- Claim form with receipt upload (photo)
- Approval workflow
- Reimburse via payroll or separate payment
- Per diem rules (local + outstation)

### ৯৩.১২ Employee Self-Service (ESS) Portal
- View payslip
- Apply leave
- View leave balance
- Mark attendance (mobile)
- Submit reimbursement claim
- Update personal info
- Download Form 16 / Salary cert
- View team calendar
- View company holiday calendar
- Access policies & handbook

### ৯৩.১৩ Exit Management
```
Resignation → Acceptance → Exit interview scheduled → 
  Knowledge transfer → Asset return checklist → 
  Final settlement calculation → Last working day → 
  Experience letter + relieving letter → 
  Account deactivation
```

### ৯৩.১৪ Reports
- Headcount (by department, role, status)
- Attrition (monthly, annual)
- Recruitment pipeline
- Leave balance summary
- Attendance regularization log
- Performance distribution
- Training completion %
- Compliance status (mandatory trainings)
- Diversity report
- Age/tenure pyramid

---

## ৯৪. Full Payroll Module **[V1 core, V1.5 advanced]**

### ৯৪.১ Salary Structure Design

#### Component Library
**Earnings:**
- Basic Salary
- House Rent Allowance (HRA)
- Dearness Allowance (DA)
- Medical Allowance
- Conveyance Allowance
- Special Allowance
- Service Charge Share (hospitality — pool tip distribution)
- Bonus (festival, performance)
- Overtime
- Holiday pay
- Acting allowance
- Night shift allowance
- Hardship allowance

**Deductions:**
- Provident Fund (employee)
- ESI (employee)
- Professional Tax (state-specific India)
- TDS / Income Tax
- Loan EMI
- Salary advance
- Late deduction
- LOP deduction
- Insurance premium
- Trade union dues
- Cooperative society dues

**Employer Contributions (cost to company):**
- PF Employer Share
- ESI Employer Share
- Gratuity provision
- Insurance premium

### ৯৪.২ Salary Structure Template
```json
{
  "structure_name": "Standard - Permanent",
  "components": [
    { "code": "BASIC", "type": "earning", "calculation": "fixed", "amount": 0, "input_required": true },
    { "code": "HRA", "type": "earning", "calculation": "percentage", "base": "BASIC", "percentage": 40 },
    { "code": "DA", "type": "earning", "calculation": "percentage", "base": "BASIC", "percentage": 10 },
    { "code": "MED", "type": "earning", "calculation": "fixed", "amount": 1250 },
    { "code": "CONV", "type": "earning", "calculation": "fixed", "amount": 1600 },
    { "code": "SPECIAL", "type": "earning", "calculation": "balance_to_ctc" },
    { "code": "PF_EMP", "type": "deduction", "calculation": "percentage", "base": "BASIC", "percentage": 12, "cap": 1800 },
    { "code": "ESI_EMP", "type": "deduction", "calculation": "percentage", "base": "GROSS", "percentage": 0.75, "applicable_if": "GROSS <= 21000" },
    { "code": "PT", "type": "deduction", "calculation": "slab", "slabs": [
      { "min": 0, "max": 15000, "amount": 0 },
      { "min": 15001, "max": 20000, "amount": 150 },
      { "min": 20001, "max": null, "amount": 200 }
    ]}
  ]
}
```

### ৯৪.৩ Payroll Processing Workflow

```
Pre-payroll:
1. Lock attendance for the month
2. Process leave deductions (LOP)
3. Process OT entries
4. Process loan EMI installments due
5. Process reimbursement claims approved
6. Apply increments/promotions effective this month
7. Process new joiners (pro-rata)
8. Process exits (final settlement separate)

Payroll Run:
9. Calculate gross per employee
10. Apply deductions (statutory + voluntary)
11. Calculate net
12. Generate payroll preview
13. Manager/HR approval
14. CFO approval (above threshold)
15. Lock payroll

Post-payroll:
16. Generate payslips (PDF)
17. Bank file generation (NEFT/RTGS/BEFTN/Cheque print)
18. Statutory file generation (PF ECR, ESI return, TDS file)
19. Accounting journal entry post
20. Email payslips
21. Compliance filing reminder
```

### ৯৪.৪ Income Tax Computation

#### Bangladesh
- Salary slab calculation (FY based)
- Tax-free allowances (medical, conveyance up to limits)
- Investment proof (DPS, Sanchaypatra, life insurance) for rebate
- Monthly TDS calculation
- Annual reconciliation
- Income tax return prep assistance

#### India
- Old vs New regime choice (per employee declaration)
- Section 80C / 80D / 80G / HRA exemption
- Standard deduction
- Form 12BB investment declaration
- Form 16 generation annually
- Form 16A for non-employee contractor

### ৯৪.৫ Provident Fund (India PF)
- EPF wage cap
- Voluntary PF
- ECR (Electronic Challan-cum-Return) file generation
- UAN management

### ৯৪.৬ ESI (India)
- Eligibility (wage ceiling 21000)
- Employee + Employer share
- ESI return file
- Card-related employee benefits

### ৯৪.৭ Gratuity
- Accrual calculation (Bangladesh + India)
- Eligibility (5 years service in India)
- Payment at exit
- Provision in books (accounting impact)

### ৯৪.৮ Bonus Management
- Festival bonus (Eid, Pohela Boishakh in BD)
- Performance bonus (linked to appraisal)
- Sales incentive
- Service charge distribution (hospitality):
  - Pool % collected as service charge
  - Distribute per points system (designation × tenure × performance)

### ৯৪.৯ Service Charge Distribution (hospitality-specific)
Common practice in hotels: 10% service charge collected → pool → distributed to staff

```typescript
function distributeServiceCharge(month, propertyId) {
  const totalCollected = await getServiceChargePool(propertyId, month);
  const eligibleStaff = await getEligibleStaff(propertyId, month); // exclude probation, managers etc per policy
  
  const totalPoints = eligibleStaff.reduce((sum, s) => sum + s.distributionPoints, 0);
  const valuePerPoint = totalCollected / totalPoints;
  
  for (const staff of eligibleStaff) {
    const allocation = valuePerPoint * staff.distributionPoints;
    await createPayrollComponent(staff.id, 'SVC_CHARGE_SHARE', allocation, month);
  }
}
```

### ৯৪.১০ Final Settlement (FnF)
On exit:
- Pending salary (last month)
- Leave encashment
- Bonus pro-rata
- Reimbursements pending
- Notice period deduction (if shortfall)
- Loan recovery
- Asset/uniform recovery
- Gratuity (if eligible)
- Tax recalculation
- Bank transfer + FnF letter

### ৯৪.১১ Payslip
- PDF generation per template
- Multi-language (Bengali + English on same payslip)
- Email auto-send
- ESS download
- Digital signature (V2)

### ৯৪.১২ Statutory Returns / Filings

**Bangladesh:**
- VAT (Mushak 9.1) monthly
- Income tax withholding monthly
- Annual return
- Labour welfare fund

**India:**
- PF ECR monthly
- ESI return monthly
- Professional Tax (state-wise)
- TDS 24Q quarterly
- Form 16 annual
- Labour Welfare Fund

### ৯৪.১৩ Payroll Reports
- Salary register (month-wise, employee-wise)
- Bank advice (NEFT file)
- Statutory deduction summary
- Department-wise salary cost
- Yearly P&L for payroll
- CTC report
- Increment history
- Loan ledger per employee
- Tax computation sheet per employee

---

## ৯৫. Full Transportation / Fleet Management Module **[V1.5]**

### ৯৫.১ Vehicle Master

```sql
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  property_id     UUID,
  vehicle_no      TEXT NOT NULL,
  type            TEXT, -- 'sedan','suv','minivan','bus','luxury'
  make            TEXT,
  model           TEXT,
  year            INT,
  color           TEXT,
  seating_capacity INT,
  fuel_type       TEXT, -- 'petrol','diesel','electric','hybrid','cng'
  ownership       TEXT, -- 'owned','leased','rental','partner'
  purchase_date   DATE,
  purchase_cost   NUMERIC(14,2),
  current_book_value NUMERIC(14,2),
  insurance_policy TEXT,
  insurance_expiry DATE,
  registration_expiry DATE,
  fitness_expiry  DATE,
  permit_type     TEXT, -- 'tourist','commercial','private'
  permit_expiry   DATE,
  pollution_expiry DATE,
  current_odometer NUMERIC(10,1),
  status          TEXT, -- 'available','on_trip','maintenance','retired'
  current_driver_id UUID,
  documents       JSONB DEFAULT '[]'
);
```

### ৯৫.২ Driver Management

```sql
CREATE TABLE drivers (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  employee_id     UUID,  -- if employee
  driver_code     TEXT NOT NULL,
  name            TEXT,
  phone           TEXT,
  license_no      TEXT,
  license_type    TEXT, -- 'light','heavy','commercial'
  license_expiry  DATE,
  badge_no        TEXT,
  blood_group     TEXT,
  emergency_contact JSONB,
  is_employee     BOOLEAN,
  vendor_id       UUID, -- if outsourced
  per_trip_rate   NUMERIC(10,2),
  per_day_rate    NUMERIC(10,2),
  commission_rate NUMERIC(5,4),
  rating          NUMERIC(3,2),
  status          TEXT DEFAULT 'active'
);
```

### ৯৫.৩ Trip Booking

#### Trip Types
- **Airport transfer** (pickup / drop)
- **Local sightseeing** (per hour / per km)
- **Outstation** (long-distance, multi-day)
- **Inter-city transfer**
- **Wedding/event service** (decorated vehicle)
- **Staff transport** (commute shuttle)
- **Owner/Management trip**
- **Vendor / Material pickup**

#### Trip Lifecycle
```sql
CREATE TABLE trips (
  id              UUID PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  property_id     UUID,
  trip_no         TEXT NOT NULL,
  type            TEXT,
  
  -- Customer
  reservation_id  UUID,  -- if for hotel guest
  guest_id        UUID,
  customer_name   TEXT,
  customer_phone  TEXT,
  
  -- Trip details
  pickup_location TEXT,
  pickup_address  TEXT,
  pickup_geo      JSONB,
  pickup_datetime TIMESTAMPTZ,
  dropoff_location TEXT,
  dropoff_address TEXT,
  dropoff_geo     JSONB,
  estimated_distance_km NUMERIC(8,2),
  estimated_duration_min INT,
  
  -- Assignment
  vehicle_id      UUID,
  driver_id       UUID,
  
  -- Status
  status          TEXT, -- 'pending','assigned','enroute_pickup','arrived','in_trip','completed','cancelled','no_show'
  actual_pickup_at TIMESTAMPTZ,
  actual_dropoff_at TIMESTAMPTZ,
  start_odometer  NUMERIC(10,1),
  end_odometer    NUMERIC(10,1),
  actual_distance_km NUMERIC(8,2),
  
  -- Charges
  base_charge     NUMERIC(10,2),
  distance_charge NUMERIC(10,2),
  time_charge     NUMERIC(10,2),
  waiting_charge  NUMERIC(10,2),
  toll_amount     NUMERIC(10,2),
  parking_amount  NUMERIC(10,2),
  fuel_charge     NUMERIC(10,2),
  surcharge_night NUMERIC(10,2),
  surcharge_holiday NUMERIC(10,2),
  total           NUMERIC(10,2),
  tax             NUMERIC(10,2),
  grand_total     NUMERIC(10,2),
  
  -- Settlement
  charge_to       TEXT, -- 'room_folio','direct_payment','company_account','complimentary'
  payment_status  TEXT,
  
  -- Driver
  driver_commission NUMERIC(10,2),
  fuel_advance    NUMERIC(10,2),
  fuel_actual     NUMERIC(10,2),
  
  -- Quality
  rating          INT,
  feedback        TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### ৯৫.৪ Pricing Models
- Per km (with minimum fare)
- Per hour (with overflow rate)
- Per day (8-hour, 80-km limit + overage)
- Per trip flat (airport transfer fixed)
- Hybrid (base + per km + per hour)
- Distance slab (0-10km, 10-25km, 25+km)
- Vehicle category-based
- Day/Night differential (10 PM - 6 AM +25%)
- Holiday surcharge
- Outstation per-day allowance for driver

### ৯৫.৫ Trip Booking Flow
```
1. Booking source: Guest request via FD, Booking engine add-on, Walk-in, Phone, Internal
2. Check availability (vehicle + driver)
3. Auto-assign or manual assign
4. Driver notification (mobile app push)
5. Driver acceptance + start odometer photo
6. Trip start (on customer pickup confirmation)
7. Real-time tracking (if GPS integrated)
8. Mid-trip stops, waiting time logged
9. Trip end + end odometer photo
10. Calculation: actual km × rate + base + waiting + tolls + tips
11. Settlement: charge to folio / cash / card
12. Driver duty close + commission accrual
13. Customer rating request
```

### ৯৫.৬ Vehicle Maintenance
- Service schedule (every X km or Y months)
- Service due alerts
- Service history per vehicle
- Cost per vehicle (TCO analysis)
- Insurance/permit/fitness renewal alerts
- Tyre management (life tracking)
- Repair log
- Vendor (garage) management

### ৯৫.৭ Fuel Management
- Fuel intake log (date, vehicle, odometer, liters, amount, station)
- Fuel mileage calculation per vehicle
- Anomaly alerts (sudden drop in mileage = leak or pilferage)
- Monthly fuel cost analysis
- Fuel advance to driver + actual reconciliation

### ৯৫.৮ Driver Duty Management
- Roster (drag-drop calendar like staff roster)
- Daily duty assignment
- Outstation duty with overnight allowance
- Driver app: today's trips, map navigation, mark trip status
- Commission per trip auto-calculated
- Monthly driver settlement (per trip + base + DA + reimbursement - advance)

### ৯৫.৯ GPS Tracking Integration (Optional)
- Vendor integration (Lokit, Fleetx, Locate2u — BD/IN options)
- Real-time vehicle location on map
- Geo-fence alerts (deviation from route)
- Speed monitoring
- Idle time alerts
- Replay trip history

### ৯৫.১০ Vehicle Utilization Reports
- Vehicle utilization % (hours running / available hours)
- Revenue per vehicle
- Cost per vehicle (fuel + maintenance + driver + depreciation)
- Profitability per vehicle
- Driver performance (trips/day, customer rating, fuel efficiency)
- Most profitable trip types
- Idle time analysis
- Maintenance cost trends

### ৯৫.১১ Customer-facing Features
- Trip booking widget in booking engine ("Add airport pickup")
- Pre-arrival upsell ("Need airport pickup?")
- Live driver/vehicle info shared via WhatsApp (driver name, vehicle no, ETA)
- One-tap call driver
- Trip receipt PDF

### ৯৫.১২ Outsourced Fleet Partner Management
For hotels who don't own vehicles:
- Partner vendor master
- Vendor rate cards
- Trip assignment to partner
- Monthly partner billing reconciliation

---

## ৯৬. Full Procurement / Inventory / Stock Module **[V1.5]**

Already partially covered in 6.3 (Inventory Procurement), but expanded here:

### ৯৬.১ Stock Categories
- F&B Raw Material (perishable + non-perishable)
- F&B Finished Goods (bottled bev, packaged)
- Linen (sheets, towels, blankets, uniform)
- Toiletries & Amenities (shampoo, soap, slippers)
- Stationery
- Cleaning supplies
- Engineering (spare parts, bulbs)
- Gift shop merchandise

### ৯৬.২ Multi-Store / Multi-Location
- Main store
- Restaurant kitchen store
- Bar store
- HK linen room
- Engineering workshop
- Per location stock + transfer

### ৯৬.৩ Procurement Workflow
```
Indent (department) → Approval → 
Purchase Inquiry (multiple vendors) → Quote comparison → 
PO generation → Vendor confirmation → 
Goods delivery → GRN (with QC check) → 
Invoice receive → 3-way matching → 
AP recorded → Payment scheduled
```

### ৯৬.৪ Stock Operations
- Receiving (GRN)
- Issue (to department)
- Inter-store transfer
- Return to vendor
- Wastage / Damage
- Stock take (cycle count + annual)
- Adjustment (with approval)

### ৯৬.৫ Costing Methods
- FIFO (First In First Out)
- Weighted Average
- LIFO (rarely used)

### ৯৬.৬ Reports
- Stock ledger per item
- Stock valuation (per costing method)
- Slow-moving / Dead stock
- Reorder level breaches
- Wastage analysis
- Vendor performance (on-time delivery, quality)
- Cost variance (PO vs invoice)
- Department consumption

---

## ৯৭. Integrated Workflow: Hotel → Accounting → HR → Payroll → Transport

এই module-গুলো isolated না — interlinked:

```
Hotel Operation Event              → Auto-flow
─────────────────────────────────────────────────────────────────
Reservation created               → AR entry (if prepaid)
Room revenue posted (night audit) → Journal entry (Revenue + Tax)
F&B order settled                 → Revenue + COGS journal
Vendor invoice received            → AP entry
Vendor payment                    → AP cleared + Bank
Salary processing                 → Payroll JE + Statutory liability JE
Transport trip completed          → Revenue (if guest pay) OR Cost (if comp)
Asset purchased                   → Asset register + Capital expense
Monthly depreciation              → Depreciation expense JE
Staff overtime                    → Payroll component + Service Charge
Employee loan disbursement        → Bank credit + Loan AR
Loan EMI deduction                → Salary debit + Loan AR cleared
Service charge collected (10%)    → SC payable → Distributed to staff next payroll
Bank reconciliation               → Match all entries
Year-end                          → P&L close → Retained Earnings
```

প্রতিটা business event-এর জন্য **predefined accounting rule**, যেটা configure করা যায় per tenant। মানে — Hotelier কখনো manually journal entry লিখবেন না; system auto-create করবে।

---

## ৯৮. Single-Stack Vision Summary

এই blueprint দিয়ে develop করা platform-এর মধ্যে নিম্নলিখিত standalone software-এর functionality থাকবে:

| Standalone Software (Conventional) | আমাদের Platform-এ Replacement |
|---|---|
| **Tally Prime / QuickBooks / Zoho Books / Xero** | Section 92 — Full Accounting/ERP module |
| **Zoho People / BambooHR / Keka / GreytHR** | Section 93 — Full HR module |
| **Zoho Payroll / RazorpayX Payroll / Khaitan Payroll** | Section 94 — Full Payroll module |
| **Loginext / SafeAddress / Lokit GPS** | Section 95 — Transportation module |
| **SAP Ariba / Coupa (procurement)** | Section 96 — Procurement & Stock |
| **OPERA / Cloudbeds / eZee Absolute (PMS)** | Sections 22-30 — Full PMS |
| **SiteMinder / RateGain (Channel Manager)** | Section 31 — Channel Sync Engine |
| **TrustYou / Revinate (Reputation)** | Section 6.8 — Reputation Management |
| **IDeaS / Atomize (Revenue Management)** | Section 5.10, 4.7 — Pricing/Yield |
| **Mailchimp / Klaviyo (Marketing)** | Section 37 — Marketing Automation |
| **Salesforce / HubSpot CRM (light use)** | Section 33 — Guest CRM + B2B portal |
| **POS systems (Petpooja, Restora)** | Section 79 — F&B POS |
| **Inventory (Sapaad/Zoho Inventory)** | Section 96 — Stock & Procurement |
| **Spa software (Vagaro, Mindbody)** | Section 81 — Spa/Wellness module |
| **Gym software (Wodify, Glofox)** | Section 81 — Gym module |
| **Event software (Cvent, Eventbrite)** | Section 80 — Event/Banquet |
| **Slack/Teams (operational)** | Section 5.9 — Internal communication (V1.5) |
| **GST/Tax software (ClearTax, TaxRaahi)** | Section 92.11 — Tax return prep |
| **Asset management (UpKeep)** | Section 92.7 — Fixed Asset Register |
| **Time tracking (Hubstaff)** | Section 93.6 — Attendance |
| **Learning Management (Moodle/Disprz)** | Section 93.8 + 6.12 — LMS Lite |

**Result:** A complete hospitality business operations platform. Hotelier-কে আর কোনো 2nd, 3rd সফটওয়্যার subscribe করতে হবে না।

---

## ৯৯. Updated Pricing Tier with ERP Modules

আগের Section 73-এর tier matrix update:

| Module | Basic | Pro | Enterprise |
|---|:---:|:---:|:---:|
| (Previous rows) | ... | ... | ... |
| **Basic Accounting (auto JE, P&L, Balance Sheet)** | – | ✓ | ✓ |
| **Full ERP Accounting (multi-entity, cost centers, budget)** | – | – | ✓ |
| **HR Module (employee master, leave, attendance)** | – | ✓ | ✓ |
| **Full HR (ATS, performance, training, ESS)** | – | – | ✓ |
| **Basic Payroll (single property)** | – | ✓ | ✓ |
| **Full Payroll (multi-property, statutory filings, FnF)** | – | – | ✓ |
| **Transport Module (basic)** | – | ✓ | ✓ |
| **Full Fleet Management (GPS, outsourced, multi-vehicle)** | – | – | ✓ |
| **Procurement & Stock** | – | ✓ | ✓ |

**Pricing Implication:**
- Pro tier pricing should be revised upward (BDT 30,000-50,000/month) given এই module-গুলোর scope
- Enterprise tier (BDT 1,00,000+/month) — fully replaces 5-10 standalone software subscriptions saving customer significantly

---

## ১০০. Updated Roadmap with Full ERP Modules

### Updated Phase Plan
| Phase | Original Plan | + ERP Modules |
|---|---|---|
| **MVP (M1-6)** | PMS + Channel sync + Direct booking + Compliance | + Basic AR/AP entries, basic chart of accounts |
| **V1.0 (M7-12)** | Mobile, F&B POS, CRM, Marketing | + Basic HR (employee master, leave, attendance), Basic Payroll (single property), Basic Accounting (auto JE) |
| **V1.5 (M13-18)** | Tier 3 channels, AI pricing, ERP | + **Full Accounting (multi-entity, budget, year-end), Full HR (ATS, performance), Full Payroll (statutory filings, FnF), Transport Module, Procurement, Spa, Gym, Banquet** |
| **V2.0 (M19-24)** | Next-gen features | + Multi-currency consolidation, Advanced fleet (GPS, outsourced partner), Industry benchmarking (USALI alignment), Tax filing direct submission via APIs |

### Team Adjustment
যেহেতু scope বেড়েছে, MVP team-এ **+1 backend engineer** (accounting/payroll domain experience preferred); V1.0-এ **+1 Finance/HR domain product manager**।

---

## ১০১. Implementation Priority for Hotelier "Single-Stack" Adoption

**Day-1 priority (without these, hotelier still needs Tally + spreadsheet):**
1. Auto-journal entry from operations (Section 92.3) — MVP
2. Basic P&L + Balance Sheet — MVP
3. AP/AR with vendor master — V1.0
4. Bank reconciliation — V1.0
5. Basic payroll with statutory deductions — V1.0
6. Tax return data prep (Mushak/GST) — V1.0

**Year-1 priority (full single-stack possible):**
7. Multi-entity consolidation — V1.5
8. Full HR ATS + Performance — V1.5
9. Fixed Asset Register + Depreciation — V1.5
10. Transport / Fleet — V1.5

**Year-2 priority (industry-leading depth):**
11. USALI-aligned reporting — V2
12. Direct e-invoice / e-way bill submission — V2
13. GPS fleet tracking — V2
14. ESG/Sustainability accounting — V2

---

## ✅ Single-Stack Confirmation

এই blueprint follow করে develop করলে hotelier-কে নিচের external software-এর কোনোটাই subscribe করতে হবে না:

✅ Accounting (Tally/QuickBooks/Zoho) — Section 92
✅ HR (Zoho People/BambooHR/Keka) — Section 93
✅ Payroll (RazorpayX/Zoho Payroll) — Section 94
✅ Transportation/Fleet (Loginext/Lokit) — Section 95
✅ Procurement (SAP Ariba/Coupa) — Section 96
✅ PMS (OPERA/Cloudbeds) — Sections 22-30
✅ Channel Manager (SiteMinder/RateGain) — Section 31
✅ POS (Petpooja/Restora) — Section 79
✅ Spa software (Vagaro/Mindbody) — Section 81
✅ Gym software (Wodify) — Section 81
✅ Event/Banquet (Cvent) — Section 80
✅ Reputation (TrustYou/Revinate) — Section 6.8
✅ Marketing (Mailchimp/Klaviyo) — Section 37
✅ CRM (Salesforce light) — Section 33
✅ Asset management (UpKeep) — Section 92.7
✅ Tax filing software (ClearTax/TaxRaahi) — Section 92.11
✅ LMS (Moodle) — Section 93.8

---

# 🌐 PART XIV — Final Gap Fill (Edge Modules, Country Specifics, Operational Excellence)

বহুবার পর্যালোচনা করে এখনো যেগুলো বাকি ছিল — এখানে complete করা হলো। এর পর আর কোনো operational/strategic gap থাকা উচিত নয়।

---

## ১০২. Concierge, Bell Desk & Guest Services Module **[V1]**

### ১০২.১ Concierge Module
- **Local Knowledge Base:** Restaurants, attractions, shopping, medical, transport — curated per city
- **Recommendation Engine:** Per guest preference + previous selection
- **External Booking:** Tour, restaurant table, theatre, spa (non-hotel)
- **Multi-language Phrasebook** for staff (Bengali → English/Arabic/Chinese phrases)
- **Concierge Request Tracking:** "Get me 2 tickets for tonight's show" → assigned → completed
- **Partner Vendors:** Local tour operators, restaurants with commission tracking

### ১০২.২ Bell Desk / Luggage Management
- Luggage check-in (pre-arrival storage / post-departure storage)
- Tag generation with QR
- Storage location tracking
- Luggage handover log (who handled, when)
- Lost luggage workflow
- Per-day storage charge (if applicable)

### ১০২.৩ VIP Treatment Workflow
- VIP detection (auto from guest profile + amount + repeat factor)
- VIP arrival alert to GM + relevant staff
- Welcome amenities (fruit basket, flower, handwritten note) auto-task
- Personalized room setup (preferences pulled)
- Dedicated escort
- Post-stay personalized follow-up

### ১০২.৪ Wake-up Call & Personal Service Requests
- Wake-up call scheduling
- Newspaper preference
- Pillow menu
- Special amenities request
- Birthday/anniversary detection from profile → auto-cake offer

### ১০২.৫ Guest Complaint Resolution Workflow
```
Complaint logged → Severity classification (low/medium/high/critical) →
  Auto-routed to department → Acknowledgment within X min →
  Resolution within Y hours → Compensation if applicable →
  Manager review → Guest satisfaction check →
  Closed → Root cause analysis if recurring
```
- Service Recovery toolkit (free upgrade, F&B credit, future stay discount)
- NPS recovery: detractor → personal outreach within 24h

---

## ১০৩. Owner / Investor Reporting Module **[V1.5]**

### ১০৩.১ Multi-Owner Property Support
- Property may be owned by single owner / partnership / investor group
- Each owner with profit share %
- Owner-specific data access (read-only owner portal)

### ১০৩.২ Management Fee Calculation
- Base fee: % of revenue
- Incentive fee: % of GOP (Gross Operating Profit) above threshold
- Marketing fee: separate
- Reserve for replacement (FF&E reserve)

### ১০৩.৩ Owner Statement (Monthly)
```
SUMMARY OPERATING STATEMENT
Total Revenue: BDT X
Operating Expenses: BDT Y
GOP (Gross Operating Profit): BDT Z
Less: Management Fee (3% of revenue)
Less: Incentive Fee (10% of GOP > target)
Less: FF&E Reserve (4% of revenue)
= Owner Distribution: BDT W

Per Owner (based on share %):
- Owner A (60%): BDT...
- Owner B (40%): BDT...
```

### ১০৩.৪ Owner Portal
- Real-time KPIs (Occupancy, ADR, RevPAR)
- Monthly statements
- Year-over-year comparison
- Budget vs Actual
- Capex requests requiring approval
- Documents (audit reports, insurance, legal)
- Distribution history

### ১০৩.৫ Distribution Waterfall (Investor groups)
- Preferred return tier
- Catch-up tier
- Profit split tier
- IRR calculation

---

## ১০৪. Quality Assurance, SOPs & Brand Standards **[V1.5]**

### ১০৪.১ Standard Operating Procedure (SOP) Manager
- SOP library per department
- Version control
- Acknowledgment tracking (each staff confirms reading)
- Checklist mode for shift handover
- SOP enforcement: required steps captured in workflows

### ১০৪.২ Brand Standards Audit (for Chain)
- Brand standard checklist (e.g., 200 items per hotel category)
- Quarterly self-audit
- Annual headquarters audit
- Score-based ranking
- Corrective action plan (CAP) workflow

### ১০৪.৩ Mystery Shopper Integration
- Vendor management (mystery shopper agency)
- Assessment criteria configuration
- Score recording
- Trend analysis

### ১০৪.৪ Forbes / LRA / Five-Star Audit Prep
- Pre-audit self-assessment
- Gap analysis
- Action plan
- Post-audit improvement tracking

### ১০৪.৫ Shift Handover Notes
- Outgoing shift logs key events
- Pending tasks transferred
- VIP arrivals next shift
- Issues to monitor
- Signed handover acknowledgment

### ১০৪.৬ Daily Briefing Notes
- Morning briefing for all departments
- VIP arrivals today, special requests
- Maintenance issues
- Special events
- Targets vs actual
- Auto-generated from system + manager additions

---

## ১০৫. Health, Safety, Fire & Food Safety Compliance **[V1.5]**

### ১০৫.১ HACCP (Hazard Analysis Critical Control Points) for F&B
- Temperature logs (refrigerator, hot hold, cold hold) — daily multi-time
- Cooking temperature verification
- Receiving inspection log
- Allergen control matrix
- Cleaning schedule + verification
- Pest control log
- Calibration log (thermometers, scales)
- HACCP plan documentation

### ১০৫.২ Allergen Management
- Per menu item allergen tags (gluten, nut, dairy, egg, shellfish, soy)
- Customer allergy capture at booking + check-in
- Kitchen alert when allergy-customer orders
- Cross-contamination prevention SOP

### ১০৫.৩ Halal / Kosher / Vegetarian Certification
- Certification tracking (issuing body, expiry)
- Per outlet certification status display
- Menu marking
- Supplier halal certification trail

### ১০৫.৪ Fire Safety Compliance
- Equipment inventory (extinguishers, smoke detectors, sprinklers, hose reels) per location
- Inspection schedule + log
- Fire drill schedule + attendance log
- Emergency contact lists
- Evacuation plan documents per floor
- Fire incident log
- Insurance compliance docs

### ১০৫.৫ First Aid & Incident Management
- First aid kit inventory + expiry tracking
- First aid trained staff list
- Guest injury log
- Staff injury log (OSHA equivalent)
- Incident investigation workflow
- Insurance claim workflow

### ১০৫.৬ Pool & Spa Safety
- Daily water quality test (pH, chlorine, temperature) log
- Lifeguard duty roster
- Pool equipment maintenance
- Drowning incident protocol
- Accessibility compliance

### ১০৫.৭ Pandemic / Health Crisis Mode (COVID-style)
Toggle-able mode for outbreak response:
- Capacity reduction rules (room buffer days between guests)
- Mask/distancing protocols
- Contact tracing log
- Vendor health screening
- Reduced service mode (no buffet, room service only)
- Cancellation policy override (auto-flexible)
- Communication templates for guests

---

## ১০৬. F&B Deep Compliance & Bar Operations **[V1.5]**

### ১০৬.১ Bar / Liquor Inventory (Regulatory)
- License tracking (BD: Excise Department; IN: state excise)
- Permit room rules (Muslim guest restriction in BD)
- Stock register per bottle (regulatory requirement in India)
- Daily breakage log
- License renewal alerts
- Excise return preparation

### ১০৬.২ Cost Control
- **Food Cost % Target:** 28-32% benchmark
- **Beverage Cost % Target:** 18-22% benchmark
- Daily cost % monitoring
- Variance investigation when above threshold
- Recipe costing
- Portion control

### ১০৬.৩ Recipe Versioning
- Recipe master with version history
- Chef approval workflow
- Cost re-calculation on ingredient change
- Standard yield calculation

### ১০৬.৪ Buffet Management
- Buffet item catalog
- Cost per person
- Wastage tracking
- Replenishment alerts
- Per-meal headcount tracking

---

## ১০৭. In-Room Tech Integrations **[V2]**

### ১০৭.১ IPTV / Smart TV Integration
- Welcome screen with guest name
- Hotel info, menu, services
- Room service ordering via TV
- Express checkout via TV
- Personalized content per loyalty tier

### ১০৭.২ Telephone PBX Integration
- Per-call billing (local, STD, ISD)
- Posting to folio (category 'telephone')
- Wake-up call automation
- Voicemail management

### ১০৭.৩ Digital Signage
- Lobby displays
- Meeting room signage
- Banquet event signage (auto-pulled from BEO)
- Restaurant menu boards
- Weather + flight info widgets

### ১০৭.৪ In-Room Tablet
- Digital compendium
- Room service ordering
- Concierge requests
- Property info + maps
- Multi-language

### ১০৭.৫ Smart Lighting & Climate
- Pre-arrival room conditioning (AC pre-cool)
- Energy save mode when room empty
- Scene presets (Welcome, Read, Sleep, Romance)

---

## ১০৮. Country-Specific Expansion Playbooks

### ১০৮.১ UAE / Dubai / Abu Dhabi **[V1.5]**
- Currency: AED
- VAT: 5% (with specific tourism categories)
- Tourism Dirham fee per room per night (varies by emirate)
- Dubai Tourism (DET) e-permit / registration
- Police reporting: TADBEER for foreign workers; DTCM for guests
- RTL Arabic support
- Friday-Saturday weekend
- Ramadan timing adjustments (F&B hours, no public daytime food)
- Halal compliance critical
- Booking.com Genius / Trip.com China traffic

### ১০৮.২ Saudi Arabia **[V2]**
- Currency: SAR
- VAT: 15%
- ZATCA e-invoicing compliance (Phase 2)
- Police reporting: Absher
- Strict halal requirements
- Hajj/Umrah season pricing strategies
- Vision 2030 tourism push — opportunity
- Arabic RTL + cultural sensitivity

### ১০৮.৩ Maldives **[V1.5]**
- Currency: MVR (but USD widely used)
- GST: 12% (Tourism GST), 8% (General)
- Green Tax per night per guest
- Resort vs city hotel distinction
- Speedboat/seaplane transfer integration critical
- All-inclusive package dominant
- High season demand spikes (Dec-Apr)

### ১০৮.৪ Sri Lanka **[V1.5]**
- Currency: LKR
- VAT: 18%
- Tourism Development Levy 1%
- Sri Lanka Tourism Development Authority registration
- Police "Foreign Registration" form
- Sinhala + Tamil + English

### ১০৮.৫ Nepal **[V1.5]**
- Currency: NPR
- VAT: 13%
- Service charge 10% mandatory by law (distributed to staff)
- Trekking permit integration (TIMS card) for adventure hotels
- Devanagari (Nepali) support

### ১০৮.৬ Indonesia **[V2]**
- Currency: IDR
- VAT: 11% (PPN)
- Tourism tax varies per region (Bali: separate levy)
- Strict halal requirements (Muslim majority)
- Local language (Bahasa Indonesia)
- Bali-specific Pecalang local security integration

### ১০৮.৭ Thailand **[V2]**
- Currency: THB
- VAT: 7%
- TM30 foreigner reporting (24hr requirement)
- TAT (Tourism Authority of Thailand) registration
- Thai language support
- Buddhist holiday calendar pricing

### ১০৮.৮ Malaysia **[V2]**
- Currency: MYR
- SST: 6% Service Tax
- Tourism Tax: RM10 per room per night (foreign guests)
- Halal certification (JAKIM)
- Malay/English/Chinese language

### ১০৮.৯ Each Country Launch Checklist (Generalized)
1. Currency + FX integration
2. Local payment gateways
3. Tax engine rules
4. Invoice format compliance
5. Police/govt reporting form integration
6. Local language UI
7. Local OTAs integration
8. Time zone + weekend rules
9. Religious/cultural calendar
10. Data residency law
11. Local sales partner identification
12. Customer support language
13. Local pricing optimization
14. Marketing localization
15. Local legal counsel engagement

---

## ১০৯. Bangladesh-Specific Deep Compliance **[MVP]**

### ১০৯.১ Bangladesh Bank Foreign Exchange Reporting
- Foreign guest revenue → Form FE-1 monthly to BB
- Foreign currency receipt log
- USD/EUR holding limit compliance
- Encashment certificate generation for foreign guest

### ১০৯.২ Bangladesh Tourism Board (BTB)
- Hotel classification registration
- Monthly arrival statistics submission
- Star rating audit prep

### ১০৯.৩ Bangladesh Hotel & Restaurant Association
- Membership tracking
- Industry reporting

### ১০৯.৪ BTRC SMS / WhatsApp Compliance
- Mask sender ID registration
- Opt-in records
- DND list integration

### ১০৯.৫ Bangladesh Securities & Exchange (if public)
- Quarterly reporting prep
- IFRS-compliant statements

### ১০৯.৬ Department of Environment
- Environment Clearance Certificate
- Waste management compliance
- Effluent treatment plant log (resort)

---

## ১১০. Group Travel & Tour Operator Module **[V1.5]**

### ১১০.১ Tour Operator Partner Master
- Multiple tour operators per market
- Negotiated allotment + net rates
- Markup structure
- Payment terms
- Cancellation policy contracts

### ১১০.২ Series Group Booking
- Pre-allocated rooms for weekly/monthly groups (e.g., wedding tour series)
- Rooming list import via Excel
- Group rate vs FIT rate differentiation
- Late name addition (within cutoff)

### ১১০.৩ Itinerary Management
- Multi-day itinerary builder
- Day-wise activity, meal, transport
- Cost rollup
- Itinerary PDF for guest

### ১১০.৪ Group Operations
- Welcome briefing room booking
- Welcome drink mass service
- Group meal vouchers
- Group transport coordination
- Group photo opportunities
- Tour leader / Coordinator privileges
- Tour escort complimentary room

### ১১০.৫ Group Settlement
- Master folio + Individual folios for incidentals
- Voucher-based settlement
- Tour operator commission auto-calc
- Statement to tour operator

---

## ১১১. Sales Pipeline (Corporate / MICE) **[V1.5]**

### ১১১.১ Sales CRM (Hospitality-Specific)
- Account master (Corporate companies)
- Contact persons per account
- Opportunity pipeline (RFP, Negotiating, Closed Won/Lost)
- Activity log (calls, emails, site inspections)
- Forecast vs achievement

### ১১১.২ RFP Response Tool
- RFP template library
- Property fact sheet (auto-pulled)
- Rate offering builder
- Standard contracts library
- Approval workflow for rates

### ১১১.৩ Site Inspection Management
- Schedule site inspection
- Welcome amenity preparation
- Tour route planning
- Feedback capture
- Conversion tracking

### ১১১.৪ Rate Contract Management
- Negotiated rate contracts per corporate
- Validity period
- Auto-renewal alerts
- Per-room-type rate matrix
- LRA (Local Rate Agreement) tracking
- Volume commitment tracking

### ১১১.৫ Account-Based Reporting
- Production per account
- Year-over-year per account
- Top accounts contribution
- Account-specific F&B/banquet revenue

---

## ১১২. Sustainability & ESG Deep Module **[V1.5 → V2]**

### ১১২.১ GHG Protocol Compliance
- **Scope 1:** Direct emissions (vehicle fuel, kitchen gas)
- **Scope 2:** Purchased electricity
- **Scope 3:** Guest travel, supply chain
- Auto-calculation from operations data
- Monthly carbon footprint dashboard

### ১১২.২ Energy Management
- Per-room energy consumption (with IoT V2)
- Department energy use tracking
- Energy benchmarking against industry
- Energy saving initiatives ROI

### ১১২.৩ Water Management
- Daily water consumption per occupied room
- Water saving (low-flow fixtures count)
- Greywater recycling tracking
- Rainwater harvesting

### ১১২.৪ Waste Management
- Waste streams (food, recyclable, hazardous, general)
- Daily weight tracking
- Recycling %
- Composting tracking

### ১১২.৫ Sustainable Sourcing
- Local supplier % tracking
- Organic ingredient %
- Fair trade products
- Sustainable seafood (MSC)
- Plastic-free initiative tracking

### ১১২.৬ Social Impact
- Local employment %
- Community engagement
- CSR project tracking
- Donation tracking
- Diversity metrics

### ১১২.৭ Certifications
- LEED / IGBC / EDGE for green building
- EarthCheck certification
- Green Key certification
- Halal / Vegan / Kosher

### ১১২.৮ ESG Reporting
- Annual ESG report generation
- GRI Standards alignment
- TCFD climate disclosure
- SDG mapping
- Investor / Corporate client reporting

---

## ১১৩. Knowledge Management & Internal Communication **[V1]**

### ১১৩.১ Property Fact Sheet
- All hotel info one-place (rooms, F&B, facilities, policies)
- Auto-generated, exportable as PDF
- Used in RFP responses + Sales kit

### ১১৩.২ VIP Profile Vault
- Per VIP detailed profile (preferences, family, allergies, anniversaries)
- Photo recognition (with consent)
- Cross-property profile sync (chain)

### ১১৩.৩ Daily Briefing System
- Morning briefing notes (per department)
- Auto-compiled from previous shift + system + manual
- Acknowledgment by attending staff
- Recording for absent staff

### ১১৩.৪ Internal Announcement Board
- Property-wide or department-wide announcements
- Acknowledgment tracking
- Pin / unpin
- Multi-language

### ১১৩.৫ Staff Recognition
- Employee of the Month workflow
- Peer recognition badges
- Guest commendation tracking
- Public recognition board

---

## ১১৪. CSR, Donation, Apprenticeship Tracking **[V2]**

### ১১৪.১ CSR Initiative Tracking
- Project master (school adoption, orphanage support, environment)
- Budget allocation
- Beneficiary tracking
- Impact metrics
- Photo/document storage
- CSR report generation

### ১১৪.২ Donation Receipt Management
- Donor master (companies + individuals)
- 80G receipt generation (India)
- Tax exemption certificate (BD)
- Annual donation summary

### ১১৪.৩ Internship / Apprenticeship Program
- Application pipeline
- Mentor assignment
- Training plan
- Evaluation
- Stipend management
- Certificate generation
- Conversion to permanent tracking

---

## ১১৫. Disaster Recovery & Business Continuity (Property-Level) **[V1.5]**

### ১১৫.১ Operational Continuity Modes
- **Normal mode**: Full operations
- **Reduced mode**: Limited service (skeleton staff)
- **Emergency mode**: Evacuation, minimal staff
- **Pandemic mode**: Health protocols active
- **Disaster mode**: Natural disaster response
- Mode toggle by manager triggers automated workflows

### ১১৫.২ Natural Disaster Protocols
- Flood (BD prone): Inventory protection checklist, guest evacuation, IT backup
- Cyclone: Coastal property protocol
- Earthquake: Structural inspection workflow
- Power outage: Generator + emergency lighting + comms protocol

### ১১৫.৩ Civil Unrest Protocol
- Curfew mode (restricted F&B hours, room confinement)
- Foreign guest evacuation coordination with embassies
- Security partner activation

### ১১৫.৪ IT Outage Mode (Offline Operations)
Already covered in 6.11 (Offline Mode) — extended:
- Mobile checkout slips
- Paper folio fallback templates
- Cash-only mode
- Manual police reporting backup

### ১১৫.৫ Insurance Claim Management
- Property insurance policy registry
- Claim workflow (incident → docs → submission → payout)
- Claim history per property
- Insurance broker integration

---

## ১১৬. Overbooking Management (Walked Guest Workflow) **[V1]**

### ১১৬.১ Walked Guest Process
যখন overbooking হয় (despite preventive measures, sometimes happens due to extended stays / OTA sync delay):

```
Detect overbooking (during shift before arrivals) →
  Identify least-impact guest to walk (lowest tier, shortest stay, latest arrival) →
  Auto-search nearby partner hotel (same category) →
  Book equivalent or better →
  Pre-call guest with apology + transport + compensation offer →
  Welcome them when returning next night (if multi-night) →
  Service recovery (free upgrade, comp meal, discount future stay) →
  Document for accounting (walk cost) + RCA
```

### ১১৬.২ Partner Hotel Network
- Backup hotel list per property
- Walk agreement contracts
- Rate parity for walks
- Reciprocal arrangement

### ১১৬.৩ Walked Guest Compensation Policy
Configurable:
- Free first night at partner hotel (paid by us)
- Transport reimbursed
- Future stay credit (BDT X or 1 night free)
- F&B voucher
- Personalized apology from GM

---

## ১১৭. AI / LLM Specific Deep Use Cases (Beyond Section 45) **[V2]**

### ১১৭.১ Specific Prompt Library
Versioned prompts in Git for each AI use case:

**Review reply prompt template:**
```
You are a hospitality professional replying to a guest review for {{property_name}}.
Property style: {{property_brand_voice}}
Review:
- Rating: {{rating}}/5
- Review text: "{{review_text}}"
- Date of stay: {{stay_date}}
- Identified issues (auto-tagged): {{auto_tags}}

Write a professional, warm reply in {{language}} that:
1. Thanks the guest by first name
2. Acknowledges specific points (positive AND negative)
3. Provides specific action taken or planned for negative points
4. Invites them back with a personal touch
5. Signs off as {{signatory_name}}, {{signatory_role}}

Tone: Warm but professional. NEVER defensive. NEVER generic.
Length: 80-120 words.
Output JSON: {"reply_text": "...", "suggested_internal_action": "..."}
```

**Guest WhatsApp chatbot system prompt:**
```
You are Atlas, the AI concierge for {{property_name}}.
Knowledge sources: hotel info, current menu, room service hours, attractions...
Guest context: {{guest_name}}, room {{room_no}}, checking out {{departure}}.

Rules:
- Reply in Bengali if guest writes Bengali, English otherwise
- Never invent hotel facts not in your knowledge base
- For complex requests, escalate to "I'll connect you with our concierge"
- Confirm orders with summary + total
- For room service orders, post to folio via tool call
- Detect emotional distress → escalate immediately
```

### ১১৭.২ RAG Architecture
- **Document chunking** (per property): Policies, menus, attractions, FAQs
- **Embedding model:** OpenAI text-embedding-3-large or Cohere Embed
- **Vector DB:** pgvector in PostgreSQL (no separate service)
- **Retrieval:** Top-K + reranking
- **Per-property scoping:** filter by property_id
- **Update mechanism:** Auto re-embed on document change

### ১১৭.৩ Voice Agent (Phone Booking) **[V2]**
- Twilio + WebRTC + Anthropic Claude voice model
- Intent: Booking inquiry, check availability, capture details
- Hand-off to human on complex requests
- Multi-language (Bengali + English)
- Call recording with consent
- Transcript saved to CRM

### ১১৭.৪ Image Recognition for Operations
- Room damage assessment (auto-detect broken items)
- Mini-bar consumption check (photo → AI count items)
- Buffet replenishment alert (low food visual)
- Cleanliness score (HK inspection AI assist)

### ১১৭.৫ Predictive Maintenance from Sensors
- AC vibration data → predict failure 7-day window
- Compressor temperature → maintenance trigger
- Water usage spike → leak detection

### ১১৭.৬ AI Cost Tracking & Guardrails
- Per-tenant LLM cost budget
- Auto-fallback to cheaper model when budget threshold hit
- Token usage per feature
- ROI calculation per AI feature

---

## ১১৮. Audit & Internal Control **[V1.5]**

### ১১৮.১ Internal Audit Module
- Audit plan annual
- Audit checklist per area (FO, F&B, HK, Accounts)
- Audit finding log
- CAPA (Corrective Action / Preventive Action) workflow
- Follow-up tracking

### ১১৮.২ Statutory Audit Support
- Year-end audit prep package
- Auditor read-only access
- Sample selection tool
- Audit query tracking

### ১১৮.৩ Internal Control Documentation
- Process flow charts
- Authority matrix (DOA — Delegation of Authority)
- Segregation of duties enforcement (system prevents conflicting role assignment)
- Risk register per process

---

## ১১৯. Optional / Future Modules (Roadmap Beyond V2)

### ১১৯.১ Web3 / Crypto (Optional Market-driven)
- Crypto payment (via Stripe Crypto or BitPay)
- NFT loyalty membership (luxury segment)
- Blockchain audit trail (immutable)

### ১১৯.২ Vertical Editions (white-labeled product lines)
- **Hostel Edition**: bed-level inventory, dorm-share, traveler community features
- **Resort Edition**: multi-outlet, activity scheduling, all-inclusive package focus
- **Boutique / Heritage Edition**: storytelling, curated experiences
- **Serviced Apartment Edition**: long-stay, monthly contracts, utility recovery
- **Vacation Rental Edition**: owner-managed, Airbnb-style
- **Restaurant-only Edition** (POS standalone)
- **Spa-only Edition**

### ১১৯.৩ Hospitality Marketplace
- Vendor marketplace (find linen supplier, kitchen equipment)
- Talent marketplace (find chef, sommelier)
- Consultant marketplace
- Photographer/Designer marketplace
- Revenue share with marketplace

### ১১৯.৪ Hotel Investment Analytics
- Acquisition opportunity scoring
- Underwriting tool
- Comparable market analysis
- Investment thesis builder
- Exit modeling

### ১১৯.৫ Autonomous Operations (Future AI)
- Self-pricing AI agent (with human oversight)
- AI revenue manager (replaces analyst)
- AI guest service agent (handles 80% queries)
- Predictive workforce scheduling (auto-roster based on forecast)
- Autonomous inventory ordering (auto-PO at reorder)

---

## ১২০. Truly Final Coverage Matrix

| Layer | Covered in Section | Status |
|---|---|---|
| Hotel core (PMS) | 22-30 | ✅ |
| Channel sync | 31, 46 | ✅ |
| Direct booking engine | 32 | ✅ |
| Guest CRM | 33 | ✅ |
| F&B / POS | 34, 79 | ✅ |
| HR (recruitment to exit) | 93 | ✅ |
| Payroll (statutory + service charge) | 94 | ✅ |
| Accounting / ERP | 92 | ✅ |
| Procurement / Stock | 96 | ✅ |
| Transportation / Fleet | 95 | ✅ |
| Maintenance / Engineering | 36 | ✅ |
| Marketing automation | 37 | ✅ |
| Reports / BI | 38 | ✅ |
| Mobile apps | 41 | ✅ |
| Public API | 44 | ✅ |
| AI/ML | 45, 117 | ✅ |
| Multi-outlet (Spa/Gym/Gift/Ticket/Mini-bar/Transport/Parking) | 78-86 | ✅ |
| Banquet / Event | 80 | ✅ |
| Commission (5 types) | 87 | ✅ |
| Package management | 88 | ✅ |
| Business source | 89 | ✅ |
| Concierge / Bell desk | 102 | ✅ |
| VIP / complaint resolution | 102 | ✅ |
| Owner reporting / Investor | 103 | ✅ |
| SOP / Brand standards / Audit prep | 104 | ✅ |
| Health & Safety / HACCP / Allergen | 105 | ✅ |
| Bar regulatory / Cost control | 106 | ✅ |
| In-room tech (IPTV/PBX/Tablet) | 107 | ✅ |
| Country expansion (BD/IN/UAE/KSA/MV/LK/NP/ID/TH/MY) | 108 | ✅ |
| Bangladesh-specific deep compliance | 109 | ✅ |
| Group travel / Tour operator | 110 | ✅ |
| Sales pipeline (Corporate/MICE) | 111 | ✅ |
| Sustainability / ESG / GHG | 112 | ✅ |
| Knowledge mgmt / Daily briefing | 113 | ✅ |
| CSR / Donation / Apprenticeship | 114 | ✅ |
| Disaster recovery / Business continuity | 115 | ✅ |
| Overbooking / Walked guest | 116 | ✅ |
| Internal Audit | 118 | ✅ |
| Compliance (PCI/GDPR/DPDP) | 63-67 | ✅ |
| DevOps / SRE / Observability | 7, 59-62 | ✅ |
| Security hardening | 62, App E | ✅ |
| Testing / QA | 57 | ✅ |
| Roadmap / Sprint plan / Team | 68-72, App Z | ✅ |
| Pricing / GTM / CS | 73-77 | ✅ |
| Database schema | 10, App L-O | ✅ |
| API contract | 19, App M | ✅ |
| UI screens | 52 | ✅ |
| Localization (10+ countries) | 54, 108, App X | ✅ |
| Web3 / NFT (optional) | 119.1 | ⚪ Optional |
| Vertical editions (Hostel/Resort/etc.) | 119.2 | 📋 Future |
| Marketplace | 119.3 | 📋 Future |
| Autonomous AI ops | 119.5 | 📋 Future |

---

## ১২১. ✅ Final Declaration

এই blueprint follow করে develop করলে hotelier-এর জন্য নিম্নলিখিত **সব requirement এক platform-এ** পাওয়া যাবে:

### Operational
✅ Multi-property PMS with full Front Office, HK, Night Audit, Folio
✅ Channel Manager with 20+ OTA support
✅ Direct Booking Engine (web + mobile-first)
✅ F&B POS (Restaurant + Bar + Banquet + Room Service)
✅ Spa, Gym, Gift Shop, Mini-bar, Attraction Ticket
✅ Laundry (in-house + outsource + guest)
✅ Transportation / Fleet
✅ Concierge / Bell Desk / Luggage / VIP

### Financial
✅ Full ERP Accounting (Multi-entity, Multi-currency, Cost Centers, Budget)
✅ AP / AR with full vendor + customer management
✅ Banking + Reconciliation
✅ Fixed Asset Register with Depreciation
✅ Tax engine (BD Mushak, India GST, UAE VAT, etc.)
✅ Statutory return preparation (multiple countries)
✅ Owner / Investor reporting + Management fee + Distribution waterfall
✅ Sustainability / ESG / GHG accounting

### People
✅ Recruitment (ATS) → Onboarding → Employee → Performance → Exit
✅ Full Payroll (statutory + service charge + FnF)
✅ Leave + Attendance (biometric + mobile + manual)
✅ Training + LMS Lite
✅ Employee Self-Service Portal
✅ Loans + Reimbursements

### Quality & Compliance
✅ SOP Manager + Brand Standards Audit
✅ HACCP + Allergen + Halal/Kosher
✅ Fire Safety + First Aid + Pool Safety
✅ Health crisis / Pandemic mode
✅ Disaster Recovery / Business Continuity
✅ Internal Audit + CAPA
✅ Police reporting (BD SB, India Form-C, UAE, etc.)
✅ Data privacy (GDPR, DPDP, country-specific)

### Growth
✅ Marketing Automation (Email + SMS + WhatsApp + Push)
✅ Sales Pipeline (Corporate / MICE / RFP)
✅ Reputation Management with AI auto-reply
✅ Rate Shopper + Dynamic Pricing AI
✅ Loyalty Program
✅ Tour Operator + Group Travel
✅ Reseller / White-label

### Technology
✅ Mobile apps (Staff + Owner + Guest)
✅ Public API + Webhooks + Marketplace
✅ AI Chatbot (WhatsApp + Voice)
✅ IoT / Smart Room / Door Lock
✅ In-Room Tech (IPTV / Tablet / Signage)
✅ Offline Mode

### Global Ready
✅ Country playbooks (BD, IN, UAE, KSA, MV, LK, NP, ID, TH, MY)
✅ Multi-language (Bengali, English, Hindi, Arabic, etc.)
✅ Multi-currency + FX management
✅ RTL support (Arabic)
✅ Multi-timezone

---

**শেষ মতামত:**

এই blueprint দিয়ে যা develop হবে তা শুধু "একটি channel manager" নয় — এটা **South Asia + MENA + SE Asia-র hospitality industry-এর জন্য complete digital operating system**। 

Hotelier-এর জন্য:
- **আগে ছিল:** 10+ আলাদা software, BDT 60K+/month subscription, integration headache, data silos
- **এখন থাকবে:** ১টা platform, BDT 30-50K/month, native integration, single source of truth

এটাই আপনার platform-এর **defensive moat** — competitors-কে এই scope-এ catch করতে গেলে minimum 3-4 years + 50+ engineers লাগবে।

**Blueprint coverage: 100%** — এর পর যা যোগ হবে তা হবে specific implementation tweak, particular market quirk, বা new technology emergence (যেমন AGI কেবল 2-3 বছর পরে আসলে)। Core scope-এ আর কিছু missing নেই।

---

# 🎨 PART XV — Complete Design System & UI Specifications

PART VI ছিল overview। এই PART-এ designer (Figma) এবং developer (code) directly implement করতে পারবে এমন pixel-level, component-level, screen-level specification।

---

## ১২২. Brand Identity

### ১২২.১ Product Name & Logo
- **Working name:** Atlas (final name TBD post-trademark search)
- **Logo concept:** Compass + property silhouette (representing navigation + hospitality)
- **Logo variants:** Full logo (icon + wordmark), Icon only, Wordmark only
- **Logo sizes:** 16px (favicon), 24px (nav), 32px, 48px, 64px, 128px (print)
- **Clear space:** Minimum padding = height of letter "A" in wordmark
- **Logo on dark:** White version
- **Logo on light:** Primary blue version
- **Logo on photo:** White with subtle drop shadow
- **Never:** Stretch, rotate, recolor outside palette, add effects

### ১২২.২ Brand Voice
- **Tone:** Professional yet warm; confident not cocky; locally rooted, globally credible
- **Bengali voice:** Respectful "আপনি", avoid heavy Sanskritized words, use everyday formal Bengali
- **English voice:** Active voice, short sentences, no jargon dump
- **Forbidden words:** "Synergy", "Revolutionary", "Unprecedented", "Best-in-class" (clichés)

### ১২২.৩ Brand Personality (for AI tone tuning)
- Helpful (not pushy)
- Precise (not vague)
- Confident (not arrogant)
- Local (not generic)
- Modern (not trendy)

---

## ১২৩. Design Tokens (Complete)

### ১২৩.১ Color Palette

#### Primary
```
primary-50:  #EFF6FF    /* lightest tint - backgrounds */
primary-100: #DBEAFE
primary-200: #BFDBFE
primary-300: #93C5FD
primary-400: #60A5FA
primary-500: #3B82F6    /* default - buttons, links */
primary-600: #2563EB    /* hover */
primary-700: #1D4ED8    /* pressed */
primary-800: #1E40AF
primary-900: #1E3A8A    /* darkest - text on primary bg */
primary-950: #172554
```

#### Neutral (Slate Gray)
```
neutral-0:   #FFFFFF
neutral-50:  #F8FAFC    /* page bg */
neutral-100: #F1F5F9    /* card bg */
neutral-200: #E2E8F0    /* borders */
neutral-300: #CBD5E1    /* disabled */
neutral-400: #94A3B8    /* placeholder */
neutral-500: #64748B    /* secondary text */
neutral-600: #475569    /* body text */
neutral-700: #334155    /* heading */
neutral-800: #1E293B
neutral-900: #0F172A    /* darkest */
```

#### Semantic
```
success-50:  #F0FDF4
success-500: #22C55E
success-600: #16A34A
success-700: #15803D

warning-50:  #FFFBEB
warning-500: #F59E0B
warning-600: #D97706
warning-700: #B45309

danger-50:   #FEF2F2
danger-500:  #EF4444
danger-600:  #DC2626
danger-700:  #B91C1C

info-50:     #ECFEFF
info-500:    #06B6D4
info-600:    #0891B2
```

#### Hospitality Operations Colors (Status semantic)
```
status-vacant-clean:     #22C55E  (green)
status-vacant-dirty:     #F59E0B  (amber)
status-occupied:         #3B82F6  (blue)
status-occupied-dirty:   #F97316  (orange)
status-out-of-order:     #EF4444  (red)
status-out-of-service:   #6B7280  (gray)
status-inspected:        #10B981  (teal)
status-reserved:         #8B5CF6  (purple)

reservation-confirmed:   #3B82F6
reservation-in-house:    #10B981
reservation-checked-out: #6B7280
reservation-cancelled:   #EF4444
reservation-no-show:     #DC2626
reservation-tentative:   #F59E0B

calendar-available:      #DCFCE7  (light green tint)
calendar-low-inventory:  #FEF3C7  (light amber)
calendar-sold-out:       #FEE2E2  (light red)
calendar-stop-sell:      #E5E7EB  (gray)
calendar-blocked:        repeating diagonal pattern
```

#### Dark Mode (auto-invert via CSS variables)
- All tokens have `.dark` variant
- Primary remains identifiable
- Backgrounds: `neutral-900` → page, `neutral-800` → card
- Text: `neutral-100` → body, `neutral-50` → heading

### ১২৩.২ Typography

#### Font Stack
```css
--font-sans: 'Inter', -apple-system, 'Segoe UI', system-ui, sans-serif;
--font-bn:   'Hind Siliguri', 'SolaimanLipi', 'Noto Sans Bengali', sans-serif;
--font-hi:   'Noto Sans Devanagari', sans-serif;
--font-ar:   'Cairo', 'Tajawal', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
--font-display: 'Inter', sans-serif;  /* for large headings */
```

#### Type Scale (rem-based, 1rem = 16px)
```
display-2xl:  4.5rem   (72px)   line: 1.0    weight: 700   tracking: -0.02em   — hero
display-xl:   3.75rem  (60px)   line: 1.0    weight: 700   tracking: -0.02em
display-lg:   3rem     (48px)   line: 1.1    weight: 700   tracking: -0.02em
display-md:   2.25rem  (36px)   line: 1.2    weight: 600   tracking: -0.01em
display-sm:   1.875rem (30px)   line: 1.25   weight: 600   tracking: -0.01em
display-xs:   1.5rem   (24px)   line: 1.3    weight: 600

text-xl:      1.25rem  (20px)   line: 1.5    weight: 400/500/600
text-lg:      1.125rem (18px)   line: 1.5    weight: 400/500/600
text-md:      1rem     (16px)   line: 1.5    weight: 400/500/600   — base body
text-sm:      0.875rem (14px)   line: 1.45   weight: 400/500/600
text-xs:      0.75rem  (12px)   line: 1.4    weight: 400/500/600   — labels, meta
text-2xs:     0.625rem (10px)   line: 1.4    weight: 500            — micro labels
```

#### Use Mapping
| Use | Token |
|---|---|
| Page title | display-md / display-lg |
| Section title | display-xs / display-sm |
| Card title | text-lg semibold |
| Body | text-md |
| Form label | text-sm semibold |
| Helper text | text-sm neutral-500 |
| Caption / meta | text-xs neutral-500 |
| Button | text-md semibold (text-sm on small) |
| Data table cell | text-sm |
| Numeric KPI | display-md tabular-nums |

#### Bengali / Devanagari Adjustment
- Use `font-feature-settings: 'liga'` for proper ligature
- Bengali line-height +0.05 (taller glyphs)
- Hindi: digit display option (Western vs Devanagari per locale pref)

### ১২৩.৩ Spacing Scale
```
space-0:   0
space-px:  1px
space-0.5: 0.125rem  (2px)
space-1:   0.25rem   (4px)
space-2:   0.5rem    (8px)
space-3:   0.75rem   (12px)
space-4:   1rem      (16px)   — base
space-5:   1.25rem   (20px)
space-6:   1.5rem    (24px)
space-8:   2rem      (32px)
space-10:  2.5rem    (40px)
space-12:  3rem      (48px)
space-16:  4rem      (64px)
space-20:  5rem      (80px)
space-24:  6rem      (96px)
space-32:  8rem      (128px)
```

#### Layout Conventions
- Page horizontal padding: `space-6` mobile, `space-8` tablet, `space-12` desktop
- Card padding: `space-6`
- Form field gap: `space-4` between fields
- Section gap: `space-12` between major sections
- Inline element gap: `space-2` to `space-3`

### ১২৩.৪ Border Radius
```
radius-none: 0
radius-sm:   0.25rem (4px)   — chips, small badges
radius-md:   0.5rem  (8px)   — buttons, inputs
radius-lg:   0.75rem (12px)  — cards
radius-xl:   1rem    (16px)  — modal, large card
radius-2xl:  1.5rem  (24px)  — feature card on marketing
radius-full: 9999px         — avatar, pill
```

### ১২৩.৫ Shadows / Elevation
```
shadow-xs:  0 1px 2px rgba(0,0,0,0.05)
shadow-sm:  0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
shadow-lg:  0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)
shadow-xl:  0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.04)
shadow-2xl: 0 25px 50px rgba(0,0,0,0.25)

shadow-focus: 0 0 0 3px rgba(59,130,246,0.5)  — focus ring
shadow-danger: 0 0 0 3px rgba(239,68,68,0.5)  — error focus
```

#### Elevation Mapping
- 0: page background (flat)
- 1 (shadow-xs): inline subtle separation
- 2 (shadow-sm): cards on page
- 3 (shadow-md): dropdowns, popovers
- 4 (shadow-lg): modals, drawers
- 5 (shadow-xl): floating action button, tooltips
- 6 (shadow-2xl): dialogs on top of overlays

### ১২৩.৬ Z-Index Scale
```
z-base:     0
z-dropdown: 1000
z-sticky:   1100
z-fixed:    1200
z-overlay:  1300
z-modal:    1400
z-popover:  1500
z-tooltip:  1600
z-toast:    1700
z-max:      9999
```

### ১২৩.৭ Animation / Motion

#### Duration
```
duration-instant: 0ms
duration-fast:    150ms   — micro: button hover, ripple
duration-base:    250ms   — default: panel slide, drawer
duration-slow:    400ms   — entrance: modal, sheet
duration-slower:  600ms   — celebratory: success animation
```

#### Easing
```
ease-linear:    cubic-bezier(0, 0, 1, 1)
ease-in:        cubic-bezier(0.4, 0, 1, 1)
ease-out:       cubic-bezier(0, 0, 0.2, 1)        — most UI exits
ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1)      — default
ease-emphasized: cubic-bezier(0.2, 0, 0, 1)       — Material 3 style
ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1) — playful bounce
```

#### Standard Motions
- Modal enter: 250ms ease-out, fade + scale 0.95→1
- Drawer enter: 250ms ease-out, slide from edge
- Toast enter: 250ms ease-out, slide + fade
- Toast exit: 150ms ease-in
- Button press: 100ms ease-out scale 0.97
- Skeleton shimmer: 1.5s linear infinite
- Page transition: 250ms ease-in-out fade

#### Reduced Motion
- Respect `prefers-reduced-motion: reduce`
- Replace transforms with opacity-only fades
- Disable bouncy easings

### ১২৩.৮ Breakpoints
```
xs:    < 640px    — mobile
sm:    640-767    — large mobile
md:    768-1023   — tablet
lg:    1024-1279  — laptop
xl:    1280-1535  — desktop
2xl:   ≥ 1536     — large desktop
```

#### Layout per Breakpoint
- Mobile: single column, bottom nav, drawer for secondary
- Tablet: 2-column for forms, sidebar collapsible
- Desktop: sidebar fixed, multi-pane layouts, calendar grid full

### ১২৩.৯ Iconography
- **Library:** Lucide Icons (consistent stroke, MIT, 1000+ icons)
- **Sizes:** 16, 20, 24, 32, 40, 48 px
- **Stroke width:** 1.5px (1.25 on 16px)
- **Color:** inherit currentColor
- **Custom hospitality icons:** Room types (single/double/suite), Bell, KeyCard, Concierge, Spa (lotus), Pool, Gym, Bed (dirty/clean) — custom set 50+ icons

### ১২৩.১০ Imagery Guidelines
- **Hero photos:** 16:9, min 1920×1080, < 200KB compressed
- **Room photos:** 4:3, min 1200×900
- **Avatar:** 1:1 square, multiple sizes
- **Empty state illustrations:** Custom illustrated set, single style, simple shapes
- **Photo treatment:** Slight overlay (10% black) for text legibility

---

## ১২৪. Component Library Specifications

প্রতিটা component-এর জন্য: anatomy, variants, sizes, states, props, accessibility, do/don't।

### ১২৪.১ Button

**Anatomy:** `[icon-left] · Label · [icon-right]`

**Variants:**
- `primary` — filled primary
- `secondary` — outlined
- `tertiary` — ghost (no border)
- `danger` — filled danger
- `success` — filled success
- `link` — text-only with underline on hover

**Sizes:**
| Size | Height | Padding-X | Text | Icon |
|---|---|---|---|---|
| xs | 28px | 12px | text-xs | 14px |
| sm | 32px | 12px | text-sm | 16px |
| md | 40px | 16px | text-md | 18px |
| lg | 48px | 20px | text-md | 20px |
| xl | 56px | 24px | text-lg | 24px |

**States:**
- default
- hover (background shift -100 on light, +100 on dark)
- active (background shift -200, scale 0.97 100ms)
- focus (focus ring)
- disabled (opacity 0.5, cursor not-allowed)
- loading (replace icon with spinner, disable click, preserve width)

**Props (TypeScript):**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  as?: 'button' | 'a';
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  children: ReactNode;
}
```

**Accessibility:**
- Real `<button>` element (or `<a>` for navigation)
- `aria-label` if icon-only
- `aria-busy="true"` when loading
- `aria-disabled` (NOT just `disabled`) for form submit during async
- Min touch target: 44×44 (use padding to expand)

**Do/Don't:**
- ✅ Use primary once per view (the main action)
- ❌ Multiple primaries causing decision paralysis
- ✅ Use icon to clarify destructive action
- ❌ Generic labels like "Submit" — prefer "Save Reservation"

### ১২৪.২ Input (Text Field)

**Anatomy:** `[Label] · [Input field [prefix · text · suffix]] · [Helper / Error]`

**Variants:**
- text, email, password, number, tel, url, search
- with prefix (e.g., currency symbol)
- with suffix (e.g., unit)
- with clear button
- with character counter

**Sizes:** sm (32px), md (40px — default), lg (48px)

**States:**
- empty / filled
- focus (focus ring + border primary)
- error (border + helper text danger)
- success (border + check icon)
- disabled (bg neutral-100)
- readonly (bg neutral-50)

**Props:**
```typescript
interface InputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  size?: 'sm' | 'md' | 'lg';
  clearable?: boolean;
  showPasswordToggle?: boolean;
  maxLength?: number;
  showCounter?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  ...HTMLInputAttributes;
}
```

**Accessibility:**
- Real `<label htmlFor>` (not placeholder as label)
- `aria-invalid` on error
- `aria-describedby` linking to helper/error
- `aria-required`
- Password reveal button has `aria-pressed`

### ১২৪.৩ Select / Combobox

- Native `<select>` for simple lists (mobile-friendly)
- Custom Combobox (Radix/shadcn) for search/multi-select/async
- Keyboard nav: arrow, enter, escape, type-ahead
- Group support (e.g., room types grouped by category)
- Async loading with skeleton

### ১২৪.৪ Date Picker

- Single date / date range / multi-month view
- Locale-aware (Bengali date display option)
- Disable past dates / blackout dates
- Quick presets (Today, Tomorrow, This Week, Next 7 Days)
- Min/max constraints
- Calendar grid keyboard navigable (PageUp/Down = month, Shift+PageUp/Down = year)
- Mobile: native picker fallback

### ১২৪.৫ Data Table

**Anatomy:**
```
[Toolbar: search · filters · column toggle · export · bulk action]
[Header: sortable columns · select-all checkbox]
[Rows: select checkbox · cells · row action menu]
[Footer: pagination · row count · page size selector]
```

**Features:**
- Server-side pagination
- Column visibility toggle (persisted per user)
- Column resize
- Column reorder (drag)
- Sortable (single + multi-column with shift)
- Filterable (per column type)
- Row selection (single + multi + select-all-pages)
- Bulk actions on selection
- Row hover actions
- Sticky header on scroll
- Sticky first column
- Row expand for nested details
- Empty state
- Loading state (skeleton rows)
- Error state with retry
- Export (CSV, Excel, PDF)
- Virtualization for 10k+ rows

**Density:**
- Compact (40px row)
- Default (48px)
- Comfortable (56px)

### ১২৪.৬ Modal / Dialog

**Sizes:** sm (400px), md (560px — default), lg (720px), xl (920px), full (page)

**Anatomy:**
```
[Backdrop · click closes (configurable)]
[Modal container]
  [Header: title · close button (X)]
  [Body: content]
  [Footer: secondary action · primary action]
```

**Variants:**
- Standard modal
- Confirmation (destructive — red primary)
- Form modal (with form inside, footer submit)
- Side sheet (slide from right, full-height)
- Bottom sheet (slide from bottom, mobile)

**Behavior:**
- Trap focus inside
- ESC closes
- Click backdrop closes (configurable)
- Scroll inside modal if content overflow
- Stack: max 2 nested modals

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` for title
- Focus first focusable on open
- Return focus to trigger on close

### ১২৪.৭ Toast / Snackbar

**Types:** success, error, warning, info, loading

**Position:** Top-right (desktop), bottom (mobile)

**Anatomy:** `[Icon] · Message · [Action button] · [Close]`

**Duration:**
- Success: 4s
- Info: 5s
- Warning: 6s
- Error: persistent (manual dismiss) OR 10s
- Loading: persistent until updated

**Features:**
- Stack up to 3 visible, queue rest
- Pause on hover
- Action button (e.g., "Undo")
- Auto-dismiss with progress bar visual

### ১২৪.৮ Form Layout

**Patterns:**
- Single column (default): label above field, fields stacked
- Two column (desktop): related fields side-by-side
- Grouped sections with divider + section title
- Inline form for quick edits
- Wizard / Stepper for multi-step

**Conventions:**
- Required marker: red asterisk (*) after label
- Helper text below field
- Error text replaces helper text in danger color
- Cancel left, Primary right (LTR) — reversed in RTL
- Sticky bottom action bar for long forms

### ১২৪.৯ Navigation

#### Top Bar
```
[Logo · Property Switcher] [Center: ____] [Search · Notifications · Help · User Menu]
Height: 64px
Background: white (light) / neutral-900 (dark)
Border-bottom: 1px neutral-200
Sticky: yes
```

#### Sidebar
```
Width: 240px (expanded), 64px (collapsed)
Sections:
  - Dashboard
  - Reservations
  - Calendar
  - Front Desk
    - Arrivals
    - Departures
    - In-house
    - Walk-in
    - Cashier
  - Housekeeping
  - Reports
  - Setup (collapsible: Properties, Rooms, Rates, Channels, Tax)
  - Marketing
  - Accounts (V1+)
  - HR (V1+)
Item: 40px tall, icon 20px, label text-sm
Active: primary-50 bg + primary-700 text + 3px primary-500 left border
Hover: neutral-100 bg
```

#### Bottom Nav (Mobile)
- 5 items max: Dashboard, Calendar, Add (FAB), Notifications, Profile
- 64px height
- Icon 24px + label text-2xs

#### Breadcrumb
```
Home / Properties / Sea View / Reservations / RSV-2026-00123
text-sm neutral-500, separator text-neutral-400
Last item neutral-900 (current)
```

### ১২৪.১০ Card

**Anatomy:**
```
[Card]
  [Optional Header: title · subtitle · action]
  [Body: content with padding space-6]
  [Optional Footer: action buttons]
```

**Variants:**
- Plain (bg white, shadow-sm)
- Outlined (border, no shadow)
- Filled (subtle bg neutral-50)
- Interactive (hover lifts, cursor pointer)

### ১২৪.১১ Badge & Chip

**Badge (status indicator):**
- Dot only (8px circle in semantic color)
- Dot + label (e.g., "● In-house")
- Solid pill (filled bg, white text)
- Outlined pill

**Chip (removable tag):**
- Label + X button
- Used for filters, selected tags

**Sizes:** xs (20px), sm (24px), md (28px)

### ১২৪.১২ Avatar

**Sizes:** xs (24), sm (32), md (40), lg (48), xl (56), 2xl (64)

**Variants:**
- Image
- Initials (auto-generated from name, background color hashed from name)
- Icon (generic person)

**Status dot:** Bottom-right, 25% size, optional

**Group:** Stack with -8px overlap, +N overflow indicator

### ১২৪.১৩ Tabs

**Variants:**
- Underline (default — line under active)
- Pills (filled background on active)
- Boxed (segmented control)
- Vertical (sidebar style)

**Features:**
- Keyboard navigable (arrow left/right)
- Scrollable on overflow
- Badge on tab (count)
- Icon support

### ১২৪.১৪ Accordion / Disclosure

- Chevron rotates on expand
- Smooth height animation
- Multiple open (default) or single (radio mode)
- Used for: FAQ, settings sections, filter groups

### ১২৪.১৫ Tooltip & Popover

**Tooltip:** Short label on hover/focus, max 200ch, 12px text, 6px padding, follows trigger 8px offset

**Popover:** Rich content, can be interactive, with close button, max 320px width

### ১২৪.১৬ Skeleton Loader

- Match shape of expected content
- Subtle shimmer animation
- Not for actions < 200ms (use nothing)
- Not for actions > 5s (use progress bar)

### ১২৪.১৭ Empty State

**Pattern:**
```
[Icon or Illustration · 120px]
[Heading: "No reservations yet" · display-xs]
[Description: short helpful text · text-md neutral-500]
[CTA: primary button "Create your first reservation"]
[Optional: link to help article]
```

### ১২৪.১৮ Pricing / Money Display

- Always with currency symbol (locale-positioned)
- Tabular nums for alignment
- Bold for the amount, regular for label
- Sub-amount (cents) in smaller size if shown
- Negative: red color + minus sign

### ১২৪.১৯ Stat / KPI Card

```
[Label: "Today's Revenue" · text-sm neutral-500 uppercase tracking-wider]
[Value: "৳45,230" · display-md tabular-nums]
[Delta: "↑ 12% vs yesterday" · text-sm success-600]
[Sparkline (optional): mini chart inline]
```

### ১২৪.২০ Search

- Global search: top bar, opens spotlight modal (Cmd+K)
- Inline list search: input with magnifying glass icon
- Search-as-you-type with debounce 300ms
- Recent + suggested + results sections in spotlight

### ১২৪.২১ Filter Bar

- Pill chips for active filters
- "Add filter" dropdown
- Clear all
- Saved view dropdown

### ১২৪.২২ File Upload

- Dropzone (large area with dashed border)
- Click to open file picker OR drag-drop
- Preview thumbnails
- Progress bar per file
- Max size + types displayed
- Remove individual

### ১২৪.২৩ Stepper / Wizard

**Horizontal (desktop):**
```
[(1) Property Info] ──── [(2) Rooms] ──── [(3) Rates] ──── [(4) Channels] ──── [(5) Done]
  ✓ completed              ● current        ○ upcoming
```

**Vertical (mobile):** Same but stacked

### ১২৪.২৪ Notification Bell + Drawer

- Bell icon with unread badge (red dot)
- Click opens drawer/dropdown
- Tabs: All, Mentions, Tasks
- Each item: avatar/icon · message · time · action
- Mark all read
- Settings link

### ১২৪.২৫ Calendar Cell (Central Calendar Specific)

**Inventory row cell:**
```
[Top: Available count · large number · color by status]
[Bottom: total / sold breakdown · small]
Color background: based on availability ratio
On click: opens cell editor popover
Drag-select: highlight range, modal for bulk action
```

**Rate row cell:**
```
[Amount · medium text]
[Optional: derived indicator]
Editable in place
```

**Restriction row cell:**
```
[Icons: M (MinLOS) · A (CTA) · D (CTD) · S (Stop sell)]
Toggle on click
```

---

## ১২৫. Screen-by-Screen Wireframes (Key Screens Detailed)

প্রতিটা key screen-এর layout, components, interactions।

### ১২৫.১ Login Screen `/login`

```
┌────────────────────────────────────────────────────┐
│                                                    │
│            [Atlas Logo · 48px]                     │
│                                                    │
│         Sign in to your hotel                      │
│         display-sm · neutral-900                   │
│                                                    │
│  ┌────────────────────────────────────────────┐    │
│  │ Email                                      │    │
│  │ [_______________________________________]  │    │
│  │                                            │    │
│  │ Password                       [Forgot?]   │    │
│  │ [_______________________________________]  │    │
│  │                                            │    │
│  │ ☐ Remember me for 30 days                  │    │
│  │                                            │    │
│  │ [    Sign in    ] (primary button, full)   │    │
│  │                                            │    │
│  │ ─── or continue with ───                   │    │
│  │                                            │    │
│  │ [ 🔵 Continue with SSO ]                   │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│         New here? Create an account →              │
│                                                    │
│         [Bengali] [English] [Hindi]                │
└────────────────────────────────────────────────────┘

Background: subtle hotel photo with overlay
Max width form: 400px
Centered vertically
```

**Interactions:**
- Email field auto-focus on load
- Tab order: email → password → forgot link → remember me → sign in
- Show "Verify CAPTCHA" after 3 failures
- Loading state: button shows spinner + disable
- Error: shake animation + toast with specific error

### ১২৫.২ Dashboard `/dashboard`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Atlas] [Property: Sea View ▾] [Search · ⌘K]    [🔔 3] [?] [👤 User Menu]│  64px topbar
├────────────────┬─────────────────────────────────────────────────────────┤
│ □ Dashboard ●  │  Good morning, Rahim  ·  Tuesday, 4 June 2026          │
│ □ Calendar     │  display-md                                             │
│ □ Reservations │                                                         │
│ □ Front Desk ▾ │  ┌─KPI─┐ ┌─KPI─┐ ┌─KPI─┐ ┌─KPI─┐                       │
│ □ Housekeeping │  │OCC  │ │ADR  │ │RevPAR│ │Today│                      │
│ □ Reports      │  │ 78% │ │৳3k  │ │৳2.4k│ │ 24   │                       │
│ □ Setup        │  │↑5%  │ │↑2%  │ │↑8%  │ │bookings                     │
│ □ Marketing    │  └─────┘ └─────┘ └─────┘ └─────┘                       │
│                │                                                         │
│  ── Sec ──     │  ┌─ Today at a Glance ───────────────────────────────┐ │
│ □ Accounts     │  │ Arrivals    ┃ Departures   ┃ In-house  ┃ HK pend  │ │
│ □ HR           │  │   12        ┃    8         ┃   46      ┃   5      │ │
│                │  │ View all →  ┃ View all →   ┃ View all →┃ Assign → │ │
│ [Collapse ◀]   │  └────────────────────────────────────────────────────┘ │
│ 240px sidebar  │                                                         │
│                │  ┌─ Reservations Trend (last 30d) ───────────────────┐ │
│                │  │ [Line chart]                                      │ │
│                │  │                                                   │ │
│                │  └───────────────────────────────────────────────────┘ │
│                │                                                         │
│                │  ┌─ Recent Activity ─────┐  ┌─ Pending Tasks ────────┐ │
│                │  │ • Booking RSV-001234 │  │ ☐ Approve refund req   │ │
│                │  │ • Check-in: Karim... │  │ ☐ Review tonight rates │ │
│                │  │ • Folio settled...   │  │ ☐ Sign vendor invoice  │ │
│                │  └──────────────────────┘  └────────────────────────┘ │
└────────────────┴─────────────────────────────────────────────────────────┘
```

**Responsive:**
- Mobile: hide sidebar, hamburger menu, stack KPIs 2×2, charts full-width
- Tablet: sidebar collapses to icon-only

### ১২৫.৩ Central Calendar `/calendar`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Topbar (sticky)                                                          │
├─────┬────────────────────────────────────────────────────────────────────┤
│Side │ ┌─ Toolbar (sticky) ───────────────────────────────────────────┐  │
│bar  │ │ [< Jun 2026 >]  [Today]  Days: [30 ▾]  Rooms: [All ▾]       │  │
│     │ │ [Bulk edit]  [Stop-sell]  [Import]  [Export]                 │  │
│     │ └──────────────────────────────────────────────────────────────┘  │
│     │                                                                   │
│     │ ┌─ Grid (horizontal scroll) ────────────────────────────────────┐│
│     │ │       │ 1  2  3  4  5  6  7  8  9  10 11 12 13 ... (dates)   ││
│     │ │       │ Su Mo Tu We Th Fr Sa Su Mo Tu We Th Fr ...           ││
│     │ │ ──────┼───────────────────────────────────────────────────── ││
│     │ │ DELUXE│                                                       ││
│     │ │ Avail │ 12 12 10  8  6  4  3  5  8 10 12 12 11 ...           ││
│     │ │ Sold  │  3  3  5  7  9 11 12 10  7  5  3  3  4 ...           ││
│     │ │ ──────┼─────────────────────────────────────────────────────  ││
│     │ │ Rate Plans:                                                   ││
│     │ │ BAR   │ 2500 2500 2500 2800 3000 3500 3500 3000 ...          ││
│     │ │ BB-NR │ 2300 2300 2300 2600 2800 3300 3300 2800 ...          ││
│     │ │ ──────┼─────────────────────────────────────────────────────  ││
│     │ │ Restr │ -  -  -  M3 M3 CTA SS -  -  -  -  -  -  ...          ││
│     │ │                                                               ││
│     │ │ SUPERIOR                                                      ││
│     │ │ ... (same pattern)                                            ││
│     │ │                                                               ││
│     │ │ EXECUTIVE SUITE                                               ││
│     │ │ ...                                                           ││
│     │ └───────────────────────────────────────────────────────────────┘│
└─────┴────────────────────────────────────────────────────────────────────┘

Cell color logic:
  Green: avail/total > 50%
  Amber: 20-50%
  Red: < 20%
  Dark red: 0
  Gray diagonal: stop-sell

Interactions:
  Click cell → popover editor
  Drag-select range → bulk edit modal
  Right-click → context menu (Copy, Apply previous week, etc.)
  Cmd+Z → undo last action
  Pinch (touch) / Cmd+wheel → zoom level
```

### ১২৫.৪ Reservation List `/reservations`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Topbar                                                                   │
├──────┬───────────────────────────────────────────────────────────────────┤
│Sidebar│ Reservations                       [+ New Reservation]           │
│      │ display-sm                                                        │
│      │                                                                   │
│      │ ┌─ Filter Bar ─────────────────────────────────────────────────┐│
│      │ │ 🔍 [Search by name, phone, ref]   [Saved view: All ▾]       ││
│      │ │ Status: [Confirmed ✕] [In-house ✕] [+ Add filter]            ││
│      │ │ Date: [Arrival next 7d ✕]                                    ││
│      │ │                                              [Export ▾]      ││
│      │ └──────────────────────────────────────────────────────────────┘│
│      │                                                                   │
│      │ ┌─ Table ─────────────────────────────────────────────────────┐ │
│      │ │ ☐ │Ref       │Guest        │Arrival   │Nights│Status     │₹ │ │
│      │ │ ☐ │RSV-00123│Karim Ahmed  │Jun 15    │ 3    │● Confirmed│10K│ │
│      │ │ ☐ │RSV-00124│Sara Wilson  │Jun 16    │ 2    │● In-house │8K │ │
│      │ │ ☐ │RSV-00125│Mehul Sharma │Jun 17    │ 1    │● Confirmed│4K │ │
│      │ │ ... (rows with hover action buttons on right)                 │ │
│      │ │ Pagination: 1-50 of 234   [< Page 1 of 5 >]   Show: 50 ▾    │ │
│      │ └──────────────────────────────────────────────────────────────┘│
└──────┴───────────────────────────────────────────────────────────────────┘

Row hover: show inline actions [Check-in] [View] [⋯ more]
Bulk select: header changes to "[N] selected · [Bulk action ▾] [Cancel]"
Empty state: illustration + "No reservations yet" + CTA
```

### ১২৫.৫ Reservation Detail `/reservations/:id`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Topbar                                                                   │
├──────┬───────────────────────────────────────────────────────────────────┤
│Sidebar│ ← Back to Reservations                                            │
│      │                                                                   │
│      │ RSV-2026-00123 · ● In-house            [Check-out] [⋯ Actions]   │
│      │ display-sm                                                        │
│      │                                                                   │
│      │ ┌─ Tabs ──────────────────────────────────────────────────────┐ │
│      │ │ Overview · Folio · Payments · Guest · Communication · Audit │ │
│      │ └─────────────────────────────────────────────────────────────┘ │
│      │                                                                   │
│      │ ┌─ Overview Tab ──────────────────────────────────────────────┐ │
│      │ │ ┌─ Stay Info ────────────────┐ ┌─ Guest ─────────────────┐ │ │
│      │ │ │ Check-in: Jun 15, 2:30 PM  │ │ [Avatar] Karim Ahmed    │ │ │
│      │ │ │ Check-out: Jun 18, 12 PM   │ │ +880 1712 345678        │ │ │
│      │ │ │ Nights: 3                  │ │ karim@example.com       │ │ │
│      │ │ │ Adults: 2 · Children: 1    │ │ Nationality: BD         │ │ │
│      │ │ │ Room: 304 (Deluxe Sea View)│ │ View profile →          │ │ │
│      │ │ │ Source: Direct             │ └─────────────────────────┘ │ │
│      │ │ └────────────────────────────┘                              │ │
│      │ │                                                              │ │
│      │ │ ┌─ Folio Summary ─────────────────────────────────────────┐│ │
│      │ │ │ Subtotal           ৳7,500                                ││ │
│      │ │ │ Service Charge     ৳ 750                                 ││ │
│      │ │ │ VAT                ৳1,237                                ││ │
│      │ │ │ ─────────────────  ─────────                             ││ │
│      │ │ │ Total              ৳9,487                                ││ │
│      │ │ │ Paid               ৳9,487  ✓                             ││ │
│      │ │ │ Balance            ৳   0                                 ││ │
│      │ │ │                                                          ││ │
│      │ │ │ [View detailed folio →]                                  ││ │
│      │ │ └──────────────────────────────────────────────────────────┘│ │
│      │ │                                                              │ │
│      │ │ ┌─ Special Requests ─┐  ┌─ Internal Notes ────────────┐    │ │
│      │ │ │ Late arrival ~11pm │  │ Add note... [+ Add]          │    │ │
│      │ │ │ Veg breakfast      │  │ • 14 Jun · Booked airport TF │    │ │
│      │ │ └────────────────────┘  └──────────────────────────────┘    │ │
│      │ └──────────────────────────────────────────────────────────────┘│
└──────┴───────────────────────────────────────────────────────────────────┘
```

### ১২৫.৬ New Reservation Modal `/reservations/new`

Wizard-style 4 steps:

**Step 1: Dates & Room**
```
○ ● ○ ○   Dates & Room

Check-in:  [Jun 15, 2026 📅]    Check-out: [Jun 18, 2026 📅]
Adults: [2 ▾]   Children: [1 ▾]   Rooms: [1 ▾]

[Search availability →]

Available Options:
┌─ Deluxe Sea View · 12 available ─────────────────┐
│ Photos · Amenities (snippets)                    │
│ ○ BAR · ৳2,500/night · Free cancel until Jun 13 │
│ ○ BAR-NRF · ৳2,300/night · Non-refundable       │
│ [Select]                                         │
└──────────────────────────────────────────────────┘
```

**Step 2: Guest**
- Search existing OR create new
- Auto-suggest by phone/email
- Form fields (name, email, phone, nationality, ID)

**Step 3: Add-ons & Notes**
- Airport pickup checkbox
- Extra bed
- Special requests
- Promo code

**Step 4: Payment**
- Method selector (cards visual)
- Payment summary
- "Pay at hotel" checkbox

Footer: [← Back] [Next →] or [Confirm Booking]

### ১২৫.৭ Front Desk Arrivals `/front-desk/arrivals`

```
Today's Arrivals · 12 expected

Filter: [All] [VIP] [Foreign] [Group] [Late arrival]

┌───────────────────────────────────────────────────────────┐
│ 🟢 #RSV-00123 · Karim Ahmed · BD · 2 nights · Deluxe 304 │
│    ETA 2:30 PM · Late arrival noted · Veg pref            │
│    Status: ⚪ Awaiting     [Check in] [Details]            │
├───────────────────────────────────────────────────────────┤
│ ⭐ #RSV-00124 · Sara Wilson · US · 4 nights · Suite 502  │
│    VIP · Anniversary · Champagne arranged                  │
│    Status: ✅ Checked in     [View folio]                  │
├───────────────────────────────────────────────────────────┤
│ 🌍 #RSV-00125 · Yamada Hiroshi · JP · 1 night · Deluxe   │
│    Foreigner registration required                         │
│    Status: ⚪ Awaiting     [Check in] [Register form]      │
└───────────────────────────────────────────────────────────┘
```

### ১২৫.৮ Quick Check-in Modal

Full-page modal:
```
Step 1: Verify ID
  [Photo capture / Upload]
  [Auto-fill from passport OCR]
  Fields: Name (locked from reservation), ID type, ID number, Issued, Expires

Step 2: Confirm Stay
  Arrival/Departure (editable for early/late)
  Special requests confirmation
  Add-on offers (room upgrade, late checkout)

Step 3: Room Assignment
  Available rooms of type displayed
  Auto-suggest (highest floor, view, recent clean)
  Map view of floor (optional)
  Confirm room

Step 4: Payment / Folio Setup
  Verify pre-payment OR
  Capture payment now OR
  Mark "pay at checkout"

Step 5: Welcome
  Print registration card
  Issue key (door lock integration trigger)
  Send welcome WhatsApp
  Done ✓
```

### ১২৫.৯ Housekeeping Room Status `/housekeeping`

```
Floor 3 · 12 rooms

[Grid view] [List view]

┌──301──┐ ┌──302──┐ ┌──303──┐ ┌──304──┐
│  🟡   │ │  🟢   │ │  🔵   │ │  🟢   │
│ Dirty │ │ Clean │ │ Occup │ │ Insp  │
│Last:11│ │Last:9 │ │Karim  │ │Ready  │
│Assn:F │ │       │ │CO:Jun │ │       │
└───────┘ └───────┘ └───────┘ └───────┘

Status legend at top.
Click room → drawer with actions:
  Mark clean / inspected / OOO / OOS
  Assign to staff
  Add note
  View history
  Report issue → maintenance
```

### ১২৫.১০ Booking Engine (Public) Search Result

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] Sea View Hotel · Cox's Bazar    [Language ▾] [BDT ▾] │
├──────────────────────────────────────────────────────────────┤
│ ┌─ Booking Bar (sticky) ────────────────────────────────────┐│
│ │ [Jun 15 → Jun 18 · 3 nights]  [2 adults, 1 child]  [✏ Edit]│
│ └────────────────────────────────────────────────────────────┘│
│                                                              │
│ 3 room types available                  Sort: [Price ↑ ▾]   │
│                                                              │
│ ┌─ Room Card ───────────────────────────────────────────────┐│
│ │ [Photo carousel · 4:3]                                    ││
│ │ Deluxe Sea View                                           ││
│ │ ⭐ 4.6 (234 reviews)                                       ││
│ │ ✓ Sea view  ✓ King bed  ✓ Free WiFi  ✓ Breakfast included││
│ │                                                            ││
│ │ [Rate Plan tabs]                                          ││
│ │ ┌─ Best Available ─────────────────────────────┐         ││
│ │ │ Free cancel until Jun 13 · No prepay         │         ││
│ │ │ ৳2,500/night × 3 = ৳7,500 + tax              │         ││
│ │ │ Total: ৳9,487  [Select] →                    │         ││
│ │ └──────────────────────────────────────────────┘         ││
│ │ ┌─ Non-Refundable ─────────────────────────────┐         ││
│ │ │ Save 10% · Pay now                           │         ││
│ │ │ ৳2,300/night × 3 = ৳6,900 + tax              │         ││
│ │ │ Total: ৳8,723  [Select] →                    │         ││
│ │ └──────────────────────────────────────────────┘         ││
│ └────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘

Mobile: stack everything, sticky bottom price + Select CTA
```

### ১২৫.১১ Booking Engine Checkout

```
[Stepper: Room ✓ · Add-ons · Guest ✓ · Payment · Confirm]

┌─ Left: Form ─────────────────────────────────────┐
│ Payment Method                                   │
│ ○ Credit/Debit Card                              │
│ ○ bKash    ○ Nagad   ○ Rocket                   │
│ ○ Pay at hotel                                   │
│                                                  │
│ [Card form OR bKash flow OR confirmation]        │
│                                                  │
│ ☑ I agree to Terms & Cancellation Policy        │
└──────────────────────────────────────────────────┘

┌─ Right: Sticky Summary ──────────────────────────┐
│ Sea View Hotel                                   │
│ Deluxe Sea View                                  │
│ Jun 15 → Jun 18 · 3 nights · 2 adults + 1 child │
│ ─────                                            │
│ Room (3 × ৳2,500)        ৳7,500                 │
│ Airport pickup           ৳1,500                  │
│ Discount (SUMMER10)     -৳900                    │
│ Subtotal                ৳8,100                   │
│ Service Charge (10%)    ৳810                     │
│ VAT (15%)               ৳1,336.50                │
│ ─────                                            │
│ Total                   ৳10,246.50               │
│                                                  │
│ [Confirm & Pay] (primary, full width)           │
└──────────────────────────────────────────────────┘

Mobile: collapse summary to expandable accordion at top
```

### ১২৫.১২ Confirmation Page

```
┌──────────────────────────────────────────────────┐
│              ✓ (success animation)               │
│      Booking Confirmed!                          │
│      Confirmation #RSV-2026-00123                │
│                                                  │
│  We've sent confirmation to:                     │
│  📧 karim@example.com  📱 +880 1712 345678       │
│  💬 WhatsApp                                     │
│                                                  │
│  [Add to Calendar] [Manage Booking] [Share]      │
│                                                  │
│  ┌─ Stay summary card ──────────────────────────┐│
│  │ Sea View Hotel · Cox's Bazar                 ││
│  │ Jun 15 → Jun 18 · Deluxe Sea View            ││
│  │ Check-in from 2 PM · Check-out by 12 PM      ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  Need anything?                                  │
│  [Request Airport Pickup] [Special Request]      │
│  [Online Check-in (available 24h before)]        │
└──────────────────────────────────────────────────┘
```

---

## ১২৬. Mobile App Screens (RN)

### ১২৬.১ Staff App — Today Dashboard
```
┌─────────────────────┐
│ ☰ Today  · Jun 4   │ Header
│                     │
│ Sea View Hotel ▾    │ Property selector
│                     │
│ ┌─ KPI Cards ────┐ │
│ │ Occupancy 78%  │ │ Swipeable cards
│ │ Arrivals 12    │ │
│ └────────────────┘ │
│                     │
│ Quick Actions       │
│ [Check-in] [HK]    │ Button grid
│ [Walk-in] [Tasks]  │
│                     │
│ Today's Tasks (5)   │
│ ☐ Clean Room 304   │ List
│ ☐ Welcome VIP 502  │
│ ☐ Maintenance #45  │
│                     │
├─────────────────────┤
│ [🏠][📅][➕][🔔][👤]│ Bottom nav
└─────────────────────┘
```

### ১২৬.২ Staff App — Room Status Update

Full-screen swipeable cards per room:
- Big room number
- Current status with color
- Quick action buttons (large touch targets)
- Photo capture (for damage)
- "Mark Clean" → confirmation → next room

### ১২৬.৩ Guest PWA — Mobile Check-in

Single-page form:
- Auto-pulled booking info
- ID upload (camera)
- Selfie verification (optional)
- Signature pad
- Estimated arrival time
- Submit → confirmation + map

---

## ১২৭. Email Template Design Specs

### ১২৭.১ Email Master Template
- Width: 600px (mobile-responsive shrinks)
- Background: neutral-50 (outside container)
- Container: white, radius-lg, shadow-sm
- Padding: 40px on desktop, 24px on mobile
- Font: System fonts stack for max client compat
- Brand header: logo centered (or left for hotel-branded), 64px tall
- Footer: address, contact, social, unsubscribe (CAN-SPAM)
- Dark mode: respect prefers-color-scheme

### ১২৭.২ Components in Email
- **Hero image:** 600×300 max
- **Headline:** 28px display, primary-700
- **Body:** 16px neutral-700, line 1.6
- **Button (CTA):** padding 14×28, primary-500 bg, white text, radius-md
- **Info card:** bordered, padding 24, used for booking summary
- **Divider:** 1px neutral-200, margin 24 vertical

### ১২৭.৩ Booking Confirmation Email Layout
```
[Logo · centered · 48px]

[Hero image: hotel photo · 600×200]

Booking Confirmed
display-md · primary-700

Hi {{guest_name}}, we're excited to welcome you!

┌─ Booking Summary Card ──────────────┐
│ Confirmation #{{booking_ref}}        │
│                                      │
│ [Photo of room type · 200×120]      │
│ {{room_type_name}}                   │
│                                      │
│ {{arrival_date}} → {{departure_date}}│
│ {{nights}} nights · {{pax}} guests  │
│                                      │
│ Total: {{currency}}{{total}}         │
└──────────────────────────────────────┘

[Manage Booking →] (CTA button)

What to expect:
✓ Check-in from {{check_in_time}}
✓ Free WiFi throughout the stay
✓ Breakfast included

[Hotel address + map link]
[Contact: phone, email, WhatsApp]

────
Footer: address, unsubscribe, social
```

---

## ১২৮. Print Template Design Specs

### ১২৮.১ Tax Invoice (Mushak 6.3 — BD)

A4, portrait. NBR-compliant fields.
```
┌────────────────────────────────────────────────────┐
│ [Hotel logo]                  মূসক চালান (6.3)    │
│                               TAX INVOICE          │
│                                                    │
│ Hotel Name                    Invoice #: INV-0001  │
│ Full address                  Date: 4 Jun 2026     │
│ BIN: 123456789                Mushak No: M-0001    │
│ Phone | Email                                      │
│                                                    │
│ BUYER:                                             │
│ Name: Karim Ahmed                                  │
│ Address: ...                                       │
│ BIN/TIN (if any): ...                              │
│                                                    │
│ ┌───────────────────────────────────────────────┐  │
│ │ # │Description    │Qty│Unit ৳│Total ৳│VAT ৳│  │
│ │ 1 │Deluxe Room    │ 3 │ 2500 │ 7500  │1125 │  │
│ │ 2 │Service Charge │ - │   -  │  750  │ 112 │  │
│ │ 3 │Airport Transfer│ 1 │ 1500 │ 1500  │ 225 │  │
│ └───────────────────────────────────────────────┘  │
│                                                    │
│                       Sub-total: ৳ 9,750           │
│                       VAT (15%): ৳ 1,462           │
│                       ─────────                    │
│                       Total:     ৳11,212           │
│                                                    │
│ Amount in words: Eleven Thousand Two Hundred...    │
│                                                    │
│ Terms: ...                                         │
│                                                    │
│ ____________________      ____________________     │
│ Authorized Signature      Buyer Signature          │
└────────────────────────────────────────────────────┘
```

### ১২৮.২ Guest Registration Card
A5 or half-A4 portrait.
- Hotel header (logo + name + address)
- Guest details (auto-filled from reservation + ID)
- Stay details (arrival, departure, room, rate)
- Foreigner section (passport, visa, purpose) — if applicable
- Police reporting fields (if BD/IN)
- Terms (refundable, ID retention policy)
- Guest signature line
- Staff signature line
- Date + time stamps

### ১২৮.৩ Folio / Bill
- Stay summary
- Itemized postings (date, description, charge, tax)
- Payments received
- Balance due
- Tax breakdown
- Footer: signatures, thank-you note

---

## ১২৯. Interaction Patterns

### ১২৯.১ Form Submission
- Optimistic update for non-critical (save settings)
- Pessimistic for critical (booking, payment)
- Loading state: button disabled + spinner inline
- Success: toast + redirect / close modal
- Error: toast + form field highlights + scroll to first error

### ১২৯.২ Destructive Actions
- Confirm dialog with action name typed if irreversible
- Toast with "Undo" (10s window) for reversible
- Red destructive button color
- Icon prefix (trash, X)

### ১২৯.৩ Search
- Cmd+K opens global spotlight
- Debounce 300ms for type-ahead
- Recent searches shown first
- Keyboard-only navigation
- Highlight matched terms in results

### ১২৯.৪ Filter / Sort
- Filters as removable chips
- "Clear all" link when active
- Saved views (named filter sets)
- URL-shareable filter state

### ১২৯.৫ Bulk Actions
- Header transforms to "[N] selected" bar
- Bulk action dropdown
- Confirm modal if destructive
- Progress bar for long operations

### ১২৯.৬ Inline Editing
- Click cell → editor pops in place
- Tab moves to next cell
- Esc cancels
- Enter saves
- Async save with subtle indicator (saving... saved ✓)

### ১২৯.৭ Drag & Drop
- Reorder lists (chevron handle on left)
- File upload (dashed border dropzone)
- Calendar event move
- Visual placeholder during drag

### ১২৯.৮ Empty States
- Friendly illustration (not just text)
- One clear primary CTA
- Optional secondary link to docs
- Different copy for "no data yet" vs "no results for filter"

### ১২৯.৯ Loading States
- < 200ms: nothing
- 200ms - 2s: skeleton
- 2s - 10s: progress bar with stage label
- > 10s: background process + notification when done

### ১২৯.১০ Notifications
- Toast for transient (success/info)
- Bell drawer for persistent
- Modal for blocking critical (e.g., session expiring)
- Push for mobile (FCM/APNS)

---

## ১৩০. Accessibility Specifications (WCAG 2.1 AA)

### Visual
- Color contrast ≥ 4.5:1 for text (3:1 for large text/UI)
- Never rely on color alone (also use icons/text)
- Focus indicator: 2px primary-500 ring, 2px offset
- Focus visible on keyboard nav, hidden on mouse
- Dark mode passes contrast
- Text resize 200% without layout break

### Interaction
- All actions reachable via keyboard
- Tab order matches visual order
- Esc closes modals/popovers
- Arrow keys for grid/calendar nav
- Min touch target 44×44 px
- Hover features have keyboard equivalent

### Semantic
- Use semantic HTML (button, nav, main, section)
- Form labels properly associated
- ARIA only when no semantic alternative
- Skip-to-content link at top
- Landmark roles
- Live regions for dynamic content

### Screen Reader
- Image alt text
- Decorative images: `alt=""`
- Icon-only buttons: `aria-label`
- Dynamic updates: `aria-live`
- Loading: `aria-busy`
- Errors: `aria-invalid` + linked error message

### Cognitive
- Plain language
- Avoid auto-playing video/audio
- Sufficient time (no aggressive timeouts)
- Confirmation before destructive
- Clear error messages with fix guidance

---

## ১৩১. Localization & RTL UI Specs

### LTR ↔ RTL
- Logical CSS properties (`margin-inline-start` not `margin-left`)
- Icons that direct (arrows, back/forward) mirror in RTL
- Logos generally do not flip
- Numbers stay LTR even in RTL text
- Test with `dir="rtl"` toggled on html

### Bengali Specific
- Tabular-nums-required for numbers in Bengali UI
- Letter-spacing slightly relaxed (Bengali ligatures need breathing room)
- Calendar shows Bengali date below Gregorian
- Date format DD/MM/YYYY default
- Currency symbol ৳ before amount

### Hindi / Arabic
- Devanagari numeral toggle
- Arabic numerals (০-৯ vs 0-9 vs ٠-٩)
- Friday-Saturday weekend in Arabic locales

### Long Text Handling
- Translations 30% longer (German) — buttons flex
- Truncate with tooltip showing full
- Wrap rather than truncate when context critical

---

## ১৩২. Design Handoff & Implementation

### Figma Organization
- **File:** Atlas Design System
- **Pages:**
  - 00 Foundation (tokens, colors, type)
  - 01 Components (organized by category)
  - 02 Patterns (form, table, navigation)
  - 03 Screens — Dashboard
  - 04 Screens — Reservations
  - 05 Screens — Calendar
  - 06 Screens — Front Desk
  - 07 Screens — Housekeeping
  - 08 Screens — Reports
  - 09 Screens — Settings
  - 10 Booking Engine (public)
  - 11 Mobile App — Staff
  - 12 Mobile App — Owner
  - 13 Mobile App — Guest PWA
  - 14 Email Templates
  - 15 Print Templates
- **Variables:** All tokens as Figma Variables (color, number, string)
- **Component variants:** Match React props
- **Auto-layout** everywhere

### Code Connect (Figma → Code)
- Each Figma component maps to shadcn/ui or custom
- Props sync via Figma Code Connect
- Story documentation

### Storybook
- Every component
- Every variant
- Every state
- Light + dark
- LTR + RTL
- Mobile + desktop
- Accessibility addon
- Chromatic visual regression

### Design Review Cadence
- Weekly design crit
- Pre-sprint design sign-off
- Post-implementation pixel review
- Quarterly design system audit

---

## ১৩৩. Design Deliverables Checklist

For each screen/feature, designer must deliver:

- [ ] Wireframe (low-fi)
- [ ] High-fi mockup (light + dark)
- [ ] Mobile + Tablet + Desktop responsive
- [ ] RTL variant if applicable
- [ ] Empty state
- [ ] Loading state (skeleton)
- [ ] Error state
- [ ] Success state
- [ ] Edge cases (long text, missing data, error responses)
- [ ] Interaction prototype (animations)
- [ ] Accessibility annotation (focus order, ARIA labels)
- [ ] Localized examples (Bengali + English)
- [ ] Specs (spacing, typography references via Figma)
- [ ] Component references (link to design system)
- [ ] Edge case handling
- [ ] Dev handoff notes (gotchas, behavior nuances)

---

## ✅ Design Part Complete

PART XV-এ এখন আছে:
- Brand identity (logo, voice, personality)
- Complete design tokens (color, type, spacing, shadow, motion, breakpoint)
- 25+ component specifications (anatomy, variants, states, props, a11y)
- 12+ detailed key screen wireframes (Login, Dashboard, Calendar, Reservation list/detail, New booking wizard, Front desk, HK, Booking engine search/checkout/confirmation)
- Mobile app screen specs
- Email template design
- Print template design (Mushak invoice, Registration card, Folio)
- 10 interaction patterns
- WCAG 2.1 AA accessibility spec
- LTR/RTL + Bengali specific
- Figma organization + handoff process
- Storybook setup
- Design deliverables checklist

**Designer Outcome:** এই PART XV পড়ে directly Figma-তে Atlas Design System file তৈরি করতে পারবে। কোনো extra reference লাগবে না।

**Developer Outcome:** এই specs দিয়ে directly shadcn/ui কে override করে Atlas-specific component library build করতে পারবে। Tailwind config (App P.4) + এই tokens combine করে design system code-এ ready।

— **End of Design Part —**
