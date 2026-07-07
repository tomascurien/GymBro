const express = require("express");
const router = express.Router();
const { 
  sequelize, 
  User, 
  Routine, 
  RoutineExercise, 
  RoutineSet, 
  Exercise, 
  ExerciseImage,
  FavoriteRoutine 
} = require('../models/index');
const { authMiddleware, SECRET_KEY } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

// Include reutilizable: la rutina original y su autor (atribución de copias)
const SOURCE_INCLUDE = {
  model: Routine,
  as: 'SourceRoutine',
  attributes: ['id', 'title'],
  include: [{ model: User, attributes: ['username', 'name', 'surname'] }],
};

// Agrega copies_count (cuántas copias tiene cada rutina) a una lista de rutinas
const annotateCopies = async (routines) => {
  const plain = routines.map(r => (r.get ? r.get({ plain: true }) : r));
  const ids = plain.map(r => r.id);
  if (!ids.length) return plain;
  const counts = await Routine.findAll({
    where: { source_routine_id: { [Op.in]: ids } },
    attributes: ['source_routine_id', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
    group: ['source_routine_id'],
    raw: true,
  });
  const map = new Map(counts.map(c => [c.source_routine_id, parseInt(c.n)]));
  return plain.map(r => ({ ...r, copies_count: map.get(r.id) || 0 }));
};

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

// POST /api/routines/:id/copy
// Copia la rutina de otro usuario a "mis rutinas", con atribución al original.
router.post("/:id/copy", authMiddleware, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const original = await Routine.findByPk(req.params.id, {
      include: [{ model: RoutineExercise, include: [RoutineSet] }],
    });
    if (!original) {
      await t.rollback();
      return res.status(404).json({ message: "Rutina no encontrada." });
    }
    if (original.user_id === req.user.id) {
      await t.rollback();
      return res.status(400).json({ message: "Esta rutina ya es tuya." });
    }

    const copy = await Routine.create({
      user_id: req.user.id,
      title: original.title,
      // Atribuir a la rutina raíz: copiar una copia sigue apuntando al original
      source_routine_id: original.source_routine_id || original.id,
    }, { transaction: t });

    for (const ex of original.RoutineExercises) {
      const newEx = await RoutineExercise.create({
        routine_id: copy.id,
        exercise_id: ex.exercise_id,
        index: ex.index,
        weight_kg: ex.weight_kg,
        reps: ex.reps,
      }, { transaction: t });
      await RoutineSet.bulkCreate(
        ex.RoutineSets.map(s => ({
          routine_exercise_id: newEx.id,
          index: s.index,
          type: s.type,
        })),
        { transaction: t }
      );
    }

    await t.commit();

    const finalRoutine = await Routine.findByPk(copy.id, {
      include: [
        { model: RoutineExercise, include: [RoutineSet, { model: Exercise, include: [ExerciseImage] }] },
        SOURCE_INCLUDE,
      ],
    });
    res.status(201).json(finalRoutine);
  } catch (error) {
    await t.rollback();
    console.error("Error al copiar la rutina:", error);
    res.status(500).json({ message: "Error al copiar la rutina." });
  }
});

// GET /api/routines/user/:username/favorites
router.get("/user/:username/favorites", async (req, res) => {
  try {
    const user = await User.findOne({where: { username: req.params.username} });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado"});
    }

    const favoriteRoutines = await user.getFavoriteRoutines({
      include: [
        {
          model: RoutineExercise,
          order: [['index', 'ASC']],
          include: [
            { model: RoutineSet, order: [['index', 'ASC']] },
            {model: Exercise, include: [ExerciseImage] }
          ]
        },
        {
          model: User
        },
        SOURCE_INCLUDE
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(await annotateCopies(favoriteRoutines));
  } catch (error) {
    console.error("Error al obtener rutinas favoritas:", error);
    res.status(500).json({ message: "Error al obtener las rutinas favoritas"});
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
                },
                { model: User, attributes: ['username', 'name', 'surname', 'profile_pic'] },
                SOURCE_INCLUDE
            ]
        });

        res.json(await annotateCopies(routines));

    } catch (error) {
        console.error("Error al obtener rutinas:", error);
        res.status(500).json({ message: "Error al obtener las rutinas." });
    }
});

//POST /api/routines/:id/favorite
router.post("/:id/favorite", authMiddleware, async (req, res) => {
  try {
    const routineId = req.params.id;
    const userId = req.user.id;

    const routine = await Routine.findByPk(routineId);
    if (!routine){
      return res.status(404).json({message: "Rutina no encontrada."});
    }

    const [favorite, created] = await FavoriteRoutine.findOrCreate({
      where: {
        user_id: userId,
        routine_id: routineId
      },
      defaults: {
        user_id: userId,
        routine_id: routineId
      }
    });

    if (created) {
      res.status(201).json({message: "Rutina guardada en favoritos."});
    } else {
      res.status(200).json({message: "Esta rutina ya está en tus favoritos"});
    }
  } catch (error) {
    console.error("Error al guardar rutina en favoritos:", error);
    res.status(500).json({message: "Error al guardar la rutina."})
  }
});

router.delete("/:id/favorite", authMiddleware, async (req, res) => {
  try {
    const routineId = req.params.id;
    const userId = req.user.id;

    const favorite = await FavoriteRoutine.findOne({
      where: {
        user_id: userId,
        routine_id: routineId
      }
    });

    if (favorite) {
      await favorite.destroy();
      res.json({ message: "Rutina quitada de favoritos." });
    } else {
      res.status(404).json({ message: "Esta rutina no estaba en tus favoritos." });
    }

  } catch (error) {
    console.error("Error al quitar rutina de favoritos:", error);
    res.status(500).json({ message: "Error al quitar la rutina." });
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

    if (routine.user_id !== userId && req.user.role !== "admin") {
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