import { LoaderCircle } from 'lucide-react';
import { Message } from '../../../shared/ui/Message.jsx';

export function BrandSelector({
  status,
  article,
  brands,
  error,
  selectedId,
  pendingId,
  onSelect,
}) {
  return (
    <section className="panel" aria-labelledby="brands-title">
      <div className="panel__head">
        <h2 id="brands-title">Производители</h2>
        {status === 'succeeded' ? <p className="panel__count">Найдено: {brands.length}</p> : null}
      </div>

      {status === 'idle' ? (
        <Message>Введите артикул и нажмите «Найти». Сервис вернёт производителей с этим номером.</Message>
      ) : null}

      {status === 'loading' ? <Message tone="loading">Ищем производителей…</Message> : null}

      {status === 'failed' ? <Message tone="danger">{error}</Message> : null}

      {status === 'succeeded' && brands.length === 0 ? (
        <Message>По артикулу {article} ничего не найдено.</Message>
      ) : null}

      {status === 'succeeded' && brands.length > 0 ? (
        <ul className="brand-list">
          {brands.map((brand) => {
            const selected = brand.id === selectedId;
            const pending = brand.id === pendingId;
            return (
              <li key={brand.id}>
                <button
                  type="button"
                  className={selected ? 'brand is-selected' : 'brand'}
                  aria-pressed={selected}
                  onClick={() => onSelect(brand)}
                >
                  <span className="brand__top">
                    <span className="brand__name">{brand.brand}</span>
                    {pending ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : null}
                  </span>
                  <span className="brand__title">{brand.name || 'Без названия'}</span>
                  <span className="brand__meta">
                    <span>Артикул {brand.number}</span>
                    <span>{brand.warehouseCount > 0 ? `Складов: ${brand.warehouseCount}` : 'Нет складов'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
