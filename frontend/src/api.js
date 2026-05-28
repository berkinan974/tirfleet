import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getTrucks = () => api.get('/trucks/').then(r => r.data)
export const createTruck = (data) => api.post('/trucks/', data).then(r => r.data)
export const updateTruck = (id, data) => api.patch(`/trucks/${id}`, data).then(r => r.data)

export const getDrivers = () => api.get('/drivers/').then(r => r.data)
export const createDriver = (data) => api.post('/drivers/', data).then(r => r.data)
export const updateDriver = (id, data) => api.patch(`/drivers/${id}`, data).then(r => r.data)

export const getPtiToday = () => api.get('/pti/today').then(r => r.data)
export const getPtiHistory = (days = 7) => api.get(`/pti/history?days=${days}`).then(r => r.data)
export const validatePti = (id, is_valid) => api.patch(`/pti/${id}/validate`, { is_valid }).then(r => r.data)

export const getLoads = (status) => api.get('/loads/' + (status ? `?status=${status}` : '')).then(r => r.data)
export const createLoad = (data) => api.post('/loads/', data).then(r => r.data)
export const updateLoad = (id, data) => api.patch(`/loads/${id}`, data).then(r => r.data)
export const getLoadSummary = () => api.get('/loads/summary').then(r => r.data)

export const nudgePti = () => api.post('/pti/nudge').then(r => r.data)
export const broadcastMessage = (message) => api.post('/drivers/broadcast', { message }).then(r => r.data)

export const getFactoring = () => api.get('/factoring/').then(r => r.data)
export const getFactoringSummary = () => api.get('/factoring/summary').then(r => r.data)
export const getUninvoicedLoads = () => api.get('/factoring/uninvoiced').then(r => r.data)
export const createFactoring = (data) => api.post('/factoring/', data).then(r => r.data)
export const updateFactoring = (id, data) => api.patch(`/factoring/${id}`, data).then(r => r.data)
