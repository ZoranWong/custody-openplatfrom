export interface FieldRule {
  validator: string
  options?: any
  message?: string
  optional?: boolean
}

export interface Rule {
  body?: Record<string, FieldRule[]>
  params?: Record<string, FieldRule[]>
  query?: Record<string, FieldRule[]>
}