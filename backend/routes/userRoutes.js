const express = require('express');
const jwt = require("jsonwebtoken");
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, SECRET_KEY } = require('../middleware/authMiddleware');
const { User, Follower, Post } = require("../models/index");

router.post('/register', userController.register);
router.post('/login', userController.login);

// ==================================================
// PUT /profile → Actualizar perfil propio (requiere JWT)
// ==================================================
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, surname, bio, profile_pic, cover_pic } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Actualizar datos básicos
    await user.update({
      name: name ?? user.name,
      surname: surname ?? user.surname,
      bio: bio ?? user.bio,
      profile_pic: profile_pic ?? user.profile_pic,
      cover_pic: cover_pic ?? user.cover_pic
    });

    res.json({ message: "Perfil actualizado correctamente.", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar el perfil." });
  }
});

// ==================================================
// POST /:id/follow → Seguir o dejar de seguir a otro usuario
// ==================================================
router.post('/:id/follow', authMiddleware, async (req, res) => {
    try {
        const userIdToFollow = parseInt(req.params.id);
        const followerId = req.user.id;

        if (userIdToFollow === followerId) {
            return res.status(400).json({ message: "No puedes seguirte a ti mismo." });
        }

        const [follow, created] = await Follower.findOrCreate({
            where: {
                follower_id: followerId,
                followed_id: userIdToFollow
            }
        });

        if (created) {
            res.status(201).json({ message: "Usuario seguido.", isFollowing: true });
        } else {
            res.status(200).json({ message: "Ya sigues a este usuario.", isFollowing: true });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al seguir al usuario.' });
    }
});

router.delete('/:id/follow', authMiddleware, async (req, res) => {
    try {
        const userIdToUnfollow = parseInt(req.params.id);
        const followerId = req.user.id;

        const deleted = await Follower.destroy({
            where: {
                follower_id: followerId,
                followed_id: userIdToUnfollow
            }
        });

        if (deleted) {
            res.json({ message: "Dejaste de seguir al usuario.", isFollowing: false  });
        } else {
            res.status(404).json({ message: "No seguías a este usuario.", isFollowing: false  });
        }
    } catch (error) {
        console.error('Error al dejar de seguir:', error);
        res.status(500).json({ message: 'Error al dejar de seguir.', isFollowing: false });
    }
});

router.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const authHeader = req.headers.authorization;
    let currentUserId = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        currentUserId = parseInt(decoded.id);
        
      } catch (err) {
        console.warn("Token inválido o expirado, continuando sin usuario logueado.");
      }
    }

    const user = await User.findOne({
      where: { username },
      attributes: [
        "id",
        "username",
        "name",
        "surname",
        "bio",
        "profile_pic",
        "cover_pic",
        "role",
      ],
      include: [
        {
          model: Follower,
          as: "followers",
          attributes: ["follower_id"],
        },
        {
          model: Follower,
          as: "following",
          attributes: ["followed_id"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Contar seguidores y seguidos
    const postsCount = await Post.count({ where: { user_id: user.id } });
    const followersCount = await Follower.count({ where: { followed_id: user.id } });
    const followingCount = await Follower.count({ where: { follower_id: user.id } });

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      console.log("🔹 Usuario logueado (currentUserId):", currentUserId);
      console.log("🔹 Perfil visitado (user.id):", user.id);
      const followRecord = await Follower.findOne({
        where: {
          follower_id: currentUserId,
          followed_id: user.id,
        },
      });
      console.log("Relación encontrada:", followRecord ? "Sí" : "No");
      isFollowing = !!followRecord;
    }
    const profileData = user.toJSON();

    profileData.posts_count = postsCount;
    profileData.followers_count = followersCount;
    profileData.following_count = followingCount;
    profileData.isFollowing = isFollowing;


    res.json({ user: profileData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el perfil del usuario." });
  }
});

module.exports = router;
