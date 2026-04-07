# 🍏 Apple Shortcut: Saturday Allowance Request

### Step 1: Create the Shortcut
1. Open **Shortcuts** app on iPhone.
2. Tap **+** to create a new shortcut.
3. Add Action: **URL**
   - Set to: `https://your-app.vercel.app/total`
4. Add Action: **Get Items from RSS Feed**
5. Add Action: **Get Details of RSS Item**
   - Set to: `Title`
6. Add Action: **Send Message**
   - Message: `Hey Mom! My chore total for this week is [Title]. Can you send it over?`
   - Recipient: `[Choose Mom's Contact]`
7. Tap **Done**.

### Step 2: Setup Automation (The "Auto-Run")
1. Go to the **Automation** tab in the Shortcuts app.
2. Tap **+** -> **Create Personal Automation**.
3. Select **Time of Day**.
   - Time: `10:00 AM` (or whenever she's awake)
   - Repeat: `Weekly` -> Select **Saturday**.
4. Select **Run Immediately** (so it doesn't ask you for permission every time).
5. Search for and select the Shortcut you just made.
