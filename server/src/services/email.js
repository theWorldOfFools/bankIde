import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;

function getTransporter() {
  if (!config.emailEnabled) {
    throw new Error('Email belum dikonfigurasi.');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined,
    });
  }
  return transporter;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

export async function sendEmailReminder(idea) {
  const when = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: config.cronTimezone,
  }).format(new Date(idea.reminder_at));

  const url = `${config.publicAppUrl}/ideas?focus=${idea.id}`;
  const safeTitle = String(idea.title).replace(/[\r\n]+/g, ' ');
  const subject = `[BankIde] Pengingat: ${safeTitle}`;
  const context = idea.context || 'Tanpa konteks.';

  const text = [
    'Pengingat BankIde',
    '',
    idea.title,
    `Kategori: ${idea.category}`,
    `Jadwal: ${when}`,
    '',
    context,
    '',
    `Buka BankIde: ${url}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px">
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#4f46e5">BankIde</p>
      <h2 style="margin:0 0 8px">${escapeHtml(idea.title)}</h2>
      <p style="margin:0 0 16px;color:#64748b">${escapeHtml(idea.category)} &middot; ${escapeHtml(when)}</p>
      <p>${escapeHtml(context).replace(/\n/g, '<br>')}</p>
      <p style="margin-top:24px">
        <a href="${escapeHtml(url)}" style="background:#4f46e5;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none">
          Buka ide
        </a>
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: config.smtp.from,
    to: config.adminEmail,
    subject,
    text,
    html,
  });
}
