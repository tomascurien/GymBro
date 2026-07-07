// Grupos musculares (IDs de Wger). Labels traducidos en i18n como muscle.<id>.
// Emojis elegidos entre los soportados por Windows 10 (nada post-2019).
export const MUSCLE_GROUPS = [
  { id: 11, emoji: '🛡️' }, // Pecho
  { id: 12, emoji: '🦅' }, // Espalda
  { id: 9, emoji: '🦵' },  // Piernas
  { id: 13, emoji: '⛰️' }, // Hombros
  { id: 8, emoji: '💪' },  // Brazos
  { id: 10, emoji: '🧘' }, // Abdominales
  { id: 14, emoji: '🦶' }, // Pantorrillas
];

export const MUSCLE_EMOJI = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.id, g.emoji]));
