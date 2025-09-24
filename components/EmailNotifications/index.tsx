'use client';

import React, { useState } from 'react';
import { EmailPreferences } from './EmailPreferences';
import { EmailStats } from './EmailStats';
import { EmailTestPanel } from './EmailTestPanel';
import { EmailHistory } from './EmailHistory';
import { Settings, BarChart3, TestTube, History } from 'lucide-react';

export function EmailNotifications() {
  const [activeTab, setActiveTab] = useState('stats');

  const tabs = [
    { id: 'stats', label: 'Statistiche', icon: BarChart3, component: EmailStats },
    { id: 'preferences', label: 'Preferenze', icon: Settings, component: EmailPreferences },
    { id: 'test', label: 'Test Email', icon: TestTube, component: EmailTestPanel },
    { id: 'history', label: 'Cronologia', icon: History, component: EmailHistory },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || EmailStats;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Content */}
      <ActiveComponent />
    </div>
  );
}

export { EmailPreferences, EmailStats, EmailTestPanel, EmailHistory };