'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Message } from '@/types/chat'
import { api } from '@/lib/api'

interface Conversation {
  id: string
  title?: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
  lastMessageAt?: Date
}

export function useChatHistory() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  
  const { data: conversations, error: conversationsError, mutate: mutateConversations } = useSWR<Conversation[]>(
    '/api/conversations',
    api.get
  )
  
  const { data: messages, error: messagesError, mutate: mutateMessages } = useSWR<Message[]>(
    selectedConversation ? `/api/conversations/${selectedConversation}/messages` : null,
    api.get
  )

  const createConversation = async (firstMessage?: string) => {
    try {
      const conversation = await api.post('/api/conversations', {
        title: firstMessage?.substring(0, 50) + (firstMessage && firstMessage.length > 50 ? '...' : ''),
      })
      
      mutateConversations()
      setSelectedConversation(conversation.id)
      
      return conversation
    } catch (error) {
      console.error('Failed to create conversation:', error)
      throw error
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      await api.delete(`/api/conversations/${conversationId}`)
      
      if (selectedConversation === conversationId) {
        setSelectedConversation(null)
      }
      
      mutateConversations()
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      throw error
    }
  }

  const updateConversationTitle = async (conversationId: string, title: string) => {
    try {
      await api.patch(`/api/conversations/${conversationId}`, { title })
      mutateConversations()
    } catch (error) {
      console.error('Failed to update conversation title:', error)
      throw error
    }
  }

  return {
    conversations: conversations || [],
    messages: messages || [],
    selectedConversation,
    setSelectedConversation,
    createConversation,
    deleteConversation,
    updateConversationTitle,
    isLoadingConversations: !conversations && !conversationsError,
    isLoadingMessages: selectedConversation && !messages && !messagesError,
    conversationsError,
    messagesError,
    refreshConversations: mutateConversations,
    refreshMessages: mutateMessages,
  }
}