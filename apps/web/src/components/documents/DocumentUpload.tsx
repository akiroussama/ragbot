'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { documentsApi } from '@/lib/api'
import toast from 'react-hot-toast'

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      setUploading(true)
      setUploadProgress(0)
      
      try {
        await documentsApi.uploadDocument(file, (progress) => {
          setUploadProgress(progress)
        })
        
        toast.success(`${file.name} uploaded successfully`)
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`)
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: true,
    disabled: uploading,
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
        <p className="text-sm text-gray-600 mt-1">
          Upload documents to make them searchable in chat conversations.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          relative rounded-lg border-2 border-dashed p-12 text-center transition-colors
          ${isDragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
      >
        <input {...getInputProps()} />
        
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900">
            {isDragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, DOC, DOCX, TXT, CSV, XLS, XLSX up to 50MB each
          </p>
        </div>
        
        {uploading && (
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2 w-full max-w-xs mx-auto">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Supported Formats</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          {[
            { ext: 'PDF', desc: 'Portable Document Format' },
            { ext: 'DOC/DOCX', desc: 'Microsoft Word' },
            { ext: 'TXT', desc: 'Plain Text' },
            { ext: 'CSV', desc: 'Comma Separated Values' },
            { ext: 'XLS/XLSX', desc: 'Microsoft Excel' },
          ].map((format) => (
            <div key={format.ext} className="flex items-center gap-x-2">
              <DocumentTextIcon className="h-4 w-4 text-gray-400" />
              <span>
                <strong>{format.ext}</strong> - {format.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}