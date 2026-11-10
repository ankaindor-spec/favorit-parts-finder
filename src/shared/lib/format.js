function groupDigits(intPart) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatPrice(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const negative = value < 0;
  const [intPart, fraction] = Math.abs(value).toFixed(2).split('.');
  return `${negative ? '-' : ''}${groupDigits(intPart)},${fraction}`;
}

export function formatQuantity(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const negative = value < 0;
  const [intPart, fraction] = Math.abs(value).toString().split('.');
  const body = fraction ? `${groupDigits(intPart)},${fraction}` : groupDigits(intPart);
  return `${negative ? '-' : ''}${body}`;
}

export function formatShipment(value) {
  if (typeof value !== 'string') return '—';
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return '—';
  const [, year, month, day, hour, minute] = match;
  return `${day}.${month}.${year}, ${hour}:${minute}`;
}
