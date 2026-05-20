# BDN Election Results

Live election results app for the Bangor Daily News, covering Maine's June 9, 2026 primary. Built with Next.js 15, React 19, TypeScript, and Tailwind v4. Data: [Decision Desk HQ](https://decisiondeskhq.com).

> For tech-stack details, data flow, environment variables, the DDHQ poller, and the database schema, see [`DEVELOPER.md`](./DEVELOPER.md).

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in credentials (see DEVELOPER.md)
npm run dev                         # http://localhost:3000
```

## Routes

| Path | What it is |
|---|---|
| `/` | Landing page. Topper + live ticker at top, full results below. |
| `/races/[slug]` | Detail page for a single race. |
| `/towns/[slug]` | Results rolled up for a single municipality. |
| `/embed/topper` | Chrome-free, iframe-able topper for embedding on bangordailynews.com. |

## Layout structure

```
app/
  layout.tsx         minimal root (html/body + metadata only)
  (site)/            route group — site chrome (SiteHeader, footer, main wrapper)
    layout.tsx
    page.tsx         landing page
    races/[slug]/
    towns/[slug]/
  embed/             escapes site chrome; iframe-able views
    layout.tsx
    topper/page.tsx
  api/
    events/          GET — global event feed across all races
    topper/          GET — top contested federal/statewide races
    race/[slug]/...  per-race endpoints (events, auto-updates, etc.)
```

The `(site)` route group is why site chrome doesn't appear on `/embed/*` — `app/layout.tsx` is intentionally minimal, and `app/(site)/layout.tsx` adds the header/footer for everything else.

## Topper + live ticker

The landing page mounts two client components above the existing race sections:

- **`<ElectionTopper />`** (`components/ElectionTopper.tsx`) — horizontal scrollable strip of mini race cards for contested federal/statewide primaries (Governor, US Senate, US House). Polls `/api/topper` every 30s.
- **`<LiveTicker />`** (`components/LiveTicker.tsx`) — global feed of calls, milestones, big-vote-drop alerts, story cards, and manual staff notes across all races. Polls `/api/events` every 30s. Read-only; staff updates are posted from the per-race ticker on `/races/[slug]`.

Both are styled with the existing design tokens in `app/bdn-design-system.css`.

## Embedding the topper on bangordailynews.com

Paste this into a custom-HTML block on the BDN homepage:

```html
<iframe
  src="https://[election-results-host]/embed/topper"
  style="width:100%; min-height:180px; border:0; display:block;"
  loading="lazy"
  title="Live Maine election results">
</iframe>
```

Replace `[election-results-host]` with the production host. `next.config.ts` sets `Content-Security-Policy: frame-ancestors 'self' https://www.bangordailynews.com https://*.bangordailynews.com bangordailynews.com` for `/embed/*` so the iframe is allowed only on BDN domains.

Bump `min-height` if a second row of cards wraps at narrower widths.

## Event categories (used by the ticker)

| Category | When it fires |
|---|---|
| `call` | A candidate has been called as winner |
| `milestone` | Auto-generated milestones (e.g., turnout threshold, % reporting) |
| `note` | Manual staff update posted via per-race ticker |
| `story` | Manual BDN story card (URL → OG metadata) |
| `ai` | Reserved for AI-assisted analysis |

Auto-generated conditions (`bellwether-*`, `bigdrop-*`, `milestone-*`, `call-*`) get their own colored badges; see `components/LiveTicker.tsx` for the styles.

## Manual updates auth

Posting to the per-race ticker requires the password in `UPDATE_PASSWORD`. The hidden hotkey to open the update form is **Cmd+W, Cmd+O, Cmd+W**. Change `UPDATE_PASSWORD` in `.env.local` before going live.

## Data source

- **Pre-election night:** mock data in `data/ddhq_races.json` (read on every request via `lib/mock-data.ts`).
- **Election night:** `ddhq_poller.py` writes live results to Supabase and/or refreshes the JSON file. See `DEVELOPER.md` for the production wiring.
