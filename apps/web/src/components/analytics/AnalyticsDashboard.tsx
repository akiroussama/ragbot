'use client'

import { ChartBarIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, UsersIcon } from '@heroicons/react/24/outline'

export function AnalyticsDashboard() {
  const stats = [
    { name: 'Total Conversations', value: '1,234', icon: ChatBubbleLeftRightIcon, change: '+12%' },
    { name: 'Documents Processed', value: '89', icon: DocumentTextIcon, change: '+5%' },
    { name: 'Active Users', value: '45', icon: UsersIcon, change: '+8%' },
    { name: 'Avg Response Time', value: '1.2s', icon: ChartBarIcon, change: '-15%' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-600 mt-1">
          Monitor your chatbot performance and usage statistics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                      <div className="ml-2 flex items-baseline text-sm">
                        <span className="text-green-600">{stat.change}</span>
                        <span className="ml-1 text-gray-500">vs last month</span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation Trends</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart placeholder - Integration with recharts would go here
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Topics</h3>
          <div className="space-y-3">
            {[
              { topic: 'Product Information', count: 45 },
              { topic: 'Technical Support', count: 32 },
              { topic: 'Pricing Questions', count: 28 },
              { topic: 'Account Issues', count: 19 },
            ].map((item) => (
              <div key={item.topic} className="flex justify-between items-center">
                <span className="text-sm text-gray-900">{item.topic}</span>
                <span className="text-sm text-gray-500">{item.count} conversations</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}