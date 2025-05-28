'use client'

import { useState } from 'react'
import { Cog6ToothIcon, KeyIcon, DatabaseIcon } from '@heroicons/react/24/outline'

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'api', name: 'API Keys', icon: KeyIcon },
    { id: 'models', name: 'Models', icon: DatabaseIcon },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure your chatbot and integration settings.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="-ml-0.5 mr-2 h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Model
                </label>
                <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option>GPT-3.5 Turbo</option>
                  <option>GPT-4</option>
                  <option>Claude-3 Sonnet</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Temperature
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  defaultValue="0.7"
                  className="mt-1 block w-full"
                />
              </div>
              
              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                  <span className="ml-2 text-sm text-gray-700">Enable document retrieval</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {[
                  { name: 'GPT-3.5 Turbo', provider: 'OpenAI', status: 'Active' },
                  { name: 'GPT-4', provider: 'OpenAI', status: 'Active' },
                  { name: 'Claude-3 Sonnet', provider: 'Anthropic', status: 'Inactive' },
                ].map((model) => (
                  <div key={model.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{model.name}</h4>
                      <p className="text-sm text-gray-500">{model.provider}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      model.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {model.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}