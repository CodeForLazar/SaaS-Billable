import type { ReactElement } from 'react';
import nodemailer from 'nodemailer';
import { render, toPlainText } from 'react-email';

// One SMTP transport for the whole app. Locally it points at Mailpit; in production at a real SMTP provider.
const transporter = nodemailer.createTransport({
   host: process.env.SMTP_HOST,
   port: Number(process.env.SMTP_PORT),
   secure: process.env.SMTP_SECURE === 'true',
   auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
});

type SendEmailOptions = {
   to: string;
   subject: string;
   react: ReactElement;
};

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
   const html = await render(react);
   // A plain-text version helps deliverability and is shown by clients that don't render HTML.
   const text = toPlainText(html);

   await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, html, text });
}
