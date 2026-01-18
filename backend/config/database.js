// config/database.js
require('dotenv').config(); 

const { Sequelize } = require('sequelize');

// Verificar que las variables existan (útil para depurar si algo falla)
if (!process.env.DB_PASSWORD) {
  console.error('❌ Error: No se encontró la variable DB_PASSWORD. Revisa tu archivo .env');
}

const sequelize = new Sequelize(
  process.env.DB_NAME,      // Nombre de la BD (postgres)
  process.env.DB_USER,      // Usuario (postgres)
  process.env.DB_PASSWORD,  // Tu contraseña secreta
  {
    host: process.env.DB_HOST, // El host de Supabase
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',       // ¡Importante! Cambiamos de 'sqlite' a 'postgres'
    logging: false,            // Poner en 'true' si quieres ver las consultas SQL en la consola
    
    // Configuración específica para Supabase (SSL es obligatorio)
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Esto evita errores de certificados auto-firmados en la nube
      }
    }
  }
);

module.exports = sequelize;