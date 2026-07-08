const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { authMiddleware, SECRET_KEY } = require('../middleware/authMiddleware');
const { Post, User, Follower, Like, Comment } = require("../models/index");
const { Op } = require("sequelize");
const { upload, uploadFileToSupabase } = require('../services/uploadService');
const { TOPICS, TAG_TO_TOPIC } = require('../constants/topics');
const { extractHashtags } = require('../utils/hashtags');

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
      topic: TOPICS.includes(topic) ? topic : null,
      hashtags: extractHashtags(text)
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

// ----- Comentarios -----

// Listar los comentarios de un post (público, cronológico)
router.get("/:id/comments", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const comments = await Comment.findAll({
      where: { post_id: postId },
      include: [{ model: User, attributes: USER_ATTRS }],
      order: [["id", "ASC"]],
    });
    res.json(comments);
  } catch (error) {
    console.error("Error al obtener comentarios:", error);
    res.status(500).json({ message: "Error al obtener los comentarios." });
  }
});

// Crear un comentario (requiere login)
router.post("/:id/comments", authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const text = (req.body.text || "").trim();
    if (!text) {
      return res.status(400).json({ message: "El comentario no puede estar vacío." });
    }

    const post = await Post.findByPk(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado." });

    const comment = await Comment.create({
      post_id: postId,
      user_id: req.user.id,
      text,
    });
    await post.increment("comments_count");

    const withUser = await Comment.findByPk(comment.id, {
      include: [{ model: User, attributes: USER_ATTRS }],
    });
    res.status(201).json(withUser);
  } catch (error) {
    console.error("Error al crear comentario:", error);
    res.status(500).json({ message: "Error al crear el comentario." });
  }
});

// Eliminar un comentario (autor o admin)
router.delete("/:id/comments/:commentId", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findByPk(parseInt(req.params.commentId));
    if (!comment) return res.status(404).json({ message: "Comentario no encontrado." });

    if (comment.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "No tenés permiso para eliminar este comentario." });
    }

    const post = await Post.findByPk(comment.post_id);
    await comment.destroy();
    if (post && post.comments_count > 0) {
      await post.decrement("comments_count");
    }

    res.json({ message: "Comentario eliminado." });
  } catch (error) {
    console.error("Error al eliminar comentario:", error);
    res.status(500).json({ message: "Error al eliminar el comentario." });
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
    const tasteTags = new Map(); // tag/tema -> peso, aprendido de tus likes
    if (userId) {
      const [following, me, myLikes] = await Promise.all([
        Follower.findAll({
          where: { follower_id: userId },
          attributes: ['followed_id'],
        }),
        User.findByPk(userId, { attributes: ['interests'] }),
        Like.findAll({
          where: { user_id: userId },
          order: [['id', 'DESC']],
          limit: 100,
          attributes: ['post_id'],
        }),
      ]);
      followedIds = new Set(following.map(f => f.followed_id));
      interests = new Set(Array.isArray(me?.interests) ? me.interests : []);

      if (myLikes.length) {
        const likedPosts = await Post.findAll({
          where: { id: { [Op.in]: myLikes.map(l => l.post_id) } },
          attributes: ['hashtags', 'topic'],
        });
        likedPosts.forEach(p => {
          (Array.isArray(p.hashtags) ? p.hashtags : []).forEach(h =>
            tasteTags.set(h, (tasteTags.get(h) || 0) + 1));
          if (p.topic) tasteTags.set(p.topic, (tasteTags.get(p.topic) || 0) + 1);
        });
      }
    }

    const now = Date.now();
    const scored = candidates.map(p => {
      const post = p.get({ plain: true });
      const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
      const ageHours = Math.max((now - new Date(post.created_at).getTime()) / 36e5, 0);
      let score = ((post.likes_count || 0) * 3 + 1) / Math.pow(ageHours + 2, 1.5);
      if (followedIds.has(post.user_id)) score *= 1.75;

      // Interés explícito: el tema del post, o un hashtag que mapea a un tema
      // que te interesa (#hopecore -> motivation, #gymtok -> gym, ...)
      const interestHit =
        (post.topic && interests.has(post.topic)) ||
        tags.some(tag => interests.has(TAG_TO_TOPIC[tag] || tag));
      if (interestHit) score *= 1.5;

      // Gusto implícito: solapamiento de tags/tema con lo que likeaste (acotado)
      let overlap = 0;
      tags.forEach(tag => { overlap += tasteTags.get(tag) || 0; });
      if (post.topic) overlap += tasteTags.get(post.topic) || 0;
      if (overlap) score *= 1 + Math.min(0.8, 0.15 * overlap);

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

// Posts que likeó el usuario autenticado (privado, para su pestaña "Me gusta")
router.get("/liked", authMiddleware, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req);
    const myLikes = await Like.findAll({
      where: { user_id: req.user.id },
      order: [["id", "DESC"]],
      limit,
      offset,
      attributes: ['post_id'],
    });
    const ids = myLikes.map(l => l.post_id);
    const posts = await Post.findAll({
      where: { id: { [Op.in]: ids } },
      include: [{ model: User, attributes: USER_ATTRS }],
    });
    // Mantener el orden de los likes (más reciente primero)
    const byId = new Map(posts.map(p => [p.id, p.get({ plain: true })]));
    const ordered = ids.map(id => byId.get(id)).filter(Boolean)
      .map(p => ({ ...p, isLiked: true }));
    res.json(ordered);
  } catch (error) {
    console.error("Error al obtener posts likeados:", error);
    res.status(500).json({ message: "Error al obtener tus me gusta." });
  }
});

// Hashtags en tendencia: frecuencia + likes sobre los últimos 200 posts
router.get("/trending", async (req, res) => {
  try {
    const recent = await Post.findAll({
      order: [["id", "DESC"]],
      limit: 200,
      attributes: ['hashtags', 'likes_count'],
    });
    const counts = new Map();
    recent.forEach(p => {
      (Array.isArray(p.hashtags) ? p.hashtags : []).forEach(tag =>
        counts.set(tag, (counts.get(tag) || 0) + 1 + (p.likes_count || 0)));
    });
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, weight]) => ({ tag, weight }));
    res.json(top);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener tendencias." });
  }
});

//  Feed global cronológico (Reciente); acepta ?tag= para filtrar por hashtag
router.get("/feed", optionalAuth, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req);
    const tag = req.query.tag ? String(req.query.tag).toLowerCase() : null;
    const posts = await Post.findAll({
      where: tag ? { hashtags: { [Op.contains]: [tag] } } : undefined,
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
