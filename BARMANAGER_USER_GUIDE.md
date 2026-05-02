# BarManager User Guide

## The All-in-One Management System for Your Bar

BarManager is a **free, modern, web‑based management app** built specifically for bars and restaurants. It replaces paper schedules, handwritten checklists, and messy spreadsheets with a single, secure, easy‑to‑use system that works on any device—phone, tablet, or computer.

### Why You’ll Love It

✅ **No more paper chaos** – Schedules and checklists are digital, printable, and always up‑to‑date.  
✅ **Conflict‑free scheduling** – The app automatically detects overlapping shifts and prevents double‑booking.  
✅ **Low‑stock alerts** – Get instant warnings when inventory runs low.  
✅ **Role‑based access** – Admins, managers, and staff see only what they need.  
✅ **Mobile‑friendly** – Designed for touch, works perfectly on phones and tablets.  
✅ **Secure & persistent** – All data is saved in the cloud (Supabase) and survives browser clears.  
✅ **100% free** – No subscription, no hidden fees, no limits.

---

## 📲 Getting Started

### 1. Access the App
- **URL:** Your unique BarManager link (e.g., `https://your‑bar‑manager.netlify.app`)
- **Login:** Every user now logs in with email and password. New users sign up and wait for admin approval.
- **Device:** Works on any modern browser (Chrome, Safari, Edge, Firefox). No app store download needed.

### 2. Roles & Permissions

| Role | What They Can Do |
|------|------------------|
| **Admin** | Full system access: manage users, approve sign‑ups, edit roles, transfer admin privileges. |
| **Manager** | Manage inventory, create schedules, approve time‑off, edit checklists. |
| **Staff** | View their own shifts, submit time‑off requests, complete checklists. |
| **Viewer** | Read‑only access (can view schedules and inventory but not make changes). |

When you first sign up, you’re placed in **“pending approval”** until an admin approves your account.

---

## 🏠 Dashboard

The dashboard is your home screen. It shows:
- A friendly time‑based greeting (Good Morning/Afternoon/Evening!)
- **Low‑stock alerts** – items that need restocking.
- **Quick‑action buttons** to jump straight to Inventory, Schedule, Checklists, or Time Off.

> **Tip:** Check the dashboard daily to see urgent alerts at a glance.

---

## 📦 Inventory Management

**Purpose:** Track stock levels, get low‑stock warnings, and manage bar supplies.

### Key Features
- **Add items** – Click “Add Item,” enter name, category, quantity, unit, and low‑stock threshold.
- **Update quantities** – Tap the number and type the new count (or use the +/‑ buttons).
- **Low‑stock alerts** – Items turn red when quantity falls below the threshold; they also appear on the dashboard.
- **Export/Import** – Download a JSON backup of your entire inventory (Settings page) or restore from a backup.

### Workflow
1. Add all your bar items (liquor, beer, wine, mixers, garnishes, paper goods, etc.).
2. Set realistic low‑stock thresholds (e.g., “5 bottles” for premium spirits).
3. Update quantities after each delivery or shift.
4. Use the dashboard to see what’s running low before you order.

### CSV Import/Export for Managers

Inventory is available only to managers and admins in the app.

**CSV columns:** `name,quantity,unit,threshold,category`

Example:
```csv
name,quantity,unit,threshold,category
Vodka,8,bottles,3,drinks
Limes,24,each,12,garnish
Cocktail Napkins,6,packs,2,supplies
```

**Export current inventory**
1. Go to **Inventory**.
2. Click **Export CSV**.
3. Save the downloaded file with your other inventory records.

**Import inventory from CSV**
1. Go to **Inventory**.
2. Click **Template** to download a blank CSV with the correct headers.
3. Fill in the rows in a spreadsheet app.
4. Click **Import CSV** and choose the file.
5. Review the preview carefully. Existing items with the same name will be updated; new names will be added.
6. Click **Import** to confirm.

**Turn a paper inventory sheet into CSV with ChatGPT**
1. Take a clear, well-lit picture of the paper inventory sheet.
2. Upload the picture to ChatGPT.
3. Use this prompt:

```text
Please read this inventory sheet and convert it into CSV with exactly these headers:
name,quantity,unit,threshold,category

Do not add extra columns. Do not guess unreadable values. Leave unknown values blank.
Use numbers only for quantity and threshold. Return only the CSV.
```

4. Review the CSV that ChatGPT returns.
5. Save it as a `.csv` file, then import it in BarManager.

If your database does not expose a category field, BarManager will still import the CSV and ignore category values.

---

## 📅 Schedule Management

**Purpose:** Create, view, and print weekly/monthly shift schedules with conflict detection.

### Key Features
- **Month‑view calendar** – See all shifts at a glance; time‑off appears as “OFF: [Name]”.
- **Add shifts** – Select staff, date, start/end time, and role (server, bartender, etc.).
- **Conflict detection** – The app blocks overlapping shifts for the same person on the same day.
- **Mobile‑optimized** – Larger tap targets, swipe‑friendly navigation, bottom‑sheet modals.
- **Build Month** – Generate an entire month of shifts using patterns (e.g., “John works every Monday 4‑11pm”).
- **Copy last month** – Quickly copy shifts from the previous month.
- **Clear all** – Wipe all shifts and approved time‑off for the month (with confirmation).
- **Print** – Generate a clean, ink‑friendly paper schedule for the wall.
- **Export CSV** – Download shift data for payroll or archiving.

