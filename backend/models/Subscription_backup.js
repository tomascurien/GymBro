const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  suscriptor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  creator_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  start: DataTypes.TEXT,
  end: DataTypes.TEXT,
  state: DataTypes.TEXT, // activa, cancelada, expirada
}, {
  tableName: 'suscription',
  timestamps: false,
});

module.exports = Subscription;