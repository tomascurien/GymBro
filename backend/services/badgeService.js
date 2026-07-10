const { Op } = require('sequelize');
const { BADGES } = require('../constants/badges');
const { ExerciseLog, Routine, FavoriteRoutine, UserBadge } = require('../models/index');

// Clave de semana (lunes ISO, en UTC) para calcular rachas semanales
const weekKey = (date) => {
  const d = new Date(date);
  const day = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

const WEEK_MS = 7 * 24 * 3600 * 1000;

// Mejor racha de semanas consecutivas con al menos un registro
const bestWeekStreak = (logs) => {
  if (!logs.length) return 0;
  const weeks = [...new Set(logs.map((l) => weekKey(l.created_at)))].sort((a, b) => a - b);
  let best = 1, run = 1;
  for (let i = 1; i < weeks.length; i++) {
    run = weeks[i] - weeks[i - 1] === WEEK_MS ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
};

// Valores actuales del usuario para cada insignia
const computeValues = async (userId) => {
  // Las tres consultas en paralelo: cada round trip a la DB cuesta caro
  const [logs, myRoutines] = await Promise.all([
    ExerciseLog.findAll({
      where: { user_id: userId },
      order: [['created_at', 'ASC']],
      attributes: ['exercise_id', 'weight_kg', 'created_at'],
    }),
    Routine.findAll({ where: { user_id: userId }, attributes: ['id'] }),
  ]);
  const saves = myRoutines.length
    ? await FavoriteRoutine.count({ where: { routine_id: { [Op.in]: myRoutines.map((r) => r.id) } } })
    : 0;

  // PRs: registros que superaron el máximo previo del ejercicio (el primero no cuenta)
  // Progreso: mejor % de mejora (máximo histórico vs. primer registro) entre ejercicios
  const byExercise = new Map();
  for (const log of logs) {
    (byExercise.get(log.exercise_id) || byExercise.set(log.exercise_id, []).get(log.exercise_id)).push(log);
  }
  let prCount = 0;
  let bestProgress = 0;
  for (const exLogs of byExercise.values()) {
    let runningMax = parseFloat(exLogs[0].weight_kg);
    const first = runningMax;
    for (let i = 1; i < exLogs.length; i++) {
      const w = parseFloat(exLogs[i].weight_kg);
      if (w > runningMax) {
        prCount++;
        runningMax = w;
      }
    }
    if (first > 0) {
      const pct = ((runningMax - first) / first) * 100;
      if (pct > bestProgress) bestProgress = pct;
    }
  }

  return {
    regularity: bestWeekStreak(logs),
    prs: prCount,
    progress: Math.floor(bestProgress),
    creator: saves,
  };
};

// Calcula el estado de todas las insignias y persiste los niveles nuevos.
// Devuelve [{ slug, tiers, value, tier, nextThreshold }]
const getBadges = async (userId) => {
  // Valores + niveles ya persistidos, en paralelo
  const [values, stored] = await Promise.all([
    computeValues(userId),
    UserBadge.findAll({ where: { user_id: userId }, attributes: ['badge_slug', 'tier'] }),
  ]);
  const storedSet = new Set(stored.map((b) => `${b.badge_slug}:${b.tier}`));

  const result = BADGES.map(({ slug, tiers }) => {
    const value = values[slug] || 0;
    let tier = 0;
    for (let i = 0; i < tiers.length; i++) {
      if (value >= tiers[i]) tier = i + 1;
    }
    return {
      slug,
      tiers,
      value,
      tier,
      nextThreshold: tier < tiers.length ? tiers[tier] : null,
    };
  });

  // Persistir SOLO los niveles nuevos, en una única query (en régimen
  // estable no hay ninguno y esto no cuesta nada).
  const missing = [];
  for (const b of result) {
    for (let t = 1; t <= b.tier; t++) {
      if (!storedSet.has(`${b.slug}:${t}`)) {
        missing.push({ user_id: userId, badge_slug: b.slug, tier: t });
      }
    }
  }
  if (missing.length) {
    await UserBadge.bulkCreate(missing, { ignoreDuplicates: true });
  }

  return result;
};

module.exports = { getBadges };
