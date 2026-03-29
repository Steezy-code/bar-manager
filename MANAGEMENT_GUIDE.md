# BarManager - Management Guide
## How to Use This App (Plain English)

---

## What Is This App?

BarManager helps you manage your bar/restaurant in 4 simple ways:

| Feature | What It Does |
|---------|--------------|
| 📦 **Inventory** | Track what you have in stock. Get alerts when things are running low. |
| 📅 **Schedule** | See who's working this week. Managers can assign shifts. |
| ✅ **Checklists** | Staff complete opening/closing tasks (like "brew coffee", "restock napkins") |
| 🏝️ **Time Off** | Staff request days off. Managers approve or deny. |

---

## How Do I Access It?

1. **Get the link** — Ask whoever set this up for the URL (looks like `something.netlify.app`)
2. **Login** — Use the email/password you were given
3. **That's it** — You're in!

---

## What Do I Do Here?

### 🏠 Dashboard (Home)
- Shows a quick overview: who's working today, what's running low, pending requests
- This is where you start every day

### 📦 Inventory
- **To add an item:** Click "Add Item" → fill in name, category, quantity, threshold
- **Threshold** = the number that triggers a low-stock alert (e.g., if threshold is 5 and you have 4, it turns red)
- **To update quantity:** Just click on the number and type the new amount
- Staff will see alerts when items hit threshold

### 📅 Schedule
- **To view:** Click any week to see shifts
- **To add a shift:** Click "Add Shift" → pick employee, date, start/end time
- **Colors mean:**
  - 🟢 Green = server
  - 🔵 Blue = bartender
  - 🟡 Yellow = manager

### ✅ Checklists
- **Opening checklist:** Staff run through it before the bar opens
- **Closing checklist:** Staff run through it before leaving
- Managers can see which checklists were completed and by whom
- Great for accountability — nobody can say "I forgot to lock up"

### 🏝️ Time Off
- Staff submit requests with dates and reason
- You get a notification
- **To respond:** Click "Approve" or "Deny"
- Approved requests show on the schedule as days off

### ⚙️ Settings (Team Management)
- Add/remove staff
- Change someone's role (staff ↔ manager)
- Only managers can access this

---

## What Do My Staff Need to Do?

| Task | Who | How Often |
|------|-----|------------|
| Update inventory when stocked | Bar staff | Daily |
| Complete opening/closing checklist | Opening/closing shift | Every shift |
| Request time off | All staff | As needed |
| Check schedule | All staff | Daily |

---

## Common Questions

**Q: Can staff see other people's info?**
A: No — staff can only see what they need to do (their shifts, their requests). Managers see everything.

**Q: What happens if I delete a staff member?**
A: Their shifts and requests stay but get disassociated. You can always re-add them.

**Q: Can I get reports on usage?**
A: Not in this version yet — but you can export data from Supabase if needed.

---

## Need Help?

If something's broken or you need changes:
1. Check with your tech person (whoever set this up)
2. Or restart — the app just reads from a database, can't really "break"

---

## Summary for Management

This tool replaces:
- 📝 Paper schedules → digital, auto-updates
- 📦 Spreadsheet inventory → automatic low-stock alerts
- 📋 Clipboard checklists → digital with timestamps
- ✉️ Slack/Text time-off requests → centralized in-app requests

**Goal:** Less confusion, more accountability, smoother operations.

---

*Created by [Your Name/Company] • Questions? Reach out to the developer.*