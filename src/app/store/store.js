import { configureStore } from '@reduxjs/toolkit';
import offersReducer from '../../features/select-brand/model/offersSlice.js';
import searchReducer from '../../features/search-parts/model/searchSlice.js';

export function createAppStore(preloadedState) {
  return configureStore({
    reducer: {
      searchParts: searchReducer,
      offers: offersReducer,
    },
    preloadedState,
  });
}

export const store = createAppStore();
