'use client';

import React, { useState } from 'react';
import { useEmailNotifications } from '@/lib/hooks/useEmailNotifications';
import { Send, TestTube, CheckCircle, XCircle, BarChart } from 'lucide-react';

export function EmailTestPanel() {
  const { sendTestNotification, sendDailyReport } = useEmailNotifications();
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestEmail = async () => {
    if (!testEmail) return;
    
    setLoading(true);
    setTestResult(null);
    
    try {
      const success = await sendTestNotification(testEmail);
      setTestResult({
        type: success ? 'success' : 'error',
        message: success 
          ? 'Email di test inviata con successo!'
          : 'Errore nell\'invio dell\'email di test'
      });
    } catch (error) {
      setTestResult({
        type: 'error',
        message: 'Errore durante l\'invio dell\'email'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDailyReport = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const success = await sendDailyReport();
      setTestResult({
        type: success ? 'success' : 'error',
        message: success 
          ? 'Report giornaliero inviato con successo!'
          : 'Errore nell\'invio del report giornaliero'
      });
    } catch (error) {
      setTestResult({
        type: 'error',
        message: 'Errore durante l\'invio del report'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <TestTube className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Test Email System
            </h3>
            <p className="text-sm text-gray-600">
              Testa invio di notifiche email e report
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Test Email */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Test Email di Base
          </h4>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="Inserisci email di test"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleTestEmail}
              disabled={!testEmail || loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium ${
                testEmail && !loading
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              Invia Test
            </button>
          </div>
        </div>

        {/* Report Giornaliero */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Report Giornaliero
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Invia il report giornaliero degli accessi a tutti gli admin abilitati
          </p>
          <button
            onClick={handleDailyReport}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium ${
              !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <BarChart className="w-4 h-4" />
            Invia Report Ora
          </button>
        </div>

        {/* Risultato Test */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {testResult.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <p className={`text-sm font-medium ${
                testResult.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResult.message}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              Invio in corso...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
