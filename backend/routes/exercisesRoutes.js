const express = require("express");
const router = express.Router();
const { Exercise, ExerciseImage } = require('../models/index');
const { authMiddleware, SECRET_KEY } = require('../middleware/authMiddleware');

// GET /api/exercises
router.get("/", authMiddleware, async (req, res) => {
  try {
    const exercises = await Exercise.findAll({
      include: [{ 
        model: ExerciseImage, 
        required: false // 'false' para que traiga ejercicios aunque NO tengan imagen
      }],
      order: [['name', 'ASC']] // Ordenar alfabéticamente
    });
    res.json(exercises);
  } catch (error) {
    console.error("Error al obtener ejercicios:", error);
    res.status(500).json({ message: "Error al obtener ejercicios." });
  }
});

module.exports = router;