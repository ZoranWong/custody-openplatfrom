# Story a-2-1: Developer Registration (开发者注册)

**Story ID:** a-2-1
**Module:** A (Developer Portal)
**Priority:** P0
**Estimated Points:** 5
**Status:** in-progress

---

## Story

As a **new developer**,
I want to register using email or phone with KYB information,
So that I can create a developer account with business verification.

## Acceptance Criteria

### Given the registration page
### When entering valid information
### Then create new account with pending KYB status

**1. Account Information:**
- [ ] Email (unique, required, valid format)
- [ ] Phone (unique, required, valid format with country code)
- [ ] Password (min 8 chars, uppercase, lowercase, number, special char)
- [ ] Confirm password (must match)

**2. KYB Information:**
- [ ] Company name (required)
- [ ] Unified Social Credit Code (required, 18 chars)
- [ ] Business license upload (required, image format, max 5MB)
- [ ] Company website (optional)
- [ ] Industry (required, dropdown selection)

**3. UBO (Ultimate Beneficial Owner) Information:**
- [ ] UBO name (required)
- [ ] UBO ID type (passport/national_id)
- [ ] UBO ID number (required)
- [ ] UBO nationality (required)
- [ ] UBO phone (required)
- [ ] Add multiple UBOs support (minimum 1 required)

**4. Company Structure:**
- [ ] Organization type (corporation/llc/partnership)
- [ ] Establishment date
- [ ] Registered address
- [ ] Business scope

**5. Validation:**
- [ ] Real-time field validation on blur
- [ ] File upload validation (max 5MB, jpg/png)
- [ ] Show error messages below fields
- [ ] Step navigation validation (cannot proceed without required fields)

**6. Submission:**
- [ ] Submit to API with status "pending_kyb_review"
- [ ] Show loading state during submission
- [ ] Navigate to verification page on success
- [ ] Handle API errors gracefully

## Technical Requirements

### API Endpoint

```http
POST /api/v1/auth/register
Content-Type: multipart/form-data
```

**Request Body:**
```json
{
  "email": "string",
  "phone": "string",
  "password": "string",
  "company_name": "string",
  "credit_code": "string",
  "business_license": "file",
  "website": "string",
  "industry": "string",
  "ubos": [
    {
      "name": "string",
      "id_type": "passport|national_id",
      "id_number": "string",
      "nationality": "string",
      "phone": "string"
    }
  ],
  "org_type": "string",
  "establishment_date": "string",
  "registered_address": "string",
  "business_scope": "string"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user_id": "uuid",
    "status": "pending_kyb_review"
  }
}
```

### UI Components Needed

| Component | Path | Description |
|-----------|------|-------------|
| `RegisterPage.vue` | `src/views/Register.vue` | Main registration container |
| `AccountForm.vue` | `src/components/auth/` | Step 1: Email, phone, password |
| `KYBForm.vue` | `src/components/auth/` | Step 2: Company information |
| `UBOForm.vue` | `src/components/auth/` | Step 3: UBO with dynamic list |
| `FileUpload.vue` | `src/components/common/` | Business license upload |
| `StepProgress.vue` | `src/components/common/` | Step indicator |

### State Management

**Pinia Store: `useAuthStore`**
- `register(data)` - Register new developer
- `loading` - Loading state
- `error` - Error message

**Local Component State (Composable):**
- `useRegistrationForm.ts` - Form state management
- `useStepNavigation.ts` - Step navigation logic

### Validation Library

- Use `vee-validate` for form validation
- Custom validators for:
  - Chinese phone number format
  - Unified Social Credit Code (18 chars)
  - Password strength requirements

## Tasks

### Phase 1: Foundation
- [ ] 1.1 Create registration view structure (Register.vue)
- [ ] 1.2 Create StepProgress component
- [ ] 1.3 Create useRegistrationForm composable
- [ ] 1.4 Create useStepNavigation composable

### Phase 2: Account Information (Step 1)
- [ ] 2.1 Implement AccountForm.vue
- [ ] 2.2 Add email validation (unique check API)
- [ ] 2.3 Add phone validation (China mobile format)
- [ ] 2.4 Add password strength validation
- [ ] 2.5 Add password confirmation matching

### Phase 3: KYB Information (Step 2)
- [ ] 3.1 Implement KYBForm.vue
- [ ] 3.2 Implement FileUpload.vue component
- [ ] 3.3 Add business license image upload
- [ ] 3.4 Add Unified Social Credit Code validation
- [ ] 3.5 Add industry dropdown options
- [ ] 3.6 Implement company structure fields

### Phase 4: UBO Information (Step 3)
- [ ] 4.1 Implement UBOForm.vue
- [ ] 4.2 Add dynamic UBO list (add/remove)
- [ ] 4.3 Add UBO ID validation based on ID type
- [ ] 4.4 Add nationality and phone validation

