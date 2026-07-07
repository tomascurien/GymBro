// Extrae hashtags del texto de un post: minúsculas, sin duplicados,
// máx 10 tags de hasta 30 caracteres (letras unicode, números y _).
const extractHashtags = (text) => {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  const seen = new Set();
  for (const m of matches) {
    const tag = m.slice(1).toLowerCase();
    if (tag.length >= 2 && tag.length <= 30) seen.add(tag);
    if (seen.size >= 10) break;
  }
  return [...seen];
};

module.exports = { extractHashtags };
