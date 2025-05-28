'use client'

import { useState } from 'react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { DocumentUpload } from '@/components/documents/DocumentUpload'
import { DocumentList } from '@/components/documents/DocumentList'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline'

type ActiveView = 'chat' | 'documents' | 'upload' | 'analytics' | 'settings'

const navigation = [
  { name: 'Chat', href: 'chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Documents', href: 'documents', icon: DocumentTextIcon },
  { name: 'Upload', href: 'upload', icon: CloudArrowUpIcon },
  { name: 'Analytics', href: 'analytics', icon: ChartBarIcon },
  { name: 'Settings', href: 'settings', icon: Cog6ToothIcon },
]

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<ActiveView>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const renderContent = () => {
    switch (activeView) {
      case 'chat':
        return <ChatInterface />
      case 'documents':
        return <DocumentList />
      case 'upload':
        return <DocumentUpload />
      case 'analytics':
        return <AnalyticsDashboard />
      case 'settings':
        return <SettingsPanel />
      default:
        return <ChatInterface />
    }
  }

  return (
    <div className="flex h-full bg-gray-50">
      <Sidebar
        navigation={navigation}
        activeView={activeView}
        onNavigate={(view) => setActiveView(view as ActiveView)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={navigation.find(item => item.href === activeView)?.name || 'Dashboard'}
          onMenuClick={() => setSidebarOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="h-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}