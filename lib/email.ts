import { createClient } from '@supabase/supabase-js';

// Email Service Configuration
export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'supabase';
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailNotification {
  id?: string;
  recipient: string;
  recipientName: string;
  type: 'guest_check_in' | 'guest_check_out' | 'daily_report' | 'system_alert';
  subject: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  scheduledFor?: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Date;
  createdBy: string;
}

// Email Templates
export const EMAIL_TEMPLATES = {
  GUEST_CHECK_IN: {
    subject: '🎯 Nuovo Check-in - {guestName}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">✅ Check-in Effettuato</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Ospite:</strong> {guestName}</p>
          <p><strong>Sala:</strong> {roomName}</p>
          <p><strong>Tavolo:</strong> {tableNumber}</p>
          <p><strong>Hostess:</strong> {hostessName}</p>
          <p><strong>Orario:</strong> {checkInTime}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Questo messaggio è stato generato automaticamente dal sistema Stadium Hospitality Manager.
        </p>
      </div>
    `,
    textContent: 'Check-in effettuato per {guestName} nella sala {roomName} alle ore {checkInTime} da {hostessName}.'
  },

  GUEST_CHECK_OUT: {
    subject: '🚪 Check-out - {guestName}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚪 Check-out Effettuato</h2>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Ospite:</strong> {guestName}</p>
          <p><strong>Sala:</strong> {roomName}</p>
          <p><strong>Hostess:</strong> {hostessName}</p>
          <p><strong>Orario Check-out:</strong> {checkOutTime}</p>
          <p><strong>Durata Permanenza:</strong> {duration}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Questo messaggio è stato generato automaticamente dal sistema Stadium Hospitality Manager.
        </p>
      </div>
    `,
    textContent: 'Check-out effettuato per {guestName} dalla sala {roomName} alle ore {checkOutTime}.'
  },

  DAILY_REPORT: {
    subject: '📊 Report Giornaliero Accessi - {date}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #059669;">📊 Report Accessi Giornaliero</h2>
        <p><strong>Data:</strong> {date}</p>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px;">
            <h3 style="margin: 0; color: #065f46;">Totale Check-in</h3>
            <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #059669;">{totalCheckIns}</p>
          </div>
          <div style="background: #fef3f2; padding: 15px; border-radius: 8px;">
            <h3 style="margin: 0; color: #991b1b;">Totale Check-out</h3>
            <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #dc2626;">{totalCheckOuts}</p>
          </div>
        </div>

        <h3>Dettaglio per Sala</h3>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
          {roomsStats}
        </div>

        <h3>Top Hostess</h3>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
          {hostessStats}
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
          Report generato automaticamente alle {reportTime}
        </p>
      </div>
    `,
    textContent: 'Report giornaliero del {date}: {totalCheckIns} check-in, {totalCheckOuts} check-out.'
  },

  SYSTEM_ALERT: {
    subject: '🚨 Alert Sistema - {alertType}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Alert Sistema</h2>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p><strong>Tipo Alert:</strong> {alertType}</p>
          <p><strong>Messaggio:</strong> {message}</p>
          <p><strong>Orario:</strong> {timestamp}</p>
          {details}
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Alert generato automaticamente dal sistema di monitoraggio.
        </p>
      </div>
    `,
    textContent: 'Alert sistema: {alertType} - {message} alle ore {timestamp}'
  }
} as const;

// Email Service Class
export class EmailService {
  private config: EmailConfig;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor(config: EmailConfig) {
    this.config = config;
  }

