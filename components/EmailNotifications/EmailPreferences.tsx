'use client';

import React, { useState } from 'react';
import { useEmailPreferences } from '@/lib/hooks/useEmailNotifications';
import type { EmailPreferences as EmailPreferencesType } from '@/lib/hooks/useEmailNotifications';
import { Save, Mail, Clock, Bell } from 'lucide-react';

export function EmailPreferences() {
  const { preferences, updatePreferences, loading, error } = useEmailPreferences();
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localPreferences, setLocalPreferences] = useState<EmailPreferencesType | null>(null);

  // Sincronizza le preferenze locali con quelle caricate
  React.useEffect(() => {
    if (preferences && !localPreferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences, localPreferences]);

  const handleToggle = (field: keyof EmailPreferencesType, value: boolean) => {
    if (!localPreferences) return;
    
    const newPrefs = { ...localPreferences, [field]: value };
    setLocalPreferences(newPrefs);
    setHasChanges(true);
  };

  const handleFrequencyChange = (frequency: 'real_time' | 'hourly' | 'daily' | 'disabled') => {
    if (!localPreferences) return;
    
    const newPrefs = { ...localPreferences, emailFrequency: frequency };
    setLocalPreferences(newPrefs);
    setHasChanges(true);
  };

  const handleTimeChange = (field: 'quietHoursStart' | 'quietHoursEnd', time: string) => {
    if (!localPreferences) return;
    
    const newPrefs = { ...localPreferences, [field]: time };
    setLocalPreferences(newPrefs);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!localPreferences || !hasChanges) return;
    
    setSaving(true);
    try {
      const success = await updatePreferences(localPreferences);
      if (success) {
        setHasChanges(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const displayPreferences = localPreferences || preferences;

  if (!preferences) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!displayPreferences) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Preferenze Email
            </h3>
            <p className="text-sm text-gray-600">
              Configura quando e come ricevere le notifiche via email
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Tipi di Notifiche */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Tipi di Notifiche
          </h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div>
                <div className="font-medium text-gray-900">Check-in Ospiti</div>
                <div className="text-sm text-gray-600">
                  Ricevi una notifica ogni volta che un ospite effettua il check-in
                </div>
              </div>
              <input
                type="checkbox"
                checked={displayPreferences.receiveCheckInNotifications}
                onChange={(e) => handleToggle('receiveCheckInNotifications', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div>
                <div className="font-medium text-gray-900">Check-out Ospiti</div>
                <div className="text-sm text-gray-600">
                  Ricevi una notifica quando un ospite effettua il check-out
                </div>
              </div>
              <input
                type="checkbox"
                checked={displayPreferences.receiveCheckOutNotifications}
                onChange={(e) => handleToggle('receiveCheckOutNotifications', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div>
                <div className="font-medium text-gray-900">Report Giornalieri</div>
                <div className="text-sm text-gray-600">
                  Ricevi un riepilogo giornaliero degli accessi alle sale
                </div>
              </div>
              <input
                type="checkbox"
                checked={displayPreferences.receiveDailyReports}
                onChange={(e) => handleToggle('receiveDailyReports', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div>
                <div className="font-medium text-gray-900">Alert di Sistema</div>
                <div className="text-sm text-gray-600">
                  Ricevi notifiche per problemi tecnici o avvisi importanti
                </div>
              </div>
              <input
                type="checkbox"
                checked={displayPreferences.receiveSystemAlerts}
                onChange={(e) => handleToggle('receiveSystemAlerts', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Frequenza Email */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Frequenza di Invio
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'real_time', label: 'Tempo reale', desc: 'Immediatamente' },
              { value: 'hourly', label: 'Ogni ora', desc: 'Raggruppa per ora' },
              { value: 'daily', label: 'Giornaliera', desc: 'Una volta al giorno' },
              { value: 'disabled', label: 'Disabilitate', desc: 'Nessuna email' }
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 ${
                  displayPreferences.emailFrequency === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="emailFrequency"
                  value={option.value}
                  checked={displayPreferences.emailFrequency === option.value}
                  onChange={(e) => handleFrequencyChange(e.target.value as 'real_time' | 'hourly' | 'daily' | 'disabled')}
                  className="sr-only"
                />
                <div>
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-600">{option.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Orari di Silenzio */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Orari di Silenzio
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Durante questi orari non riceverai notifiche email (eccetto alert critici)
          </p>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inizio
              </label>
              <input
                type="time"
                value={displayPreferences.quietHoursStart}
                onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="pt-6 text-gray-400">-</div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fine
              </label>
              <input
                type="time"
                value={displayPreferences.quietHoursEnd}
                onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex items-center gap-3 ml-auto">
            {hasChanges && (
              <span className="text-sm text-amber-600">
                Modifiche non salvate
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving || loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium ${
                hasChanges && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}