// ============================================
// SUPABASE CLIENT SETUP
// ============================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// TYPES
// ============================================

export interface Room {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'hostess'
  created_at: string
  updated_at: string
}

export interface UserRoom {
  user_id: string
  room_id: string
  created_at: string
}

export interface Guest {
  id: string
  room_id: string
  first_name: string
  last_name: string
  table_number?: string
  seat_number?: string
  checked_in: boolean
  checked_in_at?: string
  checked_in_by?: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  guest_id: string
  user_id?: string
  action: 'check_in' | 'check_out' | 'update' | 'delete' | 'create'
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  created_at: string
}

export interface ImportHistory {
  id: string
  imported_by?: string
  file_name: string
  total_rows: number
  successful_rows: number
  failed_rows: number
  errors?: Record<string, unknown>
  created_at: string
}

// ============================================
// AUTH HOOKS
// ============================================

export const useAuth = () => {
  const signUp = async (email: string, password: string, fullName: string, role: 'admin' | 'hostess') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    })

    if (error) throw error

    // Crea il profilo
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          role: role
        })

      if (profileError) throw profileError
    }

    return data
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }

  const getCurrentProfile = async () => {
    const user = await getCurrentUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error
    return data as Profile
  }

  return { signUp, signIn, signOut, getCurrentUser, getCurrentProfile }
}

// ============================================
// ROOMS HOOKS
// ============================================

export const useRooms = () => {
  const getAllRooms = async (): Promise<Room[]> => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  }

  const createRoom = async (name: string): Promise<Room> => {
    const { data, error } = await supabase
      .from('rooms')
      .insert({ name })
      .select()
      .single()

    if (error) throw error
    return data
  }

  const updateRoom = async (id: string, name: string): Promise<Room> => {
    const { data, error } = await supabase
      .from('rooms')
      .update({ name })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const deleteRoom = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  const getRoomStats = async (roomId: string) => {
    const { data, error } = await supabase
      .rpc('get_room_stats', { room_uuid: roomId })

    if (error) throw error
    return data[0]
  }

  return { getAllRooms, createRoom, updateRoom, deleteRoom, getRoomStats }
}

// ============================================
// GUESTS HOOKS
// ============================================

