const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { SECRET_KEY } = require('../middleware/authMiddleware');
const { isEmailEnabled, sendVerificationEmail } = require('../services/emailService');

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

// Nunca devolver el hash de la contraseña al cliente
const toSafeUser = (user) => {
  const { password, ...safeUser } = user.toJSON();
  return safeUser;
};

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET_KEY,
    { expiresIn: '7d' }
  );

const signVerifyToken = (user) =>
  jwt.sign({ id: user.id, purpose: 'verify-email' }, SECRET_KEY, { expiresIn: '24h' });

const buildVerifyLink = (user) =>
  `${FRONTEND_URL}/verify?token=${signVerifyToken(user)}`;

// Registro
exports.register = async (req, res) => {
  try {
    const { username, name, surname, email, password, lang } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    const emailEnabled = isEmailEnabled();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      name,
      surname,
      email,
      password: hashedPassword,
      // Sin envío de emails configurado no podemos exigir confirmación
      email_verified: !emailEnabled,
    });

    if (emailEnabled) {
      try {
        await sendVerificationEmail(user.email, user.name, buildVerifyLink(user), lang);
      } catch (mailErr) {
        // El usuario queda creado; puede reenviar el correo desde el login
        console.error('Error enviando correo de verificación:', mailErr.message);
      }
      return res.status(201).json({
        message: 'Cuenta creada. Revisá tu correo para confirmarla.',
        pendingVerification: true,
        email: user.email,
      });
    }

    // Token inmediato para auto-login tras el registro
    const token = signToken(user);
    res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      token,
      user: toSafeUser(user),
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'El nombre de usuario o email ya está en uso.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Error al registrar el usuario.' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Mensaje genérico en ambos casos para no revelar qué emails existen
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Email o contraseña incorrectos.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Email o contraseña incorrectos.' });

    if (!user.email_verified && isEmailEnabled()) {
      return res.status(403).json({
        message: 'Tu cuenta todavía no está confirmada. Revisá tu correo.',
        needsVerification: true,
      });
    }

    const token = signToken(user);

    return res.json({ message: 'Login exitoso.', token, user: toSafeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al iniciar sesión.' });
  }
};

// Confirmar correo: valida el token del link y devuelve una sesión
// (así el clic en el mail es también el primer login → onboarding directo)
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Falta el token.' });

    let payload;
    try {
      payload = jwt.verify(token, SECRET_KEY);
    } catch (e) {
      return res.status(400).json({ message: 'El enlace expiró o no es válido.' });
    }
    if (payload.purpose !== 'verify-email') {
      return res.status(400).json({ message: 'El enlace expiró o no es válido.' });
    }

    const user = await User.findByPk(payload.id);
    if (!user) return res.status(400).json({ message: 'El enlace expiró o no es válido.' });

    // Idempotente: clickear el link dos veces también funciona
    if (!user.email_verified) await user.update({ email_verified: true });

    return res.json({
      message: 'Correo confirmado.',
      token: signToken(user),
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al confirmar el correo.' });
  }
};

// Reenviar correo de verificación. Respuesta siempre genérica (sin enumeración)
// y con rate limit de 60s por email para no ser usados como cañón de spam.
const lastResend = new Map();
exports.resendVerification = async (req, res) => {
  const generic = { message: 'Si la cuenta existe y no está confirmada, reenviamos el correo.' };
  try {
    const { email, lang } = req.body;
    if (!email || !isEmailEnabled()) return res.json(generic);

    const key = String(email).toLowerCase();
    const last = lastResend.get(key);
    if (last && Date.now() - last < 60_000) return res.json(generic);
    lastResend.set(key, Date.now());

    const user = await User.findOne({ where: { email } });
    if (user && !user.email_verified) {
      await sendVerificationEmail(user.email, user.name, buildVerifyLink(user), lang);
    }
    return res.json(generic);
  } catch (error) {
    console.error('Error reenviando verificación:', error);
    return res.json(generic);
  }
};
