'use client'

export function TypingIndicator() {
  return (
    <div className="flex gap-x-4">
      <div className="flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-700">
          AI
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-x-2 mb-2">
          <span className="text-sm font-medium text-gray-900">Assistant</span>
          <div className="flex items-center gap-x-1">
            <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600">Thinking...</span>
          </div>
        </div>
        <div className="rounded-lg bg-gray-100 px-4 py-3">
          <div className="typing-indicator">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{'--delay': 0} as any} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{'--delay': 1} as any} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{'--delay': 2} as any} />
          </div>
        </div>
      </div>
    </div>
  )
}