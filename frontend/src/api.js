import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('fs_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('fs_token')
      localStorage.removeItem('fs_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const getTrucks = () => api.get('/trucks/').then(r => r.data)
export const createTruck = (data) => api.post('/trucks/', data).then(r => r.data)
export const updateTruck = (id, data) => api.patch(`/trucks/${id}`, data).then(r => r.data)

export const getDrivers = () => api.get('/drivers/').then(r => r.data)
export const createDriver = (data) => api.post('/drivers/', data).then(r => r.data)
export const updateDriver = (id, data) => api.patch(`/drivers/${id}`, data).then(r => r.data)

export const getPtiToday = () => api.get('/pti/today').then(r => r.data)
export const getPtiHistory = (days = 7) => api.get(`/pti/history?days=${days}`).then(r => r.data)
export const validatePti = (id, is_valid) => api.patch(`/pti/${id}/validate`, { is_valid }).then(r => r.data)

export const getLoads = (status, search) => {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  const qs = params.toString()
  return api.get('/loads/' + (qs ? `?${qs}` : '')).then(r => r.data)
}
export const createLoad = (data) => api.post('/loads/', data).then(r => r.data)
export const updateLoad = (id, data) => api.patch(`/loads/${id}`, data).then(r => r.data)
export const getLoadSummary = () => api.get('/loads/summary').then(r => r.data)

export const nudgePti = () => api.post('/pti/nudge').then(r => r.data)
export const broadcastMessage = (message) => api.post('/drivers/broadcast', { message }).then(r => r.data)

export const getMaintenance = (truckId) => api.get('/maintenance/' + (truckId ? `?truck_id=${truckId}` : '')).then(r => r.data)
export const createMaintenance = (data) => api.post('/maintenance/', data).then(r => r.data)
export const updateMaintenance = (id, data) => api.patch(`/maintenance/${id}`, data).then(r => r.data)
export const deleteMaintenance = (id) => api.delete(`/maintenance/${id}`).then(r => r.data)

export const parseRateConfirmation = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/loads/parse-rc', fd).then(r => r.data)
}

export const getDocuments = (loadId) => api.get(`/loads/${loadId}/documents`).then(r => r.data)
export const uploadDocument = (loadId, file, docType) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('doc_type', docType)
  return api.post(`/loads/${loadId}/documents`, fd).then(r => r.data)
}
export const deleteDocument = (loadId, docId) => api.delete(`/loads/${loadId}/documents/${docId}`).then(r => r.data)

export const getDatStatus = () => api.get('/dat/status').then(r => r.data)
export const searchDatLoads = (origin, destination, equipment = 'Van') =>
  api.get('/dat/loads', { params: { origin, destination, equipment } }).then(r => r.data)
export const getDatRates = (origin, destination, equipment = 'Van') =>
  api.get('/dat/rates', { params: { origin, destination, equipment } }).then(r => r.data)

export const getFactoring = () => api.get('/factoring/').then(r => r.data)
export const getFactoringSummary = () => api.get('/factoring/summary').then(r => r.data)
export const getUninvoicedLoads = () => api.get('/factoring/uninvoiced').then(r => r.data)
export const createFactoring = (data) => api.post('/factoring/', data).then(r => r.data)
export const updateFactoring = (id, data) => api.patch(`/factoring/${id}`, data).then(r => r.data)
