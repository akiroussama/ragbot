'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = 'Type a message...',
  maxLength = 4000
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmedMessage = message.trim()
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage)
      setMessage('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 200 // Maximum height in pixels
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setMessage(value)
      adjustTextareaHeight()
    }
  }

  const charactersRemaining = maxLength - message.length
  const isNearLimit = charactersRemaining < 100
  const canSend = message.trim().length > 0 && !disabled

  return (
    <div className="relative">
      <div className="flex items-end gap-x-3 rounded-lg border border-gray-300 bg-white p-3 shadow-sm focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
        {/* Textarea */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="block w-full resize-none border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-500 focus:ring-0 sm:text-sm sm:leading-6"
            style={{ minHeight: '20px', maxHeight: '200px' }}
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className={clsx(
            'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
            canSend
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Send message</span>
        </button>
      </div>

      {/* Character count */}
      {isNearLimit && (
        <div className="mt-1 text-right">
          <span
            className={clsx(
              'text-xs',
              charactersRemaining < 20 ? 'text-red-500' : 'text-yellow-600'
            )}
          >
            {charactersRemaining} characters remaining
          </span>
        </div>
      )}

      {/* Hint text */}
      <div className="mt-2 text-xs text-gray-500">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}