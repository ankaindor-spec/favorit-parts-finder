export function cleanString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

export function cleanNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const EMPTY_GOODS_ID = '00000000-0000-0000-0000-000000000000';

export function isPlaceholderGoods(item) {
  if (!item || typeof item !== 'object') return true;
  const brand = cleanString(item.brand);
  const number = cleanString(item.number);
  const name = cleanString(item.name);
  const goodsID = cleanString(item.goodsID).toLowerCase();
  const emptyId = goodsID === '' || goodsID === EMPTY_GOODS_ID;
  return brand === '' && number === '' && name === '' && emptyId;
}
