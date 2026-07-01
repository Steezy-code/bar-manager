// Seed data for the backend-free demo. Realistic enough that every screen looks alive:
// low-stock alerts fire, today has shifts, time-off badges show, checklists have progress.
// Dates are built for the *current* month so the calendar always lands on something.

const now = new Date()
const Y = now.getFullYear()
const M = now.getMonth() // 0-indexed (matches the app's convention)
const today = now.getDate()
const dim = new Date(Y, M + 1, 0).getDate()
const clampDay = (d) => Math.max(1, Math.min(d, dim))
const dateStr = (day) => `${Y}-${String(M + 1).padStart(2, '0')}-${String(clampDay(day)).padStart(2, '0')}`
const iso = (day) => `${dateStr(day)}T12:00:00.000Z`

const profiles = [
  { id: 'demo-admin', email: 'demo@barmanager.app', full_name: 'Demo Admin', role: 'admin', status: 'approved', created_at: iso(1) },
  { id: 'p-morgan', email: 'morgan@barmanager.app', full_name: 'Morgan Reyes', role: 'manager', status: 'approved', created_at: iso(1) },
  { id: 'p-sam', email: 'sam@barmanager.app', full_name: 'Sam Ihara', role: 'staff', status: 'approved', created_at: iso(2) },
  { id: 'p-alex', email: 'alex@barmanager.app', full_name: 'Alex Novak', role: 'staff', status: 'approved', created_at: iso(2) },
  { id: 'p-jordan', email: 'jordan@barmanager.app', full_name: 'Jordan Cole', role: 'viewer', status: 'approved', created_at: iso(3) },
  { id: 'p-pat', email: 'pat@barmanager.app', full_name: 'Pat Quinn', role: 'staff', status: 'pending', created_at: iso(4) },
]

// A shift on a given day for a staffer. Two "today" shifts so the dashboard shows them.
const shift = (id, name, day, start, end, role) => ({
  id, staff_name: name, date: dateStr(day), start_time: start, end_time: end, role, user_id: 'p-morgan', created_at: iso(day),
})

const shifts = [
  shift('s1', 'Morgan Reyes', today, '10:00', '18:00', 'manager'),
  shift('s2', 'Sam Ihara', today, '16:00', '23:00', 'bartender'),
  shift('s3', 'Alex Novak', today, '17:00', '23:30', 'server'),
  shift('s4', 'Sam Ihara', clampDay(today + 1), '16:00', '23:00', 'bartender'),
  shift('s5', 'Alex Novak', clampDay(today + 2), '11:00', '19:00', 'server'),
  shift('s6', 'Morgan Reyes', clampDay(today - 1), '10:00', '18:00', 'manager'),
  shift('s7', 'Sam Ihara', clampDay(today + 3), '16:00', '23:00', 'cook'),
  shift('s8', 'Alex Novak', clampDay(today - 2), '17:00', '23:30', 'server'),
]

const inventory_items = [
  { id: 'i1', name: 'Well Vodka', quantity: 3, unit: 'bottles', threshold: 6, category: 'spirits', user_id: 'demo-admin', role: 'admin' },
  { id: 'i2', name: 'Draft IPA Keg', quantity: 1, unit: 'kegs', threshold: 2, category: 'beer', user_id: 'demo-admin', role: 'admin' },
  { id: 'i3', name: 'Lime', quantity: 40, unit: 'each', threshold: 20, category: 'produce', user_id: 'demo-admin', role: 'admin' },
  { id: 'i4', name: 'House Red', quantity: 8, unit: 'bottles', threshold: 6, category: 'wine', user_id: 'demo-admin', role: 'admin' },
  { id: 'i5', name: 'Cocktail Napkins', quantity: 2, unit: 'packs', threshold: 5, category: 'supplies', user_id: 'demo-admin', role: 'admin' },
  { id: 'i6', name: 'Simple Syrup', quantity: 12, unit: 'liters', threshold: 4, category: 'mixers', user_id: 'demo-admin', role: 'admin' },
  { id: 'i7', name: 'Tonic Water', quantity: 24, unit: 'bottles', threshold: 12, category: 'mixers', user_id: 'demo-admin', role: 'admin' },
  { id: 'i8', name: 'Bar Straws', quantity: 5, unit: 'boxes', threshold: 5, category: 'supplies', user_id: 'demo-admin', role: 'admin' },
]

const checklists = [
  {
    id: 'c-main',
    team_id: 'main',
    user_id: 'demo-admin',
    name: 'Team Checklists',
    date: dateStr(today),
    created_at: iso(today),
    tasks: {
      opening: [
        { id: 1, t: 'Check walk-in temps', c: true, completed_by: 'p-sam', completed_at: iso(today) },
        { id: 2, t: 'Count drawer cash', c: true, completed_by: 'p-morgan', completed_at: iso(today) },
        { id: 3, t: 'Stock condiments', c: false },
        { id: 4, t: 'Wipe down bar & rail', c: false },
      ],
      closing: [
        { id: 5, t: 'Close out register', c: false },
        { id: 6, t: 'Check doors secured', c: false },
        { id: 7, t: 'Log waste sheet', c: false },
      ],
      prep: [
        { id: 8, t: 'Cut garnishes', c: true, completed_by: 'p-alex', completed_at: iso(today) },
        { id: 9, t: 'Batch house margarita mix', c: false },
      ],
    },
  },
]

const time_off_requests = [
  { id: 't1', name: 'Alex Novak', dates: `${clampDay(today + 5)}-${clampDay(today + 6)}`, days: `${clampDay(today + 5)},${clampDay(today + 6)}`, status: 'pending', month: M, year: Y, user_id: 'p-alex', created_at: iso(today) },
  { id: 't2', name: 'Sam Ihara', dates: `${clampDay(today + 9)}`, days: `${clampDay(today + 9)}`, status: 'pending', month: M, year: Y, user_id: 'p-sam', created_at: iso(today) },
  { id: 't3', name: 'Jordan Cole', dates: `${clampDay(today + 12)}-${clampDay(today + 14)}`, days: `${clampDay(today + 12)}-${clampDay(today + 14)}`, status: 'approved', month: M, year: Y, user_id: 'p-jordan', created_at: iso(today) },
]

export const demoData = {
  profiles,
  shifts,
  inventory_items,
  checklists,
  time_off_requests,
  announcements: [],
  roles: [],
  user_roles: [],
}
