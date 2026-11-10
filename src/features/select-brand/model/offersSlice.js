import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { normalizeOffers } from '../../../entities/offer/model/normalizeOffers.js';
import { toUserError } from '../../../shared/api/errors.js';
import { readApiKey, searchOffers } from '../../../shared/api/favoritApi.js';
import { resultsCleared, searchBrands } from '../../search-parts/model/searchSlice.js';

export const fetchOffers = createAsyncThunk(
  'selectBrand/fetchOffers',
  async ({ number, brand }, { signal, rejectWithValue }) => {
    const key = readApiKey();
    if (!key) return rejectWithValue({ code: 'missing_key' });
    try {
      const data = await searchOffers({ key, number, brand, signal });
      if (signal.aborted) {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }
      return normalizeOffers(data);
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      return rejectWithValue(toUserError(error));
    }
  },
);

const initialState = {
  status: 'idle',
  error: null,
  article: '',
  goodsID: null,
  brand: '',
  number: '',
  offers: [],
  requestId: null,
};

function clearOffers(state) {
  state.status = 'idle';
  state.error = null;
  state.article = '';
  state.goodsID = null;
  state.brand = '';
  state.number = '';
  state.offers = [];
  state.requestId = null;
}

const offersSlice = createSlice({
  name: 'offers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(searchBrands.pending, clearOffers)
      .addCase(resultsCleared, clearOffers)
      .addCase(fetchOffers.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.offers = [];
        state.article = action.meta.arg.article || '';
        state.goodsID = action.meta.arg.goodsID;
        state.brand = action.meta.arg.brand;
        state.number = action.meta.arg.number;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.error = null;
        state.offers = action.payload;
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        if (action.meta.aborted) return;
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.offers = [];
        state.error = action.payload || { code: 'unknown' };
      });
  },
});

export default offersSlice.reducer;
