const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Routine = sequelize.define('Routine', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // Referencia a tu tabla 'users'
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Mi Rutina',
  },
  // Atribución: si la rutina se creó copiando otra ("Basada en la rutina de @user").
  // SET NULL al borrar la original para no romper las copias.
  source_routine_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

}, {
  tableName: 'routines',
  timestamps: true, // 'created_at' y 'updated_at'
});

module.exports = Routine;