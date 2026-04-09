import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? "TRKR <noreply@mosaicdatasolutions.com>";

function isConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export interface InvoiceReturnedPayload {
  invoiceNumber: string;
  submitterName?: string | null;
  submitterEmail?: string | null;
  statusNotes?: string | null;
  submissionReference?: string | null;
}

export async function sendReturnedEmail(payload: InvoiceReturnedPayload): Promise<void> {
  if (!isConfigured()) {
    console.log(
      `[email] SMTP not configured — skipping return notification for invoice ${payload.invoiceNumber} ` +
      `(to: ${payload.submitterEmail ?? "no email on file"})`
    );
    return;
  }

  if (!payload.submitterEmail) {
    console.log(`[email] No submitter email for invoice ${payload.invoiceNumber} — skipping`);
    return;
  }

  const transport = createTransport();

  const subject = `Invoice ${payload.invoiceNumber} — Returned to Submitter`;
  const refLine = payload.submissionReference ? `\nReference: ${payload.submissionReference}` : "";
  const notesLine = payload.statusNotes ? `\nReturn reason: ${payload.statusNotes}` : "";

  const text = [
    `Dear ${payload.submitterName ?? "Vendor"},`,
    ``,
    `Your invoice ${payload.invoiceNumber} has been returned to you for correction.${refLine}${notesLine}`,
    ``,
    `Please review the notes above and resubmit a corrected invoice at your earliest convenience.`,
    ``,
    `If you have questions, contact your contract administrator and reference the invoice number above.`,
    ``,
    `— TRKR, Mosaic Data Solutions`,
  ].join("\n");

  await transport.sendMail({
    from: SMTP_FROM,
    to: payload.submitterEmail,
    subject,
    text,
  });

  console.log(`[email] Return notification sent for invoice ${payload.invoiceNumber} → ${payload.submitterEmail}`);
}

export interface ReturnReminderPayload {
  invoiceNumber: string;
  submitterName?: string | null;
  submitterEmail: string;
  submissionReference?: string | null;
  daysSinceReturn: number;
}

export async function sendReturnReminderEmail(payload: ReturnReminderPayload): Promise<void> {
  if (!isConfigured() || !payload.submitterEmail) return;

  const transport = createTransport();

  const subject = `Reminder: Invoice ${payload.invoiceNumber} awaiting your resubmission`;

  const text = [
    `Dear ${payload.submitterName ?? "Vendor"},`,
    ``,
    `This is a reminder that invoice ${payload.invoiceNumber} was returned to you ${payload.daysSinceReturn} day(s) ago and is still awaiting resubmission.`,
    payload.submissionReference ? `Reference: ${payload.submissionReference}` : "",
    ``,
    `Please log in to the vendor portal and resubmit a corrected invoice.`,
    ``,
    `— TRKR, Mosaic Data Solutions`,
  ].filter((l) => l !== undefined).join("\n");

  await transport.sendMail({ from: SMTP_FROM, to: payload.submitterEmail, subject, text });
  console.log(`[email] Return reminder sent for invoice ${payload.invoiceNumber} → ${payload.submitterEmail}`);
}
