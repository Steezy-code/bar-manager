# BarManager — Bug Hunt Findings

> **Resolution status (updated after fixes).** Findings #1–14, #17, #19, #20, #23, #25 and the
> App.jsx whitespace nit have been fixed across six commits. The two SQL migrations
> (`20260612000000_require_approved_status`, `20260612000100_restore_backup_rpc`) are committed
> but **must still be applied to the live Supabase DB**. Left intentionally unfixed (low risk /
> scope): #16 (team-row race — needs a partial unique index), #21 (1-indexed month heuristic kept
> as defensive; #11 made convention-safe instead), #22 (mixed id types — no real collision),
> #24 (Schedule modals don't lock scroll — cosmetic). Original report preserved below.

Read-only audit (original). Each finding lists file:line, severity, the problem, why it's a bug,
and a proposed fix.

Severity scale: **critical** (data loss / auth bypass affecting everyone) ·
**high** (real security/data bug, plausible trigger) · **medium** (breaks under realistic
conditions or partial data loss) · **low** (edge case, polish, drift).

Note on scope: RLS lives in `supabase/migrations/`. Where the client UI gates an action but
the database does not (or vice-versa), that mismatch is itself a finding — the live DB is the
real enforcement boundary.

---

## Severity-sorted summary

| # | Sev | Category | File | One-liner |
|---|-----|----------|------|-----------|
| 1 | **high** | Auth/RBAC | App.jsx:49-55 | `removed` users fall through route guards and keep app access |
| 2 | **high** | Auth/RBAC | RLS migrations + Admin.jsx:167 | RLS authorizes by role only, never `status`; removed/rejected managers keep DB write |
| 3 | **high** | Data integrity | Settings.jsx:145-161 | Restore deletes all 4 tables then inserts — non-atomic, insert failure wipes data |
| 4 | **high** | Data integrity | Schedule.jsx:516-527 | Build Month deletes the month then inserts — insert failure wipes the month |
| 5 | **medium** | Edge cases | Schedule.jsx:802-861 | CSV import uses naive `split(',')` — breaks on quoted fields / commas in names / CRLF |
| 6 | **medium** | Edge cases | Schedule.jsx:85,850 | `parseDay` clamps to 31 → invalid dates (e.g. `2026-02-31`) → insert rejected |
| 7 | **medium** | Config/PWA | vite.config.js:33-44 | Supabase `NetworkFirst` cache is not auth-aware and not cleared on logout |
| 8 | **medium** | State/Auth | AuthContext.jsx:52-56 | Profile never refetched on role/status change for same user → stale role until reload |
| 9 | **medium** | Data integrity | Inventory.jsx:388-397 | CSV import updates-then-inserts non-atomically; partial failure leaves half-applied |
| 10 | **medium** | Time-off index | Schedule.jsx:684-687 | `clearAll` deletes time-off by 0-indexed month, bypassing the 1-indexed heuristic other paths use |
| 11 | **medium** | RBAC/UI | Checklists.jsx:169 | Viewers (read-only role) can toggle/complete team checklist tasks |
| 12 | low | Auth | App.jsx:33-34 | `useAuth()` called twice (redundant) |
| 13 | low | Cosmetic | App.jsx:96 | Mangled JSX whitespace on settings route (known) |
| 14 | low | Edge cases | Schedule.jsx:709-723 | `exportCSV` doesn't escape commas/quotes → round-trip breaks |
| 15 | low | Time-off | Schedule.jsx:231,648,959 | `days` parsing ignores ranges (`15-17` → only day 15 flagged) |
| 16 | low | Race | Checklists.jsx:96-108 | Concurrent first-load can create duplicate `team_id='main'` rows |
| 17 | low | Matching | Dashboard.jsx:200 | Bidirectional `includes()` name match → "Al" matches "Alex" |
| 18 | low | Matching | Schedule.jsx:328,380 | Builder maps staffId by exact `full_name`, not `normalizeName` |
| 19 | low | Hooks | usePullToRefresh.js:68 | Effect re-subscribes on every `distance` change (listener churn) |
| 20 | low | Config | .netlify/secret-scan-ignore:15 | `^.*https://.*\.supabase\.co.*$` masks any real Supabase URL, not just placeholders |
| 21 | low | Drift | TimeOff.jsx:48,104 | Dual 0/1-indexed month heuristic is dead complexity under the applied migration |
| 22 | low | Keys | Checklists.jsx:13-15,204 | Mixed id types (numeric defaults vs UUID strings) — fragile if coerced |
| 23 | low | Perf | Inventory.jsx:114-154 | Category detection triggers one redundant refetch |
| 24 | low | UX | Schedule.jsx modals | Hand-rolled modals don't lock body scroll / no Escape (inconsistent with `Modal`) |
| 25 | low | Docs drift | lib/supabase.js:9-18 | CLAUDE.md "incomplete TABLES" note is stale — all tables are present |

