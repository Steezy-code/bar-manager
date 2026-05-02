# ⚠️ LEGACY GUIDE – OUTDATED

**This guide describes an older version of BarManager that used local‑storage and had no login.**

**For the current version (with Supabase, RBAC, conflict detection, mobile UI, and admin panel), please see [BARMANAGER_USER_GUIDE.md](BARMANAGER_USER_GUIDE.md).**

---

# BarManager - Management Guide (Legacy)
## How to Use This App (Plain English) – OLD VERSION

---

## What Is This App?

BarManager is your all-in-one management hub for running your bar/restaurant. Think of it as your digital back-of-house — everything you need in one place, accessible right from your phone or browser.

**No login required** — just open the link and you're in. It's designed to be simple.

| Feature | What It Does |
|---------|--------------|
| 🏠 **Dashboard** | Your home base — greeting changes by time of day |
| 📦 **Inventory** | Track stock, get alerts when items run low, import/export |
| 📅 **Schedule** | See who's working, time off shows on calendar as "OFF" |
| ✅ **Checklists** | Print checklists, add/delete lists, edit tasks |
| 🏝️ **Time Off** | Submit requests → you approve → shows on schedule |
| ⚙️ **Settings** | Full data export/import to backup or share |

---

## How Do I Access It?

1. **Get the link** — Ask whoever set this up for the URL (looks like `something.netlify.app`)
2. **Open it** — That's it. No login, no password. You're straight in.
3. **On any device** — Works on phone, tablet, or desktop

---

## What Does Each Section Do?

### 🏠 Dashboard (Home)
- Time-based greeting: "Good Morning!", "Good Afternoon!", "Good Evening!"
- Quick stats: low stock alerts, quick actions

### 📦 Inventory
- **Add items:** Click "Add Item" → fill in name, category, quantity, threshold
- **Update quantities:** Just click the number and type the new amount
- **Export/Import:** Managers/admins can export inventory to CSV, download a template, and import CSV updates
- **Low stock alerts:** Items turn red when below threshold

#### Inventory CSV How-To
Use these exact CSV headers:

```csv
name,quantity,unit,threshold,category
```

Example:

```csv
name,quantity,unit,threshold,category
Vodka,8,bottles,3,drinks
Limes,24,each,12,garnish
Cocktail Napkins,6,packs,2,supplies
```

To import: go to **Inventory** → **Template**, fill in the file, then choose **Import CSV**. BarManager previews how many items will be updated or added before anything changes.

To convert a paper sheet: take a clear photo, upload it to ChatGPT, and ask:

```text
Please read this inventory sheet and convert it into CSV with exactly these headers:
name,quantity,unit,threshold,category

Do not add extra columns. Do not guess unreadable values. Leave unknown values blank.
Use numbers only for quantity and threshold. Return only the CSV.
```

Review the CSV before importing. If this Supabase table does not have a category column, BarManager ignores category values but still imports the rest.

### 📅 Schedule
- **Add shifts:** Click "Add Shift" → pick employee, date, start/end time
- **Time off shows automatically:** When you approve time off, it shows as "OFF: Name" on the calendar
- **Print:** Click print button for paper copy
- **Clear:** Wipes all shifts and time off (with confirmation)

### ✅ Checklists
- **Multiple lists:** Opening, closing, prep — create as many as you need
- **Print:** Click print button for paper copy
- **Add/delete lists:** Use × to delete a whole list
- **Add tasks:** Edit mode lets you add tasks to any list

### 🏝️ Time Off
1. **Add Request** — Enter name, dates, day numbers (e.g., "15,16,17")
2. **Pending queue** — Requests sit in pending until you review them
3. **Approve/Deny** — Click to approve (shows on schedule) or deny
4. **Shows on calendar** — Approved time off appears as "OFF: Name" on the schedule

### ⚙️ Settings
- **Export All Data** — Downloads everything: inventory, checklists, schedule, time off, pending requests
- **Import Data** — Load a previously exported file to restore or share data

---

## How This Is Meant to Work (Intended Workflow)

This app is designed as a **management tool** — you build the lists and schedules, then use them. Here's the intended flow:

### 🖨️ The Print Workflow (Primary Use)
1. **Build your schedule** — Add shifts for the week
2. **Build your checklists** — Add tasks for opening/closing
3. **Hit Print** — Use the print button to generate clean, ink-friendly paper copies
4. **Hand them out** — Put the printed schedule where staff can see it, tape the checklist to the wall
5. **Staff check off tasks** — They mark tasks complete by hand on the printed copy

### 📅 Weekly Setup (What You Do)
| Day | Action |
|-----|--------|
| Sunday | Build next week's schedule → Print it → Put on wall |
| Daily | Check inventory, update quantities |
| Before shift | Print opening checklist → Give to opening staff |
| End of shift | Print closing checklist → Give to closing staff |

### 🔄 The "Driver" Controls Everything
- **You build** the lists in the app (schedule, checklists)
- **You export** backups periodically (Settings → Export)
- **You print** what you need
- **Staff follow** the printed paper copies

---

## TL;DR

You build → You print → You put on wall → Staff use paper.

That's the whole thing.

---

## ⚠️ CRITICAL: Don't Clear Your Browser Data!

**Your data lives in your browser.** If you clear your browser history, cache, or cookies, **ALL data will be lost** — schedules, checklists, inventory, everything.

### To Protect Your Data:
- ✅ DO regularly export data (Settings → Export)
- ✅ DO keep the link saved in your bookmarks
- ❌ DON'T clear browser history/cache
- ❌ DON'T use incognito/private mode
- ❌ DON'T switch browsers without exporting first

### If You Need to Clear Your Browser:
1. Export ALL data first (Settings → Export All Data)
2. Clear your browser
3. Re-import your data after

**You have been warned.** The driver MUST back up data before any browser clearing.

---

*Built by [Your Developer] • Questions? Reach out to whoever set this up.*
