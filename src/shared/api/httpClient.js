import { FavoritApiError } from './errors.js';

function readApiMessage(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !('error' in data)) return null;
  const { error } = data;
  if (typeof error === 'string') return error.trim() || null;
  if (error) return '';
  return null;
}

export async function fetchJson(url, { signal } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new FavoritApiError('network');
  }

  let text = '';
  try {
    text = await response.text();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new FavoritApiError('network');
  }

  if (!text) {
    if (!response.ok) throw new FavoritApiError('http', response.status);
    throw new FavoritApiError('bad_shape');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new FavoritApiError('bad_json');
  }

  const apiMessage = readApiMessage(data);
  if (apiMessage !== null) throw new FavoritApiError('api', apiMessage);

  if (!response.ok) throw new FavoritApiError('http', response.status);

  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.goods)) {
    throw new FavoritApiError('bad_shape');
  }

  return data;
}
