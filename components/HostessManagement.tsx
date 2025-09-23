'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, UserPlus } from 'lucide-react'
import { useAuth, useUserManagement, useRooms } from '@/lib/hooks'
import type { Profile, Room } from '@/lib/hooks'

export default function HostessManagement() {
  const [hostesses, setHostesses] = useState<Profile[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [hostessRooms, setHostessRooms] = useState<Record<string, Room[]>>({})
  
  const [newHostess, setNewHostess] = useState({
    email: '',
    password: '',
    fullName: '',
    selectedRooms: [] as string[]
  })

  const { signUp } = useAuth()
  const { getAllProfiles, getHostessRooms, assignRoomToHostess, removeRoomFromHostess, deleteProfile } = useUserManagement()
  const { getAllRooms } = useRooms()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [profilesData, roomsData] = await Promise.all([
        getAllProfiles(),
        getAllRooms()
      ])
      
      const hostessesOnly = profilesData.filter(p => p.role === 'hostess')
      setHostesses(hostessesOnly)
      setRooms(roomsData)

      // Carica sale per ogni hostess
      const roomsMap: Record<string, Room[]> = {}
      for (const hostess of hostessesOnly) {
        roomsMap[hostess.id] = await getHostessRooms(hostess.id)
      }
      setHostessRooms(roomsMap)
    } catch (error) {
      console.error('Errore caricamento dati:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateHostess = async () => {
    if (!newHostess.email || !newHostess.password || !newHostess.fullName) {
      alert('Compila tutti i campi')
      return
    }

    try {
      const { user } = await signUp(
        newHostess.email,
        newHostess.password,
        newHostess.fullName,
        'hostess'
      )

      if (user) {
        // Assegna le sale selezionate
        for (const roomId of newHostess.selectedRooms) {
          await assignRoomToHostess(user.id, roomId)
        }
      }

      setShowAddModal(false)
      setNewHostess({ email: '', password: '', fullName: '', selectedRooms: [] })
      await loadData()
    } catch (error) {
      console.error('Errore creazione hostess:', error)
      alert('Errore durante la creazione della hostess')
    }
  }

  const handleToggleRoom = async (hostessId: string, roomId: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        await removeRoomFromHostess(hostessId, roomId)
      } else {
        await assignRoomToHostess(hostessId, roomId)
      }
      await loadData()
    } catch (error) {
      console.error('Errore assegnazione sala:', error)
      alert('Errore durante l\'assegnazione della sala')
    }
  }

  const handleDeleteHostess = async (hostessId: string, hostessName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare l'hostess "${hostessName}"?`)) {
      return
    }

    try {
      await deleteProfile(hostessId)
      await loadData()
    } catch (error) {
      console.error('Errore eliminazione hostess:', error)
      alert('Errore durante l\'eliminazione dell\'hostess')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Caricamento hostess...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestione Hostess</h2>
          <p className="text-gray-600">Configura gli account e le assegnazioni</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nuova Hostess</span>
        </button>
      </div>

      {/* Lista Hostess */}
      <div className="grid gap-4">
        {hostesses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Nessuna hostess configurata</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Crea la prima hostess
            </button>
          </div>
        ) : (
          hostesses.map(hostess => (
            <div key={hostess.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{hostess.full_name}</h3>
                  <p className="text-sm text-gray-600">{hostess.email}</p>
                </div>
                <button
                  onClick={() => handleDeleteHostess(hostess.id, hostess.full_name)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Sale assegnate:</p>
                <div className="flex flex-wrap gap-2">
                  {rooms.map(room => {
                    const isAssigned = hostessRooms[hostess.id]?.some(r => r.id === room.id) || false
                    return (
                      <button
                        key={room.id}
                        onClick={() => handleToggleRoom(hostess.id, room.id, isAssigned)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                          isAssigned
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {room.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Nuova Hostess */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nuova Hostess</h3>
            
            <div className="space-y-4 mb-4">
              <input
                type="text"
                placeholder="Nome completo"
                value={newHostess.fullName}
                onChange={(e) => setNewHostess({ ...newHostess, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="email"
                placeholder="Email"
                value={newHostess.email}
                onChange={(e) => setNewHostess({ ...newHostess, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="password"
                placeholder="Password"
                value={newHostess.password}
                onChange={(e) => setNewHostess({ ...newHostess, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Sale da assegnare:</p>
                <div className="space-y-2">
                  {rooms.map(room => (
                    <label key={room.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newHostess.selectedRooms.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewHostess({
                              ...newHostess,
                              selectedRooms: [...newHostess.selectedRooms, room.id]
                            })
                          } else {
                            setNewHostess({
                              ...newHostess,
                              selectedRooms: newHostess.selectedRooms.filter(id => id !== room.id)
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCreateHostess}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Crea Hostess
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewHostess({ email: '', password: '', fullName: '', selectedRooms: [] })
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