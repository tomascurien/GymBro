const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { SECRET_KEY } = require('../middleware/authMiddleware');

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

// Registro
exports.register = async (req, res) => {
  try {
    const { username, name, surname, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      name,
      surname,
      email,
      password: hashedPassword,
    });

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

    const token = signToken(user);

    return res.json({ message: 'Login exitoso.', token, user: toSafeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al iniciar sesión.' });
  }
};
