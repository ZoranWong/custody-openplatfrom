# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cregis Custody OpenPlatform - A bank-grade cryptocurrency custody service infrastructure for regulated institutions. The platform enables secure asset management, governance, and compliance while integrating seamlessly with enterprise financial systems.

**Service Modes (Treasury Unit Patterns):**
- **Individual Custody (B2B2C)** - For banks/financial institutions serving retail users
- **Crypto Payment Processing** - For e-commerce platforms
- **Corporate Treasury Management** - For enterprise cross-border payments

## Reference Implementations (Prototypes)

Three demonstration platforms showcase different integration patterns:

| Prototype | Service Mode | Purpose |
|-----------|--------------|---------|
| **Everypay** | Corporate Treasury | International trade payment platform integration |
| **GlobalMall** | Crypto Payment Processing | E-commerce platform integration |
| **FinSecure** | Individual Custody | Digital banking platform integration |

## Architecture

The project is organized as a monorepo with three main subprojects:

```
cregis-custody-openplatform/
├── openplatform-api-service/   # Backend API service (enterprise/, payment/, services/)
├── openplatform-sdk/           # Client SDK (enterprise/, payment/, services/)
├── openplatform-web/           # Web frontend application
└── docs/
    └── prd-cregis-custody-2026-02-02-cn.md  # Master PRD
```

## Service Modes & Account Structures

### Individual Custody (FinSecure pattern)
- **PRIMARY**: Main asset holding wallet
- **DEPOSIT_IN**: Inbound deposit address
- **WITHDRAW_OUT**: Outbound withdrawal wallet
- **QUARANTINE**: Risk isolation wallet

### Crypto Payment Processing (GlobalMall pattern)
- **PRIMARY**: Main settlement wallet
- **PAYIN**: Receivable wallet (substates: pending, received)
- **PAYOUT**: Disbursement wallet
- **QUARANTINE**: Risk isolation wallet

### Corporate Treasury Management (Everypay pattern)
- **PRIMARY**: Main treasury wallet
- **RECEIVABLE**: Collection wallet (label-based, one-time addresses)
- **PAYMENT**: Payment wallet (single active address)
- **QUARANTINE**: Risk isolation wallet (single active address)

## Core Operations

| Operation | Description | Account Flow |
|-----------|-------------|--------------|
| **Deposit/Payin/Collect** | Inbound funds | External → Inbound wallet |
| **Pool** | Sweep to primary | Inbound → PRIMARY |
| **Lock** | Risk isolation | Inbound → QUARANTINE |
| **Release** | Approve from quarantine | QUARANTINE → PRIMARY/External |
| **Withdraw/Payout/Pay** | Outbound payment | Outbound → External |
| **Allocate** | Internal allocation | PRIMARY → Outbound |
| **Pull** | Direct primary withdrawal | PRIMARY → External |

## Policy Engine

**Three Policy Types per Treasury Unit:**
1. **Fund Outbound Mgmt Policy**: Controls outbound operations (Withdraw/Payout/Pay)
2. **Fund Pool Mgmt Policy**: Controls Pool, Allocate, Pull operations
3. **Fund Risk Mgmt Policy**: Controls Lock and Release operations

**Approval Configuration:**
- Up to 4 approval tiers per policy
- Per-asset transaction limits per tier
- Optional whitelist for external addresses

## Embedded Plugin Pages

Cregis provides embeddable UI components for third-party integration:
- **Treasury Unit Creation Authorization Page**: Authorize third-party to create treasury units
- **Treasury Policy Configuration Page**: Configure custody policies within third-party platforms
- **Transaction Details & Signature Page**: Display transaction details and collect cryptographic signatures
- **Policy Configuration Signature Page**: Sign and activate governance rules

## Third-Party Integration Labels

For reconciliation, all operations support semantic tagging:
- `user_id` (Individual Custody)
- `biz_type` (business category: procurement, payroll, sales)
- `biz_id` (business identifier: contract number, order number)
- `Order Id` (Crypto Payment Processing)

## BMAD Workflow Documentation

This project uses **BMAD** (Build-Measure-Analyze-Document) workflow management.

**Documentation structure:**
- `docs/_bmad/config.yaml` - BMAD workspace configuration
- `docs/_bmad/workflows/` - Custom workflow definitions
- `docs/_bmad/projects/{api-service,sdk,web,shared}/` - Per-project documentation

**Document types per project:**
- `api-service/`: `requirements/`, `design/`, `specs/`
- `sdk/`: `requirements/`, `design/`, `examples/`
- `web/`: `requirements/`, `design/`, `ui-specs/`
- `shared/`: Product vision, technical specs, glossary, ADRs

## Development Notes

- All subprojects are currently in initial setup phase
- SDK module is organized into `enterprise/`, `payment/`, and `services/` submodules
- API service module is organized into `enterprise/`, `payment/`, and `services/` submodules
- Reference PRD: `docs/prd-cregis-custody-2026-02-02-cn.md` for detailed requirements
- Compliance: KYB (Know Your Business) required for all institutional clients; no KYC for end users

## Coding Standards

### Naming Conventions

**All code must use camelCase for identifiers:**
- Variables: `availableBalance`, `apiCalls`, `paymentHistory`
- Object properties: `totalAmount`, `billingPeriod`, `createdAt`
- Function names: `getPaymentHistory`, `calculateTotal`, `fetchUsageStats`
- File names for utilities/components: `paymentHistory.ts`, `usageStats.vue`

**Exceptions (use as-is)::**
- Constants that are enum values or API responses matching backend
- TypeScript interfaces matching backend contracts

**Examples:**
```typescript
// DO: camelCase for all identifiers
const usageStats = getDailyUsage()
const invoiceData = {
  invoiceId: 'INV-001',
  totalAmount: 1500.00,
  billingPeriod: { start: '2026-01-01', end: '2026-01-31' }
}

// DON'T: snake_case or kebab-case
const usage_stats = {}  // ❌
const invoice-data = {}  // ❌
```
