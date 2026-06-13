import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useNotifications } from '../components/Notifications'

const RESTORE_SAFE_TABLES = [
  { key: 'inventory', table: TABLES.INVENTORY, label: 'Inventory' },
  { key: 'shifts', table: TABLES.SHIFTS, label: 'Shifts' },
  { key: 'checklists', table: TABLES.CHECKLISTS, label: 'Checklists' },
  { key: 'time_off', table: TABLES.TIME_OFF, label: 'Time Off' }
]

const REFERENCE_TABLES = [
  { key: 'profiles', table: TABLES.PROFILES, label: 'Profiles' },
  { key: 'roles', table: TABLES.ROLES, label: 'Roles' },
  { key: 'user_roles', table: TABLES.USER_ROLES, label: 'User Roles' },
  { key: 'announcements', table: TABLES.ANNOUNCEMENTS, label: 'Announcements' }
]

const getBackupSection = (backup, key) => {
  if (key === 'time_off') {
    return [
      ...(Array.isArray(backup.time_off) ? backup.time_off.map(row => ({ ...row, status: 'approved' })) : []),
      ...(Array.isArray(backup.time_off_pending) ? backup.time_off_pending.map(row => ({ ...row, status: 'pending' })) : [])
    ]
  }
  return Array.isArray(backup[key]) ? backup[key] : []
}

const hasRestoreSection = (backup, key) => {
  if (key === 'time_off') {
    return Array.isArray(backup.time_off) || Array.isArray(backup.time_off_pending)
  }
  return Array.isArray(backup[key])
}

export default function Settings() {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)
  const { confirmAction } = useNotifications()

  const showMsg = (text, type = 'success', timeout = 5000) => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), timeout)
  }

  const readTable = async ({ key, table, label }) => {
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw error
      return { key, table, label, data: data || [], error: null }
    } catch (err) {
      console.warn(`Backup skipped ${label}:`, err)
      return { key, table, label, data: [], error: err.message || 'Unable to read table' }
    }
  }

  const exportData = async () => {
    try {
      const restoreResults = await Promise.all(RESTORE_SAFE_TABLES.map(readTable))
      const referenceResults = await Promise.all(REFERENCE_TABLES.map(readTable))

      const byKey = Object.fromEntries(restoreResults.map(result => [result.key, result]))
      const reference = Object.fromEntries(referenceResults.map(result => [result.key, result.data]))
      const readErrors = [...restoreResults, ...referenceResults]
        .filter(result => result.error)
        .map(result => ({ key: result.key, table: result.table, label: result.label, error: result.error }))

      const timeOffRows = byKey.time_off?.data || []
      const data = {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        manifest: {
          app: 'BarManager',
          restoreSafeTables: RESTORE_SAFE_TABLES.map(({ key, table, label }) => ({ key, table, label })),
          referenceOnlyTables: REFERENCE_TABLES.map(({ key, table, label }) => ({ key, table, label })),
          rowCounts: {
            inventory: byKey.inventory?.data.length || 0,
            shifts: byKey.shifts?.data.length || 0,
            checklists: byKey.checklists?.data.length || 0,
            time_off: timeOffRows.filter(row => row.status === 'approved').length,
            time_off_pending: timeOffRows.filter(row => row.status === 'pending').length,
            ...Object.fromEntries(referenceResults.map(result => [result.key, result.data.length]))
          },
          readErrors
        },
        inventory: byKey.inventory?.data || [],
        shifts: byKey.shifts?.data || [],
        checklists: byKey.checklists?.data || [],
        time_off: timeOffRows.filter(row => row.status === 'approved'),
        time_off_pending: timeOffRows.filter(row => row.status === 'pending'),
        reference
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `barmanager-full-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      const restoredRows = RESTORE_SAFE_TABLES.reduce((sum, { key }) => sum + getBackupSection(data, key).length, 0)
      const warning = readErrors.length ? ` ${readErrors.length} optional/read-limited table(s) were skipped.` : ''
      showMsg(`Exported ${restoredRows} restore-safe rows.${warning}`, readErrors.length ? 'warning' : 'success', 7000)
    } catch (err) {
      console.error('Export error:', err)
      showMsg('Failed to export data.', 'error')
    }
  }

  const importData = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result)
        const supportedVersion = ['1.0', '2.0', '3.0'].includes(String(data.version))
        const hasRestoreData = RESTORE_SAFE_TABLES.some(({ key }) => hasRestoreSection(data, key))

        if (!supportedVersion || !hasRestoreData) {
          showMsg('Unknown or empty backup file. No data was changed.', 'error')
          return
        }

        const restoreCounts = Object.fromEntries(
          RESTORE_SAFE_TABLES.map(({ key }) => [key, getBackupSection(data, key).length])
        )
        const totalRows = Object.values(restoreCounts).reduce((sum, count) => sum + count, 0)
        const ignoredSections = ['reference', 'profiles', 'roles', 'user_roles', 'announcements']
          .filter(key => data[key] || data.reference?.[key])

        const confirmed = await confirmAction({
          title: 'Restore operational backup?',
          message: `This will replace Inventory, Shifts, Checklists, and Time Off with ${totalRows} row(s) from this backup.${ignoredSections.length ? '\n\nReference-only sections will not be restored: ' + ignoredSections.join(', ') + '.' : ''}`,
          confirmLabel: 'Restore',
          danger: true
        })
        if (!confirmed) return

        // The restore runs server-side in a single transaction (restore_operational_backup),
        // so a failure on any table rolls back the whole operation — the previous
        // delete-all-then-insert flow could leave tables empty. The RPC also handles
        // cross-user time-off rows that client-side inserts can't (RLS user_id check).
        const { data: counts, error } = await supabase.rpc('restore_operational_backup', { payload: data })
        if (error) throw error

        const importedRows = counts
          ? Object.values(counts).reduce((sum, count) => sum + (Number(count) || 0), 0)
          : 0
        const importedSections = counts
          ? Object.values(counts).filter(count => Number(count) > 0).length
          : 0

        showMsg(`Restored ${importedRows} row(s) across ${importedSections} operational section(s). Refresh to see all data.`, 'success', 7000)
      } catch (err) {
        console.error('Import error:', err)
        showMsg(`Failed to import data: ${err.message}`, 'error', 7000)
      }
    }
    reader.readAsText(file)
    fileRef.current.value = ''
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Export Full Backup</h2>
        <p className="text-gray-400 text-sm mb-4">
          Downloads restore-safe operational data plus any readable reference snapshots.
        </p>
        <button onClick={exportData} className="btn-primary w-full">
          Export Full Backup
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Restore Operational Data</h2>
        <p className="text-gray-400 text-sm mb-4">
          Upload a BarManager backup to replace Inventory, Shifts, Checklists, and Time Off. Reference-only data is skipped.
        </p>
        <input type="file" accept=".json" ref={fileRef} onChange={importData} className="hidden" />
        <button onClick={() => fileRef.current.click()} className="btn-secondary w-full">
          Import Backup
        </button>
      </div>

      {msg && (
        <div className={`card border ${msg.type === 'error' ? 'border-red-500 bg-red-500/20' : msg.type === 'warning' ? 'border-yellow-500 bg-yellow-500/20' : 'border-green-500 bg-green-500/20'}`}>
          <p className={msg.type === 'error' ? 'text-red-300' : msg.type === 'warning' ? 'text-yellow-200' : 'text-green-400'}>{msg.text}</p>
        </div>
      )}
    </div>
  )
}