---

## Auth / RBAC / route guards

### 1. `removed` users retain full app access — **high**
`App.jsx:49-55`, `usePermissions.js:36-37`

```js
if (isPending)  return <Navigate to="/pending-approval" replace />;
if (isRejected) return <Navigate to="/pending-approval" replace />;
```
`usePermissions` exposes `isPending` (`status==='pending'`) and `isRejected`
(`status==='rejected'`) but **no `isRemoved`**. Admin's "Remove user" sets
`status='removed'` (`Admin.jsx:167-169`, migration `20260421040000`). A removed user is
neither pending nor rejected, so `ProtectedRoute` renders the children. They lose `hasRole`
(which requires `status==='approved'`), so manager/admin routes redirect — but the
**un-guarded routes (`/`, `/schedule`, `/checklists`, `/timeoff`) still render**. An admin
"removing" a user does not actually lock them out of the app.

**Why a bug:** Soft-delete is advertised as access revocation; it isn't. A removed user keeps
reading the schedule, team checklists, and time-off, and (see #11) toggling checklist tasks.

**Fix:** Add `isRemoved` to `usePermissions` and redirect removed users (and any
non-approved status) to `/pending-approval` in `ProtectedRoute`. Simplest robust form: replace
the two checks with `if (!isApproved) return <Navigate to="/pending-approval" replace />;`
and have `PendingApproval` render a "removed" message. Verify `PendingApproval.jsx:33-46`
copy covers the removed case (currently only handles rejected vs pending).

### 2. RLS gates on role but never on `status` — **high**
`supabase/migrations/20260408122000_add_rls_shifts.sql:14-37`,
`...122100_add_rls_inventory.sql:14-32`, `Admin.jsx:167`

Every write policy is of the form:
```sql
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin','manager'))
```
No policy checks `status='approved'`. `Admin.removeUser` only flips `status` to `removed`; it
**does not downgrade `role`**. So a removed (or rejected, or never-approved-but-role-elevated)
**manager/admin keeps full insert/update/delete at the database level**, independent of the
client UI. Combined with #1 and #8, a removed manager can keep operating until something
external revokes their JWT.

**Why a bug:** The DB is the real trust boundary; it trusts a stale role on a disabled
account.

**Fix (new dated migration — do not edit applied ones):** add
`AND profiles.status = 'approved'` to every write policy's `EXISTS` (shifts, inventory,
checklists team policies). Consider also having `removeUser` set `role='viewer'` alongside
`status='removed'` as defense-in-depth. The read policies (`auth.role()='authenticated'`) are
arguably fine to leave, but tightening reads to approved users only would also close the
removed-user-reads-data gap.

### 3. ProtectedRoute calls `useAuth()` twice — **low**
`App.jsx:33-34`
```js
const { user, loading } = useAuth();
const { profile } = useAuth();
```
Harmless (same context object) but redundant and confusing. **Fix:** one destructure.

### Notes on what's actually fine here
- `hasRole` correctly requires `isApproved` (`usePermissions.js:20-23`), so the admin route
  uses `hasRole('admin')` not `hasExactRole` — that's correct (admins also satisfy manager
  routes). `hasExactRole`/`hasAnyRole` are currently unused.
- Nav filtering (`Layout.jsx:70-83`) and route guards (`App.jsx`) agree: inventory & settings
  require manager, admin requires admin, the rest are open to approved users. In sync.
