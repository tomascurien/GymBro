const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { authMiddleware } = require('../middleware/authMiddleware');
const { ExerciseLog, Exercise, ExerciseImage, Routine, RoutineExercise } = require("../models/index");

// POST /api/logs — registrar lo levantado en un ejercicio
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { exercise_id, routine_exercise_id, weight_kg, reps, sets } = req.body;

    const weight = parseFloat(weight_kg);
    const repsN = parseInt(reps);
    const setsN = parseInt(sets) || 1;
    if (!exercise_id || isNaN(weight) || weight < 0 || !repsN || repsN < 1 || setsN < 1) {
      return res.status(400).json({ message: "Datos del registro inválidos." });
    }

    const exercise = await Exercise.findByPk(exercise_id);
    if (!exercise) return res.status(404).json({ message: "Ejercicio no encontrado." });

    // ¿Récord personal? Solo celebra si SUPERA un máximo previo
    // (el primer registro de un ejercicio no cuenta como PR).
    const prevMax = await ExerciseLog.max('weight_kg', {
      where: { user_id: req.user.id, exercise_id },
    });

    const log = await ExerciseLog.create({
      user_id: req.user.id,
      exercise_id,
      routine_exercise_id: routine_exercise_id || null,
      weight_kg: weight,
      reps: repsN,
      sets: setsN,
    });

    const isNewPr = prevMax !== null && weight > parseFloat(prevMax);
    res.status(201).json({ ...log.toJSON(), isNewPr });
  } catch (error) {
    console.error("Error al registrar el log:", error);
    res.status(500).json({ message: "Error al registrar." });
  }
});

// Reduce una lista de logs (desc por fecha) al resumen que muestra la UI:
// último, anterior, hace ~un mes y PR (máximo peso).
const summarize = (logs) => {
  if (!logs.length) return null;
  const last = logs[0];
  const prev = logs[1] || null;
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - monthMs;
  // El log más reciente de hace al menos 30 días (comparación mensual)
  const monthAgo = logs.find(l => new Date(l.created_at).getTime() <= cutoff) || null;
  const pr = logs.reduce((best, l) =>
    parseFloat(l.weight_kg) > parseFloat(best.weight_kg) ? l : best, logs[0]);

  const pick = (l) => l && {
    weight_kg: parseFloat(l.weight_kg),
    reps: l.reps,
    sets: l.sets,
    created_at: l.created_at,
  };
  return { last: pick(last), prev: pick(prev), monthAgo: pick(monthAgo), pr: pick(pr) };
};

// GET /api/logs/summary?routine_id=X — resumen por ejercicio para el detalle de rutina
router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const routineId = parseInt(req.query.routine_id);
    if (isNaN(routineId)) return res.status(400).json({ message: "Falta routine_id." });

    const routine = await Routine.findByPk(routineId, {
      include: [{ model: RoutineExercise, attributes: ['exercise_id'] }],
    });
    if (!routine) return res.status(404).json({ message: "Rutina no encontrada." });

    const exerciseIds = [...new Set(routine.RoutineExercises.map(re => re.exercise_id))];
    if (!exerciseIds.length) return res.json({});

    const logs = await ExerciseLog.findAll({
      where: {
        user_id: req.user.id,
        exercise_id: { [Op.in]: exerciseIds },
      },
      order: [['created_at', 'DESC']],
      limit: 1000,
    });

    const byExercise = {};
    for (const log of logs) {
      (byExercise[log.exercise_id] = byExercise[log.exercise_id] || []).push(log);
    }

    const summary = {};
    for (const id of exerciseIds) {
      const s = summarize(byExercise[id] || []);
      if (s) summary[id] = s;
    }
    res.json(summary);
  } catch (error) {
    console.error("Error en el resumen de logs:", error);
    res.status(500).json({ message: "Error al obtener el progreso." });
  }
});

// GET /api/logs/overview — todos los ejercicios que el usuario registró alguna
// vez, con resumen (último/anterior/mes/PR) y la serie para el sparkline.
router.get("/overview", authMiddleware, async (req, res) => {
  try {
    const logs = await ExerciseLog.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 2000,
    });
    if (!logs.length) return res.json([]);

    const byExercise = {};
    for (const log of logs) {
      (byExercise[log.exercise_id] = byExercise[log.exercise_id] || []).push(log);
    }

    const exercises = await Exercise.findAll({
      where: { id: { [Op.in]: Object.keys(byExercise) } },
      include: [ExerciseImage],
    });
    const exMap = new Map(exercises.map(e => [e.id, e]));

    const overview = Object.entries(byExercise).map(([id, exLogs]) => {
      const ex = exMap.get(parseInt(id));
      // Serie cronológica (viejo → nuevo) para el sparkline, últimos 12 registros
      const series = exLogs.slice(0, 12).reverse().map(l => ({
        w: parseFloat(l.weight_kg),
        t: l.created_at,
      }));
      return {
        exercise: ex ? {
          id: ex.id,
          name: ex.name,
          category: ex.category,
          image: ex.ExerciseImages?.[0]?.image_url || null,
        } : { id: parseInt(id), name: '?', category: null, image: null },
        ...summarize(exLogs),
        series,
        total_logs: exLogs.length,
      };
    });

    // Más recientemente entrenado primero
    overview.sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at));
    res.json(overview);
  } catch (error) {
    console.error("Error en el overview de progreso:", error);
    res.status(500).json({ message: "Error al obtener el progreso." });
  }
});

// GET /api/logs/exercise/:exerciseId — historial completo de un ejercicio (fase 2)
router.get("/exercise/:exerciseId", authMiddleware, async (req, res) => {
  try {
    const exerciseId = parseInt(req.params.exerciseId);
    if (isNaN(exerciseId)) return res.status(400).json({ message: "Ejercicio inválido." });

    const logs = await ExerciseLog.findAll({
      where: { user_id: req.user.id, exercise_id: exerciseId },
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    res.json(logs);
  } catch (error) {
    console.error("Error al obtener historial:", error);
    res.status(500).json({ message: "Error al obtener el historial." });
  }
});

module.exports = router;
