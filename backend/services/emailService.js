const nodemailer = require('nodemailer');

// Envío de correos de verificación. Transportes, en orden de prioridad:
//   1. Brevo HTTP API (BREVO_API_KEY + EMAIL_FROM) — va por HTTPS/443, funciona
//      en hosts que bloquean SMTP saliente (Railway en planes free/trial).
//   2. Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) — para local u hosts sin bloqueo.
//   3. EMAIL_DEBUG=true — no envía: loguea el link a consola (desarrollo).
const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
// Google muestra el app password con espacios ("abcd efgh ..."); los sacamos
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').trim();
// Remitente para Brevo: debe estar verificado en la cuenta de Brevo
const EMAIL_FROM = (process.env.EMAIL_FROM || GMAIL_USER || '').trim();
const EMAIL_DEBUG = process.env.EMAIL_DEBUG === 'true';

const brevoConfigured = !!(BREVO_API_KEY && EMAIL_FROM);
const gmailConfigured = !!(GMAIL_USER && GMAIL_APP_PASSWORD);
const isConfigured = brevoConfigured || gmailConfigured;
const isEmailEnabled = () => isConfigured || EMAIL_DEBUG;

let transporter = null;
if (brevoConfigured) {
  // Chequeo al boot: deja en los logs si la API key de Brevo es válida
  fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': BREVO_API_KEY } })
    .then(async (r) => {
      if (r.ok) {
        console.log(`✅ Brevo listo (enviando como ${EMAIL_FROM}).`);
      } else {
        console.error(`❌ Brevo configurado pero la API key no valida: HTTP ${r.status} ${await r.text()}`);
      }
    })
    .catch((e) => console.error(`❌ Brevo configurado pero falló la verificación: ${e.message}`));
} else if (gmailConfigured) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    // Que un SMTP caído no deje colgado el registro
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
  transporter.verify()
    .then(() => console.log(`✅ SMTP listo (enviando como ${GMAIL_USER}).`))
    .catch((e) => console.error(`❌ SMTP configurado pero falló la verificación: ${e.message} (si es "Connection timeout", el host bloquea SMTP saliente: usá Brevo con BREVO_API_KEY)`));
} else if (EMAIL_DEBUG) {
  console.log('📧 Email en modo debug: los links de verificación se loguean a consola.');
} else {
  console.log('📧 Email no configurado: el registro no exige confirmación.');
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

const sendViaBrevo = async (to, subject, html) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Forma', email: EMAIL_FROM },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo HTTP ${res.status}: ${await res.text()}`);
  }
};

const sendVerificationEmail = async (email, name, link, lang) => {
  const t = TEMPLATES[lang === 'en' ? 'en' : 'es'];

  if (!isConfigured && EMAIL_DEBUG) {
    console.log(`[email-debug] verificación para ${email}: ${link}`);
    return;
  }

  const html = buildHtml(t, name, link);
  if (brevoConfigured) {
    await sendViaBrevo(email, t.subject, html);
  } else {
    await transporter.sendMail({
      from: `"Forma" <${GMAIL_USER}>`,
      to: email,
      subject: t.subject,
      html,
    });
  }
};

module.exports = { isEmailEnabled, sendVerificationEmail };
