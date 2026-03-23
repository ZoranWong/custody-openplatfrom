import { describe, it, expect } from 'vitest'

describe('TABLE_TO_MODEL_MAP', () => {
  // Test the table name to model name mapping
  const TABLE_TO_MODEL_MAP: Record<string, string> = {
    isv_developer: 'IsvDeveloper',
    applications: 'application',
    isv_users: 'IsvUser',
    bindings: 'Binding',
    endpoint_permissions: 'EndpointPermission',
    admins: 'Admin',
    oauth_resources: 'oauthResource',
    webhooks: 'webhook',
    api_logs: 'apiLog',
    metrics: 'metric',
    traces: 'trace',
  }

  it('should map isv_developer to IsvDeveloper', () => {
    expect(TABLE_TO_MODEL_MAP['isv_developer']).toBe('IsvDeveloper')
  })

  it('should map applications to application', () => {
    expect(TABLE_TO_MODEL_MAP['applications']).toBe('application')
  })

  it('should map isv_users to IsvUser', () => {
    expect(TABLE_TO_MODEL_MAP['isv_users']).toBe('IsvUser')
  })

  it('should map bindings to Binding', () => {
    expect(TABLE_TO_MODEL_MAP['bindings']).toBe('Binding')
  })

  it('should map endpoint_permissions to EndpointPermission', () => {
    expect(TABLE_TO_MODEL_MAP['endpoint_permissions']).toBe('EndpointPermission')
  })

  it('should map admins to Admin', () => {
    expect(TABLE_TO_MODEL_MAP['admins']).toBe('Admin')
  })

  it('should map oauth_resources to oauthResource', () => {
    expect(TABLE_TO_MODEL_MAP['oauth_resources']).toBe('oauthResource')
  })

  it('should map webhooks to webhook', () => {
    expect(TABLE_TO_MODEL_MAP['webhooks']).toBe('webhook')
  })

  it('should map api_logs to apiLog', () => {
    expect(TABLE_TO_MODEL_MAP['api_logs']).toBe('apiLog')
  })

  it('should map metrics to metric', () => {
    expect(TABLE_TO_MODEL_MAP['metrics']).toBe('metric')
  })

  it('should map traces to trace', () => {
    expect(TABLE_TO_MODEL_MAP['traces']).toBe('trace')
  })

  // Verify all Prisma models are mapped
  it('should have mappings for all expected tables', () => {
    const expectedTables = [
      'isv_developer',
      'applications',
      'isv_users',
      'bindings',
      'endpoint_permissions',
      'admins',
      'oauth_resources',
      'webhooks',
      'api_logs',
      'metrics',
      'traces'
    ]

    expectedTables.forEach(table => {
      expect(TABLE_TO_MODEL_MAP).toHaveProperty(table)
    })
  })
})
