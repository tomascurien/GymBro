const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const User = require("../models/User");

//  Crear un nuevo post
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { text, image } = req.body;
    const userId = req.user.id;

    await Post.create({
      user_id: userId,
      text,
      image,
      created_at: new Date().toISOString(),
    });

    res.json({ message: "Post creado exitosamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear el post." });
  }
});

//  Obtener el feed global
router.get("/feed", async (req, res) => {
  try {
    const posts = await Post.findAll({
      include: [
        {
          model: User,
          attributes: ["username", "name", "surname", "profile_pic"],
        },
      ],
      order: [["id", "DESC"]],
    });
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el feed." });
  }
});

//  Obtener los posts de un usuario por su @username
router.get("/user/:username", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username },
    });

    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado." });

    const posts = await Post.delete({
      where: { user_id: user.id },
      include: [
        {
          model: User,
          attributes: ["username", "name", "surname", "profile_pic"],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los posts del usuario." });
  }
});

// DELETE /api/posts/:id -> eliminar post (solo autor)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "Post no encontrado." });
    }

    // Verificar que el usuario autenticado sea el autor
    if (post.user_id !== userId) {
      return res.status(403).json({ message: "No tienes permiso para eliminar este post." });
    }
    await post.destroy(); // eliminación real
    return res.json({ message: "Post eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar post:", error);
    return res.status(500).json({ message: "Error interno al eliminar el post." });
  }
});

module.exports = router;