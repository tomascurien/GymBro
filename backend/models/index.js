const sequelize = require('../config/database');
const User = require('./User');
const Post = require('./Post');
const Follower = require('./Follower');
const Exercise = require('./Exercise');
const ExerciseImage = require('./ExerciseImage');
const Routine = require('./Routine');
const RoutineExercise = require('./RoutineExercise');
const RoutineSet = require('./RoutineSet');
const FavoriteRoutine = require('./FavouriteRoutines');
const Like = require('./Like');

// const Subscription = require('./Subscription');
// const Payment = require('./models/Payment');

console.log("Definiendo asociaciones de la base de datos");

// Relaciones principales
User.hasMany(Post, { foreignKey: 'user_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

// Seguidores (relación N:M entre usuarios)
User.hasMany(Follower, { foreignKey: 'follower_id', as: 'following' });
User.hasMany(Follower, { foreignKey: 'followed_id', as: 'followers' });
Follower.belongsTo(User, {
  foreignKey: 'follower_id',
  as: 'follower',
});

Follower.belongsTo(User, {
  foreignKey: 'followed_id',
  as: 'followed',
});

// Ejercicios
Exercise.hasMany(ExerciseImage, { foreignKey: 'exercise_id' });
ExerciseImage.belongsTo(Exercise, { foreignKey: 'exercise_id' });

// Rutinas
User.hasMany(Routine, { foreignKey: 'user_id' });
Routine.belongsTo(User, { foreignKey: 'user_id' });

Routine.hasMany(RoutineExercise, { foreignKey: 'routine_id', onDelete: 'CASCADE' });
RoutineExercise.belongsTo(Routine, { foreignKey: 'routine_id' });

// Copias de rutinas (atribución "Basada en la rutina de @user")
Routine.belongsTo(Routine, { foreignKey: 'source_routine_id', as: 'SourceRoutine', onDelete: 'SET NULL' });
Routine.hasMany(Routine, { foreignKey: 'source_routine_id', as: 'Copies' });

Exercise.hasMany(RoutineExercise, { foreignKey: 'exercise_id' });
RoutineExercise.belongsTo(Exercise, { foreignKey: 'exercise_id' });

// Rutinas favoritas
User.hasMany(Routine, { 
  foreignKey: 'user_id', 
  as: 'AuthoredRoutines' // <-- APODO 1
});
Routine.belongsTo(User, { foreignKey: 'user_id' });

User.belongsToMany(Routine, {
  through: FavoriteRoutine,
  foreignKey: 'user_id',
  otherKey: 'routine_id',
  as: 'FavoriteRoutines'
});

Routine.belongsToMany(User, {
  through: FavoriteRoutine,
  foreignKey: 'routine_id',
  otherKey: 'user_id',
  as: 'FavoritedBy'
});

User.hasMany(FavoriteRoutine, { foreignKey: 'user_id' });
FavoriteRoutine.belongsTo(User, { foreignKey: 'user_id' });
Routine.hasMany(FavoriteRoutine, { foreignKey: 'routine_id' });
FavoriteRoutine.belongsTo(Routine, { foreignKey: 'routine_id' });

// Likes
User.hasMany(Like, { foreignKey: 'user_id' });
Like.belongsTo(User, { foreignKey: 'user_id' });
Post.hasMany(Like, { foreignKey: 'post_id', onDelete: 'CASCADE' });
Like.belongsTo(Post, { foreignKey: 'post_id' });

// Sets
RoutineExercise.hasMany(RoutineSet, { foreignKey: 'routine_exercise_id', onDelete: 'CASCADE' });
RoutineSet.belongsTo(RoutineExercise, { foreignKey: 'routine_exercise_id' });
console.log("Asociaciones definidas.");

module.exports = {
  sequelize,
  User,
  Post,
  Follower,
  Exercise,
  ExerciseImage,
  Routine,
  RoutineExercise,
  RoutineSet,
  FavoriteRoutine,
  Like
};