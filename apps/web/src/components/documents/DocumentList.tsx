'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { DocumentTextIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import { documentsApi } from '@/lib/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface Document {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  status: 'processing' | 'completed' | 'failed'
  chunks: number
  createdAt: string
  updatedAt: string
}

export function DocumentList() {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  
  const { data: documents, error, mutate } = useSWR<Document[]>(
    '/documents',
    documentsApi.getDocuments
  )

  const handleDelete = async (documentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return
    }
    
    try {
      await documentsApi.deleteDocument(documentId)
      toast.success('Document deleted successfully')
      mutate()
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'processing': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Failed to load documents. Please try again.
        </div>
      </div>
    )
  }

  if (!documents) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your uploaded documents and their processing status.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload some documents to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.fileName}
                        </p>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span className="mx-2">•</span>
                          <span>{doc.chunks} chunks</span>
                          <span className="mx-2">•</span>
                          <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                      
                      <button
                        onClick={() => setSelectedDocument(doc.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(doc.id, doc.fileName)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete document"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}