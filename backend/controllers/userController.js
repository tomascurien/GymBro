const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET_KEY = 'gymbro_secret_key';

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

    res.json({ message: 'Usuario registrado exitosamente.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    return res.json({ message: 'Login exitoso.', token, user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al iniciar sesión.' });
  }
};