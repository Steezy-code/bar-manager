# Bar & Grill Manager - Full Specification

## Project Overview
- **Name:** BarManager
- **Type:** Web Application (PWA-ready)
- **Core Functionality:** Inventory tracking, shift scheduling, task checklists, and time-off management for bar & grill restaurants
- **Target Users:** Restaurant managers, staff, and shift leads

---

## Tech Stack (100% Free)
- **Frontend:** React + Vite
- **Styling:** Tailwind CSS
- **Database:** Supabase (free tier)
- **Auth:** Supabase Auth
- **Hosting:** Netlify (free tier)

---

## Database Schema

### `profiles` (extends Supabase auth.users)
```sql
id: uuid (PK)
email: text
full_name: text
role: 'manager' | 'staff'
created_at: timestamp
```

### `inventory_items`
```sql
id: uuid (PK)
name: text
category: text (drinks | food | supplies | cleaning)
quantity: integer
unit: text (cases | lbs | rolls | etc)
threshold: integer (low stock alert level)
last_restocked: date
created_by: uuid (FK profiles)
```

### `shifts`
```sql
id: uuid (PK)
user_id: uuid (FK profiles)
date: date
start_time: time
end_time: time
role: text (server | bartender | cook | host | manager)
status: 'scheduled' | 'completed' | 'no_show'
```

### `checklists`
```sql
id: uuid (PK)
name: text (opening | closing | prep | midshift)
date: date
completed_by: uuid (FK profiles)
completed_at: timestamp
tasks: jsonb (array of {id, text, checked})
```

### `time_off_requests`
```sql
id: uuid (PK)
user_id: uuid (FK profiles)
start_date: date
end_date: date
reason: text
status: 'pending' | 'approved' | 'denied'
reviewed_by: uuid (FK profiles)
reviewed_at: timestamp
```

---

## UI/UX Specification

### Color Palette
- **Background Dark:** #1a1a2e
- **Card Background:** #16213e
- **Accent Primary:** #e94560 (coral red - bar vibes)
- **Accent Secondary:** #0f3460
- **Text Primary:** #ffffff
- **Text Secondary:** #a0a0a0
- **Success:** #27ae60
- **Warning:** #f39c12
- **Danger:** #e94560

### Typography
- **Headings:** Bold, 24-32px
- **Body:** 14-16px, readable
- **Font:** System sans-serif (fast loading)

### Responsive Breakpoints
- Mobile: < 640px (critical for staff on floor)
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Layout Structure

#### Mobile-First Navigation
- Bottom tab bar on mobile (Dashboard, Inventory, Schedule, More)
- Sidebar on desktop

#### Pages

**1. Login Page**
- Email/password login
- "Request Access" for new staff
- Restaurant code entry (for multi-tenant)

**2. Dashboard (Home)**
- Quick stats cards
- Today's shift info
- Pending alerts (low stock, checklists)
- Quick actions

**3. Inventory Page**
- Searchable/filterable list
- Category tabs (Drinks, Food, Supplies, Cleaning)
- Quick edit quantity
- Add new item modal
- Low stock filter

**4. Schedule Page**
- Weekly calendar view
- Color-coded by role
- Add/edit shifts
- Staff availability preview
- Swap request button

**5. Checklists Page**
- Template list (Opening, Closing, Prep)
- One-tap checklist completion
- History view
- Assign to staff

**6. Time Off Page**
- Request form
- Pending requests list (for manager: approve/deny)
- Calendar view of approved time off

**7. Settings (Manager only)**
- Staff management
- Inventory thresholds
- Checklist templates
- Restaurant info

---

## Functionality Specification

### Authentication Flow
1. User enters email/password
2. If new, show "Request Access" form
3. Manager approves new users
4. Role-based redirects (manager vs staff)

### Inventory Workflow
- Manager adds items with thresholds
- Staff can update quantities (decrement on use)
- Auto-alert when below threshold
- Restock updates timestamp

### Scheduling Workflow
- Manager creates shifts for the week
- Staff see their upcoming shifts
- Swap request system
- Role coverage view

### Time Off Workflow
- Staff submits request with dates and reason
- Manager gets notification
- One-click approve/deny
- Auto-updates schedule availability

### Checklist Workflow
- Manager creates templates
- Staff opens checklist for their shift
- Check off items as done
- Saves who completed it and when

---

## Acceptance Criteria

### Must Have (MVP)
- [ ] Supabase connection works
- [ ] Login/logout functional
- [ ] Manager can add inventory items
- [ ] Inventory quantity updates
- [ ] Low stock alerts display
- [ ] Weekly schedule view
- [ ] Manager can create shifts
- [ ] Staff can see their shifts
- [ ] Checklist completion works
- [ ] Time off request submission
- [ ] Manager approve/deny time off
- [ ] Mobile responsive

### Nice to Have (Phase 2)
- [ ] Push notifications
- [ ] Offline mode
- [ ] Shift swap requests
- [ ] Labor cost calculations
- [ ] Supplier ordering integration

---

## File Structure
```
bar-manager/
├── src/
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   ├── InventoryItem.jsx
│   │   ├── ShiftCard.jsx
│   │   ├── Checklist.jsx
│   │   └── TimeOffRequest.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Inventory.jsx
│   │   ├── Schedule.jsx
│   │   ├── Checklists.jsx
│   │   ├── TimeOff.jsx
│   │   └── Settings.jsx
│   ├── lib/
│   │   └── supabase.js
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```