const express = require("express");
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { Post, User, Follower } = require("../models/index");
const { Op } = require("sequelize"); // following feed
const { upload, uploadFileToSupabase } = require('../services/uploadService');

//  Crear un nuevo post
router.post("/", authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { text } = req.body; // El texto sigue viniendo en el body
    const userId = req.user.id;
    let mediaUrl = null;
    let mediaType = 'none';

    // Si se subió un archivo, lo procesamos
    if (req.file) {
      console.log(`Subiendo archivo: ${req.file.originalname} (${req.file.mimetype})...`);
      
      // 1. Subir a Supabase (Bucket 'gymbro-media' o el que hayas creado)
      // Asegúrate de crear el bucket 'gymbro-media' en Supabase y hacerlo público
      mediaUrl = await uploadFileToSupabase(req.file, 'gymbro-posts');
      
      // 2. Determinar el tipo de medio
      if (req.file.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      }
    }

    // 3. Crear el post en la base de datos
    const newPost = await Post.create({
      user_id: userId,
      text: text || '', // Puede estar vacío si sube solo una foto
      media_url: mediaUrl,
      media_type: mediaType
    });

    // 4. Devolver el post completo con datos del usuario
    const postWithUser = await Post.findOne({
      where: { id: newPost.id },
      include: {
        model: User,
        attributes: ['username', 'name', 'surname', 'profile_pic'] 
      }
    });

    res.status(201).json(postWithUser);

  } catch (error) {
    console.error("Error al crear el post:", error);
    res.status(500).json({ message: "Error al crear el post: " + error.message });
  }
});

router.get("/following", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const followingList = await Follower.findAll({
      where: { follower_id: userId},
      attributes: ['followed_id']
    });

    //array de ids
    const followingIds = followingList.map(f => f.followed_id);

    // OP = comando IN de SQL
    //WHERE busca un solo ID entonces conviene usar OP
    const posts = await Post.findAll({
      where: {
        user_id: {
          [Op.in]: followingIds
        }
      },
      include: [
        {
          model: User,
          attributes: ["username", "name", "surname", "profile_pic"],
        },
      ],
      order: [["id", "DESC"]], // En el mismo orden que el feed global
    });

    res.json(posts);

  } catch (error) {
    console.error("Error al obtener el feed de seguidos:", error);
    res.status(500).json({ message: "Error al obtener el feed." });
  }
})
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

    const posts = await Post.findAll({
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
    if (post.user_id !== userId && req.user.role !== "admin") {
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
