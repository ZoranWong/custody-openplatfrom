/**
 * Email sender for API log alerts.
 *
 * Uses nodemailer with SMTP credentials from environment variables.
 * When SMTP is not configured, `sendAlertEmail` logs a message and returns
 * silently — this is intentional: alert events still get recorded to the DB.
 *
 * Env vars:
 *   SMTP_HOST      — e.g. smtp.gmail.com
 *   SMTP_PORT      — default 587
 *   SMTP_SECURE    — 'true' for TLS (port 465), anything else for STARTTLS
 *   SMTP_USER      — SMTP username
 *   SMTP_PASS      — SMTP password
 *   SMTP_FROM      — From header, default 'noreply@cregis.com'
 */

import { createTransport, type Transporter } from 'nodemailer';

interface SmtpConfig {
  host?: string;
  port: number;
  secure: boolean;
  auth: { user?: string; pass?: string };
  from: string;
}

function readSmtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.SMTP_FROM || 'noreply@cregis.com',
  };
}

let transporter: Transporter | undefined;

function getTransporter(): Transporter | undefined {
  const config = readSmtpConfig();
  if (!config.host) return undefined;
  if (!transporter) {
    transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: Object.values(config.auth).some(Boolean) ? config.auth : undefined,
    });
  }
  return transporter;
}

interface ErrorSample {
  endpoint: string;
  method: string;
  traceId?: string | null;
  responseStatus: number | null;
  createdAt: string;
}

/**
 * Send an alert email. Returns true when the mail was handed to SMTP, false
 * when SMTP is not configured (a no-op) — so callers can record `sent`
 * truthfully instead of assuming a silent return means success.
 */
export async function sendAlertEmail(
  to: string,
  developerId: string,
  errorCount: number,
  sampleErrors: ErrorSample[],
): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log('[ApiLogAlert] SMTP not configured — skipping email to %s for dev %s', to, developerId);
    return false;
  }
  const rows = sampleErrors
    .map(
      (e) =>
        `<tr>
          <td style="padding:4px 8px">${e.createdAt}</td>
          <td style="padding:4px 8px">${e.method} ${e.endpoint}</td>
          <td style="padding:4px 8px">${e.responseStatus ?? '-'}</td>
          <td style="padding:4px 8px">${e.traceId || '-'}</td>
        </tr>`,
    )
    .join('');

  const html = `
    <h3>Cregis API Error Alert</h3>
    <p><strong>Developer:</strong> ${developerId}</p>
    <p><strong>${errorCount} errors</strong> detected in the last monitoring window.</p>
    <table style="border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Time</th>
          <th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Endpoint</th>
          <th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Status</th>
          <th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Trace ID</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;color:#888;font-size:12px;">
      This is an automated alert from Cregis Open Platform.
    </p>`;

  await t.sendMail({
    from: readSmtpConfig().from,
    to,
    subject: `[Cregis Alert] ${errorCount} API errors for developer ${developerId}`,
    text: `Cregis API Alert — ${errorCount} errors detected for developer ${developerId}. Check the developer portal for details.`,
    html,
  });
  console.log('[ApiLogAlert] Alert email sent to %s for dev %s', to, developerId);
  return true;
}
