export class FavoritApiError extends Error {
  constructor(code, details) {
    super(code);
    this.name = 'FavoritApiError';
    this.code = code;
    this.details = details;
  }
}

const API_ERROR_CODES = new Map([
  ['empty key!', 'missing_key'],
  ['invalid key client!', 'invalid_key'],
  ['invalid access key', 'invalid_key'],
  ['empty number goods!', 'empty_number'],
  ['request quota exceeded!', 'quota'],
]);

export function toUserError(error) {
  if (error instanceof FavoritApiError) {
    if (error.code === 'api') {
      const raw = typeof error.details === 'string' ? error.details.trim().toLowerCase() : '';
      return { code: API_ERROR_CODES.get(raw) || 'unknown' };
    }
    if (error.code === 'http') {
      const status = Number(error.details);
      if (Number.isFinite(status) && status >= 500) return { code: 'unavailable' };
      return { code: 'unknown' };
    }
    if (error.code === 'network') return { code: 'unavailable' };
    if (error.code === 'bad_json' || error.code === 'bad_shape') return { code: 'bad_response' };
    return { code: 'unknown' };
  }
  return { code: 'unknown' };
}
