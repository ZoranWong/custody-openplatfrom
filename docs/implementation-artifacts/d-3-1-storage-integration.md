# Story D-3-1: Storage Integration

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **backend engineer**,
I want to replace in-memory storage with MySQL,
so that data persists across service restarts.

## Acceptance Criteria

### Core Requirements (from prd-v2-mysql.md Section 4.3)

1. **Storage Replacement**
   - [ ] Replace memory storage with MySQL repositories
   - [ ] Update service layer to use repositories
   - [ ] Maintain backward compatibility

2. **Configuration**
   - [ ] Add storage type configuration
   - [ ] Support fallback to memory storage

## Tasks / Subtasks

- [ ] Task 1: Update services
  - [ ] Update DeveloperService
  - [ ] Update ApplicationService
  - [ ] Update IsvEnterpriseService
  - [ ] Update AuthorizationService
- [ ] Task 2: Add storage config
  - [ ] Add STORAGE_TYPE env var
  - [ ] Implement storage switch

## Dev Notes

### Architecture

Current (in-memory):
```
Services → In-Memory Storage
```

Target (MySQL):
```
Services → Repositories → MySQL Connection Pool
```

### Project Structure Notes

```
openplatform-api-service/src/
├── services/
│   ├── developer.service.ts    # MODIFIED
│   ├── application.service.ts  # MODIFIED
│   └── ...
```

### References

- **PRD Requirements**: [docs/planning-artifacts/prd-v2-mysql.md#43-Phase-3-功能集成]

## Dev Agent Record

### Agent Model Used

MiniMax-M2.5

### Debug Log References

### Completion Notes List

### File List

