'use client';

import React, { useState } from 'react';
import { useEmailNotifications } from '@/lib/hooks/useEmailNotifications';
import { Mail, Clock, CheckCircle, XCircle, AlertTriangle, Filter } from 'lucide-react';

export function EmailHistory() {
  const { notifications, loading, loadNotifications } = useEmailNotifications();
  const [filter, setFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const statusConfig = {
    sent: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Inviata' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Fallita' },
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'In Attesa' },
    scheduled: { icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Programmata' }
  };

  const typeLabels = {
    'guest_check_in': 'Check-in Ospite',
    'guest_check_out': 'Check-out Ospite', 
    'daily_report': 'Report Giornaliero',
    'system_alert': 'Alert Sistema'
  };

  const filteredNotifications = notifications.filter(notification => {
    const statusMatch = filter === 'all' || notification.status === filter;
    const typeMatch = typeFilter === 'all' || notification.type === typeFilter;
    return statusMatch && typeMatch;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-gray-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Cronologia Email
              </h3>
              <p className="text-sm text-gray-600">
                {filteredNotifications.length} di {notifications.length} notifiche
              </p>
            </div>
          </div>
          
          {/* Filtri */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="all">Tutti gli stati</option>
                <option value="sent">Inviate</option>
                <option value="failed">Fallite</option>
                <option value="pending">In attesa</option>
                <option value="scheduled">Programmate</option>
              </select>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="all">Tutti i tipi</option>
                <option value="guest_check_in">Check-in</option>
                <option value="guest_check_out">Check-out</option>
                <option value="daily_report">Report</option>
                <option value="system_alert">Alert</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista Notifiche */}
      <div className="divide-y divide-gray-200">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const StatusIcon = statusConfig[notification.status as keyof typeof statusConfig]?.icon || Clock;
            const statusStyle = statusConfig[notification.status as keyof typeof statusConfig];

            return (
              <div key={notification.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className={`p-2 rounded-full ${statusStyle?.bg || 'bg-gray-100'}`}>
                    <StatusIcon className={`w-4 h-4 ${statusStyle?.color || 'text-gray-600'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.subject}
                        </p>
                        <p className="text-sm text-gray-600">
                          A: {notification.recipient}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle?.bg} ${statusStyle?.color}`}>
                          {statusStyle?.label || notification.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>{typeLabels[notification.type as keyof typeof typeLabels] || notification.type}</span>
                      <span>{notification.priority}</span>
                      <span>
                        {new Date(notification.createdAt).toLocaleString('it-IT')}
                      </span>
                      {notification.sentAt && (
                        <span>
                          Inviata: {new Date(notification.sentAt).toLocaleString('it-IT')}
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {JSON.stringify(notification.metadata)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nessuna notifica trovata con i filtri selezionati</p>
            <button
              onClick={() => {
                setFilter('all');
                setTypeFilter('all');
              }}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Rimuovi filtri
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={() => loadNotifications(notifications.length + 50)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Carica altre notifiche
          </button>
        </div>
      )}
    </div>
  );
}
