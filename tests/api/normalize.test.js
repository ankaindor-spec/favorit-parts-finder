import { describe, expect, it } from 'vitest';
import { normalizeBrands } from '../../src/entities/brand/model/normalizeBrands.js';
import { normalizeOffers } from '../../src/entities/offer/model/normalizeOffers.js';

const placeholder = {
  brand: '',
  count: 0,
  goodsID: '00000000-0000-0000-0000-000000000000',
  name: '',
  number: '',
  price: 0,
  rate: 0,
  warehouses: [],
};

describe('normalizeBrands', () => {
  it('keeps manufacturers and ignores the empty not-found record', () => {
    const brands = normalizeBrands({
      goods: [
        placeholder,
        {
          goodsID: 'id-1',
          brand: 'OSSCA',
          number: '01089',
          name: 'Стеклоподъемник',
          price: 1078.97,
          count: 36,
          rate: 1,
          warehouses: [{ id: 'w1' }, { id: 'w2' }],
        },
        {
          goodsID: 'id-2',
          brand: 'HOFFER',
          number: '01089',
          name: 'Без остатка',
          warehouses: [],
        },
      ],
    });

    expect(brands.map((brand) => brand.brand)).toEqual(['OSSCA', 'HOFFER']);
    expect(brands[0]).toMatchObject({
      goodsID: 'id-1',
      number: '01089',
      warehouseCount: 2,
    });
    expect(brands[0].price).toBeUndefined();
    expect(brands[0].count).toBeUndefined();
  });

  it('drops records without a brand or number and duplicate goods', () => {
    const brands = normalizeBrands({
      goods: [
        { goodsID: 'id-1', brand: 'FEBI', number: '01089', name: 'Фильтр' },
        { goodsID: 'id-1', brand: 'FEBI', number: '01089', name: 'Фильтр копия' },
        { goodsID: 'id-3', brand: '', number: '01089', name: 'Без бренда' },
        null,
      ],
    });

    expect(brands).toHaveLength(1);
    expect(brands[0].name).toBe('Фильтр');
  });

  it('returns an empty list for a broken payload', () => {
    expect(normalizeBrands(null)).toEqual([]);
    expect(normalizeBrands({ goods: null })).toEqual([]);
  });
});

describe('normalizeOffers', () => {
  it('uses warehouse price and stock, keeps separate warehouses, and adds analogues', () => {
    const offers = normalizeOffers({
      goods: [
        {
          goodsID: 'id-1',
          brand: 'OSSCA',
          number: '01089',
          name: 'Стеклоподъемник',
          price: 9999,
          count: 100,
          rate: 1,
          brand_quality: 'X',
          sale: true,
          warehouses: [
            {
              id: 'w1',
              code: 'МСК РС',
              price: 10.5,
              stock: 2,
              own: false,
              shipmentDate: '2026-11-13T13:30:00+03:00',
              warehouseShipping: 'ship-1',
            },
            {
              id: 'w1',
              code: 'МСК РС',
              price: 10.5,
              stock: 2,
              own: false,
              shipmentDate: '2026-11-13T13:30:00+03:00',
            },
            {
              id: 'w2',
              code: 'МСК РС',
              price: 12,
              stock: 4,
              own: true,
              shipmentDate: '2026-11-14T09:00:00+03:00',
            },
          ],
          analogues: [
            {
              goodsID: 'id-2',
              brand: 'FEBI',
              number: '111',
              name: 'Аналог рычага',
              price: 5,
              count: 8,
              rate: 2,
              notRefund: true,
              warehouses: [
                { id: 'w3', code: 'СПБ', price: '7.25', stock: 0, own: false },
              ],
            },
          ],
        },
      ],
    });

    expect(offers.map((offer) => [offer.brand, offer.price, offer.stock, offer.warehouseCode])).toEqual([
      ['OSSCA', 10.5, 2, 'МСК РС'],
      ['OSSCA', 12, 4, 'МСК РС'],
      ['FEBI', 7.25, 0, 'СПБ'],
    ]);
    expect(offers[0].warehouseShipping).toBeUndefined();
    expect(offers[0].kind).toBe('requested');
    expect(offers[2]).toMatchObject({ kind: 'analog', notRefund: true, rate: 2 });
    expect(new Set(offers.map((offer) => offer.id)).size).toBe(offers.length);
  });

  it('does not invent a price from the obsolete goods field when a warehouse has no price', () => {
    const offers = normalizeOffers({
      goods: [
        {
          goodsID: 'id-1',
          brand: 'AP',
          number: '01089',
          name: 'Колодки',
          price: 1505.8,
          count: 9,
          warehouses: [{ id: 'w1', code: '', stock: 'нет' }],
        },
      ],
    });

    expect(offers).toHaveLength(1);
    expect(offers[0].price).toBeNull();
    expect(offers[0].stock).toBeNull();
    expect(offers[0].warehouseCode).toBe('');
  });

  it('returns no offers for the empty not-found shape and for positions without warehouses', () => {
    expect(normalizeOffers({ goods: [placeholder] })).toEqual([]);
    expect(normalizeOffers({
      goods: [{
        goodsID: 'id-1',
        brand: 'AP',
        number: '01089',
        name: 'Колодки',
        price: 10,
        warehouses: [],
        analogues: [],
      }],
    })).toEqual([]);
  });
});
