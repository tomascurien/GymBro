const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 

const Exercise = sequelize.define('Exercise', {
  id: { 
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: { 
    type: DataTypes.INTEGER
  },

}, {
  sequelize,
  modelName: 'Exercise',
  timestamps: false 
});

module.exports = Exercise;