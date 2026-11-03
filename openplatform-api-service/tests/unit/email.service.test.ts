import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn(async () => ({ messageId: 'test' }));
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock('nodemailer', () => ({
  createTransport: mocks.createTransport,
}));

describe('email.service', () => {
  const origHost = process.env.SMTP_HOST;

  beforeEach(() => {
    mocks.sendMail.mockClear();
    mocks.createTransport.mockClear();
    // Reset the module so the lazy transporter is re-created per test.
    vi.resetModules();
  });

  afterEach(() => {
    process.env.SMTP_HOST = origHost;
  });

  it('is a no-op and returns false when SMTP_HOST is not configured', async () => {
    delete process.env.SMTP_HOST;
    const { sendAlertEmail } = await import('../../src/services/email.service');
    const sent = await sendAlertEmail('dev@example.com', 'dev-1', 12, []);
    expect(sent).toBe(false);
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it('sends an email and returns true when SMTP is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SMTP_FROM = 'ops@cregis.com';
    const { sendAlertEmail } = await import('../../src/services/email.service');
    const sent = await sendAlertEmail('dev@example.com', 'dev-1', 12, [
      { endpoint: '/x', method: 'POST', traceId: 't-1', responseStatus: 500, createdAt: '2026-11-01T00:00:00Z' },
    ]);

    expect(sent).toBe(true);
    expect(mocks.createTransport).toHaveBeenCalledOnce();
    expect(mocks.sendMail).toHaveBeenCalledOnce();
    const mail = mocks.sendMail.mock.calls[0][0] as any;
    expect(mail.to).toBe('dev@example.com');
    expect(mail.from).toBe('ops@cregis.com');
    expect(mail.subject).toContain('12');
    expect(mail.html).toContain('t-1');
  });
});