### Phase 5: Integration
- [ ] 5.1 Create auth API service
- [ ] 5.2 Create Pinia auth store
- [ ] 5.3 Connect form submission to API
- [ ] 5.4 Handle loading and error states
- [ ] 5.5 Navigate to verification page on success

### Phase 6: Testing
- [ ] 6.1 Add unit tests for validators
- [ ] 6.2 Add component tests
- [ ] 6.3 Test responsive design
- [ ] 6.4 Test accessibility

## Design Reference

### Form Layout (3-Step Process)

```
┌─────────────────────────────────────────────────────────┐
│                    Cregis                               │
│                  开发者注册                              │
├─────────────────────────────────────────────────────────┤
│  步骤 1         步骤 2         步骤 3                   │
│  [●]            [○]            [○]                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 第一步：账号信息                                 │   │
│  │                                               │   │
│  │ 邮箱 *                                          │   │
│  │  [____________________] 请输入有效邮箱地址     │   │
│  │                                               │   │
│  │ 手机号 *                                        │   │
│  │  [+86 ▼] [____________________]               │   │
│  │                                               │   │
│  │ 密码 *                                          │   │
│  │  [____________________] 至少8位，包含大小写   │   │
│  │                                               │   │
│  │ 确认密码 *                                      │   │
│  │  [____________________]                       │   │
│  │                                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [ 下一步 > ]               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 2: KYB Information
```
┌─────────────────────────────────────────────────────────┐
│  步骤 1         步骤 2         步骤 3                   │
│  [✓]            [●]            [○]                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 第二步：企业信息 (KYB)                          │   │
│  │                                               │   │
│  │ 公司名称 *                                      │   │
│  │  [____________________]                       │   │
│  │                                               │   │
│  │ 统一社会信用代码 *                              │   │
│  │  [____________________] 18位编码              │   │
│  │                                               │   │
│  │ 营业执照 *                                      │   │
│  │  [         选择文件         ] 只能上传 JPG/PNG │   │
│  │  已上传: business_license.jpg                  │   │
│  │                                               │   │
│  │ 公司官网                                        │   │
│  │  [____________________] 选填                  │   │
│  │                                               │   │
│  │ 所属行业 *                                      │   │
│  │  [____________________ ▼]                     │   │
│  │                                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [< 上一步]              [ 下一步 > ]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 3: UBO Information
```
┌─────────────────────────────────────────────────────────┐
│  步骤 1         步骤 2         步骤 3                   │
│  [✓]            [✓]            [●]                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 第三步：最终受益人信息 (UBO)                    │   │
│  │                                               │   │
│  │ + 添加受益人                                   │   │
│  │                                               │   │
│  │ ┌─────────────────────────────────────────┐   │   │
│  │ │ 姓名 *                                    │   │   │
│  │ │ [____________________]                  │   │   │
│  │ │                                         │   │   │
│  │ │ 证件类型 *                               │   │   │
│  │ │ [护照 ▼] [____________________]         │   │   │
│  │ │                                         │   │   │
│  │ │ 国籍 *                                   │   │   │
│  │ │ [____________________]                  │   │   │
│  │ │                                         │   │   │
│  │ │ 手机号 *                                 │   │   │
│  │ │ [+86 ▼] [____________________]          │   │   │
│  │ │                                         │   │   │
│  │ │ [ 删除此受益人 ]                        │   │   │
│  │ └─────────────────────────────────────────┘   │   │
│  │                                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [< 上一步]              [ 提交注册 ]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Dev Agent Guardrails

### Technical Requirements

| Requirement | Specification |
|-------------|---------------|
| **Frontend Framework** | Vue 3 + Vite + TypeScript |
| **UI Components** | Element Plus (customized theme) |
| **State Management** | Pinia |
| **Form Validation** | vee-validate + zod |
| **HTTP Client** | Axios |
| **Styling** | Tailwind CSS v3.4 + Custom CSS Variables |
| **Icons** | Heroicons (SVG) |

### Architecture Compliance

| Rule | Implementation |
|------|---------------|
| API Response Format | `{ code, message, data }` |
| Error Code | 40001-50002 (from PRD) |
| Date Format | ISO 8601 |
| Naming Convention | camelCase (JS), kebab-case (files) |
| State Store | `src/stores/` |
| Views | `src/views/` |
| Components | `src/components/` |
| Composables | `src/composables/` |

### Library/Framework Requirements

| Library | Version | Purpose |
|---------|---------|---------|
| Vue | 3.4+ | Frontend framework |
| Vite | 5.x | Build tool |
| TypeScript | 5.x | Type safety |
| Element Plus | 2.5+ | UI components |
| Tailwind CSS | 3.4 | Utility CSS |
| Pinia | 2.1 | State management |
| Axios | 1.6 | HTTP client |
| vee-validate | 4.12 | Form validation |
| zod | 3.22 | Schema validation |

### File Structure Requirements

```
developer-portal/
├── src/
│   ├── views/
│   │   └── Register.vue              # Main registration page
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AccountForm.vue      # Step 1
│   │   │   ├── KYBForm.vue          # Step 2
│   │   │   └── UBOForm.vue          # Step 3
│   │   └── common/
│   │       ├── StepProgress.vue     # Step indicator
│   │       └── FileUpload.vue       # File upload
│   ├── composables/
│   │   ├── useRegistrationForm.ts   # Form state
│   │   └── useStepNavigation.ts     # Step logic
│   ├── stores/
│   │   └── auth.store.ts            # Auth state
│   ├── services/
│   │   └── auth.service.ts          # API calls
│   ├── types/
│   │   └── registration.ts          # TypeScript types
│   └── utils/
│       └── validators.ts             # Custom validators
```

### Testing Requirements

| Type | Coverage Target | Location |
|------|-----------------|----------|
| Unit Tests | >80% | `*.test.ts` beside components |
| Component Tests | >70% | `*.spec.ts` beside components |
| Accessibility | WCAG 2.1 AA | Manual + axe-core |

## Project Context Reference

**From Architecture Document:**
- Backend Service: Express + TypeScript
- Database: MySQL + Prisma ORM
- Authentication: JWT (AccessToken 2h, RefreshToken 30d)
- Password: bcrypt (12 rounds)

**From UX Design:**
- Color System: Primary (#2D3748), Brand (#00BE78), Background (#F7F9FC)
- Typography: UndunText font family
- Layout: Responsive, max-width 1200px
- Design: Flat design, no shadows

**From PRD:**
- ISV (Independent Software Vendor) developer registration
- KYB (Know Your Business) required for enterprise users
- Status flow: pending_kyb_review -> active (after admin approval)

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| None (standalone) | - | Uses existing UI framework |
| Backend API | Required | POST /api/v1/auth/register |

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code reviewed
- [ ] Unit tests passing (>80% coverage)
- [ ] Component tests passing (>70% coverage)
- [ ] Integration tests passing (with mock API)
- [ ] Responsive design verified (mobile/tablet/desktop)
- [ ] Accessibility checked (keyboard nav, screen reader)
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] Design implementation verified (visual comparison)

## Notes

- KYB review happens asynchronously after registration
- Admin portal handles KYB approval (Story B.2.1)
- User receives notification when KYB approved/rejected
- Email/SMS verification required after registration (Story A.2.2)
- Password must use bcrypt with 12 rounds

## References

- **PRD:** `docs/planning-artifacts/prd-cregis-openplatform.md`
- **Architecture:** `docs/planning-artifacts/architecture.md`
- **UX Design:** `docs/planning-artifacts/ux-design-specification.md`
- **Epics:** `docs/planning-artifacts/epics.md`
- **Previous Story:** None (first story in Epic A)

---

## Dev Agent Record

### Agent Model Used

Claude Mini (MiniMax-M2.1)

### Debug Log References

- Story created from epic analysis
- Sprint status: backlog -> ready-for-dev

### Completion Notes List

1. Story document created with comprehensive developer context
2. All architecture, UX, and PRD references included
3. Technical requirements documented with specific versions
4. File structure aligned with project conventions
5. Testing requirements defined with coverage targets

### File List

**Frontend Components:**
| File | Action | Description |
|------|--------|-------------|
| `src/views/RegisterPage.vue` | Create | Main registration page |
| `src/components/auth/AccountForm.vue` | Create | Step 1: Account info |
| `src/components/auth/KYBForm.vue` | Create | Step 2: KYB info |
| `src/components/auth/UBOForm.vue` | Create | Step 3: UBO info |

**Composables (Added by Code Review):**
| File | Action | Description |
|------|--------|-------------|
| `src/composables/useRegistrationForm.ts` | Create | Form state & validation |
| `src/composables/useStepNavigation.ts` | Create | Step navigation logic |

**State & Services:**
| File | Action | Description |
|------|--------|-------------|
| `src/stores/auth.ts` | Create | Auth state store |
| `src/services/api.ts` | Create | API calls (integrated auth) |

**Tests (Added by Code Review):**
| File | Action | Description |
|------|--------|-------------|
| `tests/unit/useRegistrationForm.test.ts` | Create | Composables unit tests |

---

*Story created by BMAD workflow - Ultimate context engine for flawless implementation*
*Date: 2026-02-09*