### Workflow (Weekly)
1. **Sunday evening** – Open the Schedule page.
2. **Add shifts** for the upcoming week (or use “Build Month” for the whole month).
3. **Check for conflicts** – the app will warn you if there are overlaps.
4. **Print** the schedule and post it in the staff area.
5. **Staff** check their shifts on the printed copy or log in to see them digitally.

> **Mobile tip:** The schedule works great on phones—use it to check who’s working while you’re on the go.

---

## ✅ Checklists

**Purpose:** Create, print, and manage opening, closing, and prep checklists.

### Key Features
- **Multiple lists** – Opening, closing, prep, deep‑clean—create as many as you need.
- **Add/edit tasks** – Toggle edit mode to add, reorder, or delete tasks.
- **Completion tracking** – Staff can mark tasks complete (saved per user).
- **Print** – Generate a paper checklist to post on the wall.
- **Team checklists** – Shared lists that everyone can contribute to.

### Workflow
1. **Build your lists** – Create an “Opening” checklist (turn on lights, stock ice, set up POS, etc.) and a “Closing” checklist (clean bar, wipe down, count drawer, etc.).
2. **Print** each list and laminate or tape it in the appropriate area.
3. **Staff** check off tasks as they complete them (on the printed copy).
4. **Update** checklists anytime—changes are saved instantly.

---

## 🏝️ Time Off Requests

**Purpose:** Let staff request days off; managers approve/deny with one click.

### Key Features
- **Submit requests** – Staff enter their name, dates, and reason.
- **Approve/Deny** – Managers click “Approve” to grant the request or “Deny” to reject.
- **Auto‑appear on schedule** – Approved time‑off shows as “OFF: [Name]” on the calendar.
- **Pending queue** – See all pending requests in one place.

### Workflow
1. **Staff** submit a request (e.g., “Vacation, June 10‑15”).
2. **Manager** reviews pending requests and clicks “Approve” or “Deny.”
3. **Approved** requests instantly appear on the schedule.
4. **Staff** see their approved time‑off on the calendar.

---

## 👥 Admin Panel

**Purpose:** Manage users, roles, and system settings (accessible only to Admins).

### Key Features
- **User list** – View all staff, their roles, status, and join date.
- **Edit roles/status** – Change a user’s role (Admin/Manager/Staff/Viewer) or status (pending/approved/rejected/removed).
- **Approve sign‑ups** – New users are “pending” until an admin approves them.
- **Transfer admin role** – Safely give admin privileges to another user (you can demote yourself to manager afterward).
- **Soft‑delete users** – Mark users as “removed” (hidden by default, can be restored).
- **Show removed toggle** – View or hide removed users.

### Workflow for New Staff
1. **Staff signs up** with email and password.
2. **Admin** goes to Admin panel, finds the pending user, clicks “Approve.”
3. **Staff** can now log in and access the app according to their role.

> **Security note:** Always keep at least one admin account. Use “Transfer Admin Role” if you need to hand off admin duties.

---

## ⚙️ Settings

**Purpose:** Backup, restore, and system‑level actions.

### Key Features
- **Export Full Data** – Download a complete JSON backup of inventory, shifts, checklists, and time‑off.
- **Import Data** – Upload a backup file to restore all data (destructive—replaces everything).
- **Environment** – Shows your Supabase connection status.

### Workflow
1. **Weekly backup** – Export all data and save the file to Google Drive/Dropbox.
2. **If you switch devices** – Import the backup file on the new device.
3. **Before clearing browser data** – Always export first!

---

## 🚀 Best Practices & Tips

### For Managers/Admins
- **Use “Build Month”** to create a consistent repeating schedule (e.g., same shifts every Monday).
- **Set low‑stock thresholds** to match your ordering cycle (so you never run out).
- **Approve time‑off requests** within 24 hours to keep the schedule accurate.
- **Print schedules and checklists** and post them—staff are more likely to follow paper copies.
- **Keep a backup** every week (Settings → Export Full Data).

### For Staff
- **Log in** to see your shifts and submit time‑off requests.
- **Check the schedule** on your phone before your shift.
- **Submit time‑off requests** at least two weeks in advance.
- **Complete checklists** on the printed copy (or digitally if you prefer).

### Mobile‑First Tips
- **Add to home screen** (iOS: Share → Add to Home Screen; Android: Menu → Add to Home Screen) for an app‑like experience.
- **Use landscape mode** on phones for a wider calendar view.
- **Swipe left/right** on the schedule to move between months.

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| Can’t log in | Ensure your account has been approved by an admin. |
| Schedule overlaps allowed | Conflict detection is on—double‑check that the same person isn’t scheduled twice on the same day. |
| Low‑stock alerts not showing | Verify the item’s quantity is below its threshold. |
| “Copy Week” button missing | The button is hidden in the current version (functionality remains). |
| Admin panel not visible | You must be logged in as an Admin (role=admin). |
| Data missing after browser clear | All data is stored in the cloud (Supabase); just log in again. |
| Can’t approve a user | Ensure you’re an Admin and the user is in “pending” status. |

---

## 📞 Support & Contact

BarManager is **free and open‑source**. If you need help:

- **Ask your system administrator** (who set up the app).
- **Check the online documentation** (the README and TESTING files).
- **Report bugs or request features** via GitHub (if your admin has access).

---

## 🎉 Ready to Go?

BarManager is designed to **save you time, reduce errors, and keep your bar running smoothly**. Start by exploring the Dashboard, adding your inventory, and building your first schedule. Within a week, you’ll wonder how you ever managed without it.

**Happy managing!**

*— The BarManager Team*
