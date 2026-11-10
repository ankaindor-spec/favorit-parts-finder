import { LoaderCircle, Search } from 'lucide-react';

export function SearchPanel({
  article,
  onArticleChange,
  onSubmit,
  disabled,
  busy,
  error,
}) {
  return (
    <form
      className="search-panel"
      id="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="search-panel__label" htmlFor="article">Номер детали</label>
      <div className="search-panel__row">
        <input
          id="article"
          name="article"
          value={article}
          placeholder="Например, 01089"
          autoComplete="off"
          spellCheck="false"
          disabled={disabled}
          onChange={(event) => onArticleChange(event.target.value)}
        />
        <button className="button" type="submit" disabled={disabled}>
          {busy ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          {busy ? 'Поиск…' : 'Найти'}
        </button>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}
