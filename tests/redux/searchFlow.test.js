import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FavoritApiError } from '../../src/shared/api/errors.js';
import { fetchOffers } from '../../src/features/select-brand/model/offersSlice.js';
import { searchBrands } from '../../src/features/search-parts/model/searchSlice.js';
import { submitBrandSearch, submitBrandSelection } from '../../src/features/search-session/model/commands.js';
import { createAppStore } from '../../src/app/store/store.js';

vi.mock('../../src/shared/api/favoritApi.js', () => ({
  readApiKey: vi.fn(() => 'test-key'),
  searchManufacturers: vi.fn(),
  searchOffers: vi.fn(),
}));

const { readApiKey, searchManufacturers, searchOffers } = await import('../../src/shared/api/favoritApi.js');
const { resetRequestGuards } = await import('../../src/features/search-session/model/commands.js');

function position(brand, number, goodsID = brand) {
  return {
    goodsID,
    brand,
    number,
    name: `Деталь ${brand}`,
    price: 5000,
    count: 40,
    rate: 1,
    warehouses: [
      { id: `${goodsID}-w`, code: 'МСК РС', price: 10, stock: 2, own: false },
    ],
  };
}

describe('search flow', () => {
  let store;

  afterEach(() => {
    resetRequestGuards();
  });

  beforeEach(() => {
    store = createAppStore();
    readApiKey.mockReset();
    readApiKey.mockReturnValue('test-key');
    searchManufacturers.mockReset();
    searchOffers.mockReset();
  });

  it('stores manufacturers and ignores the obsolete goods price', async () => {
    searchManufacturers.mockResolvedValue({ goods: [position('OSSCA', '01089', 'id-1')] });

    await store.dispatch(submitBrandSearch(' 01089 '));

    expect(searchManufacturers).toHaveBeenCalledWith(expect.objectContaining({
      key: 'test-key',
      number: '01089',
    }));
    const state = store.getState().searchParts;
    expect(state.status).toBe('succeeded');
    expect(state.article).toBe('01089');
    expect(state.brands).toEqual([
      expect.objectContaining({ brand: 'OSSCA', number: '01089', goodsID: 'id-1', warehouseCount: 1 }),
    ]);
    expect(state.brands[0].price).toBeUndefined();
  });

  it('does not call the API for an empty article and clears previous results', async () => {
    searchManufacturers.mockResolvedValue({ goods: [position('OSSCA', '01089', 'id-1')] });
    searchOffers.mockResolvedValue({ goods: [position('OSSCA', '01089', 'id-1')] });
    await store.dispatch(submitBrandSearch('01089'));
    await store.dispatch(submitBrandSelection(store.getState().searchParts.brands[0]));

    const pending = store.dispatch(submitBrandSearch('   '));

    expect(pending).toBeNull();
    expect(searchManufacturers).toHaveBeenCalledTimes(1);
    expect(store.getState().searchParts).toMatchObject({ status: 'idle', brands: [], article: '' });
    expect(store.getState().offers).toMatchObject({ status: 'idle', offers: [], goodsID: null });
  });

  it('records a manufacturer search error and clears brands', async () => {
    searchManufacturers.mockRejectedValue(new FavoritApiError('network'));

    await store.dispatch(submitBrandSearch('01089'));

    expect(store.getState().searchParts.status).toBe('failed');
    expect(store.getState().searchParts.error).toEqual({ code: 'unavailable' });
    expect(store.getState().searchParts.brands).toEqual([]);
  });

  it('does not send a duplicate search while the same article is loading', () => {
    searchManufacturers.mockImplementation(() => new Promise(() => {}));

    store.dispatch(submitBrandSearch('01089'));
    store.dispatch(submitBrandSearch('01089'));

    expect(searchManufacturers).toHaveBeenCalledTimes(1);
  });

  it('resets the previous brand list when a new search starts', async () => {
    searchManufacturers.mockResolvedValueOnce({ goods: [position('OSSCA', '01089', 'id-1')] });
    await store.dispatch(submitBrandSearch('01089'));
    searchManufacturers.mockImplementationOnce(() => new Promise(() => {}));

    store.dispatch(submitBrandSearch('222'));

    expect(store.getState().searchParts).toMatchObject({
      status: 'loading',
      article: '222',
      brands: [],
    });
  });

  it('ignores a stale manufacturer response', async () => {
    let resolveFirst;
    let resolveSecond;
    searchManufacturers
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

    const first = store.dispatch(searchBrands('111'));
    const second = store.dispatch(searchBrands('222'));
    resolveSecond({ goods: [position('FEBI', '222', 'id-b')] });
    await second;
    resolveFirst({ goods: [position('OSSCA', '111', 'id-a')] });
    await first;

    expect(store.getState().searchParts).toMatchObject({
      status: 'succeeded',
      article: '222',
    });
    expect(store.getState().searchParts.brands.map((brand) => brand.brand)).toEqual(['FEBI']);
  });

  it('aborts the in-flight manufacturer request when a newer search starts', () => {
    const signals = [];
    searchManufacturers.mockImplementation(({ signal }) => {
      signals.push(signal);
      return new Promise(() => {});
    });

    store.dispatch(submitBrandSearch('111'));
    store.dispatch(submitBrandSearch('222'));

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('loads warehouse offers for the selected number and brand', async () => {
    searchManufacturers.mockResolvedValue({
      goods: [{
        ...position('GLASER', 'H01089-00', 'id-g'),
        number: 'H01089-00',
      }],
    });
    searchOffers.mockResolvedValue({
      goods: [{
        goodsID: 'id-g',
        brand: 'GLASER',
        number: 'H01089-00',
        name: 'Фильтр',
        price: 80,
        count: 3,
        warehouses: [
          { id: 'w1', code: 'СПБ', price: 86.88, stock: 3, own: true },
        ],
        analogues: [{
          goodsID: 'id-a',
          brand: 'FEBI',
          number: '333',
          name: 'Аналог',
          price: 1,
          warehouses: [{ id: 'w2', code: 'МСК', price: 90, stock: 1, own: false }],
        }],
      }],
    });

    await store.dispatch(submitBrandSearch('01089'));
    await store.dispatch(submitBrandSelection(store.getState().searchParts.brands[0]));

    expect(searchOffers).toHaveBeenCalledWith(expect.objectContaining({
      key: 'test-key',
      number: 'H01089-00',
      brand: 'GLASER',
    }));
    const offers = store.getState().offers;
    expect(offers.status).toBe('succeeded');
    expect(offers.offers.map((offer) => [offer.brand, offer.price, offer.stock])).toEqual([
      ['GLASER', 86.88, 3],
      ['FEBI', 90, 1],
    ]);
  });

  it('records an offers error', async () => {
    searchOffers.mockRejectedValue(new FavoritApiError('api', 'Request quota exceeded!'));

    await store.dispatch(submitBrandSelection({ goodsID: 'id-1', brand: 'OSSCA', number: '01089' }));

    expect(store.getState().offers.status).toBe('failed');
    expect(store.getState().offers.error).toEqual({ code: 'quota' });
    expect(store.getState().offers.offers).toEqual([]);
  });

  it('clears offers when the article changes and when another brand is selected', async () => {
    searchManufacturers.mockResolvedValue({ goods: [position('OSSCA', '01089', 'id-1'), position('FEBI', '01089', 'id-2')] });
    searchOffers.mockResolvedValue({ goods: [position('OSSCA', '01089', 'id-1')] });
    await store.dispatch(submitBrandSearch('01089'));
    await store.dispatch(submitBrandSelection(store.getState().searchParts.brands[0]));
    expect(store.getState().offers.offers).toHaveLength(1);

    let resolveOffers;
    searchOffers.mockImplementationOnce(() => new Promise((resolve) => { resolveOffers = resolve; }));
    const nextBrand = store.dispatch(submitBrandSelection(store.getState().searchParts.brands[1]));
    expect(store.getState().offers.offers).toEqual([]);
    expect(store.getState().offers).toMatchObject({ status: 'loading', goodsID: 'id-2' });
    resolveOffers({ goods: [position('FEBI', '01089', 'id-2')] });
    await nextBrand;

    searchManufacturers.mockImplementationOnce(() => new Promise(() => {}));
    store.dispatch(submitBrandSearch('999'));
    expect(store.getState().offers).toMatchObject({ status: 'idle', offers: [], goodsID: null });
  });

  it('does not repeat a completed offer request for the same position', async () => {
    searchOffers.mockResolvedValue({ goods: [position('OSSCA', '01089', 'id-1')] });
    const brand = { goodsID: 'id-1', brand: 'OSSCA', number: '01089' };

    await store.dispatch(submitBrandSelection(brand));
    const repeated = store.dispatch(submitBrandSelection(brand));

    expect(repeated).toBeNull();
    expect(searchOffers).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale offers response', async () => {
    let resolveFirst;
    let resolveSecond;
    searchOffers
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

    const first = store.dispatch(fetchOffers({ goodsID: 'id-1', brand: 'OSSCA', number: '01089', article: '01089' }));
    const second = store.dispatch(fetchOffers({ goodsID: 'id-2', brand: 'FEBI', number: '01089', article: '01089' }));
    resolveSecond({ goods: [position('FEBI', '01089', 'id-2')] });
    await second;
    resolveFirst({ goods: [position('OSSCA', '01089', 'id-1')] });
    await first;

    expect(store.getState().offers.goodsID).toBe('id-2');
    expect(store.getState().offers.offers.map((offer) => offer.brand)).toEqual(['FEBI']);
  });

  it('does not call the service when the API key is missing', async () => {
    readApiKey.mockReturnValue('');

    await store.dispatch(submitBrandSearch('01089'));

    expect(searchManufacturers).not.toHaveBeenCalled();
    expect(store.getState().searchParts.status).toBe('failed');
    expect(store.getState().searchParts.error).toEqual({ code: 'missing_key' });
  });
});
