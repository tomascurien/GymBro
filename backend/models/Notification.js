const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Notificación que recibe un usuario (user_id) por una acción de otro (actor_id).
const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {        // destinatario (dueño del post)
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  actor_id: {       // quien la generó
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {           // 'like' | 'comment'
    type: DataTypes.STRING,
    allowNull: false,
  },
  post_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  comment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notifications',
  timestamps: false,
});

module.exports = Notification;
