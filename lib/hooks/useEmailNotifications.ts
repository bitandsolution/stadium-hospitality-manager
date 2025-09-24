// lib/hooks/useEmailNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createEmailService, EmailNotification } from '../email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface EmailPreferences {
  id: string;
  userId: string;
  receiveCheckInNotifications: boolean;
  receiveCheckOutNotifications: boolean;
  receiveDailyReports: boolean;
  receiveSystemAlerts: boolean;
  emailFrequency: 'real_time' | 'hourly' | 'daily' | 'disabled';
  quietHoursStart: string;
  quietHoursEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailStats {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  successRate: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  recentActivity: Array<{
    date: string;
    sent: number;
    failed: number;
  }>;
}

// Hook principale per le notifiche email
export function useEmailNotifications() {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailService = createEmailService();

  // Carica notifiche email
  const loadNotifications = useCallback(async (limit: number = 50) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento notifiche');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carica preferenze email utente corrente
  const loadPreferences = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPreferences({
          id: data.id,
          userId: data.user_id,
          receiveCheckInNotifications: data.receive_check_in_notifications,
          receiveCheckOutNotifications: data.receive_check_out_notifications,
          receiveDailyReports: data.receive_daily_reports,
          receiveSystemAlerts: data.receive_system_alerts,
          emailFrequency: data.email_frequency,
          quietHoursStart: data.quiet_hours_start,
          quietHoursEnd: data.quiet_hours_end,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        });
      }
    } catch (err) {
      console.error('Error loading email preferences:', err);
    }
  }, []);

  // Carica statistiche email
  const loadStats = useCallback(async (days: number = 7) => {
    try {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('status, type, created_at')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats: EmailStats = {
        totalSent: 0,
        totalFailed: 0,
        totalPending: 0,
        successRate: 0,
        byType: {},
        byStatus: {},
        recentActivity: []
      };

      const dailyActivity: Record<string, { sent: number; failed: number }> = {};

      data?.forEach(notification => {
        // Count by status
        stats.byStatus[notification.status] = (stats.byStatus[notification.status] || 0) + 1;
        
        if (notification.status === 'sent') stats.totalSent++;
        if (notification.status === 'failed') stats.totalFailed++;
        if (notification.status === 'pending') stats.totalPending++;

        // Count by type
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;

        // Daily activity
        const date = new Date(notification.created_at).toISOString().split('T')[0];
        if (!dailyActivity[date]) {
          dailyActivity[date] = { sent: 0, failed: 0 };
        }
        if (notification.status === 'sent') dailyActivity[date].sent++;
        if (notification.status === 'failed') dailyActivity[date].failed++;
      });

      // Calculate success rate
      const total = stats.totalSent + stats.totalFailed;
      stats.successRate = total > 0 ? (stats.totalSent / total) * 100 : 0;

      // Convert daily activity to array
      stats.recentActivity = Object.entries(dailyActivity)
        .map(([date, activity]) => ({ date, ...activity }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setStats(stats);
    } catch (err) {
      console.error('Error loading email stats:', err);
    }
  }, []);

  // Aggiorna preferenze email
  const updatePreferences = useCallback(async (newPreferences: Partial<EmailPreferences>) => {
    setLoading(true);
    setError(null);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const updateData = {
        receive_check_in_notifications: newPreferences.receiveCheckInNotifications,
        receive_check_out_notifications: newPreferences.receiveCheckOutNotifications,
        receive_daily_reports: newPreferences.receiveDailyReports,
        receive_system_alerts: newPreferences.receiveSystemAlerts,
        email_frequency: newPreferences.emailFrequency,
        quiet_hours_start: newPreferences.quietHoursStart,
        quiet_hours_end: newPreferences.quietHoursEnd,
      };

      const { data, error } = await supabase
        .from('email_preferences')
        .upsert({ 
          user_id: user.user.id, 
          ...updateData 
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPreferences({
          id: data.id,
          userId: data.user_id,
          receiveCheckInNotifications: data.receive_check_in_notifications,
          receiveCheckOutNotifications: data.receive_check_out_notifications,
          receiveDailyReports: data.receive_daily_reports,
          receiveSystemAlerts: data.receive_system_alerts,
          emailFrequency: data.email_frequency,
          quietHoursStart: data.quiet_hours_start,
          quietHoursEnd: data.quiet_hours_end,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        });
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento preferenze');
      console.error('Error updating email preferences:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Invia notifica di check-in
  const sendCheckInNotification = useCallback(async (guestData: {
    guestName: string;
    roomName: string;
    tableNumber?: string;
    hostessName: string;
    checkInTime: string;
  }) => {
    try {
      // Ottieni email degli admin
      const { data: adminEmails, error } = await supabase
        .rpc('get_admin_emails');

      if (error) throw error;

      if (adminEmails && adminEmails.length > 0) {
        await emailService.sendCheckInNotification({
          ...guestData,
          adminEmails
        });
      }
    } catch (err) {
      console.error('Error sending check-in notification:', err);
    }
  }, [emailService]);

  // Invia report giornaliero
  const sendDailyReport = useCallback(async () => {
    try {
      // Calcola statistiche del giorno
      const today = new Date().toISOString().split('T')[0];
      const { data: todayStats, error } = await supabase
        .from('audit_log')
        .select(`
          action, 
          created_at, 
          guest:guests(first_name, last_name, room:rooms(name)), 
          user:profiles(full_name)
        `)
        .gte('created_at', today)
        .in('action', ['check_in', 'check_out']);

      if (error) throw error;

      // Type per i dati ritornati da Supabase (le relazioni sono array)
      type AuditLogWithRelations = {
        action: string;
        created_at: string;
        guest: Array<{
          first_name: string;
          last_name: string;
          room: Array<{
            name: string;
          }>;
        }>;
        user: Array<{
          full_name: string;
        }>;
      };

      const typedStats = (todayStats || []) as AuditLogWithRelations[];

      const checkIns = typedStats.filter(stat => stat.action === 'check_in');
      const checkOuts = typedStats.filter(stat => stat.action === 'check_out');

      // Calcola statistiche per sala
      const roomStats: Record<string, { checkIns: number; checkOuts: number }> = {};
      checkIns.forEach(checkIn => {
        const roomName = checkIn.guest?.[0]?.room?.[0]?.name || 'Sconosciuta';
        if (!roomStats[roomName]) roomStats[roomName] = { checkIns: 0, checkOuts: 0 };
        roomStats[roomName].checkIns++;
      });
      checkOuts.forEach(checkOut => {
        const roomName = checkOut.guest?.[0]?.room?.[0]?.name || 'Sconosciuta';
        if (!roomStats[roomName]) roomStats[roomName] = { checkIns: 0, checkOuts: 0 };
        roomStats[roomName].checkOuts++;
      });

      // Calcola statistiche per hostess
      const hostessStats: Record<string, number> = {};
      [...checkIns, ...checkOuts].forEach(stat => {
        const hostessName = stat.user?.[0]?.full_name || 'Sconosciuta';
        hostessStats[hostessName] = (hostessStats[hostessName] || 0) + 1;
      });

      // Formatta dati per il report
      const roomsStatsHtml = Object.entries(roomStats)
        .map(([room, stats]) => 
          `<p><strong>${room}:</strong> ${stats.checkIns} check-in, ${stats.checkOuts} check-out</p>`
        )
        .join('');

      const hostessStatsHtml = Object.entries(hostessStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([hostess, count]) => 
          `<p><strong>${hostess}:</strong> ${count} operazioni</p>`
        )
        .join('');

      // Ottieni email degli admin
      const { data: adminEmails, error: emailError } = await supabase
        .rpc('get_admin_emails');

      if (emailError) throw emailError;

      if (adminEmails && adminEmails.length > 0) {
        await emailService.sendDailyReport({
          date: new Intl.DateTimeFormat('it-IT').format(new Date()),
          totalCheckIns: checkIns.length,
          totalCheckOuts: checkOuts.length,
          roomsStats: roomsStatsHtml || '<p>Nessun dato disponibile</p>',
          hostessStats: hostessStatsHtml || '<p>Nessun dato disponibile</p>',
          reportTime: new Intl.DateTimeFormat('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }).format(new Date()),
          adminEmails
        });
      }

      return true;
    } catch (err) {
      console.error('Error sending daily report:', err);
      return false;
    }
  }, [emailService]);

  // Test invio email
  const sendTestNotification = useCallback(async (recipientEmail: string) => {
    try {
      await emailService.sendEmail({
        recipient: recipientEmail,
        recipientName: 'Test User',
        type: 'system_alert',
        subject: '🧪 Test Email - Stadium Hospitality Manager',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🧪 Email Test</h2>
            <p>Questo è un messaggio di test per verificare la configurazione delle email.</p>
            <p><strong>Orario invio:</strong> ${new Date().toLocaleString('it-IT')}</p>
            <p style="color: #64748b; font-size: 14px;">
              Se ricevi questo messaggio, la configurazione email è corretta!
            </p>
          </div>
        `,
        priority: 'low',
        createdBy: 'system'
      });

      return true;
    } catch (err) {
      console.error('Error sending test notification:', err);
      return false;
    }
  }, [emailService]);

  // Carica dati all'inizializzazione
  useEffect(() => {
    loadNotifications();
    loadPreferences();
    loadStats();
  }, [loadNotifications, loadPreferences, loadStats]);

  return {
    // State
    notifications,
    preferences,
    stats,
    loading,
    error,

    // Actions
    loadNotifications,
    loadPreferences,
    loadStats,
    updatePreferences,
    sendCheckInNotification,
    sendDailyReport,
    sendTestNotification,

    // Utilities
    refresh: () => {
      loadNotifications();
      loadPreferences();
      loadStats();
    }
  };
}

// Hook semplificato per le preferenze email
export function useEmailPreferences() {
  const { preferences, updatePreferences, loading, error } = useEmailNotifications();
  
  return {
    preferences,
    updatePreferences,
    loading,
    error
  };
}

// Hook per statistiche email
export function useEmailStats() {
  const { stats, loadStats, loading } = useEmailNotifications();
  
  return {
    stats,
    loadStats,
    loading,
    refresh: loadStats
  };
}