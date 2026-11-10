import { useState } from 'react';
import { formatPrice, formatQuantity, formatShipment } from '../../../shared/lib/format.js';
import { useWideLayout } from '../../../shared/lib/useWideLayout.js';
import { Message } from '../../../shared/ui/Message.jsx';

const PAGE_SIZE = 40;

function offerLabel(offer) {
  return offer.name || 'Без названия';
}

function KindBadge({ kind }) {
  return (
    <span className={kind === 'analog' ? 'badge badge--analog' : 'badge'}>
      {kind === 'analog' ? 'Аналог' : 'Искомая'}
    </span>
  );
}

function OfferMarks({ offer }) {
  return (
    <span className="badges">
      <KindBadge kind={offer.kind} />
      {offer.notRefund ? <span className="badge badge--warn">Невозвратная</span> : null}
      {offer.rate !== null && offer.rate > 1 ? (
        <span className="badge">Кратность {formatQuantity(offer.rate)}</span>
      ) : null}
    </span>
  );
}

function StockValue({ stock }) {
  if (stock === null) return '—';
  if (stock === 0) return <span className="stock stock--zero">0 · нет в наличии</span>;
  return formatQuantity(stock);
}

function WarehouseValue({ offer }) {
  const ownLabel = offer.own === true ? 'Собственный склад' : offer.own === false ? 'Внешний склад' : '';
  return (
    <span className="warehouse">
      <span>{offer.warehouseCode || 'Склад без кода'}</span>
      {ownLabel ? <span className="warehouse__note">{ownLabel}</span> : null}
    </span>
  );
}

function OffersTable({ offers }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="visually-hidden">Складские предложения</caption>
        <thead>
          <tr>
            <th scope="col">Наименование</th>
            <th scope="col">Производитель</th>
            <th scope="col">Артикул</th>
            <th scope="col">Склад</th>
            <th scope="col" className="num">Цена</th>
            <th scope="col" className="num">Наличие</th>
            <th scope="col">Отгрузка</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.id}>
              <td>
                <div className="offer-name">{offerLabel(offer)}</div>
                <OfferMarks offer={offer} />
              </td>
              <td>{offer.brand || 'Производитель не указан'}</td>
              <td>{offer.number || '—'}</td>
              <td><WarehouseValue offer={offer} /></td>
              <td className="num">{formatPrice(offer.price)}</td>
              <td className="num"><StockValue stock={offer.stock} /></td>
              <td>{formatShipment(offer.shipmentDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OfferCards({ offers }) {
  return (
    <div className="cards">
      {offers.map((offer) => (
        <article key={offer.id} className="offer-card" aria-label={`${offerLabel(offer)}, ${offer.brand}`}>
          <div className="offer-card__head">
            <h3>{offerLabel(offer)}</h3>
            <OfferMarks offer={offer} />
          </div>
          <p className="offer-card__brand">{offer.brand || 'Производитель не указан'} · {offer.number || '—'}</p>
          <dl className="offer-card__facts">
            <div>
              <dt>Цена</dt>
              <dd>{formatPrice(offer.price)}</dd>
            </div>
            <div>
              <dt>Наличие</dt>
              <dd><StockValue stock={offer.stock} /></dd>
            </div>
            <div>
              <dt>Склад</dt>
              <dd><WarehouseValue offer={offer} /></dd>
            </div>
            <div>
              <dt>Отгрузка</dt>
              <dd>{formatShipment(offer.shipmentDate)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function OffersBody({
  status,
  error,
  offers,
  brand,
  number,
  hasBrands,
  searchStatus,
  wide,
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [inStockOnly, setInStockOnly] = useState(false);
  const filtered = inStockOnly ? offers.filter((offer) => offer.stock !== null && offer.stock > 0) : offers;
  const shown = filtered.slice(0, visible);
  const title = brand ? `${brand}${number ? ` · ${number}` : ''}` : 'Предложения';

  return (
    <section className="panel" aria-labelledby="offers-title">
      <div className="panel__head">
        <h2 id="offers-title">{title}</h2>
        {status === 'succeeded' ? <p className="panel__count">Предложений: {offers.length}</p> : null}
      </div>
      <p className="panel__note">Цена и остаток — по каждому складу отдельно. Валюта в ответе сервиса не указана.</p>

      {status === 'loading' ? <Message tone="loading">Загружаем предложения…</Message> : null}
      {status === 'failed' ? <Message tone="danger">{error}</Message> : null}

      {status === 'idle' && searchStatus === 'idle' ? (
        <Message>После выбора производителя здесь появятся цены и остатки по складам, включая аналоги.</Message>
      ) : null}
      {status === 'idle' && searchStatus === 'loading' ? (
        <Message>Сначала найдём производителей по артикулу.</Message>
      ) : null}
      {status === 'idle' && searchStatus === 'failed' ? (
        <Message>Предложения появятся после успешного поиска производителя.</Message>
      ) : null}
      {status === 'idle' && searchStatus === 'succeeded' && hasBrands ? (
        <Message>{wide ? 'Выберите производителя слева.' : 'Выберите производителя выше.'}</Message>
      ) : null}
      {status === 'idle' && searchStatus === 'succeeded' && !hasBrands ? (
        <Message>Нет производителя, для которого можно запросить предложения.</Message>
      ) : null}

      {status === 'succeeded' && offers.length === 0 ? (
        <Message>Для выбранного производителя нет складских предложений.</Message>
      ) : null}

      {status === 'succeeded' && offers.length > 0 ? (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
            />
            Только с остатком
          </label>
          {filtered.length === 0 ? (
            <Message>Нет предложений с остатком больше нуля.</Message>
          ) : (
            <>
              <p className="panel__count">Показано {shown.length} из {filtered.length}</p>
              {wide ? <OffersTable offers={shown} /> : <OfferCards offers={shown} />}
              {shown.length < filtered.length ? (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setVisible((count) => count + PAGE_SIZE)}
                >
                  Показать ещё
                </button>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </section>
  );
}

export function OffersList(props) {
  const wide = useWideLayout();
  return <OffersBody key={props.selectionId || 'empty'} {...props} wide={wide} />;
}
