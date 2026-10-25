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

function layout({ eyebrow, title, body, ctaLabel, ctaUrl }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px">
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#4f46e5">${escapeHtml(eyebrow)}</p>
      <h2 style="margin:0 0 8px">${escapeHtml(title)}</h2>
      ${body}
      ${ctaUrl ? `
      <p style="margin-top:24px">
        <a href="${escapeHtml(ctaUrl)}" style="background:#4f46e5;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none">
          ${escapeHtml(ctaLabel)}
        </a>
      </p>` : ''}
    </div>
  `;
}

async function sendMail({ to, subject, text, html }) {
  if (!to) throw new Error('Alamat email tujuan kosong.');
  await getTransporter().sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
    html,
  });
}

export async function sendEmailReminder(idea, recipient) {
  if (!recipient) {
    throw new Error('Ide tidak memiliki pemilik dengan email aktif.');
  }

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

  const html = layout({
    eyebrow: 'BankIde',
    title: idea.title,
    body: `
      <p style="margin:0 0 16px;color:#64748b">${escapeHtml(idea.category)} &middot; ${escapeHtml(when)}</p>
      <p>${escapeHtml(context).replace(/\n/g, '<br>')}</p>
    `,
    ctaLabel: 'Buka ide',
    ctaUrl: url,
  });

  await sendMail({ to: recipient, subject, text, html });
}

export async function sendVerificationEmail(email, token) {
  const url = `${config.publicAppUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = '[BankIde] Verifikasi email akun';

  const text = [
    'Verifikasi email BankIde',
    '',
    'Klik tautan berikut untuk memverifikasi email akun Anda:',
    url,
    '',
    'Tautan berlaku selama 24 jam. Jika Anda tidak mendaftar, abaikan email ini.',
  ].join('\n');

  const html = layout({
    eyebrow: 'Verifikasi akun',
    title: 'Konfirmasi email Anda',
    body: `
      <p style="margin:0 0 16px;color:#64748b">
        Klik tombol di bawah untuk memverifikasi email. Tautan berlaku selama 24 jam.
      </p>
      <p style="margin:0;color:#64748b">
        Jika Anda tidak mendaftar di BankIde, abaikan email ini.
      </p>
    `,
    ctaLabel: 'Verifikasi email',
    ctaUrl: url,
  });

  await sendMail({ to: email, subject, text, html });
}

export async function sendAccountApprovedEmail(email) {
  const url = `${config.publicAppUrl}/login`;
  const subject = '[BankIde] Akun Anda telah disetujui';

  const text = [
    'Akun BankIde disetujui',
    '',
    'Admin telah menyetujui pendaftaran akun Anda. Silakan masuk:',
    url,
  ].join('\n');

  const html = layout({
    eyebrow: 'Akun disetujui',
    title: 'Selamat, akun Anda aktif',
    body: '<p style="margin:0;color:#64748b">Admin telah menyetujui pendaftaran akun Anda. Silakan masuk untuk mulai mengelola ide.</p>',
    ctaLabel: 'Masuk ke BankIde',
    ctaUrl: url,
  });

  await sendMail({ to: email, subject, text, html });
}

export async function sendAccountRejectedEmail(email) {
  const subject = '[BankIde] Pendaftaran akun ditolak';

  const text = [
    'Pendaftaran BankIde ditolak',
    '',
    'Admin belum dapat menyetujui pendaftaran akun Anda.',
    'Jika menurut Anda ini keliru, silakan hubungi admin workspace.',
  ].join('\n');

  const html = layout({
    eyebrow: 'Pendaftaran ditolak',
    title: 'Akun belum disetujui',
    body: '<p style="margin:0;color:#64748b">Admin belum dapat menyetujui pendaftaran akun Anda. Jika menurut Anda ini keliru, silakan hubungi admin workspace.</p>',
  });

  await sendMail({ to: email, subject, text, html });
}

export async function sendAdminPendingUserEmail(email, user) {
  const url = `${config.publicAppUrl}/admin/users`;
  const subject = '[BankIde] Pendaftaran user menunggu persetujuan';

  const text = [
    'Pendaftaran user baru',
    '',
    `${user.email} telah memverifikasi email dan menunggu persetujuan.`,
    '',
    `Buka halaman kelola user: ${url}`,
  ].join('\n');

  const html = layout({
    eyebrow: 'Persetujuan user',
    title: 'User baru menunggu persetujuan',
    body: `
      <p style="margin:0;color:#64748b">
        <strong>${escapeHtml(user.email)}</strong> telah memverifikasi email dan menunggu persetujuan admin.
      </p>
    `,
    ctaLabel: 'Kelola user',
    ctaUrl: url,
  });

  await sendMail({ to: email, subject, text, html });
}
