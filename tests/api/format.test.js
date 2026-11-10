import { describe, expect, it } from 'vitest';
import { formatPrice, formatQuantity, formatShipment } from '../../src/shared/lib/format.js';

describe('format', () => {
  it('formats a price without currency and keeps two decimals', () => {
    expect(formatPrice(1028.5)).toBe('1 028,50');
    expect(formatPrice(0)).toBe('0,00');
    expect(formatPrice(-12.3)).toBe('-12,30');
  });

  it('does not show invalid prices or quantities', () => {
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
    expect(formatPrice(Number.NaN)).toBe('—');
    expect(formatPrice('10')).toBe('—');
    expect(formatQuantity(null)).toBe('—');
    expect(formatQuantity(Number.NaN)).toBe('—');
  });

  it('formats stock as a grouped number', () => {
    expect(formatQuantity(0)).toBe('0');
    expect(formatQuantity(9)).toBe('9');
    expect(formatQuantity(1200)).toBe('1 200');
  });

  it('shows the shipment clock from the API value without shifting it', () => {
    expect(formatShipment('2026-11-13T13:30:00+03:00')).toBe('13.11.2026, 13:30');
    expect(formatShipment('не дата')).toBe('—');
    expect(formatShipment(null)).toBe('—');
  });
});
