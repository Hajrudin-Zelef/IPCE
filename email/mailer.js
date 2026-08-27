const nodemailer = require('nodemailer');

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
        <p><strong>${commercialNom}</strong> a validé sa collecte :</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="background: #f5f5f5;">
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
          ${zone ? `<tr style="background: #f5f5f5;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Zone</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${zone}</td></tr>` : ''}
        </table>
        ${notes ? `<div style="background:#f9f9f9;padding:12px;border-radius:6px;margin:12px 0;"><div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;margin-bottom:4px;">Notes</div><div style="font-size:13px;white-space:pre-wrap;">${notes}</div></div>` : ''}
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

module.exports = { sendValidationEmail };
