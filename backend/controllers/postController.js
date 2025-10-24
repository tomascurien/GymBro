const Post = require('../models/Post');
const jwt = require('jsonwebtoken');

exports.createPost = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Token no proporcionado.' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = decoded.id;

    const { text, image } = req.body;
    if (!text) return res.status(400).json({ message: 'El texto del post es obligatorio.' });

    const post = await Post.create({ content, image, user_id });
    res.json({ message: 'Post creado exitosamente.', post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el post.' });
  }
};