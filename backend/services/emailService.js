const nodemailer = require('nodemailer');

// Envío de correos vía Gmail SMTP (app password). La verificación de email
// solo se activa si hay credenciales configuradas; con EMAIL_DEBUG=true se
// "envía" logueando el link a consola (para desarrollo sin SMTP).
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_DEBUG = process.env.EMAIL_DEBUG === 'true';

const isConfigured = !!(GMAIL_USER && GMAIL_APP_PASSWORD);
const isEmailEnabled = () => isConfigured || EMAIL_DEBUG;

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

const TEMPLATES = {
  es: {
    subject: 'Confirmá tu correo — Forma',
    title: 'Aprende. Comparte. Crece.',
    body: 'Hola {name}, ¡bienvenido a Forma! Tocá el botón para confirmar tu correo y activar tu cuenta.',
    button: 'Confirmar mi correo',
    footer: 'Si no creaste esta cuenta, ignorá este correo. El enlace vence en 24 horas.',
  },
  en: {
    subject: 'Confirm your email — Forma',
    title: 'Learn. Share. Grow.',
    body: "Hi {name}, welcome to Forma! Click the button to confirm your email and activate your account.",
    button: 'Confirm my email',
    footer: "If you didn't create this account, ignore this email. The link expires in 24 hours.",
  },
};

const buildHtml = (t, name, link) => `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#0a0c0b;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#151917;border:1px solid #2d3531;border-radius:16px;padding:32px;text-align:center;">
      <div style="font-size:28px;font-weight:bold;color:#a3e635;margin-bottom:4px;">forma</div>
      <p style="color:#96a29a;font-size:14px;margin:0 0 24px;">${t.title}</p>
      <p style="color:#ecf1ed;font-size:16px;line-height:1.5;margin:0 0 24px;">${t.body.replace('{name}', name || '')}</p>
      <a href="${link}" style="display:inline-block;background:#a3e635;color:#0d100e;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:16px;">${t.button}</a>
      <p style="color:#96a29a;font-size:12px;margin:24px 0 0;">${t.footer}</p>
    </div>
  </div>`;

const sendVerificationEmail = async (email, name, link, lang) => {
  const t = TEMPLATES[lang === 'en' ? 'en' : 'es'];

  if (!isConfigured && EMAIL_DEBUG) {
    console.log(`[email-debug] verificación para ${email}: ${link}`);
    return;
  }

  await transporter.sendMail({
    from: `"Forma" <${GMAIL_USER}>`,
    to: email,
    subject: t.subject,
    html: buildHtml(t, name, link),
  });
};

module.exports = { isEmailEnabled, sendVerificationEmail };
