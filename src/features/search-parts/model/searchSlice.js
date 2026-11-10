import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { normalizeBrands } from '../../../entities/brand/model/normalizeBrands.js';
import { toUserError } from '../../../shared/api/errors.js';
import { readApiKey, searchManufacturers } from '../../../shared/api/favoritApi.js';

export const searchBrands = createAsyncThunk(
  'searchParts/searchBrands',
  async (article, { signal, rejectWithValue }) => {
    const key = readApiKey();
    if (!key) return rejectWithValue({ code: 'missing_key' });
    try {
      const data = await searchManufacturers({ key, number: article, signal });
      if (signal.aborted) {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }
      return normalizeBrands(data);
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
  brands: [],
  requestId: null,
};

const searchSlice = createSlice({
  name: 'searchParts',
  initialState,
  reducers: {
    resultsCleared(state) {
      state.status = 'idle';
      state.error = null;
      state.article = '';
      state.brands = [];
      state.requestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchBrands.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.brands = [];
        state.article = action.meta.arg;
        state.requestId = action.meta.requestId;
      })
      .addCase(searchBrands.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'succeeded';
        state.error = null;
        state.brands = action.payload;
      })
      .addCase(searchBrands.rejected, (state, action) => {
        if (action.meta.aborted) return;
        if (state.requestId !== action.meta.requestId) return;
        state.status = 'failed';
        state.brands = [];
        state.error = action.payload || { code: 'unknown' };
      });
  },
});

export const { resultsCleared } = searchSlice.actions;
export default searchSlice.reducer;
