const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Exercise = require('./Exercise');

class ExerciseImage extends Model {}

ExerciseImage.init({
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
  exercise_id: { // Foreign Key
    type: DataTypes.INTEGER,
    references: {
      model: Exercise,
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'ExerciseImage',
  timestamps: false
});

Exercise.hasMany(ExerciseImage, { foreignKey: 'exercise_id' });
ExerciseImage.belongsTo(Exercise, { foreignKey: 'exercise_id' });

module.exports = ExerciseImage;