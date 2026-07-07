const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { authMiddleware, SECRET_KEY } = require('../middleware/authMiddleware');
const { Post, User, Follower, Like } = require("../models/index");
const { Op } = require("sequelize");
const { upload, uploadFileToSupabase } = require('../services/uploadService');
const { TOPICS } = require('../constants/topics');

// Auth opcional: si viene un token válido setea req.user, si no sigue como anónimo.
// Lo usamos en los feeds públicos para poder marcar isLiked y boostear seguidos.
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], SECRET_KEY);
    } catch (e) {
      // Token inválido/expirado en ruta pública: lo tratamos como anónimo
    }
  }
  next();
};

const USER_ATTRS = ["username", "name", "surname", "profile_pic"];

// Agrega isLiked a cada post según el usuario autenticado (si lo hay).
const annotateLikes = async (posts, userId) => {
  const plain = posts.map(p => (p.get ? p.get({ plain: true }) : p));
  if (!userId || plain.length === 0) {
    return plain.map(p => ({ ...p, isLiked: false }));
  }
  const likes = await Like.findAll({
    where: {
      user_id: userId,
      post_id: { [Op.in]: plain.map(p => p.id) },
    },
    attributes: ['post_id'],
  });
  const likedIds = new Set(likes.map(l => l.post_id));
  return plain.map(p => ({ ...p, isLiked: likedIds.has(p.id) }));
};

const parsePagination = (req, defLimit = 20, maxLimit = 50) => {
  const limit = Math.min(parseInt(req.query.limit) || defLimit, maxLimit);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  return { limit, offset };
};

//  Crear un nuevo post
router.post("/", authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { text, topic } = req.body;
    const userId = req.user.id;
    let mediaUrl = null;
    let mediaType = 'none';

    if (req.file) {
      console.log(`Subiendo archivo: ${req.file.originalname} (${req.file.mimetype})...`);
      mediaUrl = await uploadFileToSupabase(req.file, 'gymbro-posts');

      if (req.file.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      }
    }

    const newPost = await Post.create({
      user_id: userId,
      text: text || '',
      media_url: mediaUrl,
      media_type: mediaType,
      topic: TOPICS.includes(topic) ? topic : null
    });

    const postWithUser = await Post.findOne({
      where: { id: newPost.id },
      include: { model: User, attributes: USER_ATTRS }
    });

    res.status(201).json(postWithUser);

  } catch (error) {
    console.error("Error al crear el post:", error);
    res.status(500).json({ message: "Error al crear el post: " + error.message });
  }
});

// Dar like a un post
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await Post.findByPk(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado." });

    const [, created] = await Like.findOrCreate({
      where: { user_id: req.user.id, post_id: postId },
    });

    if (created) {
      await post.increment('likes_count');
      await post.reload();
    }

    res.json({ isLiked: true, likes_count: post.likes_count });
  } catch (error) {
    console.error("Error al dar like:", error);
    res.status(500).json({ message: "Error al dar like." });
  }
});

// Quitar like
router.delete("/:id/like", authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await Post.findByPk(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado." });

    const deleted = await Like.destroy({
      where: { user_id: req.user.id, post_id: postId },
    });

    if (deleted && post.likes_count > 0) {
      await post.decrement('likes_count');
      await post.reload();
    }

    res.json({ isLiked: false, likes_count: post.likes_count });
  } catch (error) {
    console.error("Error al quitar like:", error);
    res.status(500).json({ message: "Error al quitar like." });
  }
});

// Feed "Para vos": ranking por engagement + frescura + afinidad.
// score = (likes*3 + 1) / (horas + 2)^1.5, con boosts si seguís al autor,
// si el tema del post está entre tus intereses y (menor) si tiene media.
// Público: sin login no hay boost social ni de intereses.
router.get("/for-you", optionalAuth, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req);
    const userId = req.user?.id || null;

    // Pool de candidatos: los últimos 300 posts alcanzan para una app de este tamaño.
    const candidates = await Post.findAll({
      include: [{ model: User, attributes: USER_ATTRS }],
      order: [["id", "DESC"]],
      limit: 300,
    });

    let followedIds = new Set();
    let interests = new Set();
    if (userId) {
      const [following, me] = await Promise.all([
        Follower.findAll({
          where: { follower_id: userId },
          attributes: ['followed_id'],
        }),
        User.findByPk(userId, { attributes: ['interests'] }),
      ]);
      followedIds = new Set(following.map(f => f.followed_id));
      interests = new Set(Array.isArray(me?.interests) ? me.interests : []);
    }

    const now = Date.now();
    const scored = candidates.map(p => {
      const post = p.get({ plain: true });
      const ageHours = Math.max((now - new Date(post.created_at).getTime()) / 36e5, 0);
      let score = ((post.likes_count || 0) * 3 + 1) / Math.pow(ageHours + 2, 1.5);
      if (followedIds.has(post.user_id)) score *= 1.75;
      if (post.topic && interests.has(post.topic)) score *= 1.5;
      if (post.user_id === userId) score *= 0.8; // tu propio contenido, un poco menos
      if (post.media_type && post.media_type !== 'none') score *= 1.15;
      return { post, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const page = scored.slice(offset, offset + limit).map(s => s.post);
    const annotated = await annotateLikes(page, userId);

    res.json(annotated);
  } catch (error) {
    console.error("Error en el feed for-you:", error);
    res.status(500).json({ message: "Error al obtener el feed." });
  }
});

router.get("/following", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, offset } = parsePagination(req);

    const followingList = await Follower.findAll({
      where: { follower_id: userId },
      attributes: ['followed_id']
    });

    const followingIds = followingList.map(f => f.followed_id);

    const posts = await Post.findAll({
      where: { user_id: { [Op.in]: followingIds } },
      include: [{ model: User, attributes: USER_ATTRS }],
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    res.json(await annotateLikes(posts, userId));

  } catch (error) {
    console.error("Error al obtener el feed de seguidos:", error);
    res.status(500).json({ message: "Error al obtener el feed." });
  }
});

//  Feed global cronológico (Reciente)
router.get("/feed", optionalAuth, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req);
    const posts = await Post.findAll({
      include: [{ model: User, attributes: USER_ATTRS }],
      order: [["id", "DESC"]],
      limit,
      offset,
    });
    res.json(await annotateLikes(posts, req.user?.id || null));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el feed." });
  }
});

//  Obtener los posts de un usuario por su @username
router.get("/user/:username", optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username },
    });

    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado." });

    const posts = await Post.findAll({
      where: { user_id: user.id },
      include: [{ model: User, attributes: USER_ATTRS }],
      order: [["id", "DESC"]],
    });

    res.json(await annotateLikes(posts, req.user?.id || null));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los posts del usuario." });
  }
});

// DELETE /api/posts/:id -> eliminar post (solo autor o admin)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.id;

    const post = await Post.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "Post no encontrado." });
    }

    if (post.user_id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "No tienes permiso para eliminar este post." });
    }
    await post.destroy();
    return res.json({ message: "Post eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar post:", error);
    return res.status(500).json({ message: "Error interno al eliminar el post." });
  }
});

module.exports = router;
