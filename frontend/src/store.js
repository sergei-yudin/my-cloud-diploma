import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from './api'

export const loadMe = createAsyncThunk('auth/me', async (_, thunk) => {
  try { return await api('/auth/me/') } catch (error) { return thunk.rejectWithValue(error.message) }
})
export const login = createAsyncThunk('auth/login', (payload) => api('/auth/login/', { method: 'POST', body: JSON.stringify(payload) }))
export const register = createAsyncThunk('auth/register', (payload) => api('/auth/register/', { method: 'POST', body: JSON.stringify(payload) }))
export const logout = createAsyncThunk('auth/logout', () => api('/auth/logout/', { method: 'POST' }))

const auth = createSlice({
  name: 'auth', initialState: { user: null, loading: true, error: null }, reducers: {},
  extraReducers: (builder) => builder
    .addCase(loadMe.fulfilled, (state, action) => { state.user = action.payload; state.loading = false })
    .addCase(loadMe.rejected, (state) => { state.user = null; state.loading = false })
    .addCase(login.fulfilled, (state, action) => { state.user = action.payload; state.error = null })
    .addCase(register.fulfilled, (state, action) => { state.user = action.payload; state.error = null })
    .addCase(logout.fulfilled, (state) => { state.user = null })
    .addMatcher((action) => [login.rejected.type, register.rejected.type].includes(action.type), (state, action) => { state.error = action.error.message }),
})

export const store = configureStore({ reducer: { auth: auth.reducer } })

