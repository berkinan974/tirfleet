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
export const getIftaSummary = (year, quarter) => api.get('/loads/ifta', { params: { year, quarter } }).then(r => r.data)

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

export const getPartners = (type) => api.get('/partners/' + (type ? `?partner_type=${type}` : '')).then(r => r.data)
export const createPartner = (data) => api.post('/partners/', data).then(r => r.data)
export const updatePartner = (id, data) => api.patch(`/partners/${id}`, data).then(r => r.data)
export const deletePartner = (id) => api.delete(`/partners/${id}`).then(r => r.data)

export const getVendors = () => api.get('/vendors/').then(r => r.data)
export const createVendor = (data) => api.post('/vendors/', data).then(r => r.data)
export const updateVendor = (id, data) => api.patch(`/vendors/${id}`, data).then(r => r.data)
export const deleteVendor = (id) => api.delete(`/vendors/${id}`).then(r => r.data)

export const getBillingEntries = () => api.get('/accounting/billing').then(r => r.data)
export const createBillingEntry = (data) => api.post('/accounting/billing', data).then(r => r.data)
export const updateBillingEntry = (id, data) => api.patch(`/accounting/billing/${id}`, data).then(r => r.data)
export const deleteBillingEntry = (id) => api.delete(`/accounting/billing/${id}`).then(r => r.data)

export const getFactoringReports = () => api.get('/accounting/factoring-reports').then(r => r.data)
export const createFactoringReport = (data) => api.post('/accounting/factoring-reports', data).then(r => r.data)
export const updateFactoringReport = (id, data) => api.patch(`/accounting/factoring-reports/${id}`, data).then(r => r.data)
export const deleteFactoringReport = (id) => api.delete(`/accounting/factoring-reports/${id}`).then(r => r.data)
export const getAccountingSummary = () => api.get('/accounting/summary').then(r => r.data)

export const getSettlements = () => api.get('/payroll/settlements').then(r => r.data)
export const createSettlement = (data) => api.post('/payroll/settlements', data).then(r => r.data)
export const updateSettlement = (id, data) => api.patch(`/payroll/settlements/${id}`, data).then(r => r.data)
export const deleteSettlement = (id) => api.delete(`/payroll/settlements/${id}`).then(r => r.data)
export const getOpenBalance = (params) => api.get('/payroll/open-balance', { params }).then(r => r.data)

export const getFuelCards = () => api.get('/fuel/cards').then(r => r.data)
export const createFuelCard = (data) => api.post('/fuel/cards', data).then(r => r.data)
export const updateFuelCard = (id, data) => api.patch(`/fuel/cards/${id}`, data).then(r => r.data)
export const deleteFuelCard = (id) => api.delete(`/fuel/cards/${id}`).then(r => r.data)

export const getFuelTransactions = () => api.get('/fuel/transactions').then(r => r.data)
export const createFuelTransaction = (data) => api.post('/fuel/transactions', data).then(r => r.data)
export const updateFuelTransaction = (id, data) => api.patch(`/fuel/transactions/${id}`, data).then(r => r.data)
export const deleteFuelTransaction = (id) => api.delete(`/fuel/transactions/${id}`).then(r => r.data)
export const getFuelSummary = () => api.get('/fuel/summary').then(r => r.data)

export const getTrailers = () => api.get('/trailers/').then(r => r.data)
export const createTrailer = (data) => api.post('/trailers/', data).then(r => r.data)
export const updateTrailer = (id, data) => api.patch(`/trailers/${id}`, data).then(r => r.data)
export const deleteTrailer = (id) => api.delete(`/trailers/${id}`).then(r => r.data)

export const getTollDevices = () => api.get('/tolls/devices').then(r => r.data)
export const createTollDevice = (data) => api.post('/tolls/devices', data).then(r => r.data)
export const updateTollDevice = (id, data) => api.patch(`/tolls/devices/${id}`, data).then(r => r.data)
export const deleteTollDevice = (id) => api.delete(`/tolls/devices/${id}`).then(r => r.data)

export const getTollTransactions = () => api.get('/tolls/transactions').then(r => r.data)
export const createTollTransaction = (data) => api.post('/tolls/transactions', data).then(r => r.data)
export const updateTollTransaction = (id, data) => api.patch(`/tolls/transactions/${id}`, data).then(r => r.data)
export const deleteTollTransaction = (id) => api.delete(`/tolls/transactions/${id}`).then(r => r.data)

export const getTollTemplates = () => api.get('/tolls/templates').then(r => r.data)
export const createTollTemplate = (data) => api.post('/tolls/templates', data).then(r => r.data)
export const deleteTollTemplate = (id) => api.delete(`/tolls/templates/${id}`).then(r => r.data)

export const getReportTotalRevenue = (params) => api.get('/reports/total-revenue', { params }).then(r => r.data)
export const getReportRatePerMile = (params) => api.get('/reports/rate-per-mile', { params }).then(r => r.data)
export const getReportRevenueByDispatcher = (params) => api.get('/reports/revenue-by-dispatcher', { params }).then(r => r.data)
export const getReportPaymentSummary = (params) => api.get('/reports/payment-summary', { params }).then(r => r.data)
export const getReportExpenses = (params) => api.get('/reports/expenses', { params }).then(r => r.data)
export const getReportGrossProfit = (params) => api.get('/reports/gross-profit', { params }).then(r => r.data)
export const getReportGrossProfitPerLoad = (params) => api.get('/reports/gross-profit-per-load', { params }).then(r => r.data)
export const getReportProfitLoss = (params) => api.get('/reports/profit-loss', { params }).then(r => r.data)

export const getFactoring = () => api.get('/factoring/').then(r => r.data)
export const getFactoringSummary = () => api.get('/factoring/summary').then(r => r.data)
export const getUninvoicedLoads = () => api.get('/factoring/uninvoiced').then(r => r.data)
export const createFactoring = (data) => api.post('/factoring/', data).then(r => r.data)
export const updateFactoring = (id, data) => api.patch(`/factoring/${id}`, data).then(r => r.data)
