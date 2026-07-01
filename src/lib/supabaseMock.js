// In-memory stand-in for the Supabase client, used to run BarManager as a live,
// backend-free portfolio demo. It implements only the client surface the app actually
// calls (auth + a chainable/thenable query builder + one rpc), backed by plain arrays
// seeded from demoData.
//
// ponytail: in-memory only, resets on reload; not a general supabase-js shim — just the
// methods this app uses. No new dependency.

import { demoData } from './demoData.js'

let idCounter = 1
const genId = () => globalThis.crypto?.randomUUID?.() || `demo-${idCounter++}`

// One demo user, always signed in as an approved admin so every route guard passes and
// admin/manager-only nav is visible. Its id matches a seeded profiles row.
const DEMO_USER = {
  id: 'demo-admin',
  email: 'demo@barmanager.app',
  user_metadata: { full_name: 'Demo Admin' },
}
const DEMO_SESSION = { user: DEMO_USER }

class Query {
  constructor(store, table) {
    this.store = store
    this.table = table
    this.filters = []
    this._order = null
    this._limit = null
    this._single = null // 'single' | 'maybe'
    this._count = null
    this._head = false
    this._op = 'select'
    this._payload = null
  }

  select(_cols, opts = {}) {
    if (opts.count) this._count = opts.count
    if (opts.head) this._head = true
    return this
  }
  insert(rows) { this._op = 'insert'; this._payload = Array.isArray(rows) ? rows : [rows]; return this }
  update(obj) { this._op = 'update'; this._payload = obj; return this }
  delete() { this._op = 'delete'; return this }

  eq(c, v) { this.filters.push(r => r[c] === v); return this }
  neq(c, v) { this.filters.push(r => r[c] !== v); return this }
  gte(c, v) { this.filters.push(r => r[c] >= v); return this }
  lte(c, v) { this.filters.push(r => r[c] <= v); return this }
  in(c, vals) { this.filters.push(r => vals.includes(r[c])); return this }
  order(c, opts = {}) { this._order = { c, asc: opts.ascending !== false }; return this }
  limit(n) { this._limit = n; return this }
  single() { this._single = 'single'; return this }
  maybeSingle() { this._single = 'maybe'; return this }

  _match(rows) { return rows.filter(r => this.filters.every(f => f(r))) }

  _run() {
    const rows = this.store[this.table] || (this.store[this.table] = [])
    try {
      if (this._op === 'insert') {
        const inserted = this._payload.map(r => ({ id: genId(), ...r }))
        rows.push(...inserted)
        return { data: inserted, error: null }
      }
      if (this._op === 'update') {
        const matched = this._match(rows)
        matched.forEach(r => Object.assign(r, this._payload))
        return { data: matched, error: null }
      }
      if (this._op === 'delete') {
        const doomed = new Set(this._match(rows))
        this.store[this.table] = rows.filter(r => !doomed.has(r))
        return { data: null, error: null }
      }
      // select
      let out = this._match(rows)
      if (this._order) {
        const { c, asc } = this._order
        out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0))
        if (!asc) out.reverse()
      }
      const count = out.length
      if (this._limit != null) out = out.slice(0, this._limit)
      if (this._single === 'single') {
        return out.length
          ? { data: out[0], error: null }
          : { data: null, error: { code: 'PGRST116', message: 'No rows found' } }
      }
      if (this._single === 'maybe') return { data: out[0] ?? null, error: null, count }
      if (this._head) return { data: null, error: null, count }
      return { data: out, error: null, count }
    } catch (e) {
      return { data: null, error: { message: String(e?.message || e) } }
    }
  }

  // Thenable: `await query` (and Promise.all([...queries])) resolves the result.
  then(onFulfilled, onRejected) {
    return Promise.resolve(this._run()).then(onFulfilled, onRejected)
  }
}

export const createDemoClient = (seed = demoData) => {
  const store = JSON.parse(JSON.stringify(seed))
  return {
    auth: {
      getSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
      onAuthStateChange: (cb) => {
        Promise.resolve().then(() => cb('SIGNED_IN', DEMO_SESSION))
        return { data: { subscription: { unsubscribe() {} } } }
      },
      signInWithPassword: async () => ({ data: { session: DEMO_SESSION, user: DEMO_USER }, error: null }),
      signUp: async () => ({ data: { user: DEMO_USER }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (table) => new Query(store, table),
    rpc: async (name, params) => {
      if (name === 'restore_operational_backup') {
        const p = params?.payload || {}
        return {
          data: {
            inventory: (p.inventory || []).length,
            shifts: (p.shifts || []).length,
            checklists: (p.checklists || []).length,
            time_off: (p.time_off || []).length + (p.time_off_pending || []).length,
          },
          error: null,
        }
      }
      return { data: null, error: null }
    },
  }
}

export const demoClient = createDemoClient()
