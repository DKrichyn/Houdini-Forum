import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!config.smtp.user || !config.smtp.pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host || 'smtp.gmail.com',
    port: config.smtp.port || 587,
    secure: !!config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });

  return transporter;
}

export async function sendMail(to, subject, text, html) {
  const t = getTransporter();
  if (!t) {
    console.log('[MAIL:FAKE]', { to, subject, text, html });
    return;
  }
  await t.sendMail({
    from: config.emailFrom,
    to,
    subject,
    text: text || '',
    html: html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`,
  });
}

export async function sendEmailConfirm(to, token) {
  const verifyUrl = `${config.frontendUrl}/email-confirm?token=${encodeURIComponent(token)}`;
  const subject = 'Confirm your email';
  const text = `Please confirm your email by opening this link: ${verifyUrl}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${subject}</title>
<style>
  body{margin:0;padding:0;background:#f6f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}
  .container{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,.1)}
  .header{padding:24px;font-size:20px;font-weight:600;color:#111;border-bottom:1px solid #eaeaea}
  .content{padding:24px}
  .content p{font-size:14px;color:#333;line-height:1.6}
  .btn{display:inline-block;margin-top:16px;background:#1f883d;color:#fff !important;text-decoration:none !important;padding:12px 20px;border-radius:6px;font-weight:600}
  .footer{background:#f6f8fa;padding:16px 24px;font-size:12px;color:#6e7781;text-align:center}
</style>
</head>
<body>
  <div class="container">
    <div class="header">USOF Email Confirmation</div>
    <div class="content">
      <p>Thanks for registering! Please confirm your email address.</p>
      <a href="${verifyUrl}" target="_blank" rel="noopener" class="btn">Confirm email</a>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    </div>
    <div class="footer">This link will expire soon. Please do not share it.</div>
  </div>
</body></html>`;

  return sendMail(to, subject, text, html);
}

export async function sendPasswordReset(to, token) {
  const resetUrl = `${config.frontendUrl}/reset/${token}`;
  const subject = 'Reset your password';
  const text = `To reset your password, open this link: ${resetUrl}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${subject}</title>
<style>
  body{margin:0;padding:0;background:#f6f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}
  .container{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,.1)}
  .header{padding:24px;font-size:20px;font-weight:600;color:#111;border-bottom:1px solid #eaeaea}
  .content{padding:24px}
  .content p{font-size:14px;color:#333;line-height:1.6}
  .btn{display:inline-block;margin-top:16px;background:#1f883d;color:#fff !important;text-decoration:none !important;padding:12px 20px;border-radius:6px;font-weight:600}
  .footer{background:#f6f8fa;padding:16px 24px;font-size:12px;color:#6e7781;text-align:center}
</style>
</head>
<body>
  <div class="container">
    <div class="header">USOF Password Reset</div>
    <div class="content">
      <p>We received a request to reset your password. Click the button below to create a new one.</p>
      <a href="${resetUrl}" target="_blank" rel="noopener" class="btn">Reset password</a>
      <p>If you didn’t request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">This link will expire soon. Please do not share it.</div>
  </div>
</body></html>`;

  return sendMail(to, subject, text, html);
}
