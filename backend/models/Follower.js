const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Follower = sequelize.define('Follower', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  follower_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  followed_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
}, {
  tableName: 'followers',
  timestamps: false,
});

module.exports = Follower;