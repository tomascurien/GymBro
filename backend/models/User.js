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
  password: DataTypes.STRING,
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user',
  },
  bio: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  profile_pic: DataTypes.STRING,
  cover_pic: DataTypes.STRING,
  time_stamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'users',  // Forzamos el nombre correcto
  timestamps: false,
});
module.exports = User;