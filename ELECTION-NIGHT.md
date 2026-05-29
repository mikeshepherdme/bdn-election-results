# Election Night Guide — Mike's Desk

**Maine Primary — Tuesday, June 9, 2026**  
Polls close at **8 p.m.** Results typically begin appearing within 15–30 minutes.

---

## Your embeds at a glance

All 12 embeds are live at `https://mikeshepherdme.github.io/bdn-election-embeds/`. Bookmark the ones you'll use most.

### Statewide and federal races (full maps + live tickers)

| Race | URL |
|---|---|
| Governor — Democratic | `…/embed-gov-dem-primary.html` |
| Governor — Republican | `…/embed-gov-rep-primary.html` |
| U.S. Senate — Democratic | `…/embed-senate-dem-primary.html` |
| U.S. House CD1 — Republican | `…/embed-cd1-rep-primary.html` |
| U.S. House CD2 — Democratic | `…/embed-cd2-dem-primary.html` |

These show: candidate bars, a Maine municipality map that fills in as towns report, and the live-update ticker.

### Race grids (multi-race cards)

| Race group | URL |
|---|---|
| State Senate — Democratic | `…/embed-state-senate-dem-primary.html` |
| State Senate — Republican | `…/embed-state-senate-rep-primary.html` |
| State House — Democratic | `…/embed-state-house-dem-primary.html` |
| State House — Republican | `…/embed-state-house-rep-primary.html` |
| District Attorney races | `…/embed-da-races.html` |
| County races (Sheriff, Commissioner, etc.) | `…/embed-county-races.html` |

These show: a card for each race with candidate bars and a "X/XX towns" counter. Click **Show by town** on any card to see the town-by-town breakdown.

### Town lookup

`…/embed-town-lookup.html` — type any Maine town to see every race it participates in and that town's vote totals.

---

## How the results update

Every embed polls for new data **every 30 seconds** — no page reload needed. The bar percentages, vote totals, and town counts update automatically throughout the night.

A small **CALLED** badge appears in green on a candidate's row when Decision Desk HQ calls the race. You don't need to do anything.

---

## Automatic ticker events (statewide and federal embeds only)

The live-update ticker in the five single-race embeds generates entries on its own:

| What you'll see | When it fires |
|---|---|
| **CALLED** (green) | Decision Desk HQ declares a winner |
| **MILESTONE** (amber) | Every 10% of estimated votes counted (10%, 20%, … 90%) |
| **BIG VOTE DROP** (purple) | Any single town reports 2,000+ votes at once |
| **BELLWETHER** (teal) | Governor races only — when a historically predictive town reports |

These fire automatically. You don't need to post them.

---

## Posting a manual live update

Use this to add a reporter's note, a contextual line, or a link to a story you just published.

### Step 1 — Open the editor

With the embed open in your browser, hold **Ctrl + Cmd** and type the letters **W**, **O**, **W** in sequence.

A prompt will ask for your password — use the `UPDATE_PASSWORD` value from your Vercel settings. Once entered, it stays active for the browser tab session (you won't be asked again until you close the tab).

### Step 2 — Write a note

Type your update in the text box. Optionally:
- **Author** — add a reporter's name (appears below the note)
- **Paste a BDN story URL** — the embed will fetch the headline and preview image and display it as a story card instead of plain text

Click **Post update**.

The entry appears at the top of the ticker immediately on your screen and within 30 seconds on all readers' screens.

### Step 3 — Delete an entry

Open the editor again with **Ctrl + Cmd + W O W**, find the entry, and click the **✕** next to it.

---

## Reading the pre-results state

Before 8 p.m. (or until the first towns report), embeds show:

- **Gray dashes** in place of percentages — normal, not an error
- **0 / XX towns** — the denominator is the total number of reporting units for that race
- **Est. ~X,XXX votes** on statewide/congressional races — estimated turnout based on past elections

---

## Troubleshooting

**Bars are still at 0% at 9 p.m.**  
The most common cause is that the DDHQ feed hasn't started yet. Check `/api/race/governor-democratic-primary` directly — if it shows `total_votes: 0` and `precincts.reporting: 0`, the data just hasn't come in. Wait and refresh in 2 minutes.

**An embed shows a loading spinner indefinitely**  
The Vercel API may be cold-starting. Reload the embed once. If it persists after a second reload, check `https://bdn-election-results.vercel.app/api/races` in a browser tab — if that 404s or errors, escalate to your developer.

**Town breakdown doesn't expand when I click "Show by town"**  
Click again — it may have loaded slowly. If the town table stays blank, the individual race endpoint may be down. Try opening the full race embed for that race (e.g. the Governor embed) to confirm the API is responding.

**The ticker editor password isn't working**  
Confirm the `UPDATE_PASSWORD` value in Vercel → Project → Settings → Environment Variables. If it's blank, the editor accepts any password — but if a value is set and isn't matching, paste it directly to avoid invisible characters.

**A called race isn't showing the CALLED badge**  
Auto-events are generated when the single-race embed polls. If the tab was closed when the call came in, open the embed and wait up to 30 seconds for it to catch up. The badge should appear on the next poll cycle.

**Results look wrong or frozen**  
Hard-reload the embed (Cmd + Shift + R on Mac) to clear any cached state. If results are genuinely stale, check the Vercel function logs for errors.

---

## Quick reference

| Task | How |
|---|---|
| Post a note | Ctrl + Cmd + W O W → type → Post |
| Post a story card | Ctrl + Cmd + W O W → paste BDN URL → Post |
| Delete an update | Ctrl + Cmd + W O W → click ✕ |
| See town breakdown | Click **Show by town** on any race card |
| Look up a specific town | Use the Town Lookup embed |
| Check raw API data | `https://bdn-election-results.vercel.app/api/races` |

---

## Before the polls close — checklist for Mike

- [ ] Open all five single-race embeds in browser tabs and confirm they load
- [ ] Open the State Senate Democratic grid and click **Show by town** on one card to confirm the toggle works
- [ ] Open the town lookup and search for **Bangor** — confirm it loads race results
- [ ] Do a test live update: Ctrl + Cmd + W O W → post "Test note" → confirm it appears → delete it
- [ ] Confirm the embeds are iframed correctly on the BDN site

---

*For technical issues, contact your developer with the error visible in the browser console (right-click → Inspect → Console) or in the Vercel function logs.*
