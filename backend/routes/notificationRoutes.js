const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { Notification, User, Post } = require('../models/index');

const ACTOR_ATTRS = ['username', 'name', 'surname', 'profile_pic'];

// Listar las notificaciones del usuario (más recientes primero)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'Actor', attributes: ACTOR_ATTRS },
        { model: Post, attributes: ['id', 'text', 'media_url'] },
      ],
      order: [['id', 'DESC']],
      limit: 50,
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ message: 'Error al obtener las notificaciones.' });
  }
});

// Cantidad de no leídas (para el badge del bell)
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });
    res.json({ count });
  } catch (error) {
    console.error('Error al contar notificaciones:', error);
    res.status(500).json({ message: 'Error al contar notificaciones.' });
  }
});

// Marcar todas como leídas (al abrir la pestaña)
router.post('/read', authMiddleware, async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    res.json({ message: 'Notificaciones marcadas como leídas.' });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ message: 'Error al marcar las notificaciones.' });
  }
});

module.exports = router;
