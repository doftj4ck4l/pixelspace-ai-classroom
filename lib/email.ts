import nodemailer from "nodemailer";

/**
 * Email delivery with a development fallback: when SMTP_HOST is not set the
 * message lands in an in-memory mailbox (see /api/dev/mailbox) so staging and
 * local flows — verification, password reset — stay fully usable.
 */

export type Mail = { to: string; subject: string; html: string; text: string };

const DEFAULT_FROM =
  process.env.SMTP_FROM ?? "Pixelspace AI Classroom <no-reply@pixelspace.my>";

const devMailbox: Mail[] = [];
const DEV_MAILBOX_LIMIT = 50;

const smtpConfigured = () => Boolean(process.env.SMTP_HOST);

export const isDevMailboxEnabled = () => !smtpConfigured();

export const getDevMailbox = () => devMailbox;

export const sendEmail = async (mail: Mail) => {
  if (smtpConfigured()) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "1",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transport.sendMail({ from: DEFAULT_FROM, ...mail });
    return;
  }
  devMailbox.unshift(mail);
  if (devMailbox.length > DEV_MAILBOX_LIMIT)
    devMailbox.length = DEV_MAILBOX_LIMIT;
};
