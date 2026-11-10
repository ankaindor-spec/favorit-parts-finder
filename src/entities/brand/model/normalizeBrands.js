import { cleanNumber, cleanString, isPlaceholderGoods } from '../../part/model/goods.js';

export function normalizeBrands(payload) {
  const goods = Array.isArray(payload?.goods) ? payload.goods : [];
  const brands = [];
  const seen = new Set();

  goods.forEach((item) => {
    if (isPlaceholderGoods(item)) return;
    const brand = cleanString(item.brand);
    const number = cleanString(item.number);
    const name = cleanString(item.name);
    if (!brand || !number) return;

    const goodsID = cleanString(item.goodsID) || `${brand}|${number}|${name}`;
    if (seen.has(goodsID)) return;
    seen.add(goodsID);

    const warehouses = Array.isArray(item.warehouses)
      ? item.warehouses.filter((warehouse) => warehouse && typeof warehouse === 'object')
      : [];

    brands.push({
      id: goodsID,
      goodsID,
      brand,
      number,
      name,
      rate: cleanNumber(item.rate),
      warehouseCount: warehouses.length,
    });
  });

  return brands;
}
