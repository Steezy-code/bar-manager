import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { TABLES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useNotifications } from '../components/Notifications'
import Modal from '../components/Modal'
import IconButton from '../components/IconButton'
import EmptyState from '../components/EmptyState'
import { SkeletonGrid } from '../components/Skeleton'
import { useAppRefresh } from '../hooks/usePullToRefresh'
import { CubeIcon, XMarkIcon, MinusIcon } from '@heroicons/react/24/outline'

const DEFAULT_CATEGORY = 'drinks'
const CSV_HEADERS = ['name', 'quantity', 'unit', 'threshold', 'category']
const emptyItem = { name: '', quantity: 0, unit: '', threshold: 5, category: DEFAULT_CATEGORY }

const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

const csvEscape = (value) => {
  const text = String(value ?? '')
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const downloadTextFile = (contents, filename, type = 'text/csv') => {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const parseCSV = (text) => {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++
      row.push(field)
      if (row.some(value => String(value).trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  row.push(field)
  if (row.some(value => String(value).trim() !== '')) rows.push(row)
  return rows
}

const parseInventoryNumber = (value, fallback, label, rowNumber) => {
  const raw = String(value ?? '').trim()
  if (!raw) return { value: fallback, error: null }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { value: fallback, error: `Row ${rowNumber}: ${label} must be 0 or higher, or blank.` }
  }

  return { value: parsed, error: null }
}

export default function Inventory() {
  const fileRef = useRef(null)
  const { user, profile } = useAuth()
  const { hasRole } = usePermissions()
  const { notify, confirmAction } = useNotifications()
  const canManageInventory = hasRole('manager')
  const [items, setItems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState(emptyItem)
  const [editingItem, setEditingItem] = useState(null)
  const [search, setSearch] = useState('')
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [categorySupported, setCategorySupported] = useState(false)
  const [importReport, setImportReport] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const categoryDetectedRef = useRef(false)

  const detectCategorySupport = useCallback(async () => {
    if (categoryDetectedRef.current) return categorySupported
    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .select('category')
        .limit(1)

      const supported = !error
      setCategorySupported(supported)
      categoryDetectedRef.current = true
      return supported
    } catch (err) {
      setCategorySupported(false)
      categoryDetectedRef.current = true
      return false
    }
  }, [categorySupported])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      await detectCategorySupport()
      const { data, error } = await supabase
        .from(TABLES.INVENTORY)
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching inventory:', err)
      notify('Failed to load inventory from database.', 'error')
    } finally {
      setLoading(false)
    }
  }, [detectCategorySupport, notify])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useAppRefresh(fetchItems)

  const update = async (id, delta) => {
    if (!canManageInventory || updatingId) return

    const item = items.find(i => i.id === id)
    if (!item) return

    const newQuantity = Math.max(0, Number(item.quantity || 0) + delta)
    setItems(current => current.map(i => i.id === id ? { ...i, quantity: newQuantity } : i))
    setUpdatingId(id)
    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .update({ quantity: newQuantity })
        .eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error updating quantity:', err)
      setItems(current => current.map(i => i.id === id ? { ...i, quantity: item.quantity } : i))
      notify('Failed to update quantity in database.', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const remove = async (id) => {
    if (!canManageInventory) return

    const item = items.find(i => i.id === id)
    const confirmed = await confirmAction({
      title: 'Remove inventory item?',
      message: `Remove ${item?.name || 'this item'} from inventory?`,
      confirmLabel: 'Remove',
      danger: true
    })
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .delete()
        .eq('id', id)
      if (error) throw error

      setItems(current => current.filter(i => i.id !== id))
      notify('Inventory item removed.', 'success')
    } catch (err) {
      console.error('Error removing item:', err)
      notify('Failed to remove item from database.', 'error')
    }
  }

  const add = async (e) => {
    e.preventDefault()
    if (!canManageInventory) return
    if (!user) {
      notify('You must be logged in to add an item.', 'error')
      return
    }

    const itemToInsert = {
      name: newItem.name.trim(),
      quantity: Number(newItem.quantity || 0),
      unit: newItem.unit.trim(),
      threshold: Number(newItem.threshold || 0),
      user_id: user.id,
      role: profile?.role || 'staff'
    }
    if (categorySupported) itemToInsert.category = newItem.category.trim() || DEFAULT_CATEGORY

    try {
      const { data, error } = await supabase
        .from(TABLES.INVENTORY)
        .insert([itemToInsert])
        .select('*')
      if (error) throw error

      setItems(current => [...current, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAdd(false)
      setNewItem(emptyItem)
      notify('Inventory item added.', 'success')
    } catch (err) {
      console.error('Error adding item:', err)
      notify('Failed to add item to database.', 'error')
    }
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editingItem || !canManageInventory) return

    const updates = {
      name: editingItem.name.trim(),
      quantity: Number(editingItem.quantity || 0),
      unit: editingItem.unit.trim(),
      threshold: Number(editingItem.threshold || 0)
    }
    if (categorySupported) updates.category = editingItem.category?.trim() || DEFAULT_CATEGORY

    try {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .update(updates)
        .eq('id', editingItem.id)
      if (error) throw error

      setItems(current => current.map(item => item.id === editingItem.id ? { ...item, ...updates } : item).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingItem(null)
      notify('Inventory item updated.', 'success')
    } catch (err) {
      console.error('Error editing item:', err)
      notify('Failed to update item in database.', 'error')
    }
  }

  const exportCSV = () => {
    if (!canManageInventory) return

    const rows = items.map(item => (
      CSV_HEADERS.map(header => {
        if (header === 'category' && !categorySupported) return ''
        return csvEscape(item[header] ?? '')
      }).join(',')
    ))

    const csv = `${CSV_HEADERS.join(',')}\n${rows.join('\n')}`
    downloadTextFile(csv, `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`)
    notify(`Exported ${items.length} inventory item(s).`, 'success')
  }

  const downloadTemplate = () => {
    if (!canManageInventory) return
    downloadTextFile(`${CSV_HEADERS.join(',')}\n`, 'inventory-import-template.csv')
    notify('Inventory CSV template downloaded.', 'success')
  }

  const buildImportPreview = (text) => {
    const rows = parseCSV(text)
    if (rows.length < 2) {
      return { errors: ['CSV file is empty or has no data rows.'], skipped: [], validRows: [], updates: [], additions: [] }
    }

    const headers = rows[0].map(header => String(header || '').trim().toLowerCase())
    const indexes = Object.fromEntries(CSV_HEADERS.map(header => [header, headers.indexOf(header)]))
    if (indexes.name === -1) {
      return { errors: ['CSV must include a name column.'], skipped: [], validRows: [], updates: [], additions: [] }
    }

    const errors = []
    const skipped = []
    const seenNames = new Map()
    const existingByName = new Map(items.map(item => [normalizeName(item.name), item]))
    const validRows = []

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 1
      const getValue = (key) => indexes[key] === -1 ? '' : row[indexes[key]]
      const hasAnyValue = row.some(value => String(value || '').trim() !== '')
      if (!hasAnyValue) continue

      const name = String(getValue('name') || '').trim()
      if (!name) {
        skipped.push(`Row ${rowNumber}: missing name.`)
        continue
      }

      const normalizedName = normalizeName(name)
      if (seenNames.has(normalizedName)) {
        errors.push(`Rows ${seenNames.get(normalizedName)} and ${rowNumber}: duplicate item name "${name}".`)
        continue
      }
      seenNames.set(normalizedName, rowNumber)

      const quantityResult = parseInventoryNumber(getValue('quantity'), 0, 'quantity', rowNumber)
      const thresholdResult = parseInventoryNumber(getValue('threshold'), 5, 'threshold', rowNumber)
      if (quantityResult.error) errors.push(quantityResult.error)
      if (thresholdResult.error) errors.push(thresholdResult.error)
      if (quantityResult.error || thresholdResult.error) continue

      const parsedRow = {
        rowNumber,
        name,
        normalizedName,
        quantity: quantityResult.value,
        unit: String(getValue('unit') || '').trim(),
        threshold: thresholdResult.value,
        category: String(getValue('category') || '').trim() || DEFAULT_CATEGORY,
        existingItem: existingByName.get(normalizedName) || null
      }
      validRows.push(parsedRow)
    }

    return {
      errors,
      skipped,
      validRows,
      updates: validRows.filter(row => row.existingItem),
      additions: validRows.filter(row => !row.existingItem)
    }
  }

  const applyImportPreview = async (preview) => {
    const updates = preview.updates.map(row => {
      const changes = {
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        threshold: row.threshold
      }
      if (categorySupported) changes.category = row.category

      return supabase
        .from(TABLES.INVENTORY)
        .update(changes)
        .eq('id', row.existingItem.id)
    })

    const additions = preview.additions.map(row => {
      const itemToInsert = {
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        threshold: row.threshold,
        user_id: user?.id,
        role: profile?.role || 'staff'
      }
      if (categorySupported) itemToInsert.category = row.category
      return itemToInsert
    })

    const updateResults = await Promise.all(updates)
    const updateError = updateResults.find(result => result.error)?.error
    if (updateError) throw updateError

    if (additions.length > 0) {
      const { error } = await supabase
        .from(TABLES.INVENTORY)
        .insert(additions)
      if (error) throw error
    }

    await fetchItems()
  }

  const importCSV = async (e) => {
    const file = e.target.files[0]
    if (!file || !canManageInventory) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const preview = buildImportPreview(event.target.result)
        if (preview.errors.length > 0) {
          setImportReport({
            type: 'error',
            title: 'CSV import needs fixes',
            lines: preview.errors.slice(0, 8)
          })
          notify('CSV import has errors. No inventory was changed.', 'error')
          return
        }

        if (preview.validRows.length === 0) {
          setImportReport({
            type: 'error',
            title: 'No importable rows found',
            lines: preview.skipped.length ? preview.skipped.slice(0, 8) : ['Add at least one row with an item name.']
          })
          notify('No importable inventory rows found.', 'error')
          return
        }

        const categoryNote = categorySupported
          ? ''
          : '\n\nCategory is included in the CSV, but this database does not expose a category column. Category values will be ignored.'
        const skippedNote = preview.skipped.length
          ? `\n\nSkipped row(s):\n${preview.skipped.slice(0, 5).join('\n')}${preview.skipped.length > 5 ? `\n...and ${preview.skipped.length - 5} more.` : ''}`
          : ''

        const confirmed = await confirmAction({
          title: 'Import inventory CSV?',
          message: `${preview.updates.length} item(s) will be updated.\n${preview.additions.length} item(s) will be added.${skippedNote}${categoryNote}`,
          confirmLabel: 'Import',
          danger: false
        })
        if (!confirmed) return

        await applyImportPreview(preview)
        setImportReport({
          type: 'success',
          title: 'CSV import complete',
          lines: [
            `${preview.updates.length} item(s) updated.`,
            `${preview.additions.length} item(s) added.`,
            `${preview.skipped.length} row(s) skipped.`,
            ...(categorySupported ? [] : ['Category values were ignored because this database does not expose a category column.'])
          ]
        })
        notify('Inventory CSV imported.', 'success')
      } catch (err) {
        console.error('Inventory CSV import error:', err)
        setImportReport({
          type: 'error',
          title: 'CSV import failed',
          lines: [err.message || 'The inventory import could not be completed.']
        })
        notify('Failed to import inventory CSV.', 'error')
      }
    }

    reader.readAsText(file)
    fileRef.current.value = ''
  }

  const categories = useMemo(
    () => [...new Set(items.map(i => i.category).filter(Boolean))].sort(),
    [items]
  )

  const highlight = (text, query) => {
    if (!query) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return <>{text.slice(0, idx)}<mark className="bg-yellow-300/30 text-white rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>
  }

  const lowItems = items.filter(i => Number(i.quantity || 0) <= Number(i.threshold || 5))
  const filteredItems = items.filter(item => {
    const haystack = `${item.name || ''} ${item.unit || ''} ${item.category || ''}`.toLowerCase()
    const matchesSearch = haystack.includes(search.trim().toLowerCase())
    const matchesLow = !showLowOnly || Number(item.quantity || 0) <= Number(item.threshold || 5)
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesLow && matchesCategory
  })

  if (!canManageInventory) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-400">Only managers and admins can access inventory.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-400">Loading…</p>
        </div>
        <SkeletonGrid count={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-400">{items.length} items</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="w-5 h-5" /> Add</button>
          <button onClick={() => fileRef.current.click()} className="btn-secondary"><ArrowUpTrayIcon className="w-5 h-5" /> Import CSV</button>
          <button onClick={exportCSV} className="btn-secondary"><ArrowDownTrayIcon className="w-5 h-5" /> Export CSV</button>
          <button onClick={downloadTemplate} className="btn-secondary"><DocumentArrowDownIcon className="w-5 h-5" /> Template</button>
        </div>
      </div>

      <input type="file" accept=".csv,text/csv" ref={fileRef} onChange={importCSV} className="hidden" />

      {!categorySupported && (
        <div className="card border-yellow-500 bg-yellow-500/10 text-sm text-yellow-100">
          Category can be included in CSV files, but this database does not expose a category column. Imports and exports will continue without changing category values.
        </div>
      )}

      {importReport && (
        <div className={`card border ${importReport.type === 'error' ? 'border-red-500 bg-red-500/20' : 'border-green-500 bg-green-500/20'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={importReport.type === 'error' ? 'font-bold text-red-300' : 'font-bold text-green-300'}>{importReport.title}</h2>
              <ul className="mt-2 space-y-1 text-sm text-gray-200">
                {importReport.lines.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}
              </ul>
            </div>
            <IconButton icon={XMarkIcon} label="Dismiss import report" onClick={() => setImportReport(null)} className="-mr-2 -mt-2" />
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="input md:flex-1"
            placeholder="Search inventory..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCategoryFilter('all') }}
          />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              className="rounded"
              checked={showLowOnly}
              onChange={e => setShowLowOnly(e.target.checked)}
            />
            Low stock only
          </label>
        </div>
      </div>

      {categorySupported && categories.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-none">
          {['all', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`shrink-0 snap-start min-h-touch rounded-lg px-4 font-medium capitalize transition active:scale-[0.97] ${categoryFilter === cat ? 'bg-bar-accent font-semibold text-white' : 'bg-bar-card text-gray-300 hover:bg-bar-blue'}`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      )}

      {lowItems.length > 0 && (
        <div className="card border border-red-500 bg-red-500/20">
          <div className="mb-2 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <h3 className="font-bold text-red-400">Low Stock ({lowItems.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowItems.map(i => (
              <span key={i.id} className="rounded bg-red-600 px-2 py-1 text-sm">{i.name}: {i.quantity} left</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map(i => {
          const isLow = Number(i.quantity || 0) <= Number(i.threshold || 5)
          return (
            <div key={i.id} className={`card ${isLow ? 'border-red-500' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{highlight(i.name, search.trim())}</h3>
                  {categorySupported && i.category && <p className="text-xs text-gray-400">{i.category}</p>}
                  {isLow && <p className="text-xs text-red-400">Low stock (min: {i.threshold})</p>}
                </div>
                <div className="flex gap-1">
                  <IconButton icon={PencilSquareIcon} label={`Edit ${i.name}`} onClick={() => setEditingItem({ ...i, category: i.category || DEFAULT_CATEGORY })} />
                  <IconButton icon={TrashIcon} label={`Remove ${i.name}`} tone="danger" onClick={() => remove(i.id)} />
                </div>
              </div>
              <div className="mt-3 flex items-center">
                <button onClick={() => update(i.id, -1)} disabled={updatingId === i.id} className="flex h-11 w-11 items-center justify-center rounded-lg bg-bar-blue active:scale-90 disabled:opacity-50" aria-label={`Decrease ${i.name}`}><MinusIcon className="h-5 w-5" /></button>
                <span className="mx-4 text-lg font-bold tabular-nums">{i.quantity}</span>
                <button onClick={() => update(i.id, 1)} disabled={updatingId === i.id} className="flex h-11 w-11 items-center justify-center rounded-lg bg-bar-blue active:scale-90 disabled:opacity-50" aria-label={`Increase ${i.name}`}><PlusIcon className="h-5 w-5" /></button>
                <span className="ml-3 text-sm text-gray-400">{i.unit}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filteredItems.length === 0 && (
        <EmptyState
          icon={CubeIcon}
          title="No items to show"
          message={items.length === 0 ? 'Add your first inventory item to get started.' : 'No inventory items match those filters.'}
          action={items.length === 0 ? <button onClick={() => setShowAdd(true)} className="btn-primary"><PlusIcon className="h-5 w-5" /> Add item</button> : null}
        />
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Item">
        <form onSubmit={add} className="space-y-3">
          <input placeholder="Name" className="input" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required />
          {categorySupported && (
            <input placeholder="Category" className="input" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} />
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input type="number" min="0" placeholder="Qty" className="input" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} required />
            <input placeholder="Unit" className="input" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} required />
          </div>
          <div>
            <label className="field-label">Low stock alert when qty is at or below</label>
            <input type="number" min="0" className="input" value={newItem.threshold} onChange={e => setNewItem({ ...newItem, threshold: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
            <button className="btn-primary flex-1">Add</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Item">
        {editingItem && (
          <form onSubmit={saveEdit} className="space-y-3">
            <input placeholder="Name" className="input" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} required />
            {categorySupported && (
              <input placeholder="Category" className="input" value={editingItem.category || DEFAULT_CATEGORY} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })} />
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input type="number" min="0" placeholder="Qty" className="input" value={editingItem.quantity} onChange={e => setEditingItem({ ...editingItem, quantity: e.target.value })} required />
              <input placeholder="Unit" className="input" value={editingItem.unit || ''} onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })} required />
            </div>
            <div>
              <label className="field-label">Low stock alert when qty is at or below</label>
              <input type="number" min="0" className="input" value={editingItem.threshold} onChange={e => setEditingItem({ ...editingItem, threshold: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditingItem(null)} className="btn-secondary flex-1">Cancel</button>
              <button className="btn-primary flex-1">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
