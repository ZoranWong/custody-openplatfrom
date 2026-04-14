/**
 * Cregis OpenPlatform SDK - Webhook Service
 */

import { HttpClient } from '../core/http';

/**
 * Webhook Service
 */
export class WebhookService {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /**
   * Register webhook (for receiving events)
   * POST /api/v1/isv/webhooks/webhooks
   */
  async registerWebhook(request: {
    url: string;
    eventTypes: string[];
  }): Promise<{
    id: string;
    url: string;
    eventTypes: string[];
    isActive: boolean;
    secret: string;
  }> {
    const response = await this.http.post<{
      id: string;
      url: string;
      event_types: string[];
      is_active: boolean;
      secret: string;
    }>('/api/v1/isv/webhooks/webhooks', request);

    return {
      id: response.id,
      url: response.url,
      eventTypes: response.event_types,
      isActive: response.is_active,
      secret: response.secret,
    };
  }

  /**
   * List registered webhooks
   * GET /api/v1/isv/webhooks/webhooks
   */
  async listWebhooks(): Promise<
    Array<{
      id: string;
      url: string;
      eventTypes: string[];
      isActive: boolean;
    }>
  > {
    const response = await this.http.get<
      Array<{
        id: string;
        url: string;
        event_types: string[];
        is_active: boolean;
      }>
    >('/api/v1/isv/webhooks/webhooks');

    return response.map((wh) => ({
      id: wh.id,
      url: wh.url,
      eventTypes: wh.event_types,
      isActive: wh.is_active,
    }));
  }

  /**
   * Update webhook
   * PUT /api/v1/isv/webhooks/webhooks/:id
   */
  async updateWebhook(
    id: string,
    request: {
      url?: string;
      eventTypes?: string[];
      isActive?: boolean;
    }
  ): Promise<{ success: boolean }> {
    const response = await this.http.put<{ success: boolean }>(
      `/api/v1/isv/webhooks/webhooks/${id}`,
      request
    );

    return response;
  }

  /**
   * Delete webhook
   * DELETE /api/v1/isv/webhooks/webhooks/:id
   */
  async deleteWebhook(id: string): Promise<{ success: boolean }> {
    await this.http.delete(`/api/v1/isv/webhooks/webhooks/${id}`);
    return { success: true };
  }
}
