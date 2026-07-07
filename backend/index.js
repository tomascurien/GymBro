require('dotenv').config();
const { sequelize } = require('./models');

const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require("./routes/postRoutes");
const exerciseRoutes = require("./routes/exercisesRoutes");
const routineRoutes = require("./routes/routineRoutes");

const app = express();

// CORS: con ALLOWED_ORIGINS (lista separada por comas, ej. "https://forma.app,http://localhost:3000")
// solo esos orígenes pueden llamar a la API; sin la variable queda abierto (modo dev).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

if (allowedOrigins.length > 0) {
  app.use(cors({ origin: allowedOrigins }));
} else {
  console.warn('⚠️  CORS abierto a cualquier origen. Definí ALLOWED_ORIGINS en producción.');
  app.use(cors());
}
app.use(express.json());

// Rutas
app.use('/api/users', userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/routines", routineRoutes);
// Test de conexión
app.get('/', (req, res) => {
  res.send('Forma API funcionando');
});

// Puerto: Railway (u otro host) inyecta process.env.PORT; en local cae a 3001
const PORT = process.env.PORT || 3001;

// Sincronizar DB y lanzar servidor
sequelize.sync({ alter: true }).then(() => {
  console.log("Base de datos sincronizada.");
  app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
});