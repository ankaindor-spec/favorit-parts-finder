export function normalizeArticle(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}
