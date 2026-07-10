// Definición de insignias. Los labels viven en i18n del frontend (badge.<slug>).
// tiers = umbrales para cada nivel; el color por dificultad se asigna en el
// frontend desde el nivel más difícil hacia atrás (verde→amarillo→rojo→violeta).
const BADGES = [
  { slug: 'regularity', tiers: [1, 4, 12, 26, 52] },  // semanas seguidas entrenando
  { slug: 'prs', tiers: [1, 10, 25, 50] },            // récords personales logrados
  { slug: 'progress', tiers: [10, 25, 50, 100] },     // % de mejora en un ejercicio
  { slug: 'creator', tiers: [5, 25, 100, 999] },      // veces que guardaron tus rutinas
];

module.exports = { BADGES };