export const useGuests = () => {
  const getAllGuests = async (roomId?: string): Promise<Guest[]> => {
    let query = supabase
      .from('guests')
      .select('*')
      .order('last_name')

    if (roomId) {
      query = query.eq('room_id', roomId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  const searchGuests = async (searchTerm: string, roomFilter?: string, userId?: string) => {
    const { data, error } = await supabase
      .rpc('search_guests', {
        search_term: searchTerm || null,
        room_filter: roomFilter || null,
        user_id: userId || null
      })

    if (error) throw error
    return data
  }

  const createGuest = async (guest: Omit<Guest, 'id' | 'created_at' | 'updated_at'>): Promise<Guest> => {
    const { data, error } = await supabase
      .from('guests')
      .insert(guest)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const updateGuest = async (id: string, updates: Partial<Guest>): Promise<Guest> => {
    const { data, error } = await supabase
      .from('guests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const checkInGuest = async (guestId: string, userId: string): Promise<Guest> => {
    const { data, error } = await supabase
      .from('guests')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: userId
      })
      .eq('id', guestId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const checkOutGuest = async (guestId: string): Promise<Guest> => {
    const { data, error } = await supabase
      .from('guests')
      .update({
        checked_in: false,
        checked_in_at: null,
        checked_in_by: null
      })
      .eq('id', guestId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const deleteGuest = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  const bulkCreateGuests = async (guests: Omit<Guest, 'id' | 'created_at' | 'updated_at'>[]): Promise<Guest[]> => {
    const { data, error } = await supabase
      .from('guests')
      .insert(guests)
      .select()

    if (error) throw error
    return data
  }

  const deleteAllGuestsInRoom = async (roomId: string): Promise<void> => {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('room_id', roomId)

    if (error) throw error
  }

  return {
    getAllGuests,
    searchGuests,
    createGuest,
    updateGuest,
    checkInGuest,
    checkOutGuest,
    deleteGuest,
    bulkCreateGuests,
    deleteAllGuestsInRoom
  }
}

// ============================================
// USER MANAGEMENT HOOKS (ADMIN)
// ============================================

export const useUserManagement = () => {
  const getAllProfiles = async (): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')

    if (error) throw error
    return data
  }

  const getHostessRooms = async (userId: string): Promise<Room[]> => {
    const { data, error } = await supabase
      .from('user_rooms')
      .select('rooms(*)')
      .eq('user_id', userId)

    if (error) throw error
    return data.map(item => item.rooms as unknown as Room)
  }

  const assignRoomToHostess = async (userId: string, roomId: string): Promise<void> => {
    const { error } = await supabase
      .from('user_rooms')
      .insert({ user_id: userId, room_id: roomId })

    if (error) throw error
  }

  const removeRoomFromHostess = async (userId: string, roomId: string): Promise<void> => {
    const { error } = await supabase
      .from('user_rooms')
      .delete()
      .eq('user_id', userId)
      .eq('room_id', roomId)

    if (error) throw error
  }

  const updateProfile = async (userId: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const deleteProfile = async (userId: string): Promise<void> => {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error
  }

  return {
    getAllProfiles,
    getHostessRooms,
    assignRoomToHostess,
    removeRoomFromHostess,
    updateProfile,
    deleteProfile
  }
}

// ============================================
// AUDIT LOG HOOKS
// ============================================

export const useAuditLog = () => {
  const getGuestAuditLog = async (guestId: string): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from('audit_log')
      .select(`
        *,
        profiles:user_id(full_name, email)
      `)
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  const getAllAuditLogs = async (limit = 100): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from('audit_log')
      .select(`
        *,
        profiles:user_id(full_name, email),
        guests:guest_id(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  return { getGuestAuditLog, getAllAuditLogs }
}

// ============================================
// IMPORT/EXPORT HOOKS
// ============================================

export const useImportExport = () => {
  const importGuestsFromExcel = async (
    file: File,
    userId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    throw new Error('To be implemented in next step')
  }

  const exportGuestsToExcel = async (roomId?: string): Promise<Blob> => {
    throw new Error('To be implemented in next step')
  }

  const saveImportHistory = async (
    importedBy: string,
    fileName: string,
    totalRows: number,
    successfulRows: number,
    failedRows: number,
    errors?: Record<string, unknown>
  ): Promise<ImportHistory> => {
    const { data, error } = await supabase
      .from('import_history')
      .insert({
        imported_by: importedBy,
        file_name: fileName,
        total_rows: totalRows,
        successful_rows: successfulRows,
        failed_rows: failedRows,
        errors: errors
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  const getImportHistory = async (limit = 50): Promise<ImportHistory[]> => {
    const { data, error } = await supabase
      .from('import_history')
      .select(`
        *,
        profiles:imported_by(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  return {
    importGuestsFromExcel,
    exportGuestsToExcel,
    saveImportHistory,
    getImportHistory
  }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export const useRealtimeGuests = (roomId: string, onUpdate: (payload: unknown) => void) => {
  const channel = supabase
    .channel(`guests:room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'guests',
        filter: `room_id=eq.${roomId}`
      },
      onUpdate
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ============================================
// EMAIL NOTIFICATIONS
// ============================================

export const sendEmailNotification = async (
  to: string,
  subject: string,
  body: string
) => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, body }
  })

  if (error) throw error
  return data
}

// ============================================
// STATISTICS HOOKS
// ============================================

export const useStatistics = () => {
  const getGlobalStats = async () => {
    const { count: totalGuests } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })

    const { count: checkedInGuests } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('checked_in', true)

    const { count: totalRooms } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })

    const { count: totalHostesses } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'hostess')

    return {
      totalGuests: totalGuests || 0,
      checkedInGuests: checkedInGuests || 0,
      pendingGuests: (totalGuests || 0) - (checkedInGuests || 0),
      totalRooms: totalRooms || 0,
      totalHostesses: totalHostesses || 0
    }
  }

  const getRoomStatsByDate = async (roomId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('guests')
      .select('checked_in_at, checked_in')
      .eq('room_id', roomId)
      .gte('checked_in_at', startDate)
      .lte('checked_in_at', endDate)
      .eq('checked_in', true)

    if (error) throw error
    return data
  }

  const getHostessPerformance = async (userId: string) => {
    const { count: totalCheckIns } = await supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('checked_in_by', userId)
      .eq('checked_in', true)

    const { data: recentActivity, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('user_id', userId)
      .eq('action', 'check_in')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return {
      totalCheckIns: totalCheckIns || 0,
      recentActivity: recentActivity || []
    }
  }

  return {
    getGlobalStats,
    getRoomStatsByDate,
    getHostessPerformance
  }
}