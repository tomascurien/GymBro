const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Esto define cada set para un ejercicio en una rutina
const RoutineSet = sequelize.define('RoutineSet', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  routine_exercise_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'routine_exercises',
      key: 'id',
    },
  },
  index: { // Set 1, Set 2, Set 3...
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'normal', // 'normal', 'warmup', 'drop', 'failure'
  }
}, {
  tableName: 'routine_sets',
  timestamps: false,
});

module.exports = RoutineSet;