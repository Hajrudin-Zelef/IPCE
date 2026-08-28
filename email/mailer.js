// Marexsoft Corporation
const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

async function sendValidationEmail({ commercialNom, ca, offres, bc, rdvCount, visites, contacts, zone, notes }) {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'votre.email@gmail.com') {
    console.log('[EMAIL] Configuration non définie — email non envoyé');
    return false;
  }

  const mail = getTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3c72, #2a5298); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">📊 Collecte Validée — IPCE</h2>
      </div>
      <div style="background: #fff; padding: 20px; border: 1px solid #ddd;">
        <p><strong>${escapeHtml(commercialNom)}</strong> a validé sa collecte :</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="background: #f5f5f5;">
// Marexsoft Corporation
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>CA</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${(ca / 1e6).toFixed(1)}M FCFA</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Offres</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${offres}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>BC Signés</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${bc}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>RDV</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${rdvCount}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Visites</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${visites || 0}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Contacts</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${contacts || 0}</td>
          </tr>
          ${zone ? `<tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Zone</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(zone)}</td></tr>` : ''}
        </table>
        ${notes ? `<div style="background:#f9f9f9;padding:12px;border-radius:6px;margin:12px 0;"><div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;margin-bottom:4px;">Notes</div><div style="font-size:13px;white-space:pre-wrap;">${escapeHtml(notes)}</div></div>` : ''}
        <p style="color: #666; font-size: 12px;">Connectez-vous au panel admin pour approuver ou rejeter cette collecte.</p>
      </div>
    </div>
  `;

  try {
    await mail.sendMail({
      from: `"IPCE Dashboard" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || 'admin@ipce.com',
      subject: `📊 Collecte validée par ${commercialNom}`,
      html,
    });
    console.log(`[EMAIL] Envoyé à ${process.env.ADMIN_EMAIL} pour ${commercialNom}`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Erreur envoi:', err.message);
    return false;
  }
}

async function sendResetPasswordEmail({ userName, resetToken }) {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'votre.email@gmail.com') {
    console.log('[EMAIL] Configuration non définie — email de reset non envoyé');
    return false;
  }

  const mail = getTransporter();
  const resetUrl = `${process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',')[0] : 'http://localhost:4600'}/reset-password.html?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1e3c72, #2a5298); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🔑 Réinitialisation de mot de passe — IPCE</h2>
      </div>
      <div style="background: #fff; padding: 20px; border: 1px solid #ddd;">
        <p>Bonjour <strong>${escapeHtml(userName)}</strong>,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Réinitialiser mon mot de passe</a>
        </div>
        <p style="color: #666; font-size: 12px;">Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    </div>
  `;

  try {
    await mail.sendMail({
      from: `"IPCE Dashboard" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || 'admin@ipce.com',
      subject: `🔑 Réinitialisation de mot de passe — ${userName}`,
      html,
    });
    console.log(`[EMAIL] Email de reset envoyé pour ${userName}`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Erreur envoi reset:', err.message);
    return false;
  }
}

module.exports = { sendValidationEmail, sendResetPasswordEmail };
// Marexsoft Corporation
