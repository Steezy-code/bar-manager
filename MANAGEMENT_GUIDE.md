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

### 🏝️ Time Off (How It Actually Works)
Since there are no notifications, here's the real workflow:

1. **Staff text you** — "Hey, I need off next Friday"
2. **You decide** — Approve or deny in your head
3. **You update the schedule manually** — Remove their shift for that day
4. **You print the new schedule** — Staff see who's working without them

The Time Off page in the app exists but isn't actively used — it's more for your reference. The real flow is: **staff → text you → you update schedule → print new schedule**.

Don't expect staff to submit requests through the app. They won't. They text you, you handle it.

### ⚙️ Settings (Team Management)
- View all team members
- Add new staff
- Change roles (staff ↔ manager)
- Remove team members if needed
- **Import/Export:** Use these buttons to save and load your data — useful for backups or transferring between accounts

---

## How This Is Meant to Work (Intended Workflow)

This app is designed as a **management tool** — you build the lists and schedules, then use them. Here's the intended flow:

### 🖨️ The Print Workflow (Primary Use)
1. **Build your schedule** — Add shifts for the week
2. **Build your checklists** — Add tasks for opening/closing
3. **Hit Print** — Use the print button to generate clean, ink-friendly paper copies
4. **Hand them out** — Put the printed schedule where staff can see it, tape the checklist to the wall or POS station
5. **Staff check off tasks** — They mark tasks complete by hand on the printed copy

This replaces clipboard checklists and paper schedules. You create digitally → print → staff use on paper.

### 📅 Weekly Setup (What You Do)
| Day | Action |
|-----|--------|
| Sunday | Build next week's schedule in the app → Print it → Put on wall |
| Daily | Check inventory, update quantities |
| Before shift | Print opening checklist → Give to opening staff |
| End of shift | Print closing checklist → Give to closing staff |

### 🔄 The "Driver" Controls Everything
- **You build** the lists in the app (schedule, checklists)
- **You export** backups periodically (Settings → Export)
- **You print** what you need
- **Staff follow** the printed paper copies

Staff don't need to log into the app daily — they use the printed papers you provide.

### ❌ What's NOT Happening Here
- Staff are NOT getting push notifications when you add a shift
- Staff are NOT expected to check the app on their own
- You are NOT automatically alerted when something is done

**You are the driver.** You set it up, print it out, and hand it to them. That's the whole workflow.

---

## Important Notes

### 🔔 About Notifications
**You will NOT receive notifications** when staff complete tasks, submit time-off requests, or update inventory. This app is designed as:
- A **management hub** for you to build lists, schedules, and track things
- A **tool to print** clean checklists and schedules

Staff are expected to complete tasks on their own. If you need real-time notifications, that would require a more complex setup with authentication.

### 👤 Who "Drives" This App?
The person who set this up (you, or whoever the tech person is) is the **driver** of this app. Here's what that means:

- **You are the source of truth** — if data gets lost or someone needs to re-sync, they come to you
- **Others use it through you** — if a manager or staff member wants in, you add them (or point them to the link)
- **Import/Export is your friend** — use the Export button in Settings to back up data. If someone's data gets messed up, you can send them an export to import

### 🔄 How Others Use This App
If other managers or staff want to use the app:
1. Send them the link (same one you use)
2. They can view/enter data, but **you're still the backup source of truth**
3. Periodically export data to keep a master copy

---

## What Do My Staff Actually Need to Do

| Task | How It Works |
|------|--------------|
| Time off | Staff **text YOU**. You update the schedule. Print new schedule. |
| Schedule | Staff **look at the printed copy** you put on the wall |
| Checklists | Staff **use the printed copy** you tape by the register |
| Inventory | You track this. Staff restock when you tell them. |

That's it. Staff don't need to open the app. They look at the printed schedule, use the printed checklist, and text you for time off.

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

## TL;DR

You build → You print → You put on wall → Staff use paper.

That's the whole thing.

---

*Built by [Your Developer] • Questions? Reach out to whoever set this up.*