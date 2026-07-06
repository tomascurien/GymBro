const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: DataTypes.STRING,
  surname: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: { // Hash de la contraseña
    type: DataTypes.STRING,
    allowNull: false, 
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user',
  },
  bio: {
    type: DataTypes.TEXT, // Mejor TEXT para biografías largas
    defaultValue: '',
  },
  // --- CAMPOS DE IMAGEN ---
  profile_pic: {
    type: DataTypes.STRING(1024), // Aumentamos longitud por si la URL es larga
    allowNull: true,
  },
  cover_pic: {
    type: DataTypes.STRING(1024),
    allowNull: true,
  },
  // ------------------------
  time_stamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'users',  // Forzamos el nombre correcto
  timestamps: false,
});
module.exports = User;