'use client'

import { useSupabase } from '../providers'
import { useEffect, useState } from 'react'
import { Users, DoorOpen, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import GuestList from '@/components/GuestList'

interface ProfileData {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'hostess'
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const { user, session, supabase } = useSupabase()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      const profile: ProfileData = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || 'Utente',
        role: user.user_metadata?.role || 'hostess',
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      }
      setProfile(profile)
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [user])

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
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DoorOpen className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Stadium Access</h1>
                <p className="text-sm text-gray-600">
                  {profile.full_name} • {profile.role === 'admin' ? 'Admin' : 'Hostess'}
                </p>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Gestione Ospiti</h2>
          <p className="text-gray-600">Check-in e monitoraggio accessi</p>
        </div>

        <GuestList 
          userId={profile.id} 
          userRole={profile.role}
        />
      </main>
    </div>
  )
}