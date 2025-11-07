const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Follower = require("../models/Follower");

router.post('/register', userController.register);
router.post('/login', userController.login);

router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;

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
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Contar seguidores y seguidos
    const followersCount = await Follower.count({ where: { followed_id: user.id } });
    const followingCount = await Follower.count({ where: { follower_id: user.id } });

    res.json({
      ...user.toJSON(),
      followers: followersCount,
      following: followingCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el perfil del usuario." });
  }
});

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
router.post("/:id/follow", authMiddleware, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followedId = parseInt(req.params.id);

    if (followerId === followedId) {
      return res.status(400).json({ message: "No puedes seguirte a ti mismo." });
    }

    // Verificar si ya lo sigue
    const existingFollow = await Follower.findOne({
      where: { follower_id: followerId, followed_id: followedId }
    });

    if (existingFollow) {
      // Si ya lo sigue → dejar de seguir
      await existingFollow.destroy();
      return res.json({ message: "Dejaste de seguir al usuario." });
    }

    // Si no lo sigue → seguir
    await Follower.create({ follower_id: followerId, followed_id: followedId });
    res.json({ message: "Ahora sigues a este usuario." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al seguir o dejar de seguir al usuario." });
  }
});
module.exports = router;
