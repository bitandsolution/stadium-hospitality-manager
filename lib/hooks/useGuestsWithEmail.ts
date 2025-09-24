// lib/hooks/useGuestsWithEmail.ts
// Estensione del tuo useGuests hook esistente per includere le notifiche email

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createEmailService } from '../email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Estendi il tuo tipo Guest esistente se necessario
export interface Guest {
  id: string;
  room_id: string;
  first_name: string;
  last_name: string;
  table_number?: string;
  seat_number?: string;
  checked_in: boolean;
  checked_in_at?: string;
  checked_in_by?: string;
  created_at: string;
  updated_at: string;
  room?: {
    name: string;
  };
  checked_in_user?: {
    full_name: string;
  };
}

export function useGuestsWithEmail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailService = createEmailService();

  // Funzione di check-in estesa con notifica email
  const checkInGuestWithNotification = useCallback(async (guestId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Ottieni dati completi del guest prima del check-in
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select(`
          *,
          room:rooms(name),
          checked_in_user:profiles(full_name)
        `)
        .eq('id', guestId)
        .single();

      if (guestError) throw guestError;

      // Ottieni dati utente corrente
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('User not authenticated');

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.user.id)
        .single();

      // Esegui check-in
      const { error: updateError } = await supabase
        .from('guests')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
          checked_in_by: currentUser.user.id
        })
        .eq('id', guestId);

      if (updateError) throw updateError;

      // Registra nell'audit log
      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          guest_id: guestId,
          user_id: currentUser.user.id,
          action: 'check_in',
          new_data: { 
            checked_in: true, 
            checked_in_at: new Date().toISOString() 
          }
        });

      if (auditError) console.warn('Audit log error:', auditError);

      // Invia notifica email asincrona (non bloccare l'UI)
      if (guestData && currentProfile) {
        // Esegui in background senza await per non bloccare l'interfaccia
        setTimeout(async () => {
          try {
            await sendCheckInNotificationSafely({
              guestName: `${guestData.first_name} ${guestData.last_name}`,
              roomName: guestData.room?.name || 'Sala Sconosciuta',
              tableNumber: guestData.table_number || undefined,
              hostessName: currentProfile.full_name || 'Hostess',
              checkInTime: new Date().toLocaleString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
              })
            });
          } catch (emailError) {
            console.error('Email notification failed:', emailError);
            // Qui potresti voler registrare l'errore o mostrare una notifica all'utente
          }
        }, 100); // Piccolo delay per non interferire con l'UI
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante check-in');
      return false;
    } finally {
      setLoading(false);
    }
  }, [emailService]);

  // Funzione di check-out estesa con notifica email
  const checkOutGuestWithNotification = useCallback(async (guestId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Ottieni dati completi del guest prima del check-out
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select(`
          *,
          room:rooms(name),
          checked_in_user:profiles(full_name)
        `)
        .eq('id', guestId)
        .single();

      if (guestError) throw guestError;

      // Calcola durata permanenza
      const checkInTime = guestData.checked_in_at ? new Date(guestData.checked_in_at) : null;
      const checkOutTime = new Date();
      const duration = checkInTime 
        ? Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60)) // in minuti
        : 0;

      // Ottieni dati utente corrente  
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('User not authenticated');

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.user.id)
        .single();

      // Esegui check-out
      const { error: updateError } = await supabase
        .from('guests')
        .update({
          checked_in: false,
          checked_in_at: null,
          checked_in_by: null
        })
        .eq('id', guestId);

      if (updateError) throw updateError;

      // Registra nell'audit log
      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          guest_id: guestId,
          user_id: currentUser.user.id,
          action: 'check_out',
          old_data: {
            checked_in: true,
            checked_in_at: guestData.checked_in_at
          },
          new_data: {
            checked_in: false,
            checked_in_at: null
          }
        });

      if (auditError) console.warn('Audit log error:', auditError);

      // Invia notifica email asincrona
      if (guestData && currentProfile) {
        setTimeout(async () => {
          try {
            await sendCheckOutNotificationSafely({
              guestName: `${guestData.first_name} ${guestData.last_name}`,
              roomName: guestData.room?.name || 'Sala Sconosciuta',
              hostessName: currentProfile.full_name || 'Hostess',
              checkOutTime: checkOutTime.toLocaleString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              duration: formatDuration(duration)
            });
          } catch (emailError) {
            console.error('Email notification failed:', emailError);
          }
        }, 100);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante check-out');
      return false;
    } finally {
      setLoading(false);
    }
  }, [emailService]);

  // Funzione helper per inviare notifica check-in in modo sicuro
  const sendCheckInNotificationSafely = async (data: {
    guestName: string;
    roomName: string;
    tableNumber?: string;
    hostessName: string;
    checkInTime: string;
  }) => {
    try {
      // Ottieni email degli admin che vogliono ricevere notifiche
      const { data: adminEmails, error } = await supabase
        .rpc('get_admin_emails');

      if (error) {
        console.error('Error getting admin emails:', error);
        return;
      }

      if (adminEmails && adminEmails.length > 0) {
        await emailService.sendCheckInNotification({
          ...data,
          adminEmails
        });
      }
    } catch (error) {
      console.error('Failed to send check-in notification:', error);
      // Non rilancio l'errore per non interrompere il flusso principale
    }
  };

  // Funzione helper per inviare notifica check-out in modo sicuro
  const sendCheckOutNotificationSafely = async (data: {
    guestName: string;
    roomName: string;
    hostessName: string;
    checkOutTime: string;
    duration: string;
  }) => {
    try {
      // Ottieni email degli admin che vogliono ricevere notifiche di check-out
      const { data: adminProfiles, error } = await supabase
        .from('profiles')
        .select(`
          email,
          email_preferences!inner(receive_check_out_notifications)
        `)
        .eq('role', 'admin')
        .eq('email_preferences.receive_check_out_notifications', true);

      if (error) {
        console.error('Error getting admin emails for checkout:', error);
        return;
      }

      type AdminProfile = {
        email: string;
        email_preferences: Array<{
          receive_check_out_notifications: boolean;
        }>;
      };

      const typedProfiles = (adminProfiles || []) as AdminProfile[];
      const emails = typedProfiles
        .filter(profile => profile.email_preferences?.[0]?.receive_check_out_notifications)
        .map(profile => profile.email);
      
      if (emails.length > 0) {
        // Invia email a tutti gli admin interessati
        for (const email of emails) {
          await emailService.sendEmail({
            recipient: email,
            recipientName: 'Admin',
            type: 'guest_check_out',
            subject: `🚪 Check-out - ${data.guestName}`,
            content: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">🚪 Check-out Effettuato</h2>
                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Ospite:</strong> ${data.guestName}</p>
                  <p><strong>Sala:</strong> ${data.roomName}</p>
                  <p><strong>Hostess:</strong> ${data.hostessName}</p>
                  <p><strong>Orario Check-out:</strong> ${data.checkOutTime}</p>
                  <p><strong>Durata Permanenza:</strong> ${data.duration}</p>
                </div>
              </div>
            `,
            priority: 'medium',
            createdBy: 'system'
          });
        }
      }
    } catch (error) {
      console.error('Failed to send check-out notification:', error);
    }
  };

  // Utility per formattare la durata
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minuti`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  };

  return {
    checkInGuestWithNotification,
    checkOutGuestWithNotification,
    loading,
    error
  };
}

// lib/scheduledTasks.ts
// Funzioni per task programmati (da chiamare con cron job o Edge Functions)

export class ScheduledEmailTasks {
  private emailService = createEmailService();
  
  // Invia report giornaliero programmato
  async sendDailyReportScheduled(): Promise<boolean> {
    try {
      console.log('Starting scheduled daily report...');
      
      // Calcola statistiche del giorno precedente
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const { data: stats, error } = await supabase
        .from('audit_log')
        .select(`
          action, 
          created_at, 
          guest:guests(first_name, last_name, room:rooms(name)), 
          user:profiles(full_name)
        `)
        .gte('created_at', yesterdayStr)
        .lt('created_at', new Date().toISOString().split('T')[0])
        .in('action', ['check_in', 'check_out']);

      if (error) throw error;

      const checkIns = stats?.filter(stat => stat.action === 'check_in') || [];
      const checkOuts = stats?.filter(stat => stat.action === 'check_out') || [];

      // Type per i dati ritornati da Supabase
      type AuditLogStats = {
        action: string;
        created_at: string;
        guest: Array<{
          first_name: string;
          last_name: string;
          room: Array<{ name: string }>;
        }>;
        user: Array<{
          full_name: string;
        }>;
      };

      const typedCheckIns = checkIns as AuditLogStats[];
      const typedCheckOuts = checkOuts as AuditLogStats[];

      // Calcola statistiche per sala
      const roomStats: Record<string, { checkIns: number; checkOuts: number }> = {};
      typedCheckIns.forEach(checkIn => {
        const roomName = checkIn.guest?.[0]?.room?.[0]?.name || 'Sconosciuta';
        if (!roomStats[roomName]) roomStats[roomName] = { checkIns: 0, checkOuts: 0 };
        roomStats[roomName].checkIns++;
      });
      
      typedCheckOuts.forEach(checkOut => {
        const roomName = checkOut.guest?.[0]?.room?.[0]?.name || 'Sconosciuta';
        if (!roomStats[roomName]) roomStats[roomName] = { checkIns: 0, checkOuts: 0 };
        roomStats[roomName].checkOuts++;
      });

      // Calcola statistiche hostess
      const hostessStats: Record<string, number> = {};
      [...typedCheckIns, ...typedCheckOuts].forEach(stat => {
        const hostessName = stat.user?.[0]?.full_name || 'Sconosciuta';
        hostessStats[hostessName] = (hostessStats[hostessName] || 0) + 1;
      });

      // Formatta per HTML
      const roomsStatsHtml = Object.entries(roomStats)
        .map(([room, data]) => 
          `<p><strong>${room}:</strong> ${data.checkIns} check-in, ${data.checkOuts} check-out</p>`
        )
        .join('') || '<p>Nessun dato disponibile</p>';

      const hostessStatsHtml = Object.entries(hostessStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([hostess, count]) => 
          `<p><strong>${hostess}:</strong> ${count} operazioni</p>`
        )
        .join('') || '<p>Nessun dato disponibile</p>';

      // Ottieni email admin
      const { data: adminEmails, error: emailError } = await supabase
        .rpc('get_admin_emails');

      if (emailError) throw emailError;

      if (adminEmails && adminEmails.length > 0) {
        await this.emailService.sendDailyReport({
          date: yesterday.toLocaleDateString('it-IT'),
          totalCheckIns: checkIns.length,
          totalCheckOuts: checkOuts.length,
          roomsStats: roomsStatsHtml,
          hostessStats: hostessStatsHtml,
          reportTime: new Date().toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          adminEmails
        });
      }

      console.log(`Daily report sent successfully to ${adminEmails?.length || 0} admins`);
      return true;
    } catch (error) {
      console.error('Failed to send scheduled daily report:', error);
      return false;
    }
  }

  // Pulisci vecchie notifiche email (da eseguire settimanalmente)
  async cleanupOldNotifications(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_old_email_notifications', { days_to_keep: 90 });

      if (error) throw error;
      
      console.log(`Cleaned up ${data} old email notifications`);
      return data || 0;
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
      return 0;
    }
  }

  // Invia notifiche email in coda (per gestire invii falliti)
  async processPendingNotifications(): Promise<number> {
    try {
      const { data: pendingNotifications, error } = await supabase
        .from('email_notifications')
        .select('*')
        .eq('status', 'pending')
        .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Più vecchie di 5 minuti
        .limit(10); // Processa solo 10 alla volta

      if (error) throw error;
      if (!pendingNotifications || pendingNotifications.length === 0) {
        return 0;
      }

      let processed = 0;
      for (const notification of pendingNotifications) {
        try {
          await this.emailService.sendEmail({
            recipient: notification.recipient,
            recipientName: notification.recipient_name || 'User',
            type: notification.type as 'guest_check_in' | 'guest_check_out' | 'daily_report' | 'system_alert',
            subject: notification.subject,
            content: notification.content,
            priority: notification.priority as 'high' | 'medium' | 'low',
            createdBy: notification.created_by || 'system'
          });

          processed++;
        } catch (notificationError) {
          console.error(`Failed to send notification ${notification.id}:`, notificationError);
        }
      }

      return processed;
    } catch (error) {
      console.error('Failed to process pending notifications:', error);
      return 0;
    }
  }
}