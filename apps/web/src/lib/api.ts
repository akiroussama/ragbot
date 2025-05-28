import axios, { AxiosInstance, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        // Add tenant ID if available
        const tenantId = localStorage.getItem('tenant_id')
        if (tenantId) {
          config.headers['X-Tenant-ID'] = tenantId
        }
        
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data
      },
      (error) => {
        if (error.response) {
          const { status, data } = error.response
          
          switch (status) {
            case 401:
              // Handle unauthorized
              localStorage.removeItem('auth_token')
              toast.error('Session expired. Please log in again.')
              window.location.href = '/login'
              break
            case 403:
              toast.error('Access denied')
              break
            case 404:
              toast.error('Resource not found')
              break
            case 429:
              toast.error('Too many requests. Please try again later.')
              break
            case 500:
              toast.error('Server error. Please try again later.')
              break
            default:
              toast.error(data?.message || 'An error occurred')
          }
        } else if (error.request) {
          toast.error('Network error. Please check your connection.')
        } else {
          toast.error('An unexpected error occurred')
        }
        
        return Promise.reject(error)
      }
    )
  }

  async get<T = any>(url: string, params?: any): Promise<T> {
    return this.client.get(url, { params })
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    return this.client.post(url, data)
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    return this.client.put(url, data)
  }

  async patch<T = any>(url: string, data?: any): Promise<T> {
    return this.client.patch(url, data)
  }

  async delete<T = any>(url: string): Promise<T> {
    return this.client.delete(url)
  }

  async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
  }
}

export const api = new ApiClient()

// Helper functions for specific API calls
export const chatApi = {
  sendMessage: (data: any) => api.post('/chat', data),
  streamChat: (data: any) => api.post('/chat/stream', data),
  getConversations: () => api.get('/conversations'),
  getConversation: (id: string) => api.get(`/conversations/${id}`),
  createConversation: (data: any) => api.post('/conversations', data),
  deleteConversation: (id: string) => api.delete(`/conversations/${id}`),
  getMessages: (conversationId: string) => api.get(`/conversations/${conversationId}/messages`),
}

export const documentsApi = {
  getDocuments: (params?: any) => api.get('/documents', params),
  getDocument: (id: string) => api.get(`/documents/${id}`),
  uploadDocument: (file: File, onProgress?: (progress: number) => void) => 
    api.upload('/documents/upload', file, onProgress),
  deleteDocument: (id: string) => api.delete(`/documents/${id}`),
  updateDocument: (id: string, data: any) => api.patch(`/documents/${id}`, data),
}

export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getUsage: (params?: any) => api.get('/analytics/usage', params),
  getConversationStats: (params?: any) => api.get('/analytics/conversations', params),
  getDocumentStats: (params?: any) => api.get('/analytics/documents', params),
}

export const settingsApi = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data: any) => api.patch('/settings', data),
  getModels: () => api.get('/settings/models'),
  testConnection: (provider: string, config: any) => 
    api.post(`/settings/test-connection/${provider}`, config),
}