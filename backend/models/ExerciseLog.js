const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Registro de progreso: qué levantó el usuario en un ejercicio, cuándo.
// Vive por (user, exercise) — NO pertenece a la rutina: el historial sobrevive
// a copias/compras de rutinas y cruza rutinas distintas. routine_exercise_id
// es solo contexto opcional (qué prescripción estaba siguiendo).
const ExerciseLog = sequelize.define('ExerciseLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  exercise_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  routine_exercise_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  weight_kg: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
  },
  reps: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sets: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'exercise_logs',
  timestamps: false,
  indexes: [
    { fields: ['user_id', 'exercise_id', 'created_at'] },
  ],
});

module.exports = ExerciseLog;
