const { sequelize } = require('./models');

const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require("./routes/postRoutes");
const exerciseRoutes = require("./routes/exercisesRoutes");
const routineRoutes = require("./routes/routineRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/users', userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/routines", routineRoutes);
// Test de conexión
app.get('/', (req, res) => {
  res.send('GymBro API funcionando ');
});

// Sincronizar DB y lanzar servidor
sequelize.sync().then(() => {
  console.log(" Base de datos recreada desde cero");
  app.listen(3001, () => console.log(" Servidor corriendo en http://localhost:3001"));
});