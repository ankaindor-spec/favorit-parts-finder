import { afterEach, describe, expect, it, vi } from 'vitest';
import { FavoritApiError, toUserError } from '../../src/shared/api/errors.js';
import {
  FAVORIT_PRICE_URL,
  readApiKey,
  searchManufacturers,
  searchOffers,
} from '../../src/shared/api/favoritApi.js';

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok,
    status,
    text: async () => text,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('favorit API client', () => {
  it('reads the public demo key variable', () => {
    expect(readApiKey()).toBe('test-key');
  });

  it('requests manufacturers by article without a brand', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ goods: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    const data = await searchManufacturers({ key: 'test-key', number: '01089', signal });

    const [url, options] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(FAVORIT_PRICE_URL);
    expect(parsed.searchParams.get('key')).toBe('test-key');
    expect(parsed.searchParams.get('number')).toBe('01089');
    expect(parsed.searchParams.get('brand')).toBeNull();
    expect(parsed.searchParams.get('analogues')).toBeNull();
    expect(options).toMatchObject({
      method: 'GET',
      signal,
      headers: { Accept: 'application/json' },
    });
    expect(options.headers['Content-Type']).toBeUndefined();
    expect(data).toEqual({ goods: [] });
  });

  it('requests offers with brand, analogues and the documented info flag', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ goods: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await searchOffers({ key: 'test-key', number: '01 089', brand: 'Meat & Doria' });

    const parsed = new URL(fetchMock.mock.calls[0][0]);
    expect(parsed.searchParams.get('key')).toBe('test-key');
    expect(parsed.searchParams.get('number')).toBe('01 089');
    expect(parsed.searchParams.get('brand')).toBe('Meat & Doria');
    expect(parsed.searchParams.get('analogues')).toBe('on');
    expect(parsed.searchParams.get('info')).toBe('on');
    expect(parsed.search).toContain('Meat+%26+Doria');
  });

  it('returns the empty not-found payload as data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      goods: [{
        brand: '',
        count: 0,
        goodsID: '00000000-0000-0000-0000-000000000000',
        name: '',
        number: '',
        price: 0,
        rate: 0,
        warehouses: [],
      }],
    })));

    const data = await searchManufacturers({ key: 'test-key', number: '7260500039S' });
    expect(data.goods).toHaveLength(1);
    expect(data.goods[0].brand).toBe('');
  });

  it('maps documented and observed API errors without exposing the raw text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(
      { error: 'Invalid access key' },
      { ok: false, status: 403 },
    )));

    await expect(searchManufacturers({ key: 'bad', number: '01089' }))
      .rejects.toMatchObject({ name: 'FavoritApiError', code: 'api', details: 'Invalid access key' });

    expect(toUserError(new FavoritApiError('api', 'Invalid access key'))).toEqual({ code: 'invalid_key' });
    expect(toUserError(new FavoritApiError('api', 'Invalid key client!'))).toEqual({ code: 'invalid_key' });
    expect(toUserError(new FavoritApiError('api', 'Empty key!'))).toEqual({ code: 'missing_key' });
    expect(toUserError(new FavoritApiError('api', 'Empty number goods!'))).toEqual({ code: 'empty_number' });
    expect(toUserError(new FavoritApiError('api', 'Request quota exceeded!'))).toEqual({ code: 'quota' });
    expect(toUserError(new FavoritApiError('api', 'Something internal'))).toEqual({ code: 'unknown' });
    expect(toUserError(new FavoritApiError('api', { text: 'hidden' }))).toEqual({ code: 'unknown' });
  });

  it('treats an error object on HTTP 200 as an API error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Empty number goods!' }, { status: 200 })));
    await expect(searchManufacturers({ key: 'test-key', number: '01089' }))
      .rejects.toMatchObject({ code: 'api', details: 'Empty number goods!' });
  });

  it('rejects invalid JSON and a payload without goods', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse('not-json')));
    await expect(searchOffers({ key: 'test-key', number: '01089', brand: 'OSSCA' }))
      .rejects.toMatchObject({ code: 'bad_json' });

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ price: 10 })));
    await expect(searchManufacturers({ key: 'test-key', number: '01089' }))
      .rejects.toMatchObject({ code: 'bad_shape' });
    expect(toUserError(new FavoritApiError('bad_json'))).toEqual({ code: 'bad_response' });
    expect(toUserError(new FavoritApiError('bad_shape'))).toEqual({ code: 'bad_response' });
  });

  it('maps network and server failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    await expect(searchManufacturers({ key: 'test-key', number: '01089' }))
      .rejects.toMatchObject({ code: 'network' });
    expect(toUserError(new FavoritApiError('network'))).toEqual({ code: 'unavailable' });

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse('', { ok: false, status: 502 })));
    await expect(searchManufacturers({ key: 'test-key', number: '01089' }))
      .rejects.toMatchObject({ code: 'http', details: 502 });
    expect(toUserError(new FavoritApiError('http', 502))).toEqual({ code: 'unavailable' });
  });

  it('does not swallow an aborted request', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw abortError;
    }));
    await expect(searchManufacturers({ key: 'test-key', number: '01089' }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});
