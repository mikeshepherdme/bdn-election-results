"""
Generates static HTML race and town pages for the BDN election results prototype.

Outputs:
  races/{slug}.html   — one per race (4 total)
  towns/{slug}.html   — one per Maine municipality (504 total)

Also patches prototype.html to link to the generated pages.
"""

import csv, re, os
from pathlib import Path
from collections import defaultdict

ROOT   = Path(__file__).parent
DATA   = ROOT / "data" / "historical"
RACES_DIR = ROOT / "races"
TOWNS_DIR = ROOT / "towns"
RACES_DIR.mkdir(exist_ok=True)
TOWNS_DIR.mkdir(exist_ok=True)

# ── Mock race data (mirrors lib/mock-data.ts) ─────────────────────────────────

RACES = [
    {
        "slug": "governor-democratic-primary",
        "title": "Governor",
        "district": None,
        "party": "Democratic",
        "party_color": "#1A5FAB",
        "party_bg": "#E8F0FA",
        "called": False,
        "called_winner": None,
        "status": "counting",
        "pct_reporting": 45,
        "precincts_reporting": 241,
        "precincts_total": 536,
        "total_votes": 54420,
        "candidates": [
            {"name": "Nirav Shah",     "last": "Shah",     "votes": 14820, "pct": 27.2},
            {"name": "Shenna Bellows", "last": "Bellows",  "votes": 12870, "pct": 23.6},
            {"name": "Hannah Pingree", "last": "Pingree",  "votes": 11550, "pct": 21.2},
            {"name": "Troy Jackson",   "last": "Jackson",  "votes": 9240,  "pct": 17.0},
            {"name": "Angus King III", "last": "King",     "votes": 5940,  "pct": 11.0},
        ],
        "vcu_results": [
            {"town": "Bangor",       "county": "Penobscot",     "votes": {"Shah": 812,  "Bellows": 687,  "Pingree": 614,  "Jackson": 498,  "King": 321}},
            {"town": "Portland",     "county": "Cumberland",    "votes": {"Shah": 1840, "Bellows": 1680, "Pingree": 1540, "Jackson": 520,  "King": 720}},
            {"town": "Lewiston",     "county": "Androscoggin",  "votes": {"Shah": 620,  "Bellows": 480,  "Pingree": 310,  "Jackson": 540,  "King": 198}},
            {"town": "Auburn",       "county": "Androscoggin",  "votes": {"Shah": 287,  "Bellows": 198,  "Pingree": 143,  "Jackson": 251,  "King": 91}},
            {"town": "Brewer",       "county": "Penobscot",     "votes": {"Shah": 142,  "Bellows": 121,  "Pingree": 98,   "Jackson": 167,  "King": 58}},
            {"town": "Caribou",      "county": "Aroostook",     "votes": {"Shah": 87,   "Bellows": 62,   "Pingree": 54,   "Jackson": 198,  "King": 34}},
            {"town": "Presque Isle", "county": "Aroostook",     "votes": {"Shah": 98,   "Bellows": 74,   "Pingree": 61,   "Jackson": 210,  "King": 41}},
            {"town": "Bar Harbor",   "county": "Hancock",       "votes": {"Shah": 143,  "Bellows": 128,  "Pingree": 167,  "Jackson": 54,   "King": 76}},
        ],
        "annotation": "Penobscot County, which favors Jackson, is slow to report. Results may not arrive until 10 p.m. — BDN Politics",
    },
    {
        "slug": "governor-republican-primary",
        "title": "Governor",
        "district": None,
        "party": "Republican",
        "party_color": "#CC2929",
        "party_bg": "#FAE8E8",
        "called": True,
        "called_winner": "Mason",
        "called_winner_full": "Garrett Mason",
        "status": "called",
        "pct_reporting": 60,
        "precincts_reporting": 321,
        "precincts_total": 536,
        "total_votes": 59100,
        "candidates": [
            {"name": "Garrett Mason",   "last": "Mason",   "votes": 28140, "pct": 47.6},
            {"name": "Owen McCarthy",   "last": "McCarthy","votes": 14520, "pct": 24.6},
            {"name": "Jonathan Bush",   "last": "Bush",    "votes": 8470,  "pct": 14.3},
            {"name": "Robert Wessels",  "last": "Wessels", "votes": 4230,  "pct": 7.2},
            {"name": "David Jones",     "last": "Jones",   "votes": 3740,  "pct": 6.3},
        ],
        "vcu_results": [
            {"town": "Bangor",    "county": "Penobscot",    "votes": {"Mason": 812, "McCarthy": 420, "Bush": 241, "Wessels": 98,  "Jones": 87}},
            {"town": "Portland",  "county": "Cumberland",   "votes": {"Mason": 680, "McCarthy": 390, "Bush": 210, "Wessels": 104, "Jones": 92}},
            {"town": "Lewiston",  "county": "Androscoggin", "votes": {"Mason": 520, "McCarthy": 298, "Bush": 167, "Wessels": 84,  "Jones": 71}},
            {"town": "Caribou",   "county": "Aroostook",    "votes": {"Mason": 298, "McCarthy": 142, "Bush": 87,  "Wessels": 54,  "Jones": 44}},
        ],
        "annotation": None,
    },
    {
        "slug": "us-house-cd2-democratic-primary",
        "title": "U.S. House",
        "district": "2",
        "party": "Democratic",
        "party_color": "#1A5FAB",
        "party_bg": "#E8F0FA",
        "called": False,
        "called_winner": None,
        "status": "counting",
        "pct_reporting": 35,
        "precincts_reporting": 148,
        "precincts_total": 421,
        "total_votes": 33400,
        "candidates": [
            {"name": "Matt Dunlap",   "last": "Dunlap",   "votes": 11480, "pct": 34.4},
            {"name": "Joe Baldacci",  "last": "Baldacci",  "votes": 9120,  "pct": 27.3},
            {"name": "Jordan Wood",   "last": "Wood",      "votes": 7840,  "pct": 23.5},
            {"name": "Paige Loud",    "last": "Loud",      "votes": 4960,  "pct": 14.8},
        ],
        "vcu_results": [
            {"town": "Bangor",       "county": "Penobscot", "votes": {"Dunlap": 781, "Baldacci": 612, "Wood": 540, "Loud": 298}},
            {"town": "Caribou",      "county": "Aroostook", "votes": {"Dunlap": 142, "Baldacci": 67,  "Wood": 54,  "Loud": 38}},
            {"town": "Presque Isle", "county": "Aroostook", "votes": {"Dunlap": 156, "Baldacci": 74,  "Wood": 61,  "Loud": 43}},
        ],
        "annotation": None,
    },
    {
        "slug": "us-senate-democratic-primary",
        "title": "U.S. Senate",
        "district": None,
        "party": "Democratic",
        "party_color": "#1A5FAB",
        "party_bg": "#E8F0FA",
        "called": False,
        "called_winner": None,
        "status": "too-close",
        "pct_reporting": 40,
        "precincts_reporting": 214,
        "precincts_total": 536,
        "total_votes": 48000,
        "candidates": [
            {"name": "Candidate One", "last": "One", "votes": 24576, "pct": 51.2},
            {"name": "Candidate Two", "last": "Two", "votes": 23424, "pct": 48.8},
        ],
        "vcu_results": [],
        "annotation": None,
    },
]

