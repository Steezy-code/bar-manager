# TESTING.md — MVP RBAC Testing Guide

This document covers how to set up, test, and verify the Role-Based Access Control (RBAC) system in BarManager on the `feature/rbac-login-vibes` branch.

---

## Prerequisites

### 1. Supabase Project

You need a Supabase project with the database schema from `README.md` applied. Key tables:

| Table | Key Columns |
|---|---|
| `profiles` | `id` (uuid, FK to auth.users), `email`, `full_name`, `role` (text, default `'staff'`), `status` (text, default `'pending'`), `created_at` |
| `inventory_items` | `id`, `name`, `category`, `quantity`, `unit`, `threshold` |
| `shifts` | `id`, `user_id` (FK), `date`, `start_time`, `end_time`, `role` |
| `checklists` | `id`, `name`, `date`, `tasks` (jsonb), `completed_by`, `completed_at` |
| `time_off_requests` | `id`, `user_id` (FK), `start_date`, `end_date`, `reason`, `status`, `reviewed_by`, `reviewed_at` |

Ensure the `handle_new_user()` trigger exists so that signing up automatically creates a `profiles` row with `role = 'staff'` and `status = 'pending'`.

### 2. Environment Variables

Create a `.env` file in the project root (do **not** commit it):

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Tip:** Copy `.env.example` and fill in your values.

For Netlify deploys, add the same keys under **Site settings → Environment variables**. Branch-specific overrides are supported via Netlify's "Scopes" feature.

### 3. Local Dev Server

```bash
npm install
npm run dev
```

The app should open at `http://localhost:5173` (or the port Vite assigns).

---

## Roles Overview

| Role | Level | Can Access /admin | Can Edit Users | Can Manage Resources |
|---|---|---|---|---|
| `admin` | 4 | ✅ | ✅ | ✅ (all) |
| `manager` | 3 | ❌ | ❌ | ✅ (inventory, schedule, checklists, time-off) |
| `staff` | 2 | ❌ | ❌ | ✅ (limited — own shifts, own time-off requests) |
| `viewer` | 1 | ❌ | ❌ | ❌ (read-only) |

Role hierarchy is enforced by `usePermissions()` in `src/hooks/usePermissions.js`.

---

## Test Accounts Setup

Before testing, seed at least two accounts in your Supabase project:

### Admin Account
1. Sign up via the app (or create directly in Supabase Auth dashboard).
2. In Supabase SQL Editor, promote the user:
   ```sql
   UPDATE profiles
   SET role = 'admin', status = 'approved'
   WHERE email = 'admin@yourbar.com';
   ```

### Staff Account
1. Sign up via the app normally.
2. Leave the default `role = 'staff'` and `status = 'pending'`.

---

## Test Cases

### Test 1: Sign-Up Flow

**Steps:**
1. Open the app → navigate to `/signup`.
2. Enter a new email, password, and (optionally) full name.
3. Click "Request Access".

**Expected:**
- Success message: "Check Your Email" with a link back to login.
- In Supabase → `profiles` table: new row with `role = 'staff'`, `status = 'pending'`.
- After email verification, logging in should redirect to `/pending-approval`.

**Verify in Supabase:**
```sql
SELECT id, email, role, status FROM profiles ORDER BY created_at DESC LIMIT 5;
```

---

### Test 2: Pending Approval Screen

**Steps:**
1. Log in as the newly signed-up staff user (after email verification).
2. Observe the landing page.

**Expected:**
- User sees the Pending Approval screen (`/pending-approval`).
- The screen shows "Waiting for Approval" with the user's email.
- A "Sign out" link is available.
- Navigating to any protected route (e.g., `/`, `/inventory`) redirects back to `/pending-approval`.

---

### Test 3: Admin Login & Navigation

**Steps:**
1. Log in as the admin account.
2. Check the sidebar/navigation.

**Expected:**
- All standard nav items visible: Dashboard, Inventory, Schedule, Checklists, Time Off, Settings.
- **Admin** link (with shield icon) appears at the bottom of the nav list.
- User info panel at bottom of sidebar shows email and `Role: admin`.

---

### Test 4: Admin Panel — View Users

**Steps:**
1. As admin, click the "Admin" link or navigate to `/admin`.

**Expected:**
- Page title: "User Management".
- A table with columns: Email, Role, Status, Created, Actions.
- All users from the `profiles` table are listed.
- Each user row shows their current role as a colored badge:
  - `admin` → red badge
  - `manager` → yellow badge
  - `staff` → green badge
  - `viewer` → gray badge
- Status badges: `approved` (green), `pending` (yellow), `rejected` (red).

---

### Test 5: Admin Panel — Edit User Role

**Steps:**
1. As admin on `/admin`, click "Edit" next to a staff user.
2. Change the role dropdown from `staff` to `manager`.
3. Click the checkmark (save) button.

**Expected:**
- The role badge updates immediately in the table.
- In Supabase, the user's `profiles.role` is now `manager`.

**Verify in Supabase:**
```sql
SELECT email, role, status FROM profiles WHERE email = 'staff@yourbar.com';
```

---

### Test 6: Admin Panel — Approve Pending User

**Steps:**
1. As admin on `/admin`, find a user with `status = 'pending'`.
2. Click the "Approve" button.

