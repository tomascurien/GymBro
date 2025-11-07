const sequelize = require('./config/database');
const User = require('./models/User');
//const Subscription = require('./models/Subscription');
//const Payment = require('./models/Payment');
const Post = require('./models/Post');
const Follower = require ('./models/Follower');

// Relaciones principales
User.hasMany(Post, { foreignKey: 'user_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

// Seguidores (relación N:M entre usuarios)
User.hasMany(Follower, { foreignKey: 'follower_id', as: 'Following' });
User.hasMany(Follower, { foreignKey: 'followed_id', as: 'Followers' });

// Suscripciones y pagos 
//User.hasMany(Subscription, { foreignKey: 'suscriptor_id', as: 'SuscripcionesHechas' });
//User.hasMany(Subscription, { foreignKey: 'creator_id', as: 'Suscriptores' });
//Subscription.belongsTo(User, { foreignKey: 'suscriptor_id', as: 'Suscriptor' });
//Subscription.belongsTo(User, { foreignKey: 'creator_id', as: 'Creador' });
//User.hasMany(Payment, { foreignKey: 'user_id' });
//Payment.belongsTo(User, { foreignKey: 'user_id' });
//Subscription.hasMany(Payment, { foreignKey: 'suscription_id' });
//Payment.belongsTo(Subscription, { foreignKey: 'suscription_id' });

const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require("./routes/postRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/users', userRoutes);
app.use("/api/posts", postRoutes);

// Test de conexión
app.get('/', (req, res) => {
  res.send('GymBro API funcionando ');
});

// Sincronizar DB y lanzar servidor
sequelize.sync().then(() => {
  console.log(" Base de datos recreada desde cero");
  app.listen(3001, () => console.log(" Servidor corriendo en http://localhost:3001"));
});