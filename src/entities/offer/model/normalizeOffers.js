import { cleanNumber, cleanString, isPlaceholderGoods } from '../../part/model/goods.js';

function warehouseList(position) {
  if (!Array.isArray(position?.warehouses)) return [];
  return position.warehouses.filter((warehouse) => warehouse && typeof warehouse === 'object');
}

function positionKey(position) {
  return [
    cleanString(position.goodsID),
    cleanString(position.brand),
    cleanString(position.number),
    cleanString(position.name),
  ].join('|');
}

function pushWarehouses(position, kind, offers, seen) {
  const goodsID = cleanString(position.goodsID);
  const brand = cleanString(position.brand);
  const number = cleanString(position.number);
  const name = cleanString(position.name);
  const rate = cleanNumber(position.rate);
  const positionNotRefund = position.notRefund === true;

  warehouseList(position).forEach((warehouse) => {
    const price = cleanNumber(warehouse.price);
    const stock = cleanNumber(warehouse.stock);
    const shipmentDate = cleanString(warehouse.shipmentDate);
    const signature = [
      goodsID,
      brand,
      number,
      cleanString(warehouse.id),
      cleanString(warehouse.code),
      price ?? '',
      stock ?? '',
      shipmentDate,
      kind,
    ].join('|');
    if (seen.has(signature)) return;
    seen.add(signature);

    offers.push({
      id: signature,
      goodsID,
      kind,
      name,
      brand,
      number,
      warehouseCode: cleanString(warehouse.code),
      own: typeof warehouse.own === 'boolean' ? warehouse.own : null,
      price,
      stock,
      shipmentDate,
      notRefund: positionNotRefund || warehouse.notRefund === true,
      rate,
    });
  });
}

export function normalizeOffers(payload) {
  const goods = Array.isArray(payload?.goods) ? payload.goods : [];
  const offers = [];
  const seenOffers = new Set();
  const seenPositions = new Set();

  function walk(position, kind, depth) {
    if (!position || typeof position !== 'object' || isPlaceholderGoods(position)) return;
    const key = positionKey(position);
    if (seenPositions.has(key)) return;
    seenPositions.add(key);
    pushWarehouses(position, kind, offers, seenOffers);
    if (depth >= 2 || !Array.isArray(position.analogues)) return;
    position.analogues.forEach((analog) => walk(analog, 'analog', depth + 1));
  }

  goods.forEach((item) => walk(item, 'requested', 0));
  return offers;
}
