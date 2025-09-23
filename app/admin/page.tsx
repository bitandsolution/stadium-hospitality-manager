'use client'

import { useSupabase } from '../providers'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DoorOpen, LogOut, Users, Home, UserPlus, Upload } from 'lucide-react'
import RoomManagement from '@/components/RoomManagement'
import HostessManagement from '@/components/HostessManagement'
import GuestList from '@/components/GuestList'
import ImportExport from '@/components/ImportExport'

interface ProfileData {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'hostess'
}

export default function AdminPage() {
  const { user, session, supabase } = useSupabase()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'guests' | 'rooms' | 'hostesses' | 'import'>('guests')
  const hasLoadedProfile = useRef(false)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || hasLoadedProfile.current) return
      hasLoadedProfile.current = true

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('id', user.id)
          .single()

        if (error) throw error
        if (!data) throw new Error('Profilo non trovato')

        const rawData = data as unknown as {
          id: string
          email: string
          full_name: string
          role: string
        }

        const profileData: ProfileData = {
          id: rawData.id,
          email: rawData.email,
          full_name: rawData.full_name,
          role: rawData.role as 'admin' | 'hostess',
        }

        if (profileData.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setProfile(profileData)
        setLoading(false)
      } catch (error) {
        console.error('Errore:', error)
        router.push('/login')
      }
    }

    loadProfile()
  }, [user, router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Caricamento...</div>
      </div>
    )
  }

  if (!session || !profile) {
    return null
  }

  const tabs = [
    { id: 'guests' as const, label: 'Ospiti', icon: Users },
    { id: 'rooms' as const, label: 'Sale', icon: Home },
    { id: 'hostesses' as const, label: 'Hostess', icon: UserPlus },
    { id: 'import' as const, label: 'Import/Export', icon: Upload },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DoorOpen className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Stadium Access - Admin</h1>
                <p className="text-sm text-gray-600">{profile.full_name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'guests' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Gestione Ospiti</h2>
              <p className="text-gray-600">Visualizza e gestisci tutti gli ospiti</p>
            </div>
            <GuestList userId={profile.id} userRole="admin" />
          </div>
        )}

        {activeTab === 'rooms' && <RoomManagement />}

        {activeTab === 'hostesses' && <HostessManagement />}

        {activeTab === 'import' && <ImportExport userId={profile.id} />}
      </main>
    </div>
  )
}