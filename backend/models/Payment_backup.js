const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  suscription_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: DataTypes.INTEGER,
  date: DataTypes.TEXT,
  state: DataTypes.TEXT, // pendiente, completado, fallido
}, {
  tableName: 'payment',
  timestamps: false,
});

module.exports = Payment;