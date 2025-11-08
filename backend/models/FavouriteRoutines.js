const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FavoriteRoutine = sequelize.define('FavoriteRoutine', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  routine_id: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'routines', 
      key: 'id',
    },
  },
}, {
  tableName: 'favorite_routines',
  timestamps: true, 
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'routine_id']
    }
  ]
});

module.exports = FavoriteRoutine;