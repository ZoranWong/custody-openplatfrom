# Story D-2-3: Data Migration

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **backend engineer**,
I want to migrate existing in-memory data to MySQL,
so that I can preserve data when switching to persistent storage.

## Acceptance Criteria

### Core Requirements (from prd-v2-mysql.md Section 2.3)

1. **Migration Strategy**
   - [ ] Export data from memory storage
   - [ ] Import data to MySQL
   - [ ] Validate data integrity

2. **Data Mapping**
   - [ ] Map Developer model to table
   - [ ] Map Application model to table
   - [ ] Map IsvEnterprise model to table
   - [ ] Map Authorization model to table

## Tasks / Subtasks

- [ ] Task 1: Create migration utility
  - [ ] Export data from memory
  - [ ] Transform data format
  - [ ] Import to MySQL
- [ ] Task 2: Validate migration
  - [ ] Compare record counts
  - [ ] Verify data integrity

## Dev Notes

### Migration Approach

**一次性迁移** (from prd-v2-mysql.md Section 2.3):
- Stop service
- Export memory data
- Initialize MySQL tables
- Import data
- Verify integrity
- Start service

### Project Structure Notes

```
openplatform-api-service/src/
├── database/
│   └── migrator.ts            # NEW: Migration utility
```

### References

- **PRD Requirements**: [docs/planning-artifacts/prd-v2-mysql.md#23-迁移策略]

## Dev Agent Record

### Agent Model Used

MiniMax-M2.5

### Debug Log References

### Completion Notes List

### File List