- Pending users get `role='viewer'` by trigger (`20260404060702`), so a *pending* account has
  no elevated role to abuse — the status-less RLS risk (#2) is specifically about
  *previously-approved* accounts later disabled.

---

## Supabase data layer

### 4. Settings restore is destructive and non-atomic — **high**
`Settings.jsx:145-161`
```js
const clearResults = await Promise.all(RESTORE_SAFE_TABLES.map(({ table }) =>
  supabase.from(table).delete().neq('id', EMPTY_UUID)))   // wipes inventory, shifts, checklists, time_off
...
for (const { key, table } of RESTORE_SAFE_TABLES) {
  const { error } = await supabase.from(table).insert(rows)
  if (error) throw error                                  // first failure aborts the loop
}
```
All four operational tables are deleted **first**, then re-inserted sequentially. If any insert
fails (RLS rejects a row's `user_id`, a column from the backup no longer exists, a
checklists/time_off constraint, an oversized JSON, a transient network error), the loop throws
and the remaining sections are never re-inserted — **permanent data loss across up to all four
tables**. There is no transaction and no rollback.

**Why a bug:** A restore is supposed to be safe; here a single bad row turns it into a wipe.

**Fix options (pick per appetite):**
- Best: move the delete+insert into a Postgres RPC (`SECURITY DEFINER`) that runs in one
  transaction. Restore becomes all-or-nothing.
- Interim client-side: insert into temp/staging first, or insert *before* delete where schema
  allows; at minimum, do per-table delete-then-insert (so a failure only loses one table, and
  abort before touching the others), and validate the backup shape (column allow-list) before
  any delete. Strip server-managed columns (`id`/`created_at`) or upsert by id.

### 5. Schedule "Build Month" deletes then inserts — **high**
`Schedule.jsx:516-527`

Same pattern as #4, scoped to one month:
```js
await supabase.from(TABLES.SHIFTS).delete().gte('date',startDate).lte('date',endDate)
await supabase.from(TABLES.SHIFTS).insert(shiftsToInsert)   // if this throws, month is gone
```
Insert failure (e.g. an invalid date from #6, or RLS) leaves the month's shifts deleted with
nothing inserted. `clearAll` (`:671-700`) has the same shape but is intentionally destructive
so it's acceptable there.

**Fix:** Wrap delete+insert in an RPC transaction, or insert first and delete the *old* rows by
id afterward. At minimum validate every `date` before deleting (see #6).

### 6. Inventory CSV import is non-atomic — **medium**
`Inventory.jsx:388-397`

`applyImportPreview` runs all updates via `Promise.all`, throws on the first update error, then
does the inserts. A mid-batch failure leaves some updates applied and the inserts skipped —
inconsistent but **not destructive** (no deletes), so lower severity than #4/#5. Acceptable to
leave, or wrap in an RPC for consistency. Worth a user-facing "partially applied" message.

### 7. String-literal table names / TABLES drift — **low (resolved) / docs**
`lib/supabase.js:9-18`

`TABLES` now includes `ANNOUNCEMENTS`, `ROLES`, `USER_ROLES`. A scan of `src/` finds **no**
remaining string-literal table names — every `.from()` uses a `TABLES.*` constant. The
CLAUDE.md "TABLES const is incomplete" known-issue is **stale**; update the doc. (`'main'` and
`'team_id'` literals in Checklists are column values, not table names — fine.)

### 8. Profile not refetched on role/status change — **medium**
`AuthContext.jsx:49-62`
```js
if (user.id !== lastFetchedUserIdRef.current) { ...fetchProfile(user.id) }
```
`onAuthStateChange` only refetches the profile when the **user id changes**. A
`TOKEN_REFRESHED` event (same id) skips it. So when an admin changes someone's role or status,
that user's `profile` in context stays stale until a full reload. This directly weakens #1/#2:
a just-removed user keeps their approved session live.

**Fix:** refetch the profile on `SIGNED_IN`/`TOKEN_REFRESHED` too (or poll/subscribe to the
`profiles` row via Supabase realtime). At minimum refetch on tab focus.

### Checklists team-mode fallback — **verified mostly OK, with caveats**
`Checklists.jsx:34-116`

I traced every branch against the migration chain:
- The `team_id`-missing fallback (`error.message.includes('team_id')`, `:52`) requires
  Supabase to surface that string in the error — plausible (`42703 column ... does not exist`).
  Under the applied schema (`20260409230000` adds `team_id`) this branch is **dead**, but
  harmless.
- The team query uses `.maybeSingle()`, which returns `{data:null,error:null}` for zero rows —
  it never yields `PGRST116`. So the `error.code !== 'PGRST116'` comment/branch (`:84`) is
  misleading but not harmful: null data correctly falls through to the "create team checklist"
  path.
- **Team read works for all roles** because `20260409230000` replaces the per-user RLS with
  `team_id='main' AND authenticated` SELECT/INSERT/UPDATE policies, and the migration
  pre-seeds one `main` row. (An earlier read of only `...122200` suggested non-creators
  couldn't read the team row — the later migration fixes that. No bug.)
- **Caveat (race, low — #16):** if the seeded row is ever absent, two users loading
  simultaneously both insert `team_id='main'` with different `user_id`, which satisfies
  `UNIQUE(team_id,user_id)` → duplicate team rows. `save().eq('team_id','main')` then updates
  *all* of them and `limit(1)` reads the newest. Self-healing-ish but messy.

---

## Schedule.jsx — dates, conflicts, destructive ops

### 9. Naive CSV parsing — **medium**
`Schedule.jsx:802-861`

Unlike Inventory's RFC-style `parseCSV`, Schedule uses
`text.split('\n').filter(...).split(',')`:
- Commas inside a quoted name (`"Smith, John"`) shift every column.
- `\r` from CRLF files survives into the last field (`year`); `parseInt` tolerates it but
  `role`/text fields would keep the `\r`.
- No quote handling at all.

**Fix:** reuse Inventory's `parseCSV` (extract it to a shared util) for both importers.

### 10. `parseDay` produces invalid calendar dates — **medium**
`Schedule.jsx:82-88, 850-851`
```js
if (!isNaN(num)) return Math.max(1, Math.min(num, 31));
```
Day is clamped to **31 regardless of month length**. `formatDateForSupabase(2026, 1, 31)` →
`"2026-02-31"`, which Postgres rejects → the whole CSV insert fails (and via #5 could wipe a
month if reused there). Manual Add Shift has the same exposure: the `max={daysInMonth}` input
attribute is only a soft hint; a typed/over value reaches `formatDateForSupabase`.

**Fix:** clamp to the actual days-in-month for the target year/month
(`new Date(year, month+1, 0).getDate()`), and validate before insert.

### 11. `clearAll` time-off delete bypasses the month-index heuristic — **medium**
`Schedule.jsx:684-687` vs `:171-175` / `TimeOff.jsx:104`
```js
.eq('month', currentMonth)   // currentMonth is 0-indexed JS month
```
`fetchTimeOff` and `TimeOff.addPending` both run a "if any `month>11`, treat as 1-indexed"
heuristic. `clearAll` does **not** — it deletes using the raw 0-indexed `currentMonth`. Under
the applied migration `20260408040000` (which forces months to 0–11 via CHECK), this is
**correct and consistent**. But if that migration is *not* applied on some environment, the
display code compensates while `clearAll` deletes the wrong month (off-by-one) — silent,
destructive divergence.

**Fix:** delete the dual-index heuristic everywhere and rely on the schema invariant
(months 0–11, enforced by the migration), OR apply the same conversion in `clearAll`. Don't
leave one destructive path on a different convention than the read paths. (See also #21.)

### Conflict detection — reviewed, behaves correctly
`shiftsOverlap` (`:27-35`) returns `false` when any time is missing (`timeToMinutes` → `null`)
and uses strict `startA < endB && startB < endA`, so **touching shifts (end==start) don't
collide** — correct. `findExistingShiftConflicts`/`findInternalShiftConflicts` normalize names
with `normalizeName` consistently. `generateSchedule` deliberately skips
`findExistingShiftConflicts` because it replaces the month — correct given the delete. No bug
found; one nit: time-off name match (`:303-305`) tries `to.name || to.staff_name ||
to.full_name`, but `time_off_requests` only stores `name` — the extra fallbacks are harmless
dead options.

### "Copy Week" is vestigial, not half-wired — **info**
The `showCopyWeek` state (`:102`) actually drives the **Copy Month** modal (`:1299-1319`);
there is no week-copy code path. The CLAUDE.md "Copy Week hidden" note refers to this renamed
feature. Nothing dangling.

### 12. `exportCSV` doesn't escape — **low**
`Schedule.jsx:709-723` builds rows with raw template literals; a name containing a comma breaks
re-import. **Fix:** use `csvEscape` (share from Inventory).

### 13. Time-off `days` ignores ranges — **low**
`Schedule.jsx:231, 648, 959`; `getTimeOffForDate`/`getTimeOffDays`/`daysToShow` all do
`String(to.days).split(',').map(d => parseInt(d.trim()))`. A user who types `15-17` in the
"day numbers" field yields `[15]` (parseInt stops at `-`), so days 16–17 don't trigger the
conflict warning or the calendar marker. The form placeholder asks for `15,16,17`, so it's
input-dependent. **Fix:** expand `a-b` ranges, or constrain the input.

### 14. Builder staffId matching is exact, not normalized — **low**
`Schedule.jsx:328, 380`
`profilesList.find(p => p.full_name === s.name)` (exact, case-sensitive) where the rest of the
file uses `normalizeName`. A mismatch leaves `staffId=''`, and `getStaffIdFromProfile('')`
(`:223-226`) falls back to `user?.id`, so generated shifts get the **manager's** `user_id`.
Cosmetic for `user_id`, but inconsistent. **Fix:** match via `normalizeName`.

---

## State & React correctness

### Optimistic updates — reviewed, rollbacks correct
- Inventory `update` (`Inventory.jsx:158-180`): captures `item.quantity` and restores it on
  error. Correct.
- TimeOff `approveRequest` (`:135-160`): removes from pending, adds to approved, and on error
  restores both lists. Correct. `deny`/`removeApproved` set `processingRequestId` before the
  confirm dialog and reset on cancel. Correct.

### 15. `usePullToRefresh` re-subscribes on every move — **low**
`usePullToRefresh.js:68` — deps `[distance, refreshing, onRefresh]`. `distance` updates on
every `touchmove`, so listeners are torn down/re-added continuously during a pull. Works
(the `onEnd` closure stays fresh) but churny. **Fix:** keep `distance` in a ref, or read it in
`onEnd` from a ref, and drop it from deps.

### Notifications `window.alert` monkey-patch — reviewed, OK
`Notifications.jsx:42-48`. `notify` is stable (depends only on stable `dismissToast`), so the
effect runs once; cleanup restores the original `alert`. No leak. (Minor theoretical: if the
effect ever re-ran it would capture the already-patched `alert` as "original" — not reachable
today.)

### 16. List keys — mixed id types — **low**
`Checklists.jsx:13-15` seeds numeric ids `1..7`; `addT` (`:204`) uses
`crypto.randomUUID()` (string). React keys stay unique and `find(t => t.id === id)` is safe
because a number never `===` a UUID string. But the mixed types are fragile — any future
`Number(id)`/`==` coercion would break. **Fix:** make defaults UUID strings too.

---

## Edge cases & data integrity

### 17. Dashboard name match is too fuzzy — **low**
`Dashboard.jsx:200`
```js
userMatchTerms.some(term => staffName === term || staffName.includes(term) || term.includes(staffName))
```
Bidirectional substring matching means a staffer named "Al" matches a shift for "Alex" (and
vice-versa), so "My shifts" can show the wrong person's shifts. **Fix:** prefer exact
normalized match; only fall back to substring on full-token boundaries.

### 18. CSV import partial-apply messaging — **low**
Already covered in #6; surface a "partially applied — review inventory" message instead of a
generic failure when some rows committed.

### Number coercion — reviewed, mostly safe
`Number(x || 0)` is used consistently for quantity/threshold; `parseInt` calls that matter use
radix 10 (`Dashboard.formatTime12`, TimeOff month). A few bare `parseInt(parts[...])` exist in
Schedule CSV (`:838,844`) — base-10 by default for these values, acceptable but add radix for
clarity.

---

## Config / build / deploy

### 19. PWA Supabase cache is not auth-aware — **medium**
`vite.config.js:33-44` — `NetworkFirst` on `/rest/v1/` with a 24h `maxAge` and 8s network
timeout. The cache key is the URL; it ignores the `Authorization` header, and the cache is
**not cleared on logout**. Risks:
- On a shared device, after user A logs out and user B logs in, an offline load (or any read
  during the 8s timeout window on a flaky network) can serve **user A's RLS-scoped data** from
  cache to user B.
- Generally, up to 24h-stale data on slow networks.

Mutations are POST/PATCH/DELETE and aren't cached by Workbox's GET-only Cache API, so writes
aren't affected. Auth itself lives under `/auth/v1/` (not matched), so tokens aren't cached.

**Fix:** clear the `supabase-data` cache on `signOut` (`caches.delete('supabase-data')`),
shorten `maxAgeSeconds`, and/or add a `cacheKeyWillBeUsed` plugin that includes the user id, or
restrict caching to genuinely shared/static reads only.

### 20. `secret-scan-ignore` over-broad pattern — **low**
`.netlify/secret-scan-ignore:15` — `^.*https://.*\.supabase\.co.*$` ignores **any** line
containing a Supabase URL in any file, not just the `your-project` placeholders above it. The
anon key and URL are also exempted via `SECRETS_SCAN_OMIT_KEYS` in `netlify.toml` (intended —
they're public client values). Line 15 is broader than needed and would mask an accidentally
committed real project URL. The anon *key* itself is only matched by the placeholder pattern
`.*your-anon-key.*`, so a real key would still be caught unless delivered via the omitted VITE
var — which is the intended path. **Fix:** tighten line 15 to the placeholder host only.

### 21. Dead dual-index month complexity — **low**
`TimeOff.jsx:48-49,104`, `Schedule.jsx:171-175`. Migration `20260408040000` enforces months
0–11 (CHECK `month>=0 AND month<=11`), so the `month>11` "1-indexed" detector can never fire.
The conversion code is dead weight and a drift risk (it implies two conventions coexist; #11
shows one path forgot it). **Fix:** remove the heuristic; document the 0-indexed invariant.

### `package.json` / scripts — OK
`icons` → `scripts/generate-icons.mjs` exists; `sharp` is a devDep. `dev`/`build`/`preview`
match README/SETUP. No missing-script drift.

### Migrations note
Two dirs as documented. `time_off` month migration (`20260408040000`) has a latent hazard
worth flagging (not editable now, already applied): `UPDATE ... SET month = month - 1 WHERE
month BETWEEN 1 AND 12` would corrupt any rows that were *already* 0-indexed (e.g. a genuine
0-indexed December = 11 → 10) if the table ever held mixed conventions. Treat live DB as source
of truth; no action unless data looks shifted.

---

## Top 5 fixes to make first

1. **#1 + #8 — lock out `removed`/non-approved users (auth bypass).** Add `isRemoved`/
   "not approved → redirect" to `ProtectedRoute` and refetch the profile on token refresh.
   This is a security hole with a one-click trigger (admin "Remove user") that silently does
   nothing. Small, self-contained, high impact.

2. **#2 — add `status='approved'` to all RLS write policies (new migration).** The client fix
   in #1 is cosmetic if the database still trusts a stale elevated role. This closes the actual
   trust boundary. Ship as a new dated migration; don't edit applied ones.

3. **#4 — make Settings restore atomic (or fail-safe).** A non-atomic delete-then-insert across
   four tables is a data-loss bug waiting on one bad backup row. Move to a transactional RPC, or
   at minimum validate + per-table delete/insert so a failure can't cascade across tables.

4. **#5 + #6 + #10 — Schedule date safety.** Clamp `parseDay` to real days-in-month, validate
   dates before the Build-Month delete, and reuse Inventory's robust `parseCSV`/`csvEscape`.
   Together these stop invalid dates from both failing imports and (via the delete-first flow)
   wiping a month.

5. **#19 — clear the Supabase PWA cache on logout.** Cross-user data exposure on shared devices
   is a privacy issue; the fix is a few lines in `signOut` plus a shorter `maxAge`.

---

*End of report. Awaiting approval before any code changes. Suggested commit batching:*
*(a) auth/RBAC #1,#3,#8; (b) RLS migration #2; (c) data-integrity #4,#5,#6; (d) Schedule*
*dates/CSV #9,#10,#11,#12,#13,#14; (e) config #19,#20,#21; (f) low-risk polish. Run*
*`npm run build` after each batch.*
