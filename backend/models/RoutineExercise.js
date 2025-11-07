const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Esto conecta un ejercicio de wger con una Rutina del usuario
const RoutineExercise = sequelize.define('RoutineExercise', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  routine_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'routines',
      key: 'id',
    },
  },
  exercise_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Exercises',
      key: 'id',
    },
  },
  index: { // Para el orden (0, 1, 2, 3...)
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  weight_kg: {
    type: DataTypes.DECIMAL(5, 2), // 5 dígitos, 2 decimales (ej. 100.25)
    allowNull: true,
  },
  reps: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'routine_exercises',
  timestamps: false,
});

module.exports = RoutineExercise;