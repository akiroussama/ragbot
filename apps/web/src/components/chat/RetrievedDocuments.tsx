'use client'

import { RetrievedDocument } from '@/types/chat'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

interface RetrievedDocumentsProps {
  documents: RetrievedDocument[]
}

export function RetrievedDocuments({ documents }: RetrievedDocumentsProps) {
  if (documents.length === 0) {
    return null
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900">Retrieved Documents</h3>
        <p className="text-xs text-gray-500 mt-1">
          {documents.length} document{documents.length !== 1 ? 's' : ''} found
        </p>
      </div>
      
      <div className="space-y-3">
        {documents.map((doc, index) => (
          <div
            key={doc.id}
            className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
          >
            <div className="flex items-start gap-x-2 mb-2">
              <DocumentTextIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-900">
                    Document {index + 1}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(doc.score * 100).toFixed(1)}% match
                  </span>
                </div>
                {doc.source && (
                  <div className="text-xs text-gray-500 truncate">
                    {doc.source}
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray-700 line-clamp-4">
              {doc.content}
            </p>
            
            {doc.metadata && Object.keys(doc.metadata).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(doc.metadata)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {key}: {String(value).substring(0, 20)}
                    </span>
                  ))
                }
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}