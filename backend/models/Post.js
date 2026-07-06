const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Post = sequelize.define("Post", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  text: {
    type: DataTypes.TEXT, // Cambiado a TEXT para permitir posts largos
    allowNull: true,
  },
  // --- NUEVOS CAMPOS ---
  media_url: {
    type: DataTypes.STRING, // La URL pública de Supabase
    allowNull: true,
  },
  media_type: {
    type: DataTypes.ENUM('image', 'video', 'none'),
    defaultValue: 'none',
  },
  // Campo 'image' legacy (lo mantenemos por compatibilidad temporal o lo eliminamos)
  // Si decides mantenerlo, úsalo como fallback del media_url
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // ---------------------
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  likes_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: "posts",
  timestamps: false,
});

Post.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Post, { foreignKey: "user_id" });

module.exports = Post;