  // Send email using configured provider
  async sendEmail(notification: Omit<EmailNotification, 'id' | 'createdAt' | 'status'>): Promise<boolean> {
    try {
      // Save notification to database first
      const savedNotification = await this.saveNotification(notification);
      
      let success = false;
      
      switch (this.config.provider) {
        case 'resend':
          success = await this.sendWithResend(savedNotification);
          break;
        case 'sendgrid':
          success = await this.sendWithSendGrid(savedNotification);
          break;
        case 'supabase':
          success = await this.sendWithSupabase(savedNotification);
          break;
      }

      // Update notification status
      await this.updateNotificationStatus(savedNotification.id!, success ? 'sent' : 'failed');
      
      return success;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Send check-in notification
  async sendCheckInNotification(guestData: {
    guestName: string;
    roomName: string;
    tableNumber?: string;
    hostessName: string;
    checkInTime: string;
    adminEmails: string[];
  }): Promise<void> {
    const template = EMAIL_TEMPLATES.GUEST_CHECK_IN;
    
    for (const email of guestData.adminEmails) {
      await this.sendEmail({
        recipient: email,
        recipientName: 'Admin',
        type: 'guest_check_in',
        subject: this.replaceTemplateVars(template.subject, guestData),
        content: this.replaceTemplateVars(template.htmlContent, guestData),
        priority: 'medium',
        createdBy: 'system',
        metadata: {
          guestName: guestData.guestName,
          roomName: guestData.roomName,
          action: 'check_in'
        }
      });
    }
  }

  // Send daily report
  async sendDailyReport(reportData: {
    date: string;
    totalCheckIns: number;
    totalCheckOuts: number;
    roomsStats: string;
    hostessStats: string;
    reportTime: string;
    adminEmails: string[];
  }): Promise<void> {
    const template = EMAIL_TEMPLATES.DAILY_REPORT;
    
    for (const email of reportData.adminEmails) {
      await this.sendEmail({
        recipient: email,
        recipientName: 'Admin',
        type: 'daily_report',
        subject: this.replaceTemplateVars(template.subject, reportData),
        content: this.replaceTemplateVars(template.htmlContent, reportData),
        priority: 'low',
        createdBy: 'system',
        metadata: {
          reportDate: reportData.date,
          totalCheckIns: reportData.totalCheckIns,
          totalCheckOuts: reportData.totalCheckOuts
        }
      });
    }
  }

  // Private methods for different providers
  private async sendWithResend(notification: EmailNotification): Promise<boolean> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: [notification.recipient],
          subject: notification.subject,
          html: notification.content,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Resend error:', error);
      return false;
    }
  }

  private async sendWithSendGrid(notification: EmailNotification): Promise<boolean> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: notification.recipient, name: notification.recipientName }],
            subject: notification.subject
          }],
          from: { email: this.config.fromEmail, name: this.config.fromName },
          content: [{ type: 'text/html', value: notification.content }]
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('SendGrid error:', error);
      return false;
    }
  }

  private async sendWithSupabase(notification: EmailNotification): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.functions.invoke('send-email', {
        body: {
          to: notification.recipient,
          subject: notification.subject,
          html: notification.content,
          from: this.config.fromEmail
        }
      });

      return !error;
    } catch (error) {
      console.error('Supabase Edge Function error:', error);
      return false;
    }
  }

  // Database operations
  private async saveNotification(notification: Omit<EmailNotification, 'id' | 'createdAt' | 'status'>): Promise<EmailNotification> {
    const { data, error } = await this.supabase
      .from('email_notifications')
      .insert({
        ...notification,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as EmailNotification;
  }

  private async updateNotificationStatus(id: string, status: 'sent' | 'failed'): Promise<void> {
    const updateData: { status: string; sent_at?: string } = { status };
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    await this.supabase
      .from('email_notifications')
      .update(updateData)
      .eq('id', id);
  }

  // Template utilities
  private replaceTemplateVars(template: string, data: Record<string, string | number | string[] | undefined>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = data[key];
      if (value === undefined) return match;
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    });
  }

  // Get notification history
  async getNotifications(limit: number = 50): Promise<EmailNotification[]> {
    const { data, error } = await this.supabase
      .from('email_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Get notification statistics
  async getEmailStats(days: number = 7): Promise<{
    totalSent: number;
    totalFailed: number;
    successRate: number;
    byType: Record<string, number>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await this.supabase
      .from('email_notifications')
      .select('status, type')
      .gte('created_at', since.toISOString());

    if (error) throw error;

    const stats = {
      totalSent: 0,
      totalFailed: 0,
      successRate: 0,
      byType: {} as Record<string, number>
    };

    data?.forEach(notification => {
      if (notification.status === 'sent') stats.totalSent++;
      if (notification.status === 'failed') stats.totalFailed++;
      
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
    });

    const total = stats.totalSent + stats.totalFailed;
    stats.successRate = total > 0 ? (stats.totalSent / total) * 100 : 0;

    return stats;
  }
}

// Factory function to create email service
export function createEmailService(): EmailService {
  // DEBUG: stampa le variabili
  console.log('Email config:', {
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasResendKey: !!process.env.RESEND_API_KEY,
    provider: process.env.EMAIL_PROVIDER
  });

  const config: EmailConfig = {
    provider: (process.env.EMAIL_PROVIDER as 'resend' | 'sendgrid' | 'supabase') || 'resend',
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.EMAIL_FROM || 'noreply@stadium.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Stadium Hospitality Manager'
  };

  return new EmailService(config);
}