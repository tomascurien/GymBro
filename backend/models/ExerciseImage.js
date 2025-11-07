const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExerciseImage = sequelize.define('ExerciseImage', {
  id: { 
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  is_main: {
    type: DataTypes.BOOLEAN
  },
  exercise_id: {
    type: DataTypes.INTEGER
  }

}, {
  sequelize,
  modelName: 'ExerciseImage',
  timestamps: false
});

module.exports = ExerciseImage;