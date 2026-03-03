# Story D-2-1: Table Structure Definition

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **backend engineer**,
I want to define database table structures,
so that I can store application data persistently.

## Acceptance Criteria

### Core Requirements (from prd-v2-mysql.md Section 2.2)

1. **Create Tables**
   - [ ] developers table
   - [ ] applications table
   - [ ] isv_enterprises table
   - [ ] authorizations table
   - [ ] api_logs table
   - [ ] webhooks table
   - [ ] metrics table
   - [ ] traces table

2. **Table Design**
   - [ ] Primary keys: VARCHAR(36) UUID
   - [ ] Indexes for query optimization
   - [ ] Foreign key constraints

## Tasks / Subtasks

- [ ] Task 1: Create DDL scripts
  - [ ] Write CREATE TABLE statements
  - [ ] Add indexes
  - [ ] Add foreign keys
- [ ] Task 2: Create migration script
  - [ ] Implement runMigrations()
  - [ ] Handle schema version tracking

## Dev Notes

### Data Model Reference (prd-v2-mysql.md Section 2.2)

```sql
-- Example: developers table
CREATE TABLE developers (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  ...
);
```

### Project Structure Notes

```
openplatform-api-service/
├── migrations/
│   └── 001_initial_schema.sql  # NEW
└── src/
    └── database/
        └── migrations.ts       # NEW: Migration runner
```

### References

- **PRD Requirements**: [docs/planning-artifacts/prd-v2-mysql.md#22-数据模型]

## Dev Agent Record

### Agent Model Used

MiniMax-M2.5

### Debug Log References

### Completion Notes List

### File List

