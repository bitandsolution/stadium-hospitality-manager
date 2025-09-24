'use client';

import React, { useState } from 'react';
import { GuestList } from '@/components/GuestList';
import RoomManagement from '@/components/RoomManagement';
import HostessManagement from '@/components/HostessManagement';
import { EmailNotifications } from '@/components/EmailNotifications';
import { 
  Users, 
  Home, 
  UserCog, 
  Mail,
  BarChart3,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('guests');

  const tabs = [
    { id: 'guests', label: 'Ospiti', icon: Users, component: GuestList },
    { id: 'rooms', label: 'Sale', icon: Home, component: RoomManagement },
    { id: 'hostess', label: 'Hostess', icon: UserCog, component: HostessManagement },
    { id: 'email', label: 'Email', icon: Mail, component: EmailNotifications }, // NUOVO
    { id: 'reports', label: 'Report', icon: BarChart3, component: ReportsPanel }, // Da implementare
    { id: 'import', label: 'Import', icon: FileSpreadsheet, component: ImportPanel }, // Da implementare
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || GuestList;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Pannello Amministrazione
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gestisci ospiti, sale, hostess e notifiche email
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Quick Actions */}
              <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>
          
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
                    {tab.id === 'email' && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-1">NEW</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ActiveComponent />
      </div>
    </div>
  );
}

// Componenti placeholder per future implementazioni
function ReportsPanel() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Report e Analytics</h3>
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Funzionalità in sviluppo</p>
        <p className="text-sm text-gray-400 mt-2">
          Qui potrai visualizzare grafici e statistiche dettagliate
        </p>
      </div>
    </div>
  );
}

function ImportPanel() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Import Excel</h3>
      <div className="text-center py-12">
        <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Funzionalità in sviluppo</p>
        <p className="text-sm text-gray-400 mt-2">
          Import automatico di ospiti da file Excel
        </p>
      </div>
    </div>
  );
}