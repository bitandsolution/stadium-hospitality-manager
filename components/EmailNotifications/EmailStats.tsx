'use client';

import React from 'react';
import { useEmailStats } from '@/lib/hooks/useEmailNotifications';
import { Mail, TrendingUp, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

export function EmailStats() {
  const { stats, loading, refresh } = useEmailStats();

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header con bottone refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Statistiche Email (ultimi 7 giorni)
        </h3>
        <button
          onClick={() => refresh()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* Cards statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Email Inviate */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Email Inviate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSent}</p>
            </div>
          </div>
        </div>

        {/* Email Fallite */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Email Fallite</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalFailed}</p>
            </div>
          </div>
        </div>

        {/* In Attesa */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Attesa</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPending}</p>
            </div>
          </div>
        </div>

        {/* Tasso di Successo */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tasso Successo</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(stats.successRate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dettagli per tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email per Tipo */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Distribuzione per Tipo
          </h4>
          <div className="space-y-3">
            {Object.entries(stats.byType).map(([type, count]) => {
              const typeLabels: Record<string, string> = {
                'guest_check_in': 'Check-in Ospiti',
                'guest_check_out': 'Check-out Ospiti',
                'daily_report': 'Report Giornalieri',
                'system_alert': 'Alert Sistema'
              };

              const percentage = ((count / (stats.totalSent + stats.totalFailed + stats.totalPending)) * 100);

              return (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {typeLabels[type] || type}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attività Recente */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Attività Recente
          </h4>
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.slice(-7).map((activity) => (
                <div key={activity.date} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(activity.date).toLocaleDateString('it-IT', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{activity.sent}</span>
                    </div>
                    {activity.failed > 0 && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{activity.failed}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nessuna attività recente</p>
          )}
        </div>
      </div>
    </div>
  );
}