**Expected:**
- Status badge changes from yellow (`pending`) to green (`approved`).
- In Supabase, the user's `profiles.status` is now `approved`.
- That user can now log in and access the app (no longer stuck on Pending Approval).

---

### Test 7: Admin Panel — Edit Status Inline

**Steps:**
1. As admin on `/admin`, click "Edit" on any user.
2. Change the status dropdown (e.g., from `approved` to `rejected`).
3. Save.

**Expected:**
- Status updates in UI and Supabase.
- If the user is now `rejected`, they should be blocked from accessing protected routes.

---

### Test 8: Access Denied — Non-Admin Hits /admin

**Steps:**
1. Log in as a non-admin user (manager, staff, or viewer) with `status = 'approved'`.
2. Manually navigate to `/admin` via the URL bar.

**Expected:**
- User sees "Access Denied" message: "You must be an administrator to view this page."
- OR user is redirected to `/` (dashboard).
- The Admin link does NOT appear in the sidebar for this user.

---

### Test 9: Admin Link Visibility

**Steps:**
1. Log in as admin → check sidebar.
2. Log out → log in as staff → check sidebar.
3. Log out → log in as manager → check sidebar.

**Expected:**
- Admin link (shield icon) is **only** visible when `profile.role === 'admin'`.
- For all other roles, the Admin link is hidden.

---

### Test 10: Role Hierarchy with usePermissions

**Steps:**
1. Log in as a manager.
2. Attempt to access Inventory, Schedule, Checklists, Time Off pages.

**Expected:**
- Manager can access all resource pages (level 3 ≥ level 2 for staff-level resources).
- Manager cannot access `/admin` (requires exact `admin` role check in ProtectedRoute).

**Steps (viewer):**
1. Log in as a viewer.
2. Attempt to access any resource page.

**Expected:**
- Viewer has read-only access (if enforced at UI level).
- Viewer cannot access `/admin`.

---

### Test 11: Sign-Out Flow

**Steps:**
1. While logged in, click "Sign out" in the sidebar.

**Expected:**
- Redirected to `/login`.
- Attempting to navigate to any protected route redirects to `/login`.
- Session is cleared (no stale auth state).

---

### Test 12: End-to-End Smoke Test

This is the full happy path:

1. **Sign up** a new user (`newuser@bar.com`) → sees "Check Your Email".
2. **Verify email** (click Supabase confirmation link).
3. **Log in** as new user → lands on `/pending-approval`.
4. **Log in as admin** → go to `/admin` → find `newuser@bar.com` → click "Approve".
5. **Log out admin** → **log in as new user** → now lands on Dashboard (`/`).
6. **Admin** changes new user's role from `staff` to `manager`.
7. **New user refreshes** → sidebar still has no Admin link; can access inventory, schedule, etc.
8. **Admin** changes new user's role to `admin`.
9. **New user refreshes** → Admin link now visible; can access `/admin`.

---

## Netlify Deploy Preview Testing

If your Netlify project supports deploy previews:

1. Push the `feature/rbac-login-vibes` branch to GitHub.
2. Open a PR from `feature/rbac-login-vibes` → `main`.
3. Netlify will generate a deploy preview URL (e.g., `https://deploy-preview-42--your-site.netlify.app`).
4. Ensure the preview has the Supabase env vars set (under Netlify → Site settings → Environment variables → Branch deploy scope).
5. Run through the test cases above on the preview URL.

> **Important:** If env vars are scoped to `production` only, the preview won't connect to Supabase. Set the scope to "All deploys" or add a branch-specific override.

---

## Troubleshooting

| Issue | Likely Cause | Fix |
|---|---|---|
| App shows blank/errors on load | Missing env vars | Check `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| Sign-up works but no profile row | Missing `handle_new_user()` trigger | Run the trigger SQL from `README.md` in Supabase SQL Editor |
| Admin link doesn't appear | Profile not loading or role mismatch | Check `profiles.role` in Supabase; ensure AuthContext fetches profile |
| /admin shows Access Denied for admin | Profile fetch failed or role is wrong | Check browser console for errors; verify `profiles.role = 'admin'` |
| Pending approval loop | Status never updated | Admin must approve via `/admin` panel or update `profiles.status` in SQL |
| Netlify preview can't connect to Supabase | Env vars not scoped to branch deploys | Update scope in Netlify dashboard |

---

## Files Involved

| File | Purpose |
|---|---|
| `src/context/AuthContext.jsx` | Auth state, profile fetch, role/status exposure |
| `src/hooks/usePermissions.js` | Role hierarchy logic (`hasRole`, `hasExactRole`, `hasAnyRole`) |
| `src/pages/Login.jsx` | Sign-in form |
| `src/pages/SignUp.jsx` | Sign-up / request access form |
| `src/pages/PendingApproval.jsx` | Waiting screen for unapproved users |
| `src/pages/Admin.jsx` | Admin panel — user list, role/status editing |
| `src/components/Layout.jsx` | Sidebar with conditional Admin link |
| `src/App.jsx` | Router with `ProtectedRoute` and `requiredRole` guard |
| `src/lib/supabase.js` | Supabase client init and table name constants |

---

_Last updated: 2026-04-07 · Branch: feature/rbac-login-vibes_
