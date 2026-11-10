import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PackageSearch } from 'lucide-react';
import { submitBrandSearch, submitBrandSelection } from '../../../features/search-session/model/commands.js';
import { normalizeArticle } from '../../../shared/lib/article.js';
import { messageFor } from '../../../shared/lib/messages.js';
import { readApiKey } from '../../../shared/api/favoritApi.js';
import { Message } from '../../../shared/ui/Message.jsx';
import { BrandSelector } from '../../../widgets/brand-selector/ui/BrandSelector.jsx';
import { OffersList } from '../../../widgets/offers-list/ui/OffersList.jsx';
import { SearchPanel } from '../../../widgets/search-panel/ui/SearchPanel.jsx';

export function PartsSearchPage() {
  const dispatch = useDispatch();
  const search = useSelector((state) => state.searchParts);
  const offers = useSelector((state) => state.offers);
  const [article, setArticle] = useState('');
  const [formError, setFormError] = useState('');
  const keyReady = Boolean(readApiKey());
  const searchLocked = !keyReady || search.status === 'loading';

  function handleArticleChange(value) {
    setArticle(value);
    if (formError) setFormError('');
  }

  function handleSubmit() {
    if (!readApiKey()) return;
    const normalized = normalizeArticle(article);
    setFormError(normalized ? '' : 'Введите номер детали.');
    const pending = dispatch(submitBrandSearch(article));
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  }

  function handleSelect(brand) {
    const pending = dispatch(submitBrandSelection(brand));
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  }

  return (
    <div className="app-shell">
      <a className="skip" href="#search">К поиску</a>
      <header className="header">
        <div className="header__inner">
          <div className="header__title">
            <PackageSearch size={28} aria-hidden="true" />
            <h1>Favorit Parts Finder</h1>
          </div>
          <p className="header__lead">Поиск автозапчастей по артикулу: производители, аналоги и остатки по складам.</p>
        </div>
      </header>
      <main className="page">
        {!keyReady ? (
          <Message tone="danger">
            Не задан ключ доступа к сервису проценки. Добавьте VITE_FAVORIT_API_KEY и пересоберите приложение.
          </Message>
        ) : null}
        <SearchPanel
          article={article}
          onArticleChange={handleArticleChange}
          onSubmit={handleSubmit}
          disabled={searchLocked}
          busy={search.status === 'loading'}
          error={formError}
        />
        <div className="results">
          <BrandSelector
            status={search.status}
            article={search.article}
            brands={search.brands}
            error={search.status === 'failed' ? messageFor(search.error) : ''}
            selectedId={offers.goodsID}
            pendingId={offers.status === 'loading' ? offers.goodsID : ''}
            onSelect={handleSelect}
          />
          <OffersList
            status={offers.status}
            error={offers.status === 'failed' ? messageFor(offers.error) : ''}
            offers={offers.offers}
            brand={offers.brand}
            number={offers.number}
            selectionId={offers.goodsID}
            hasBrands={search.brands.length > 0}
            searchStatus={search.status}
          />
        </div>
        <footer className="footer">
          <p>Данные сервиса «Проценка» Favorit. Демонстрационный ключ публичный, он указан в официальной документации.</p>
        </footer>
      </main>
    </div>
  );
}
