'use client';

import React, { useState, useEffect } from 'react';
import { useGuests } from '@/lib/hooks'; // Il tuo hook esistente
import { useGuestsWithEmail } from '@/lib/hooks/useGuestsWithEmail'; // Il nuovo hook
import { Search, UserCheck, UserX, Mail, Users, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // ✅ Usa il client esistente
import { createEmailService } from '@/lib/email';

// Tipo Guest - adatta secondo la tua interfaccia esistente
interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  room?: {
    name: string;
  };
  table_number?: string;
  checked_in: boolean;
  checked_in_at?: string;
}

// Props del componente (opzionali per compatibilità con dashboard)
interface GuestListProps {
  userId?: string;
  userRole?: 'admin' | 'hostess';
}

export function GuestList({ userId, userRole }: GuestListProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmailIntegration, setShowEmailIntegration] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGuest, setEditingGuest] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ first_name: string; last_name: string } | null>(null);
  
  // Usa i tuoi hooks esistenti
  const { getAllGuests, checkInGuest, checkOutGuest, updateGuest } = useGuests();
  
  // Usa il nuovo hook per le funzioni con email
  const { 
    checkInGuestWithNotification, 
    checkOutGuestWithNotification,
    loading: emailLoading,
    error: emailError 
  } = useGuestsWithEmail();

  // Carica gli ospiti
  const loadGuests = async () => {
    setLoading(true);
    try {
      const data = await getAllGuests();
      setGuests(data);
    } catch (error) {
      console.error('Error loading guests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtra ospiti in base al termine di ricerca
  const filteredGuests = guests.filter((guest: Guest) =>
    `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.room?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.table_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Gestione check-in con notifica email
  const handleCheckInWithEmail = async (guestId: string) => {
    const success = await checkInGuestWithNotification(guestId);
    if (success) {
      loadGuests();
      console.log('Check-in completed with email notification');
    }
  };

  // Gestione check-out con notifica email
  const handleCheckOutWithEmail = async (guestId: string) => {
    const success = await checkOutGuestWithNotification(guestId);
    if (success) {
      loadGuests();
      console.log('Check-out completed with email notification');
    }
  };

  // Gestione check-in senza notifica
  const handleCheckIn = async (guestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await checkInGuest(guestId, user.id);
        loadGuests();
      }
    } catch (error) {
      console.error('Error during check-in:', error);
    }
  };

  // Gestione check-out senza notifica
  const handleCheckOut = async (guestId: string) => {
    try {
      await checkOutGuest(guestId);
      loadGuests();
    } catch (error) {
      console.error('Error during check-out:', error);
    }
  };

  // Inizia modifica ospite
  const startEditGuest = (guest: Guest) => {
    setEditingGuest(guest.id);
    setEditForm({
      first_name: guest.first_name,
      last_name: guest.last_name
    });
  };

  // Annulla modifica
  const cancelEdit = () => {
    setEditingGuest(null);
    setEditForm(null);
  };

  // Salva modifica con notifica email
  const saveGuestEdit = async (guestId: string) => {
    if (!editForm) return;

    try {
      const guest = guests.find(g => g.id === guestId);
      if (!guest) return;

      // Controlla se nome o cognome sono cambiati
      const hasNameChanged = 
        editForm.first_name !== guest.first_name || 
        editForm.last_name !== guest.last_name;

      // Aggiorna l'ospite
      await updateGuest(guestId, editForm);

      // Invia email SOLO se nome/cognome sono cambiati
      if (hasNameChanged && showEmailIntegration) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: adminEmails } = await supabase.rpc('get_admin_emails');

        if (adminEmails && adminEmails.length > 0 && user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          // Invia notifica di modifica
          const emailService = createEmailService();
          await emailService.sendEmail({
            recipient: adminEmails[0],
            recipientName: 'Admin',
            type: 'system_alert',
            subject: `✏️ Modifica Ospite - ${editForm.first_name} ${editForm.last_name}`,
            content: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">✏️ Ospite Modificato</h2>
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Modificato da:</strong> ${profile?.full_name || 'Hostess'}</p>
                  <p><strong>Nome precedente:</strong> ${guest.first_name} ${guest.last_name}</p>
                  <p><strong>Nuovo nome:</strong> ${editForm.first_name} ${editForm.last_name}</p>
                  <p><strong>Sala:</strong> ${guest.room?.name || 'N/A'}</p>
                  <p><strong>Orario modifica:</strong> ${new Date().toLocaleString('it-IT')}</p>
                </div>
              </div>
            `,
            priority: 'medium',
            createdBy: user.id
          });
        }
      }

      loadGuests();
      setEditingGuest(null);
      setEditForm(null);
    } catch (error) {
      console.error('Error updating guest:', error);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
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
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Gestione Ospiti ({filteredGuests.length})
            </h3>
            <p className="text-sm text-gray-600">
              Notifica email automatica SOLO per modifiche nome/cognome
            </p>
          </div>
          
          {/* Toggle Email Integration */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showEmailIntegration}
                onChange={(e) => setShowEmailIntegration(e.target.checked)}
                className="rounded"
              />
              <Mail className="w-4 h-4" />
              <span className="text-sm">Notifiche Email</span>
            </label>
          </div>
        </div>

        {/* Ricerca */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome, sala o tavolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Notifica errori email */}
        {emailError && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm">
              ⚠️ Notifica Email: {emailError}
            </p>
          </div>
        )}
      </div>

      {/* Lista Ospiti */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {filteredGuests.map((guest: Guest) => (
            <div key={guest.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white ${
                    guest.checked_in ? 'bg-green-500' : 'bg-gray-400'
                  }`}>
                    {guest.first_name.charAt(0)}{guest.last_name.charAt(0)}
                  </div>
                  
                  {/* Info Ospite */}
                  <div className="flex-1">
                    {editingGuest === guest.id ? (
                      // Modalità modifica
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editForm?.first_name || ''}
                          onChange={(e) => setEditForm(prev => prev ? {...prev, first_name: e.target.value} : null)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Nome"
                        />
                        <input
                          type="text"
                          value={editForm?.last_name || ''}
                          onChange={(e) => setEditForm(prev => prev ? {...prev, last_name: e.target.value} : null)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Cognome"
                        />
                        <button
                          onClick={() => saveGuestEdit(guest.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Salva"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Annulla"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      // Modalità visualizzazione
                      <>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {guest.first_name} {guest.last_name}
                          </p>
                          <button
                            onClick={() => startEditGuest(guest)}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Modifica nome"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>📍 {guest.room?.name}</span>
                          {guest.table_number && <span>🪑 Tavolo {guest.table_number}</span>}
                          {guest.checked_in && guest.checked_in_at && (
                            <span>⏰ {new Date(guest.checked_in_at).toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Azioni */}
                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    guest.checked_in
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {guest.checked_in ? 'Presente' : 'Non presente'}
                  </span>

                  {/* Azioni Check-in/out - SENZA icona Mail */}
                  {!guest.checked_in ? (
                    <button
                      onClick={() => handleCheckIn(guest.id)}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      <UserCheck className="w-4 h-4" />
                      Check-in
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckOut(guest.id)}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      <UserX className="w-4 h-4" />
                      Check-out
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredGuests.length === 0 && !loading && (
          <div className="p-12 text-center">
            <div className="text-gray-300 mb-4">
              <Users className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500 mb-2">Nessun ospite trovato</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Rimuovi filtro di ricerca
              </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}