// config/database.js
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./GymBro.db", 
});

module.exports = sequelize;