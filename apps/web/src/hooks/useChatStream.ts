'use client'

import { useState, useCallback } from 'react'
import { Message, RetrievedDocument, StreamChatResponse } from '@/types/chat'
import { api } from '@/lib/api'

interface UseChatStreamOptions {
  onMessageComplete?: (message: Message) => void
  onDocumentsRetrieved?: (documents: RetrievedDocument[]) => void
  conversationId?: string | null
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true)
    setError(null)
    setStreamingMessage('')

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          conversationId: options.conversationId,
          generationOptions: {
            stream: true,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      setIsLoading(false)
      setIsStreaming(true)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            
            try {
              const data: StreamChatResponse = JSON.parse(line.replace(/^data: /, ''))
              
              switch (data.type) {
                case 'content':
                  if (data.content) {
                    fullContent += data.content
                    setStreamingMessage(fullContent)
                  }
                  break
                  
                case 'retrieval':
                  if (data.retrievedDocuments) {
                    options.onDocumentsRetrieved?.(data.retrievedDocuments)
                  }
                  break
                  
                case 'end':
                  setIsStreaming(false)
                  
                  if (options.onMessageComplete) {
                    const message: Message = {
                      id: data.id,
                      role: 'assistant',
                      content: fullContent,
                      timestamp: new Date(),
                      metadata: {
                        model: data.metadata?.model,
                        provider: data.metadata?.provider,
                        usage: data.usage,
                      },
                    }
                    options.onMessageComplete(message)
                  }
                  
                  setStreamingMessage('')
                  break
                  
                case 'error':
                  throw new Error(data.error || 'Unknown error')
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (err) {
      console.error('Chat stream error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [options])

  return {
    sendMessage,
    isLoading,
    isStreaming,
    streamingMessage,
    error,
  }
}