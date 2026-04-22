# Role-Based Access Control (RBAC) Guide

BarManager now includes role-based access control with four roles:

- **Admin**: Full system access, can manage users and settings.
- **Manager**: Can manage staff, inventory, schedules.
- **Staff**: Regular employee with limited access (default).
- **Viewer**: Read-only access.

## Database Migrations

To enable RBAC, run the following SQL migrations in your Supabase SQL Editor.

### 1. Add status column and update roles

Run the SQL in `supabase/migrations/20260404060700_add_rbac.sql`. This will:
- Add `status` column to `profiles` (pending, approved, rejected).
- Create `roles` and `user_roles` tables.
- Set up Row Level Security policies.

### 2. Update profile trigger and defaults

Run the SQL in `supabase/migrations/20260404060702_update_profile_trigger.sql`. This will:
- Update the default role to `viewer` and add status default `pending`.
- Update the trigger to assign `viewer` role and `pending` status for new signups.
- Backfill existing users with `status = 'approved'`.

### 3. (Optional) Create an admin user

After running migrations, you need to promote at least one user to admin. You can do this via the Admin panel (once you have an admin) or manually via SQL:

```sql
UPDATE profiles SET role = 'admin', status = 'approved' WHERE email = 'your-email@example.com';
```

## Using the Admin Panel

1. Log in with an admin account.
2. Navigate to the **Admin** link in the sidebar.
3. You'll see a list of all users with their roles and status.
4. You can edit roles, approve pending users, or reject them.

## Protected Routes

- `/admin` – only accessible by `admin` role.
- All other routes require `status = 'approved'`. Pending users are redirected to a waiting page.

## Customizing Permissions

You can use the `usePermissions` hook in your components:

```jsx
import { usePermissions } from './hooks/usePermissions';

const { hasRole, isAdmin } = usePermissions();
if (isAdmin) { ... }
```

## Troubleshooting

- If you can't see the Admin link, ensure your profile role is `admin`.
- If new users are stuck on pending approval, approve them via the Admin panel.
- If you lose admin access, use the SQL update above to restore.

## Security Notes

- Row Level Security policies ensure users can only read their own profile unless they are admin.
- Always keep your Supabase project credentials secure.

## Future Enhancements

- Role hierarchy for easier permission checks.
- Fine-grained permissions per feature.
- Audit logs for role changes.

For questions, refer to the main SETUP.md or open an issue on GitHub.