// routes/contentRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Content = require("../models/Content");
const User = require("../models/User");

// Crear un post
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { content, image } = req.body;
    const userId = req.user.id;
    await Content.create({ user_id: userId, description: content, url_content: image, time_stamp: new Date().toISOString() });
    res.json({ message: "Post creado exitosamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear el post." });
  }
});

// Ver el feed global
router.get("/feed", async (req, res) => {
  try {
    const posts = await Content.findAll({
      include: [{ model: User, attributes: ["name", "surname", "profile_pic"] }],
      order: [["id", "DESC"]],
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el feed." });
  }
});

// Ver los posts de un usuario
router.get("/user/:id", async (req, res) => {
  try {
    const posts = await Content.findAll({
      where: { user_id: req.params.id },
      include: [{ model: User, attributes: ["name", "surname", "profile_pic"] }],
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los posts del usuario." });
  }
});

module.exports = router;