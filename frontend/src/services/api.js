
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('civicai_token')

  const publicAuthEndpoints = [
    '/auth/login/',
    '/auth/citizen/send-otp/',
    '/auth/citizen/verify-otp/',
  ]

  const isPublicAuthRequest = publicAuthEndpoints.some(
    (endpoint) => config.url?.includes(endpoint)
  )

  if (isPublicAuthRequest) {
    delete config.headers.Authorization
  } else if (token) {
    config.headers.Authorization = `Token ${token}`
  }

  return config
})

export function saveToken(token) {
  localStorage.setItem('civicai_token', token)
}

export function clearToken() {
  localStorage.removeItem('civicai_token')
}

export default api
