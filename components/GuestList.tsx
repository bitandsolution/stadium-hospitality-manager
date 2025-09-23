'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Check, X } from 'lucide-react'
import { useGuests } from '@/lib/hooks'
import type { Guest } from '@/lib/hooks'

interface GuestListProps {
  userId: string
  userRole: 'admin' | 'hostess'
  assignedRooms?: string[]
}

export default function GuestList({ userId, userRole, assignedRooms }: GuestListProps) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const { getAllGuests, checkInGuest, checkOutGuest } = useGuests()

  useEffect(() => {
    loadGuests()
  }, [])

  const loadGuests = async () => {
    try {
      setLoading(true)
      const data = await getAllGuests()
      
      // Filtra per sale assegnate se hostess
      if (userRole === 'hostess' && assignedRooms) {
        const filtered = data.filter(g => assignedRooms.includes(g.room_id))
        setGuests(filtered)
      } else {
        setGuests(data)
      }
    } catch (error) {
      console.error('Errore caricamento ospiti:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGuests = useMemo(() => {
    if (!searchTerm) return guests

    const term = searchTerm.toLowerCase()
    return guests.filter(g => 
      g.first_name.toLowerCase().includes(term) ||
      g.last_name.toLowerCase().includes(term) ||
      g.table_number?.toLowerCase().includes(term)
    )
  }, [guests, searchTerm])

  const handleToggleCheckIn = async (guest: Guest) => {
    try {
      if (guest.checked_in) {
        await checkOutGuest(guest.id)
      } else {
        await checkInGuest(guest.id, userId)
      }
      // Ricarica la lista
      await loadGuests()
    } catch (error) {
      console.error('Errore check-in:', error)
      alert('Errore durante il check-in')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Caricamento...</div>
  }

  const stats = {
    total: guests.length,
    checkedIn: guests.filter(g => g.checked_in).length,
    pending: guests.filter(g => !g.checked_in).length
  }

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Totale Ospiti</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
          <div className="text-sm text-gray-600">Entrati</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">In Attesa</div>
        </div>
      </div>

      {/* Ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Cerca per nome, cognome o tavolo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Lista Ospiti */}
      <div className="space-y-2">
        {filteredGuests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nessun ospite trovato
          </div>
        ) : (
          filteredGuests.map(guest => (
            <div
              key={guest.id}
              className={`bg-white rounded-lg p-4 border-2 transition ${
                guest.checked_in
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 hover:border-indigo-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg font-bold text-gray-900">
                      {guest.last_name} {guest.first_name}
                    </div>
                    {guest.checked_in && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        ENTRATO
                      </span>
                    )}
                  </div>
                  {guest.table_number && (
                    <div className="text-sm text-gray-600 mt-1">
                      Tavolo {guest.table_number}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleToggleCheckIn(guest)}
                  className={`px-6 py-3 rounded-lg font-semibold transition transform active:scale-95 ${
                    guest.checked_in
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {guest.checked_in ? (
                    <span className="flex items-center space-x-2">
                      <X className="w-5 h-5" />
                      <span>Annulla</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      <Check className="w-5 h-5" />
                      <span>Check-in</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}