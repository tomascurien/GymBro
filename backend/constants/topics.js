// Temas disponibles para posts e intereses de usuarios.
// Debe coincidir con frontend/src/constants/topics.js (los labels viven en los diccionarios i18n).
const TOPICS = [
  'gym',
  'cardio',
  'calisthenics',
  'nutrition',
  'mindfulness',
  'motivation',
  'recovery',
  'science',
];

// Hashtags de tendencia → tema al que apuntan (para que #hopecore cuente como
// interés en 'motivation', #gymtok como 'gym', etc. en el feed "Para vos").
const TAG_TO_TOPIC = {
  hopecore: 'motivation',
  mindset: 'motivation',
  disciplina: 'motivation',
  discipline: 'motivation',
  nofalta: 'motivation',
  gymtok: 'gym',
  gymrat: 'gym',
  fittok: 'gym',
  gymbro: 'gym',
  meditacion: 'mindfulness',
  meditación: 'mindfulness',
  meditation: 'mindfulness',
  running: 'cardio',
  hiit: 'cardio',
  proteina: 'nutrition',
  proteína: 'nutrition',
  protein: 'nutrition',
  dieta: 'nutrition',
  diet: 'nutrition',
  descanso: 'recovery',
  sleep: 'recovery',
  movilidad: 'recovery',
  mobility: 'recovery',
  calistenia: 'calisthenics',
  streetworkout: 'calisthenics',
  ciencia: 'science',
  hipertrofia: 'science',
  hypertrophy: 'science',
};

module.exports = { TOPICS, TAG_TO_TOPIC };
