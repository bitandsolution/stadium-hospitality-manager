'use client'

import { useState, useRef } from 'react'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useRooms, useGuests, useImportExport } from '@/lib/hooks'

interface ImportResult {
  success: number
  failed: number
  errors: string[]
  createdRooms: string[]
}

export default function ImportExport({ userId }: { userId: string }) {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { getAllRooms, createRoom } = useRooms()
  const { bulkCreateGuests, getAllGuests } = useGuests()
  const { saveImportHistory } = useImportExport()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('📁 File selezionato:', file.name, file.size, file.type)

    setImporting(true)
    setProgress(0)
    setImportResult(null)

    try {
      // Verifica tipo file
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error('Formato file non supportato. Usa .xlsx o .xls')
      }

      console.log('📖 Lettura file in corso...')
      
      // Leggi il file Excel
      const data = await file.arrayBuffer()
      console.log('📊 ArrayBuffer creato, size:', data.byteLength)
      
      const workbook = XLSX.read(data, { type: 'array' })
      console.log('📋 Workbook letto. Fogli:', workbook.SheetNames)
      
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<{
        HOSPITALITY?: string
        TAVOLO?: string | number
        'COGNOME '?: string
        COGNOME?: string
        NOME?: string
      }>

      console.log('🔍 Dati estratti:')
      console.log('- Righe totali:', jsonData.length)
      console.log('- Prime 3 righe:', jsonData.slice(0, 3))
      console.log('- Colonne prima riga:', Object.keys(jsonData[0] || {}))

      if (jsonData.length === 0) {
        throw new Error('File Excel vuoto o formato non riconosciuto')
      }

      setProgress(10)

      // Verifica presenza colonne essenziali
      const firstRow = jsonData[0]
      const hasHospitality = 'HOSPITALITY' in firstRow
      const hasCognome = 'COGNOME' in firstRow || 'COGNOME ' in firstRow
      const hasNome = 'NOME' in firstRow

      console.log('🔍 Verifica colonne:')
      console.log('- HOSPITALITY:', hasHospitality)
      console.log('- COGNOME:', hasCognome)
      console.log('- NOME:', hasNome)

      if (!hasHospitality) {
        throw new Error('Colonna "HOSPITALITY" mancante nel file Excel')
      }
      if (!hasCognome) {
        throw new Error('Colonna "COGNOME" mancante nel file Excel')
      }
      if (!hasNome) {
        throw new Error('Colonna "NOME" mancante nel file Excel')
      }

      // Carica le sale esistenti
      console.log('🏢 Caricamento sale esistenti...')
      const existingRooms = await getAllRooms()
      const roomMap = new Map(existingRooms.map(r => [r.name.toUpperCase(), r.id]))
      const createdRooms: string[] = []

      console.log('🏢 Sale esistenti:', existingRooms.map(r => r.name))
      setProgress(20)

      // Prepara i dati per l'import
      const guestsToImport = []
      const errors: string[] = []

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const rowNum = i + 2 // +2 perché Excel parte da 1 e la riga 1 è l'header

        try {
          // Estrai i dati (gestisci variazioni nei nomi colonne)
          const roomName = row.HOSPITALITY?.toString().trim().toUpperCase()
          const lastName = (row['COGNOME '] || row.COGNOME)?.toString().trim()
          const firstName = row.NOME?.toString().trim()
          const tableNumber = row.TAVOLO?.toString().trim() || ''

          // Debug per le prime righe
          if (i < 5) {
            console.log(`📋 Riga ${rowNum}:`, { roomName, lastName, firstName, tableNumber })
          }

          // Validazione
          if (!roomName) {
            errors.push(`Riga ${rowNum}: manca il nome della sala`)
            continue
          }
          if (!lastName) {
            errors.push(`Riga ${rowNum}: manca il cognome`)
            continue
          }
          if (!firstName) {
            errors.push(`Riga ${rowNum}: manca il nome`)
            continue
          }

          // Crea la sala se non esiste
          let roomId = roomMap.get(roomName)
          if (!roomId) {
            console.log(`🏗️ Creazione sala: ${roomName}`)
            const newRoom = await createRoom(roomName)
            roomId = newRoom.id
            roomMap.set(roomName, roomId)
            createdRooms.push(roomName)
          }

          guestsToImport.push({
            room_id: roomId,
            first_name: firstName,
            last_name: lastName,
            table_number: tableNumber,
            checked_in: false,
          })

        } catch (error) {
          console.error(`❌ Errore riga ${rowNum}:`, error)
          errors.push(`Riga ${rowNum}: ${error instanceof Error ? error.message : 'errore sconosciuto'}`)
        }

        // Aggiorna progress
        setProgress(20 + Math.floor((i / jsonData.length) * 60))
      }

      console.log(`📥 Preparazione completata:`)
      console.log('- Ospiti da importare:', guestsToImport.length)
      console.log('- Errori:', errors.length)
      console.log('- Sale create:', createdRooms)

      setProgress(85)

      // Inserimento bulk nel database
      let successCount = 0
      if (guestsToImport.length > 0) {
        try {
          console.log('💾 Inserimento nel database...')
          await bulkCreateGuests(guestsToImport)
          successCount = guestsToImport.length
          console.log('✅ Inserimento completato')
        } catch (error) {
          console.error('❌ Errore inserimento database:', error)
          errors.push(`Errore inserimento database: ${error instanceof Error ? error.message : 'errore sconosciuto'}`)
        }
      }

      setProgress(95)

      // Salva storico import
      try {
        console.log('📊 Salvataggio storico import...')
        await saveImportHistory(
          userId,
          file.name,
          jsonData.length,
          successCount,
          errors.length,
          errors.length > 0 ? { errors } : undefined
        )
      } catch (error) {
        console.error('⚠️ Errore salvataggio storico:', error)
      }

      setProgress(100)

      setImportResult({
        success: successCount,
        failed: errors.length,
        errors: errors.slice(0, 10), // Mostra solo primi 10 errori
        createdRooms,
      })

      console.log('🎉 Import completato!')

    } catch (error) {
      console.error('💥 Errore generale import:', error)
      setImportResult({
        success: 0,
        failed: 1,
        errors: [`Errore lettura file: ${error instanceof Error ? error.message : 'errore sconosciuto'}`],
        createdRooms: [],
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const guests = await getAllGuests()
      const rooms = await getAllRooms()
      const roomMap = new Map(rooms.map(r => [r.id, r.name]))

      // Prepara i dati per l'export
      const exportData = guests.map(g => ({
        SALA: roomMap.get(g.room_id) || 'Sconosciuta',
        COGNOME: g.last_name,
        NOME: g.first_name,
        TAVOLO: g.table_number || '',
        CHECK_IN: g.checked_in ? 'SÌ' : 'NO',
        DATA_CHECK_IN: g.checked_in_at || '',
      }))

      // Crea il file Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ospiti')

      // Download
      XLSX.writeFile(workbook, `report_accessi_${new Date().toISOString().split('T')[0]}.xlsx`)

    } catch (error) {
      console.error('Errore export:', error)
      alert('Errore durante l\'export')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Import/Export Dati</h2>
        <p className="text-gray-600">Gestisci i dati degli ospiti tramite Excel</p>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Excel</h3>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition cursor-pointer"
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Clicca per selezionare il file Excel</p>
          <p className="text-sm text-gray-500">Formato: HOSPITALITY, TAVOLO, COGNOME, NOME</p>
        </div>

        {importing && (
          <div className="mt-4">
            <div className="flex items-center space-x-3 text-indigo-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Importazione in corso... {progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {importResult && (
          <div className="mt-4 space-y-3">
            {importResult.success > 0 && (
              <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">
                    Importati {importResult.success} ospiti con successo!
                  </p>
                  {importResult.createdRooms.length > 0 && (
                    <p className="text-sm text-green-700 mt-1">
                      Sale create: {importResult.createdRooms.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {importResult.failed > 0 && (
              <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">
                    {importResult.failed} righe con errori
                  </p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium mb-2">Requisiti file Excel:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Formato .xlsx o .xls</li>
            <li>Prima riga: intestazioni colonne</li>
            <li>Colonne: HOSPITALITY (nome sala), TAVOLO, COGNOME, NOME</li>
            <li>Le sale verranno create automaticamente se non esistono</li>
          </ul>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Dati</h3>
        <p className="text-gray-600 mb-4">Scarica il report degli accessi in formato Excel</p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {exporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Esportazione...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Scarica Report Accessi</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}