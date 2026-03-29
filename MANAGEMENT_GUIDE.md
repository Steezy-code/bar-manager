# BarManager - Management Guide
## How to Use This App (Plain English)

---

## What Is This App?

BarManager is your all-in-one management hub for running your bar/restaurant. Think of it as your digital back-of-house — everything you need in one place, accessible right from your phone or browser.

**No login required** — just open the link and you're in. It's designed to be simple.

| Feature | What It Does |
|---------|--------------|
| 🏠 **Dashboard** | Your home base — overview of what's happening right now |
| 📦 **Inventory** | Track stock, get alerts when items run low |
| 📅 **Schedule** | See who's working, assign shifts, manage the team |
| ✅ **Checklists** | Staff complete opening/closing tasks with timestamps |
| 🏝️ **Time Off** | Staff request days off, you approve or deny |
| ⚙️ **Settings** | Team management and app configuration |

---

## How Do I Access It?

1. **Get the link** — Ask whoever set this up for the URL (looks like `something.netlify.app`)
2. **Open it** — That's it. No login, no password. You're straight in.
3. **On any device** — Works on phone, tablet, or desktop

---

## What Does Each Section Do?

### 🏠 Dashboard (Home)
- Today's overview at a glance
- Quick stats: staff working today, low stock alerts, pending requests
- This is where you start every day to see what's up

### 📦 Inventory
- **Add items:** Click "Add Item" → fill in name, category, quantity, threshold
- **Threshold** = the number that triggers a low-stock alert
  - Example: If threshold is 5 and you have 4, it turns red → time to restock
- **Update quantities:** Just click the number and type the new amount
- **Categories:** Drinks, food, supplies, cleaning — whatever makes sense for you

### 📅 Schedule
- **View:** Click any week to see who's working
- **Assign shifts:** Click "Add Shift" → pick employee, date, start/end time
- **Roles shown by color:**
  - 🟢 Green = server
  - 🔵 Blue = bartender  
  - 🟡 Yellow = manager
- **At a glance:** See coverage for the whole week instantly

### ✅ Checklists
- **Opening checklist:** Staff run through it before the bar opens (brew coffee, restock napkins, etc.)
- **Closing checklist:** Staff run through it before locking up (count drawer, clean equipment, etc.)
- **Timestamped:** You'll see exactly who completed what and when
- **Accountability:** No more "I forgot" — it's all recorded

### 🏝️ Time Off
- Staff submit requests with dates and reason
- **You get notified** (check the Time Off page)
- **Approve or Deny** with one click
- Approved requests automatically show on the schedule

### ⚙️ Settings (Team Management)
- View all team members
- Add new staff
- Change roles (staff ↔ manager)
- Remove team members if needed

---

## What Do My Staff Need to Do?

| Task | Who | How Often |
|------|-----|------------|
| Update inventory when stocked | Bar staff | Daily |
| Complete opening checklist | Opening shift | Every shift before opening |
| Complete closing checklist | Closing shift | Every shift before leaving |
| Check schedule | All staff | Daily |
| Request time off | All staff | As needed |

---

## Why This Setup?

**No login = fewer barriers**
- Staff don't need another password to remember
- Managers don't need to chase people to set up accounts
- Just share the link and go

**Management hub approach**
- Everything in one place — no switching between apps
- Works great on mobile for managers on the floor
- Real-time updates — everyone sees the same info

**Accountability baked in**
- Checklist timestamps = proof tasks were done
- Inventory tracking = know what to reorder
- Shift logs = scheduling history

---

## Common Questions

**Q: Can staff see everything?**
A: Yes — but that's intentional for a small team. Everyone sees the schedule, inventory, and can complete checklists. It's a collaborative tool, not a hierarchical surveillance system.

**Q: What happens if I delete a team member?**
A: Their shifts and requests stay but get disassociated. You can always re-add them if they come back.

**Q: Can I export data?**
A: Yes — the data lives in Supabase (the database). You can export from there if you need reports.

**Q: Is this secure?**
A: The app itself is open (no login), but the database has security rules. Only authorized team members could access the data backend if they had credentials.

---

## Summary for Management

This tool replaces the old way of doing things:

| Old Way | New Way |
|---------|---------|
| 📝 Paper schedules or text threads | Digital schedule everyone sees |
| 📦 Spreadsheet or memory inventory | Automatic low-stock alerts |
| 📋 Clipboard checklists | Digital with timestamps + proof |
| ✉️ Texts/Slack for time-off requests | In-app requests, one-click approve/deny |
| 🔐 Multiple logins for every tool | One link, open and go |

**Goal:** Less confusion, more accountability, smoother day-to-day operations — without the hassle.

---

## Need Help?

If something looks wrong:
1. Refresh the page — fixes most issues
2. Check with whoever set it up
3. The app reads from a database, so it can't really "break" — worst case is a refresh needed

---

*Built by [Your Developer] • Questions? Reach out to the person who set this up.*