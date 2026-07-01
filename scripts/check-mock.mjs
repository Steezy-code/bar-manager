// Self-check for the demo Supabase mock query builder. Run: node scripts/check-mock.mjs
import assert from 'node:assert/strict'
import { createDemoClient } from '../src/lib/supabaseMock.js'

const db = createDemoClient({ widgets: [] })

// insert -> returns rows with ids
const ins = await db.from('widgets').insert([{ name: 'a', n: 1 }, { name: 'b', n: 2 }]).select('*')
assert.equal(ins.error, null)
assert.equal(ins.data.length, 2)
assert.ok(ins.data[0].id, 'insert assigns an id')

// select + eq filter
const eqRes = await db.from('widgets').select('*').eq('name', 'b')
assert.equal(eqRes.data.length, 1)
assert.equal(eqRes.data[0].n, 2)

// count + head returns count, no rows
const cnt = await db.from('widgets').select('id', { count: 'exact', head: true })
assert.equal(cnt.data, null)
assert.equal(cnt.count, 2)

// order + limit
await db.from('widgets').insert({ name: 'c', n: 3 })
const ordered = await db.from('widgets').select('*').order('n', { ascending: false }).limit(1)
assert.equal(ordered.data[0].n, 3)

// maybeSingle empty -> null (no error); single empty -> PGRST116
assert.equal((await db.from('widgets').select('*').eq('name', 'zzz').maybeSingle()).data, null)
assert.equal((await db.from('widgets').select('*').eq('name', 'zzz').single()).error.code, 'PGRST116')

// update mutates
await db.from('widgets').update({ n: 99 }).eq('name', 'a')
assert.equal((await db.from('widgets').select('*').eq('name', 'a').single()).data.n, 99)

// delete removes
await db.from('widgets').delete().eq('name', 'a')
assert.equal((await db.from('widgets').select('*').eq('name', 'a')).data.length, 0)

// auth hands out an approved-admin session
assert.equal((await db.auth.getSession()).data.session.user.id, 'demo-admin')

// rpc reports payload counts
const rpc = await db.rpc('restore_operational_backup', { payload: { shifts: [1, 2], inventory: [1] } })
assert.equal(rpc.data.shifts, 2)
assert.equal(rpc.data.inventory, 1)

console.log('mock self-check: OK')