# ── Load historical CSVs ───────────────────────────────────────────────────────

def load_csv(path):
    with open(path) as f:
        return list(csv.DictReader(f))

ctx_rows   = load_csv(DATA / "primary_context.csv")
dem18_rows = load_csv(DATA / "gov_dem_2018_firstchoice_by_town.csv")
rep18_rows = load_csv(DATA / "gov_rep_2018_by_town.csv")

ctx   = {r["municipality"].upper(): r for r in ctx_rows}
rep18 = {r["municipality"].upper(): r for r in rep18_rows}

# Pivot dem 2018 to {TOWN: {short_name: {votes, pct}}}
dem18 = defaultdict(dict)
for r in dem18_rows:
    dem18[r["town"].upper()][r["candidate_short"]] = {
        "votes": int(r["first_choice_votes"]),
        "pct":   float(r["first_choice_pct"]),
        "full":  r["candidate"],
    }

# VCU lookup: town name (title case) → list of (race, votes_dict)
town_races = defaultdict(list)
for race in RACES:
    for vcu in race["vcu_results"]:
        town_races[vcu["town"].upper()].append((race, vcu))

def town_slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def race_display_title(race):
    if race["district"]:
        return f"{race['title']}, District {race['district']}"
    return race["title"]

# ── HTML helpers ──────────────────────────────────────────────────────────────

