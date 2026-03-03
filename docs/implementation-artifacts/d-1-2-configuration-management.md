# Story D-1-2: Configuration Management

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **backend engineer**,
I want to externalize database configuration,
so that I can manage database settings across environments.

## Acceptance Criteria

### Core Requirements (from prd-v2-mysql.md Section 4.1)

1. **Configuration Management**
   - [ ] Externalize database connection settings
   - [ ] Support .env file for local development
   - [ ] Support environment variables for production

2. **Config Structure**
   - [ ] Host, port, database name
   - [ ] Username, password
   - [ ] Connection pool settings

## Tasks / Subtasks

- [ ] Task 1: Create database config
  - [ ] Define DatabaseConfig interface
  - [ ] Load from environment
- [ ] Task 2: Add .env template
  - [ ] Create .env.example
  - [ ] Document required variables

## Dev Notes

### Project Structure Notes

```
openplatform-api-service/
├── .env.example            # NEW
└── src/
    └── config/
        └── database.ts     # MODIFIED
```

### References

- **PRD Requirements**: [docs/planning-artifacts/prd-v2-mysql.md#41-Phase-1-基础设施]

## Dev Agent Record

### Agent Model Used

MiniMax-M2.5

### Debug Log References

### Completion Notes List

### File List

