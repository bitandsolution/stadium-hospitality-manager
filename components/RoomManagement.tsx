'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, DoorOpen } from 'lucide-react'
import { useRooms, useGuests } from '@/lib/hooks'
import type { Room } from '@/lib/hooks'

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomStats, setRoomStats] = useState<Record<string, { total: number; checkedIn: number }>>({})

  const { getAllRooms, createRoom, updateRoom, deleteRoom } = useRooms()
  const { getAllGuests } = useGuests()

  useEffect(() => {
    loadRooms()
  }, [])

  const loadRooms = async () => {
    try {
      setLoading(true)
      const roomsData = await getAllRooms()
      setRooms(roomsData)

      // Carica statistiche per ogni sala
      const guestsData = await getAllGuests()
      const stats: Record<string, { total: number; checkedIn: number }> = {}
      
      roomsData.forEach(room => {
        const roomGuests = guestsData.filter(g => g.room_id === room.id)
        stats[room.id] = {
          total: roomGuests.length,
          checkedIn: roomGuests.filter(g => g.checked_in).length
        }
      })
      
      setRoomStats(stats)
    } catch (error) {
      console.error('Errore caricamento sale:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return

    try {
      await createRoom(newRoomName.trim())
      setNewRoomName('')
      setShowAddModal(false)
      await loadRooms()
    } catch (error) {
      console.error('Errore creazione sala:', error)
      alert('Errore durante la creazione della sala')
    }
  }

  const handleUpdateRoom = async () => {
    if (!editingRoom || !editingRoom.name.trim()) return

    try {
      await updateRoom(editingRoom.id, editingRoom.name.trim())
      setEditingRoom(null)
      await loadRooms()
    } catch (error) {
      console.error('Errore aggiornamento sala:', error)
      alert('Errore durante l\'aggiornamento della sala')
    }
  }

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare la sala "${roomName}"? Tutti gli ospiti associati verranno eliminati.`)) {
      return
    }

    try {
      await deleteRoom(roomId)
      await loadRooms()
    } catch (error) {
      console.error('Errore eliminazione sala:', error)
      alert('Errore durante l\'eliminazione della sala')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Caricamento sale...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestione Sale</h2>
          <p className="text-gray-600">Configura le sale hospitality</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nuova Sala</span>
        </button>
      </div>

      {/* Lista Sale */}
      <div className="grid gap-4">
        {rooms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <DoorOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nessuna sala configurata</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Crea la prima sala
            </button>
          </div>
        ) : (
          rooms.map(room => {
            const stats = roomStats[room.id] || { total: 0, checkedIn: 0 }
            return (
              <div key={room.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingRoom?.id === room.id ? (
                      <input
                        type="text"
                        value={editingRoom.name}
                        onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                        className="text-xl font-bold text-gray-900 border-b-2 border-indigo-500 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {stats.checkedIn} / {stats.total} ospiti entrati
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    {editingRoom?.id === room.id ? (
                      <>
                        <button
                          onClick={handleUpdateRoom}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          Salva
                        </button>
                        <button
                          onClick={() => setEditingRoom(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                          Annulla
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingRoom(room)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id, room.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Nuova Sala */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nuova Sala</h3>
            <input
              type="text"
              placeholder="Nome sala (es. OLYMPIA)"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={handleCreateRoom}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Crea Sala
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewRoomName('')
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}