def head(title):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Maine Election Results | BDN</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {{
  theme: {{
    extend: {{
      colors: {{
        bdn: {{ green: '#2D6A2D', dark: '#1F4E1F', light: '#EBF3EB' }},
        dem: {{ DEFAULT: '#1A5FAB', light: '#E8F0FA' }},
        rep: {{ DEFAULT: '#CC2929', light: '#FAE8E8' }},
      }},
      fontFamily: {{
        headline: ['"Franklin Gothic Medium"', '"Arial Narrow"', 'Arial', 'sans-serif'],
      }}
    }}
  }}
}}
</script>
<style>
  body {{ font-family: Georgia, serif; background: #F8F8F8; color: #1a1a1a; }}
  .font-headline {{ font-family: "Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif; }}
</style>
</head>
<body class="min-h-screen">"""

def bdn_header(home_path):
    return f"""
<header class="bg-bdn-green text-white sticky top-0 z-40">
  <div class="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
    <a href="https://www.bangordailynews.com" class="flex items-center gap-3">
      <div class="bg-white text-bdn-green font-headline font-bold text-lg w-10 h-10 flex items-center justify-center shrink-0">BDN</div>
      <span class="font-headline text-sm uppercase tracking-widest hidden sm:block">Bangor Daily News</span>
    </a>
    <div class="h-5 w-px bg-white/30 hidden sm:block"></div>
    <a href="{home_path}" class="font-headline text-sm uppercase tracking-widest text-white/90 hover:text-white">Election Results</a>
  </div>
</header>"""

def status_badge(race):
    if race["status"] == "called":
        return '<span class="bg-green-100 text-green-800 text-xs font-headline font-bold px-2 py-0.5 rounded border border-green-300">Called</span>'
    if race["status"] == "too-close":
        return '<span class="bg-amber-100 text-amber-800 text-xs font-headline font-bold px-2 py-0.5 rounded border border-amber-300">Too Close</span>'
    return '<span class="bg-gray-100 text-gray-600 text-xs font-headline px-2 py-0.5 rounded border border-gray-200">Counting</span>'

def candidate_rows_html(race, votes_dict=None):
    cands = sorted(race["candidates"], key=lambda c: -(votes_dict[c["last"]] if votes_dict else c["votes"]))
    total = sum(votes_dict[c["last"]] for c in cands) if votes_dict else race["total_votes"]
    html = ""
    for i, c in enumerate(cands):
        votes = votes_dict[c["last"]] if votes_dict else c["votes"]
        pct   = (votes / total * 100) if total else c["pct"]
        is_winner = race["called"] and i == 0
        bar_color = "bg-dem" if race["party"] == "Democratic" else "bg-rep"
        winner_bg = "bg-green-50 -mx-4 px-4 rounded" if is_winner else ""
        check = "✓ " if is_winner else ""
        name_cls = "text-green-800 font-bold" if is_winner else ""
        pct_cls  = "text-green-800 font-bold" if is_winner else "font-bold"
        html += f"""
    <div class="py-2 {winner_bg}">
      <div class="flex items-baseline justify-between gap-2 mb-1">
        <span class="font-headline text-sm {name_cls}">{check}{c['name']}</span>
        <div class="flex items-baseline gap-3 shrink-0">
          <span class="text-sm {pct_cls} tabular-nums">{pct:.1f}%</span>
          <span class="text-xs text-gray-500 tabular-nums w-16 text-right">{votes:,}</span>
        </div>
      </div>
      <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div class="h-full {bar_color} rounded-full {'opacity-100' if is_winner else 'opacity-75'}" style="width:{pct:.1f}%"></div>
      </div>
    </div>"""
    return html

def reporting_footer(race):
    return f"""
  <div class="pt-3 border-t border-gray-100 mt-1">
    <div class="flex items-center justify-between mb-1">
      <span class="text-xs text-gray-500">{race['precincts_reporting']:,} of {race['precincts_total']:,} precincts reporting</span>
      <span class="text-xs font-bold text-bdn-green">{race['pct_reporting']}%</span>
    </div>
    <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div class="h-full bg-bdn-green rounded-full" style="width:{race['pct_reporting']}%"></div>
    </div>
  </div>"""

def foot():
    return """
<footer class="border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-500">
  Results by <a href="https://decisiondeskhq.com" class="text-bdn-green hover:underline">Decision Desk HQ</a> · © 2026 Bangor Daily News
</footer>
</body></html>"""

# ── Race pages ────────────────────────────────────────────────────────────────

def generate_race_page(race):
    slug  = race["slug"]
    title = race_display_title(race)
    party_label = f"{race['party']} Primary"

    # Sort candidates by votes
    sorted_cands = sorted(race["candidates"], key=lambda c: -c["votes"])
    leader = sorted_cands[0]
    margin_votes = sorted_cands[0]["votes"] - sorted_cands[1]["votes"] if len(sorted_cands) > 1 else 0
    margin_pts   = sorted_cands[0]["pct"]   - sorted_cands[1]["pct"]   if len(sorted_cands) > 1 else 0

    # Town results table
    town_rows = ""
    if race["vcu_results"]:
        last_cols = "".join(f'<th class="text-right px-3 py-2 font-medium">{c["last"]}</th>' for c in sorted_cands)
        town_rows += f"""
<div class="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
  <div class="px-5 py-3 border-b border-gray-200">
    <h2 class="font-headline text-sm uppercase tracking-wide text-gray-500">Results by Town</h2>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          <th class="text-left px-4 py-2 font-medium">Town</th>
          {last_cols}
          <th class="text-right px-4 py-2 font-medium">Total</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">"""

        for vcu in sorted(race["vcu_results"], key=lambda v: -sum(v["votes"].values())):
            town_total = sum(vcu["votes"].values())
            tslug = town_slug(vcu["town"])
            td_vals = ""
            local_leader_last = max(vcu["votes"], key=vcu["votes"].get)
            for c in sorted_cands:
                v = vcu["votes"].get(c["last"], 0)
                p = v / town_total * 100 if town_total else 0
                bold = 'font-bold' if c["last"] == local_leader_last else ''
                td_vals += f'<td class="text-right px-3 py-2 tabular-nums {bold}">{p:.1f}%</td>'

            town_rows += f"""
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-2">
            <a href="../towns/{tslug}.html" class="text-bdn-green hover:underline font-medium">{vcu['town']}</a>
            <span class="text-xs text-gray-500 ml-1">{vcu['county']} Co.</span>
          </td>
          {td_vals}
          <td class="text-right px-4 py-2 text-gray-500 tabular-nums">{town_total:,}</td>
        </tr>"""

        town_rows += """
      </tbody>
    </table>
  </div>
</div>"""

    annotation_html = ""
    if race.get("annotation"):
        annotation_html = f"""
<div class="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-3 flex gap-2">
  <span class="text-amber-600 shrink-0">📝</span>
  <p class="text-xs italic text-amber-900">{race['annotation']}</p>
</div>"""

    winner_banner = ""
    if race["called"] and race.get("called_winner_full"):
        winner_banner = f"""
<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
  <p class="font-headline text-lg text-green-800">✓ {race['called_winner_full']} wins the {party_label}</p>
  <p class="text-sm text-green-700 mt-0.5">{leader['pct']:.1f}% · Leads by {margin_pts:.1f} pts ({margin_votes:,} votes) with {race['pct_reporting']}% reporting</p>
</div>"""

    calls_log = ""
    if race["called"]:
        calls_log = f"""
<div class="bg-white rounded-lg border border-gray-200 p-5 mt-4">
  <h2 class="font-headline text-sm uppercase tracking-wide text-gray-500 mb-3">Calls Log</h2>
  <div class="border-l-4 border-bdn-green pl-4">
    <p class="text-sm font-bold">9:31 p.m. — {race['called_winner_full']} wins {title} {party_label}</p>
    <p class="text-xs text-gray-500 mt-0.5">Called by Decision Desk HQ · {race['pct_reporting']}% reporting · +{margin_pts:.1f} pts</p>
  </div>
</div>"""

    html = head(f"{title} — {party_label}") + bdn_header("../../prototype.html") + f"""
<main class="max-w-5xl mx-auto px-4 py-6">

  <nav class="text-sm text-gray-500 mb-4">
    <a href="../../prototype.html" class="hover:text-bdn-green">Results</a>
    <span class="mx-2">›</span>
    <span>{title}</span>
  </nav>

  <div class="mb-5">
    <div class="flex items-center gap-2 mb-1">
      <span class="text-white text-xs font-headline uppercase tracking-wide px-2 py-0.5 rounded" style="background:{race['party_color']}">{party_label}</span>
      {status_badge(race)}
    </div>
    <h1 class="font-headline text-3xl md:text-4xl uppercase tracking-tight">{title}</h1>
    <p class="text-gray-500 text-sm mt-1">June 9, 2026 Primary</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <div class="lg:col-span-2">
      {winner_banner}
      {annotation_html}
      <div class="bg-white rounded-lg border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-headline text-sm uppercase tracking-wide text-gray-500">Statewide Results</h2>
        </div>
        <div class="divide-y divide-gray-100">
          {candidate_rows_html(race)}
        </div>
        {reporting_footer(race)}
      </div>
      {town_rows}
      {calls_log}
    </div>

    <div class="space-y-4">
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="font-headline text-sm uppercase tracking-wide text-gray-500">Map</h3>
        </div>
        <div class="h-52 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
          Interactive map — election night
        </div>
      </div>

      <div class="bg-bdn-light border border-bdn-green/20 rounded-lg p-4">
        <h3 class="font-headline text-sm uppercase tracking-wide text-bdn-green mb-2">🔔 Get alerts</h3>
        <p class="text-xs text-gray-700 mb-3">We'll email you when this race is called or hits 90% reporting.</p>
        <input type="email" placeholder="your@email.com" class="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-white mb-2 focus:outline-none focus:border-bdn-green" disabled>
        <button class="w-full bg-bdn-green text-white py-2 rounded text-sm font-headline uppercase tracking-wide opacity-50 cursor-not-allowed" disabled>Notify me</button>
        <p class="text-xs text-gray-400 mt-2">Sign-up available before June 9.</p>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-2">
        <div class="flex justify-between"><span class="text-gray-500">Candidates</span><span class="font-medium">{len(race['candidates'])}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">Total votes</span><span class="font-medium tabular-nums">{race['total_votes']:,}</span></div>
        <div class="flex justify-between"><span class="text-gray-500">Winner advances to</span><span class="font-medium">Nov. 3 general</span></div>
      </div>
    </div>
  </div>
</main>
""" + foot()

    out = RACES_DIR / f"{slug}.html"
    out.write_text(html)
    print(f"  races/{slug}.html")

# ── Town pages ────────────────────────────────────────────────────────────────

COUNTY_NAMES = {
    "AND":"Androscoggin","ARO":"Aroostook","CUM":"Cumberland","FRA":"Franklin",
    "HAN":"Hancock","KEN":"Kennebec","KNO":"Knox","LIN":"Lincoln","OXF":"Oxford",
    "PEN":"Penobscot","PIS":"Piscataquis","SAG":"Sagadahoc","SOM":"Somerset",
    "WAL":"Waldo","WAS":"Washington","YOR":"York",
}

def generate_town_page(municipality):
    muni_upper = municipality.upper()
    ctx_row    = ctx.get(muni_upper, {})
    county_abbr = ctx_row.get("county", "")
    county_name = COUNTY_NAMES.get(county_abbr, county_abbr)
    display_name = municipality.title()
    slug = town_slug(municipality)

    # Registration stats
    dem_elig = int(float(ctx_row.get("dem_eligible_2026", 0) or 0))
    rep_elig = int(float(ctx_row.get("rep_eligible_2026", 0) or 0))
    dem_reg  = int(float(ctx_row.get("dem_registered",   0) or 0))
    rep_reg  = int(float(ctx_row.get("rep_registered",   0) or 0))
    unenr    = int(float(ctx_row.get("unenrolled_registered", 0) or 0))
    total    = int(float(ctx_row.get("total_registered", 0) or 0))

    # Live race results for this town
    live_races = town_races.get(muni_upper, [])
    # Also check title-case match
    if not live_races:
        live_races = town_races.get(display_name.upper(), [])

    live_html = ""
    if live_races:
        live_html = '<div class="space-y-4 mb-8">'
        for race, vcu in live_races:
            votes_dict = vcu["votes"]
            town_total = sum(votes_dict.values())
            local_sorted = sorted(race["candidates"], key=lambda c: -(votes_dict.get(c["last"], 0)))
            local_leader = local_sorted[0]
            party_label  = f"{race['party']} Primary"
            rtitle = race_display_title(race)
            winner = race["called_winner"] if race["called"] else None

            live_html += f"""
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
      <div>
        <a href="../races/{race['slug']}.html" class="font-headline text-lg uppercase tracking-tight hover:text-bdn-green">{rtitle}</a>
        <span class="ml-2 text-white text-xs px-2 py-0.5 rounded font-headline" style="background:{race['party_color']}">{party_label}</span>
      </div>
      {status_badge(race)}
    </div>
    <div class="px-5 py-4 divide-y divide-gray-100">
      {candidate_rows_html(race, votes_dict)}
    </div>
    <div class="px-5 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
      <span class="text-xs text-gray-500 font-medium">{town_total:,} votes cast in {display_name} · Local leader: {local_leader['name']}</span>
      <a href="../races/{race['slug']}.html" class="text-xs text-bdn-green hover:underline">Statewide →</a>
    </div>
  </div>"""
        live_html += "</div>"
    else:
        live_html = """
<div class="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-8 text-center">
  <p class="font-headline text-base text-gray-600">Results will appear here as precincts report on June 9, 2026.</p>
</div>"""

    # 2018 Dem context
    dem18_town = dem18.get(muni_upper, {})
    dem18_html = ""
    if dem18_town:
        dem_cands = sorted(dem18_town.items(), key=lambda x: -x[1]["votes"])
        dem18_total = sum(v["votes"] for v in dem18_town.values())
        dem_2018_ballots = int(float(ctx_row.get("dem_2018_ballots", 0) or 0))
        dem_reg_2017     = int(float(ctx_row.get("dem_registered_2017", 0) or 0))
        dem_turnout_pct  = ctx_row.get("dem_turnout_2018_pct", "")

        bar_rows = ""
        for short, data in dem_cands:
            full = data["full"]
            last = full.split(",")[0]
            pct  = data["pct"]
            bar_rows += f"""
      <div class="mb-2">
        <div class="flex justify-between text-xs mb-0.5">
          <span class="text-gray-700">{last}</span>
          <span class="font-bold tabular-nums">{pct:.1f}%</span>
        </div>
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-dem rounded-full opacity-60" style="width:{pct:.1f}%"></div>
        </div>
      </div>"""

        turnout_note = f" · {dem_turnout_pct}% turnout" if dem_turnout_pct else ""
        dem18_html = f"""
    <div>
      <h3 class="font-headline text-sm uppercase tracking-wide text-gray-500 mb-3">2018 Gov. — Democratic First Choice</h3>
      {bar_rows}
      <p class="text-xs text-gray-400 mt-2">{dem18_total:,} ballots{turnout_note} (closed primary)</p>
    </div>"""

    # 2018 Rep context
    rep18_town = rep18.get(muni_upper, {})
    rep18_html = ""
    if rep18_town:
        rep_candidates = [
            ("Moody", int(rep18_town.get("moody", 0) or 0)),
            ("Mason", int(rep18_town.get("mason", 0) or 0)),
            ("Mayhew", int(rep18_town.get("mayhew", 0) or 0)),
            ("Fredette", int(rep18_town.get("fredette", 0) or 0)),
        ]
        rep_total = int(float(rep18_town.get("total_ballots", 0) or 0))
        rep_turnout = ctx_row.get("rep_turnout_2018_pct", "")
        bar_rows = ""
        for name, votes in sorted(rep_candidates, key=lambda x: -x[1]):
            pct = votes / rep_total * 100 if rep_total else 0
            bar_rows += f"""
      <div class="mb-2">
        <div class="flex justify-between text-xs mb-0.5">
          <span class="text-gray-700">{name}</span>
          <span class="font-bold tabular-nums">{pct:.1f}%</span>
        </div>
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-rep rounded-full opacity-60" style="width:{pct:.1f}%"></div>
        </div>
      </div>"""
        turnout_note = f" · {rep_turnout}% turnout" if rep_turnout else ""
        rep18_html = f"""
    <div class="mt-6">
      <h3 class="font-headline text-sm uppercase tracking-wide text-gray-500 mb-3">2018 Gov. — Republican Results</h3>
      {bar_rows}
      <p class="text-xs text-gray-400 mt-2">{rep_total:,} ballots{turnout_note} (closed primary)</p>
    </div>"""

    context_html = ""
    if dem18_html or rep18_html:
        context_html = f"""
<div class="bg-white rounded-lg border border-gray-200 p-5 mt-6">
  <h2 class="font-headline text-base uppercase tracking-wide text-gray-500 mb-4">2018 Primary Context</h2>
  <p class="text-xs text-gray-400 mb-4 italic">
    2018 had closed primaries — enrolled party members only. In 2026, unenrolled voters may also participate.
    Direct turnout comparison not valid; shown as geographic reference only.
  </p>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    {dem18_html}
    {rep18_html}
  </div>
</div>"""

    reg_html = f"""
<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
  <div class="bg-white rounded-lg border border-gray-200 p-3 text-center">
    <p class="text-xs text-gray-500 font-headline uppercase">Dem Eligible 2026</p>
    <p class="text-2xl font-headline font-bold text-dem mt-0.5">{dem_elig:,}</p>
    <p class="text-xs text-gray-400">{dem_reg:,} enrolled + {unenr:,} unenrolled</p>
  </div>
  <div class="bg-white rounded-lg border border-gray-200 p-3 text-center">
    <p class="text-xs text-gray-500 font-headline uppercase">Rep Eligible 2026</p>
    <p class="text-2xl font-headline font-bold text-rep mt-0.5">{rep_elig:,}</p>
    <p class="text-xs text-gray-400">{rep_reg:,} enrolled + {unenr:,} unenrolled</p>
  </div>
  <div class="bg-white rounded-lg border border-gray-200 p-3 text-center">
    <p class="text-xs text-gray-500 font-headline uppercase">Total Registered</p>
    <p class="text-2xl font-headline font-bold text-gray-700 mt-0.5">{total:,}</p>
  </div>
  <div class="bg-white rounded-lg border border-gray-200 p-3 text-center">
    <p class="text-xs text-gray-500 font-headline uppercase">County</p>
    <p class="text-xl font-headline font-bold text-gray-700 mt-0.5">{county_name}</p>
  </div>
</div>"""

    html = head(display_name) + bdn_header("../../prototype.html") + f"""
<main class="max-w-5xl mx-auto px-4 py-6">

  <nav class="text-sm text-gray-500 mb-4">
    <a href="../../prototype.html" class="hover:text-bdn-green">Results</a>
    <span class="mx-2">›</span>
    <span>Towns</span>
    <span class="mx-2">›</span>
    <span>{display_name}</span>
  </nav>

  <div class="mb-5 border-b border-gray-200 pb-4">
    <h1 class="font-headline text-3xl md:text-4xl uppercase tracking-tight">{display_name}</h1>
    <p class="text-gray-500 text-sm mt-1">{county_name} County · June 9, 2026 Primary</p>
  </div>

  {reg_html}
  {live_html}
  {context_html}

</main>
""" + foot()

    out = TOWNS_DIR / f"{slug}.html"
    out.write_text(html)

# ── Run ───────────────────────────────────────────────────────────────────────

print("Generating race pages...")
for race in RACES:
    generate_race_page(race)

print(f"\nGenerating town pages ({len(ctx)} towns)...")
for i, muni in enumerate(sorted(ctx.keys()), 1):
    generate_town_page(muni)
    if i % 50 == 0:
        print(f"  {i}/{len(ctx)}...")

print(f"\nPatching prototype.html links...")
proto = (ROOT / "prototype.html").read_text()
replacements = [
    # Town quick-links in modal
    ('>Bangor<',        f'>Bangor<', f'href="towns/bangor.html"'),
    ('>Portland<',      f'>Portland<', f'href="towns/portland.html"'),
    ('>Lewiston<',      f'>Lewiston<', f'href="towns/lewiston.html"'),
    ('>Caribou<',       f'>Caribou<', f'href="towns/caribou.html"'),
]
# Replace href="#" before each town name in the modal
for old_name, _, new_href in replacements:
    proto = re.sub(
        rf'href="#"([^>]*){re.escape(old_name)}',
        lambda m, h=new_href, t=old_name: f'{h}{m.group(1)}{t}',
        proto
    )
# Wire up race card "View full results" / race card links
for race in RACES:
    title = race_display_title(race).replace(", District", " CD")
    proto = proto.replace(
        f'href="#{race["slug"]}"',
        f'href="races/{race["slug"]}.html"'
    )
(ROOT / "prototype.html").write_text(proto)

print("\nDone.")
print(f"  {len(RACES)} race pages → races/")
print(f"  {len(ctx)} town pages → towns/")
