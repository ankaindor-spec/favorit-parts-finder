import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { FavoritApiError } from '../../src/shared/api/errors.js';
import { createAppStore } from '../../src/app/store/store.js';
import { PartsSearchPage } from '../../src/pages/parts-search/ui/PartsSearchPage.jsx';

vi.mock('../../src/shared/api/favoritApi.js', () => ({
  readApiKey: vi.fn(() => 'test-key'),
  searchManufacturers: vi.fn(),
  searchOffers: vi.fn(),
}));

const { readApiKey, searchManufacturers, searchOffers } = await import('../../src/shared/api/favoritApi.js');
const { resetRequestGuards } = await import('../../src/features/search-session/model/commands.js');

function renderPage() {
  const store = createAppStore();
  render(
    <Provider store={store}>
      <PartsSearchPage />
    </Provider>,
  );
  return store;
}

function manufacturer(brand, extra = {}) {
  return {
    goodsID: extra.goodsID || brand,
    brand,
    number: extra.number || '01089',
    name: extra.name || `Деталь ${brand}`,
    price: 9999,
    count: 30,
    rate: 1,
    warehouses: extra.warehouses || [],
  };
}

describe('PartsSearchPage', () => {
  afterEach(() => {
    resetRequestGuards();
  });

  beforeEach(() => {
    readApiKey.mockReset();
    readApiKey.mockReturnValue('test-key');
    searchManufacturers.mockReset();
    searchOffers.mockReset();
    delete window.matchMedia;
  });

  it('shows the initial search state', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Favorit Parts Finder' })).toBeInTheDocument();
    expect(screen.getByLabelText('Номер детали')).toHaveValue('');
    expect(screen.getByText(/Введите артикул и нажмите/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('does not search when the article is empty or blank', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Найти' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Введите номер детали.');
    expect(searchManufacturers).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Номер детали'), '   ');
    await user.keyboard('{Enter}');
    expect(searchManufacturers).not.toHaveBeenCalled();
  });

  it('searches on Enter and renders manufacturers', async () => {
    const user = userEvent.setup();
    searchManufacturers.mockResolvedValue({
      goods: [manufacturer('OSSCA', { name: 'Стеклоподъемник задний левый', warehouses: [{ id: 'w1' }] })],
    });
    renderPage();

    await user.type(screen.getByLabelText('Номер детали'), '01089{Enter}');

    expect(await screen.findByRole('button', { name: /OSSCA/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Стеклоподъемник задний левый/ })).toBeInTheDocument();
    expect(searchManufacturers).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('9 999,00')).not.toBeInTheDocument();
  });

  it('shows a loading state and blocks the form while manufacturers are requested', async () => {
    const user = userEvent.setup();
    let resolveSearch;
    searchManufacturers.mockImplementation(({ signal }) => new Promise((resolve, reject) => {
      resolveSearch = resolve;
      signal.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }));
    renderPage();

    await user.type(screen.getByLabelText('Номер детали'), '01089');
    await user.click(screen.getByRole('button', { name: 'Найти' }));

    expect(screen.getByText('Ищем производителей…')).toBeInTheDocument();
    expect(screen.getByLabelText('Номер детали')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Поиск…' })).toBeDisabled();

    resolveSearch({
      goods: [manufacturer('OSSCA', { name: 'Стеклоподъемник задний левый' })],
    });
    expect(await screen.findByRole('button', { name: /OSSCA/ })).toBeEnabled();
  });

  it('shows warehouse rows with price and stock after a brand is selected', async () => {
    const user = userEvent.setup();
    searchManufacturers.mockResolvedValue({
      goods: [manufacturer('OSSCA', { name: 'Стеклоподъемник задний левый' })],
    });
    searchOffers.mockResolvedValue({
      goods: [{
        goodsID: 'OSSCA',
        brand: 'OSSCA',
        number: '01089',
        name: 'Стеклоподъемник задний левый',
        price: 9999,
        count: 100,
        rate: 1,
        warehouses: [
          { id: 'w1', code: 'МСК РС', price: 1028.5, stock: 9, own: false, shipmentDate: '2026-11-12T13:30:00+03:00' },
          { id: 'w2', code: 'МСК РС', price: 1100, stock: 0, own: true, shipmentDate: '2026-11-13T09:00:00+03:00' },
        ],
        analogues: [{
          goodsID: 'FEBI',
          brand: 'FEBI',
          number: '222',
          name: 'Аналог стекла',
          price: 1,
          warehouses: [{ id: 'w3', code: 'СПБ', price: 640, stock: 2, own: false }],
        }],
      }],
    });
    renderPage();

    await user.type(screen.getByLabelText('Номер детали'), '01089');
    await user.click(screen.getByRole('button', { name: 'Найти' }));
    await user.click(await screen.findByRole('button', { name: /OSSCA/ }));

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Стеклоподъемник задний левый')).toBeInTheDocument();
    expect(within(rows[1]).getByText('OSSCA')).toBeInTheDocument();
    expect(within(rows[1]).getByText('1 028,50')).toBeInTheDocument();
    expect(within(rows[1]).getByText('9')).toBeInTheDocument();
    expect(within(rows[2]).getByText('0 · нет в наличии')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Аналог стекла')).toBeInTheDocument();
    expect(within(rows[3]).getByText('640,00')).toBeInTheDocument();
    expect(screen.queryByText(/₽|руб/)).not.toBeInTheDocument();
    expect(screen.queryByText('9 999,00')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /OSSCA/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders offer cards on a narrow viewport', async () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const user = userEvent.setup();
    searchManufacturers.mockResolvedValue({
      goods: [manufacturer('OSSCA', { name: 'Стеклоподъемник задний левый' })],
    });
    searchOffers.mockResolvedValue({
      goods: [{
        goodsID: 'OSSCA',
        brand: 'OSSCA',
        number: '01089',
        name: 'Стеклоподъемник задний левый',
        warehouses: [{ id: 'w1', code: 'МСК РС', price: 86.88, stock: 3, own: true }],
      }],
    });
    renderPage();

    await user.type(screen.getByLabelText('Номер детали'), '01089{Enter}');
    await user.click(await screen.findByRole('button', { name: /OSSCA/ }));

    expect(await screen.findByRole('article', { name: /Стеклоподъемник задний левый, OSSCA/ })).toBeInTheDocument();
    expect(screen.getByText('86,88')).toBeInTheDocument();
    expect(screen.getByText('Собственный склад')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an empty manufacturer result and an empty offers result', async () => {
    const user = userEvent.setup();
    searchManufacturers.mockResolvedValueOnce({
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
    });
    renderPage();
    await user.type(screen.getByLabelText('Номер детали'), '7260500039S{Enter}');
    expect(await screen.findByText('По артикулу 7260500039S ничего не найдено.')).toBeInTheDocument();

    searchManufacturers.mockResolvedValueOnce({
      goods: [manufacturer('AP', { name: 'Колодки' })],
    });
    searchOffers.mockResolvedValueOnce({
      goods: [manufacturer('AP', { name: 'Колодки', warehouses: [] })],
    });
    await user.clear(screen.getByLabelText('Номер детали'));
    await user.type(screen.getByLabelText('Номер детали'), '01089{Enter}');
    await user.click(await screen.findByRole('button', { name: /AP/ }));
    expect(await screen.findByText('Для выбранного производителя нет складских предложений.')).toBeInTheDocument();
  });

  it('shows a human error and hides the raw service message', async () => {
    const user = userEvent.setup();
    searchManufacturers.mockRejectedValue(new FavoritApiError('api', 'Invalid access key'));
    renderPage();

    await user.type(screen.getByLabelText('Номер детали'), '01089{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервис не принял ключ доступа.');
    expect(screen.queryByText(/Invalid access key/)).not.toBeInTheDocument();
    expect(screen.queryByText(/goodsID|stack/i)).not.toBeInTheDocument();
  });

  it('explains a missing API key and blocks the search', () => {
    readApiKey.mockReturnValue('');
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(/Не задан ключ доступа/);
    expect(screen.getByRole('button', { name: 'Найти' })).toBeDisabled();
    expect(screen.getByLabelText('Номер детали')).toBeDisabled();
  });

  it('can hide zero-stock rows with the local filter', async () => {
    const user = userEvent.setup();
    searchManufacturers.mockResolvedValue({ goods: [manufacturer('OSSCA')] });
    searchOffers.mockResolvedValue({
      goods: [{
        goodsID: 'OSSCA',
        brand: 'OSSCA',
        number: '01089',
        name: 'Стеклоподъемник',
        warehouses: [
          { id: 'w1', code: 'МСК', price: 10, stock: 0 },
          { id: 'w2', code: 'СПБ', price: 12, stock: 4 },
        ],
      }],
    });
    renderPage();
    await user.type(screen.getByLabelText('Номер детали'), '01089{Enter}');
    await user.click(await screen.findByRole('button', { name: /OSSCA/ }));
    expect(await screen.findByText('0 · нет в наличии')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Только с остатком' }));

    expect(screen.queryByText('0 · нет в наличии')).not.toBeInTheDocument();
    expect(screen.getByText('12,00')).toBeInTheDocument();
  });
});
