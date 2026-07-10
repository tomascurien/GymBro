const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Nivel de insignia ganado por un usuario (se persiste al detectarse, así los
// logros sobreviven a futuros cambios de umbrales y habilita notificaciones).
const UserBadge = sequelize.define('UserBadge', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  badge_slug: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tier: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  earned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'user_badges',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['user_id', 'badge_slug', 'tier'] },
  ],
});

module.exports = UserBadge;
