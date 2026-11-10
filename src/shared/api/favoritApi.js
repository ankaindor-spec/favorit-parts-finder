import { fetchJson } from './httpClient.js';

// Документация указывает http://, но страница GitHub Pages открывается по HTTPS.
// Запрос на http:// с такой страницы браузер блокирует как mixed content.
// Живой HTTPS-адрес отвечает тем же JSON и отдаёт Access-Control-Allow-Origin: *.
export const FAVORIT_PRICE_URL = 'https://api.favorit-parts.ru/hs/hsprice/';

export function readApiKey() {
  const value = import.meta.env.VITE_FAVORIT_API_KEY;
  return typeof value === 'string' ? value.trim() : '';
}

function buildUrl(params) {
  const url = new URL(FAVORIT_PRICE_URL);
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(name, value);
    }
  });
  return url.toString();
}

export function searchManufacturers({ key, number, signal }) {
  return fetchJson(buildUrl({ key, number }), { signal });
}

export function searchOffers({ key, number, brand, signal }) {
  return fetchJson(buildUrl({
    key,
    number,
    brand,
    analogues: 'on',
    info: 'on',
  }), { signal });
}
