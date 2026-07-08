const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { authMiddleware, SECRET_KEY } = require('../middleware/authMiddleware');
const { Post, User, Follower, Like, Comment, Notification, CommentLike } = require("../models/index");
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
      // Notificar al dueño del post (nunca a uno mismo)
      if (post.user_id !== req.user.id) {
        await Notification.create({
          user_id: post.user_id,
          actor_id: req.user.id,
          type: 'like',
          post_id: post.id,
        });
      }
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

// Marca isLiked en cada comentario según el usuario autenticado (si lo hay)
const annotateCommentLikes = async (comments, userId) => {
  const plain = comments.map((c) => (c.get ? c.get({ plain: true }) : c));
  if (!userId || plain.length === 0) {
    return plain.map((c) => ({ ...c, isLiked: false }));
  }
  const likes = await CommentLike.findAll({
    where: { user_id: userId, comment_id: { [Op.in]: plain.map((c) => c.id) } },
    attributes: ['comment_id'],
  });
  const liked = new Set(likes.map((l) => l.comment_id));
  return plain.map((c) => ({ ...c, isLiked: liked.has(c.id) }));
};

// Listar comentarios de nivel superior de un post (público, cronológico)
router.get("/:id/comments", optionalAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const comments = await Comment.findAll({
      where: { post_id: postId, parent_id: null },
      include: [{ model: User, attributes: USER_ATTRS }],
      order: [["id", "ASC"]],
    });
    res.json(await annotateCommentLikes(comments, req.user?.id || null));
  } catch (error) {
    console.error("Error al obtener comentarios:", error);
    res.status(500).json({ message: "Error al obtener los comentarios." });
  }
});

// Listar respuestas de un comentario (público, cronológico)
router.get("/:id/comments/:commentId/replies", optionalAuth, async (req, res) => {
  try {
    const replies = await Comment.findAll({
      where: { parent_id: parseInt(req.params.commentId) },
      include: [{ model: User, attributes: USER_ATTRS }],
      order: [["id", "ASC"]],
    });
    res.json(await annotateCommentLikes(replies, req.user?.id || null));
  } catch (error) {
    console.error("Error al obtener respuestas:", error);
    res.status(500).json({ message: "Error al obtener las respuestas." });
  }
});

// Crear un comentario o una respuesta (requiere login)
router.post("/:id/comments", authMiddleware, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const text = (req.body.text || "").trim();
    if (!text) {
      return res.status(400).json({ message: "El comentario no puede estar vacío." });
    }

    const post = await Post.findByPk(postId);
    if (!post) return res.status(404).json({ message: "Post no encontrado." });

    // Un solo nivel: la respuesta se cuelga del comentario raíz del hilo,
    // pero la notificación va a quien realmente respondimos (target).
    let target = null; // comentario al que se responde
    let rootId = null; // raíz del hilo (threading plano)
    if (req.body.parent_id) {
      target = await Comment.findByPk(parseInt(req.body.parent_id));
      if (!target) return res.status(404).json({ message: "Comentario padre no encontrado." });
      rootId = target.parent_id || target.id;
    }

    const comment = await Comment.create({
      post_id: postId,
      user_id: req.user.id,
      text,
      parent_id: rootId,
    });
    await post.increment("comments_count");

    if (target) {
      const root = await Comment.findByPk(rootId);
      if (root) await root.increment("replies_count");
      // Notificar a quien respondimos (nunca a uno mismo)
      if (target.user_id !== req.user.id) {
        await Notification.create({
          user_id: target.user_id,
          actor_id: req.user.id,
          type: 'reply',
          post_id: postId,
          comment_id: comment.id,
        });
      }
    } else if (post.user_id !== req.user.id) {
      // Comentario de nivel superior: notificar al dueño del post
      await Notification.create({
        user_id: post.user_id,
        actor_id: req.user.id,
        type: 'comment',
        post_id: post.id,
        comment_id: comment.id,
      });
    }

    const withUser = await Comment.findByPk(comment.id, {
      include: [{ model: User, attributes: USER_ATTRS }],
    });
    res.status(201).json(withUser);
  } catch (error) {
    console.error("Error al crear comentario:", error);
    res.status(500).json({ message: "Error al crear el comentario." });
  }
});

// Like a un comentario
router.post("/:id/comments/:commentId/like", authMiddleware, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const comment = await Comment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: "Comentario no encontrado." });

    const [, created] = await CommentLike.findOrCreate({
      where: { user_id: req.user.id, comment_id: commentId },
    });
    if (created) {
      await comment.increment("likes_count");
      await comment.reload();
      if (comment.user_id !== req.user.id) {
        await Notification.create({
          user_id: comment.user_id,
          actor_id: req.user.id,
          type: 'comment_like',
          post_id: comment.post_id,
          comment_id: comment.id,
        });
      }
    }
    res.json({ isLiked: true, likes_count: comment.likes_count });
  } catch (error) {
    console.error("Error al dar like al comentario:", error);
    res.status(500).json({ message: "Error al dar like al comentario." });
  }
});

// Quitar like a un comentario
router.delete("/:id/comments/:commentId/like", authMiddleware, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const comment = await Comment.findByPk(commentId);
    if (!comment) return res.status(404).json({ message: "Comentario no encontrado." });

    const deleted = await CommentLike.destroy({
      where: { user_id: req.user.id, comment_id: commentId },
    });
    if (deleted && comment.likes_count > 0) {
      await comment.decrement("likes_count");
      await comment.reload();
    }
    res.json({ isLiked: false, likes_count: comment.likes_count });
  } catch (error) {
    console.error("Error al quitar like del comentario:", error);
    res.status(500).json({ message: "Error al quitar like del comentario." });
  }
});

// Eliminar un comentario o respuesta (autor o admin)
router.delete("/:id/comments/:commentId", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findByPk(parseInt(req.params.commentId));
    if (!comment) return res.status(404).json({ message: "Comentario no encontrado." });

    if (comment.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "No tenés permiso para eliminar este comentario." });
    }

    const post = await Post.findByPk(comment.post_id);

    if (comment.parent_id) {
      // Respuesta: borra sus likes, ella misma, y ajusta contadores
      await CommentLike.destroy({ where: { comment_id: comment.id } });
      await comment.destroy();
      const parent = await Comment.findByPk(comment.parent_id);
      if (parent && parent.replies_count > 0) await parent.decrement("replies_count");
      if (post && post.comments_count > 0) await post.decrement("comments_count");
    } else {
      // Comentario raíz: borra sus respuestas y todos los likes involucrados
      const replies = await Comment.findAll({ where: { parent_id: comment.id }, attributes: ['id'] });
      const replyIds = replies.map((r) => r.id);
      const allIds = [comment.id, ...replyIds];
      await CommentLike.destroy({ where: { comment_id: { [Op.in]: allIds } } });
      if (replyIds.length) await Comment.destroy({ where: { id: { [Op.in]: replyIds } } });
      await comment.destroy();
      if (post) {
        const newCount = Math.max((post.comments_count || 0) - (1 + replyIds.length), 0);
        await post.update({ comments_count: newCount });
      }
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
