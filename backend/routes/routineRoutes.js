const express = require("express");
const router = express.Router();
const { 
  sequelize, 
  User, 
  Routine, 
  RoutineExercise, 
  RoutineSet, 
  Exercise, 
  ExerciseImage 
} = require('../models/index');
const authMiddleware = require("../middleware/authMiddleware");

// POST /api/routines
router.post("/", authMiddleware, async (req, res) => {

  
  const { title, exercises } = req.body;
  const userId = req.user.id;

  if (!title || !exercises || exercises.length === 0) {
    return res.status(400).json({ message: "Faltan datos para crear la rutina." });
  }

  // Usamos una transacción para asegurar que todo se cree
  // o nada se cree (si algo falla).
  const t = await sequelize.transaction();

  try {
    // 1. Crear la Rutina principal
    const newRoutine = await Routine.create({
      user_id: userId,
      title: title
    }, { transaction: t });

    // 2. Recorrer cada ejercicio enviado
    for (const ex of exercises) {
      // 2a. Crear la entrada en RoutineExercise
      const newRoutineExercise = await RoutineExercise.create({
        routine_id: newRoutine.id,
        exercise_id: ex.exercise_id,
        index: ex.index,
        weight_kg: ex.weight_kg,
        reps: ex.reps
      }, { transaction: t });

      // 2b. Crear los sets para ese ejercicio
      const setsData = ex.sets.map((set, setIndex) => ({
        routine_exercise_id: newRoutineExercise.id,
        index: setIndex,
        type: set.type || 'normal'
      }));

      await RoutineSet.bulkCreate(setsData, { transaction: t });
    }

    // Si todo salió bien, confirmamos la transacción
    await t.commit();
    
    // Devolvemos la rutina completa que acabamos de crear
    const finalRoutine = await Routine.findByPk(newRoutine.id, {
        include: [
            { 
                model: RoutineExercise, 
                include: [RoutineSet, Exercise] 
            }
        ]
    });
    
    res.status(201).json(finalRoutine);

  } catch (error) {
    await t.rollback();
    console.error("Error al crear la rutina:", error);
    res.status(500).json({ message: "Error al crear la rutina." });
  }
});

// GET /api/routines/user/:username
// Obtiene todas las rutinas de un usuario (para su perfil)
router.get("/user/:username", async (req, res) => {
    try {
        const user = await User.findOne({ where: { username: req.params.username }});
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        //consulta que trae todo
        const routines = await Routine.findAll({
            where: { user_id: user.id },
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: RoutineExercise,
                    as: 'RoutineExercises',
                    order: [['index', 'ASC']],
                    include: [
                        {
                            model: RoutineSet,
                            order: [['index', 'ASC']]
                        },
                        {
                            model: Exercise,
                            include: [ ExerciseImage ] // Incluye el ejercicio y su imagen
                        }
                    ]
                }
            ]
        });

        res.json(routines);

    } catch (error) {
        console.error("Error al obtener rutinas:", error);
        res.status(500).json({ message: "Error al obtener las rutinas." });
    }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const routineId = req.params.id;
    const userId = req.user.id;

    const routine = await Routine.findByPk(routineId);
    if (!routine) {
      return res.status(404).json({ message: "Rutina no encontrada." });
    }

    if (routine.user_id !== userId) {
      return res.status(403).json({ message: "No tienes permiso para eliminar esta rutina." });
    }

    await routine.destroy();

    res.json({ message: "Rutina eliminada correctamente." });

  } catch (error) {
    console.error("Error al eliminar la rutina:", error);
    res.status(500).json({ message: "Error al eliminar la rutina." });
  }
});
module.exports = router;