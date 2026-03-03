# Frontend Architecture Guide

## Overview

This guide documents the frontend architecture and design standards for the Cregis Developer Portal.

## Technology Stack

- **Framework:** Vue 3 (Composition API) + Vite
- **Language:** TypeScript
- **UI Library:** Element Plus
- **Styling:** Tailwind CSS v3.4
- **State Management:** Pinia
- **Routing:** Vue Router 4
- **Icons:** Element Plus Icons

## Design System

### CSS Variables (:root)

All colors and styles are defined as CSS variables:

```css
:root {
  --el-color-primary: #00be78;
  --el-color-success: #00be78;
  --el-color-warning: #f6ad55;
  --el-color-danger: #e53e3e;
  --el-color-info: #3182ce;
  --el-border-radius-base: 8px;
  --el-border-radius-small: 6px;
  --el-box-shadow: none;
}
```

### Brand Colors

| Name | Value | Usage |
|------|-------|-------|
| Primary | `#00BE78` | Primary CTA, success states |
| Success | `#00BE78` | Success messages |
| Warning | `#F6AD55` | Warning messages |
| Danger | `#E53E3E` | Error messages, danger actions |
| Info | `#3182CE` | Info messages |

### Typography

```css
font-family: 'Gellix', 'Udun Text', -apple-system, BlinkMacSystemFont, sans-serif;
font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
```

### Border Radius

| Name | Value | Usage |
|------|-------|-------|
| small | 6px | Small buttons, inputs |
| base | 8px | Default border radius |
| large | 12px | Cards, modals |

## Component Standards

### Button Component

Use the custom Button component with proper color handling based on type:

```vue
<script setup lang="ts">
import Button from '@/components/common/Button.vue'
</script>

<template>
  <Button type="primary">Primary</Button>
  <Button type="success">Success</Button>
  <Button type="warning">Warning</Button>
  <Button type="danger">Danger</Button>
  <Button type="info">Info</Button>
</template>
```

**Type-to-Color Mapping:**

The Button component uses CSS variables from `:root`:

| Type | Color Variable | Value |
|------|----------------|-------|
| primary | `var(--el-color-primary)` | `#00BE78` |
| success | `var(--el-color-success)` | `#00BE78` |
| warning | `var(--el-color-warning)` | `#F6AD55` |
| danger | `var(--el-color-danger)` | `#E53E3E` |
| info | `var(--el-color-info)` | `#3182CE` |

**Button Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| type | 'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' | 'primary' | Button type |
| size | 'large' \| 'default' \| 'small' | 'default' | Button size |
| disabled | boolean | false | Disable button |
| loading | boolean | false | Show loading state |
| nativeType | 'button' \| 'submit' \| 'reset' | 'button' | Native button type |

**Element Plus Button Compatibility:**

When using el-button directly, set color using CSS variable:

```vue
<el-button
  type="primary"
  color="var(--el-color-primary)"
>
  Button Text
</el-button>
```

### Input Heights

All input components should use consistent height:

| Component | Height | Tailwind Class |
|-----------|--------|----------------|
| Standard input | 40px | `h-10` |
| Large input | 48px | `h-12` |
| Small input | 32px | `h-8` |

Example:
```vue
<el-input class="h-10" />
```

### Form Validation

- Use inline validation with error messages below inputs
- Validate on blur for individual fields
- Validate on submit for the entire form
- Show success/error states with appropriate colors

## File Structure

```
openplatform-web/developer-portal/
├── src/
│   ├── assets/
│   │   ├── fonts/
│   │   └── styles/
│   │       ├── main.css          # CSS variables and base styles
│   │       ├── variables.css     # (optional) additional variables
│   │       └── components.css    # (optional) component styles
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.vue       # Custom button component
│   │   │   ├── Card.vue
│   │   │   ├── Header.vue
│   │   │   └── Footer.vue
│   │   └── auth/
│   ├── views/
│   ├── composables/
│   ├── stores/
│   ├── router/
│   ├── services/
│   └── types/
├── public/
└── docs/
```

## API Integration

### API Response Format

All API responses follow this format:

```typescript
interface ApiResponse<T> {
  code: number      // 0 = success
  message: string   // Response message
  data?: T          // Response data
}
```

### Token Storage

- Access Token: `localStorage.getItem('accessToken')`
- Refresh Token: `localStorage.getItem('refreshToken')`

### Error Handling

- Handle 401 Unauthorized: Redirect to login
- Handle 403 Forbidden: Show access denied
- Handle 4xx: Show validation errors
- Handle 5xx: Show server error

## Development Guidelines

### Component Guidelines

1. Use Composition API with `<script setup>`
2. Use defineModel for v-model in forms
3. Use TypeScript for all components
4. Follow single-responsibility principle
5. Keep components small and focused

### Styling Guidelines

1. Use Tailwind CSS for layout and spacing
2. Use design system colors from CSS variables
3. Avoid hardcoded colors
4. Use utility classes for common patterns

### CSS Variables Usage

Always use CSS variables for colors and common styles:

```css
/* Good */
background-color: var(--el-color-primary);
border-radius: var(--el-border-radius-base);

/* Avoid */
background-color: #00BE78;
border-radius: 8px;
```

### Testing Requirements

- Unit tests: >80% coverage
- Component tests: >70% coverage
- Test all user interactions
- Test error states

## References

- [Story a-1-1: Landing Page](../implementation/artifacts/a-1-1-landing-page.md)
- [Story a-2-1: Developer Registration](../implementation/artifacts/a-2-1-developer-registration.md)
- [Auth API Documentation](../api/auth-api.md)
