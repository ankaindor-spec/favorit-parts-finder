import { normalizeArticle } from '../../../shared/lib/article.js';
import { fetchOffers } from '../../select-brand/model/offersSlice.js';
import { resultsCleared, searchBrands } from '../../search-parts/model/searchSlice.js';

const flights = {
  search: null,
  offers: null,
};

function track(slot, promise) {
  const previous = flights[slot];
  flights[slot] = promise;
  promise.catch(() => {});
  promise.finally(() => {
    if (flights[slot] === promise) flights[slot] = null;
  });
  if (previous && previous !== promise) previous.abort();
  return promise;
}

function abortSlot(slot) {
  const current = flights[slot];
  flights[slot] = null;
  if (current) current.abort();
}

export function resetRequestGuards() {
  abortSlot('search');
  abortSlot('offers');
}

export function submitBrandSearch(rawArticle) {
  return (dispatch, getState) => {
    const article = normalizeArticle(rawArticle);
    if (!article) {
      abortSlot('search');
      abortSlot('offers');
      dispatch(resultsCleared());
      return null;
    }

    const current = getState().searchParts;
    if (current.status === 'loading' && current.article === article) return null;

    abortSlot('offers');
    return track('search', dispatch(searchBrands(article)));
  };
}

export function submitBrandSelection(position) {
  return (dispatch, getState) => {
    const goodsID = typeof position?.goodsID === 'string' ? position.goodsID : '';
    const brand = typeof position?.brand === 'string' ? position.brand.trim() : '';
    const number = typeof position?.number === 'string' ? position.number.trim() : '';
    if (!goodsID || !brand || !number) return null;

    const current = getState().offers;
    if (
      (current.status === 'loading' || current.status === 'succeeded')
      && current.goodsID === goodsID
    ) {
      return null;
    }

    const article = getState().searchParts.article;
    return track('offers', dispatch(fetchOffers({
      article,
      goodsID,
      brand,
      number,
    })));
  };
}
