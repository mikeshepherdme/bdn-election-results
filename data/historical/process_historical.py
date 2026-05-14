"""
Processes 2018 Maine gubernatorial primary results and voter registration
into clean CSVs for the BDN election results app.

Inputs (from ~/Downloads):
  govd-1.xlsx ... govd-5.xlsx  — 2018 Dem gov primary cast vote records (RCV)
  govr.xlsx                    — 2018 Rep gov primary results by town
  E&R 3.7.26 ACTIVE After Inactivation Process.xlsx — March 2026 registration

Fetched from Maine SOS:
  r-e-active1117.txt           — November 2017 registration (2018 turnout denominator)

Outputs (written to ./):
  registered_voters_by_town.csv        (March 2026, town-level)
  gov_dem_2018_firstchoice_by_town.csv (long format, first-choice votes by town)
  gov_rep_2018_by_town.csv             (aggregated by town)
  primary_context.csv                  (joined: 2026 registration + eligibility
                                        + 2018 ballots + valid 2018 turnout %)

2018 turnout denominator: enrolled party members only (closed primary).
2026 eligible denominator: enrolled + unenrolled (semi-open primary).
"""

import re
import sys
from io import StringIO
from pathlib import Path
from urllib.request import urlopen

try:
    import pandas as pd
    import openpyxl  # noqa: F401 — required by pandas Excel engine
except ImportError:
    sys.exit("Run: pip3 install pandas openpyxl")

DOWNLOADS = Path.home() / "Downloads"
OUT_DIR = Path(__file__).parent

# ── Voter registration (March 2026 Excel) ─────────────────────────────────────
# Columns: COUNTY, MUNICIPALITY, W/P, CG, SS, SR, CC, D, G, L, R, U, TOTAL, Column1
# Note: no NL (No Labels) column in this file vs. the older SOS text format.

REG_FILE = DOWNLOADS / "E&R 3.7.26 ACTIVE After Inactivation Process.xlsx"

print("Reading March 2026 voter registration file...")
reg_raw = pd.read_excel(
    REG_FILE,
    sheet_name="Registered And Enrolled Voters ",
    header=0,
    engine="openpyxl",
)
reg_raw = reg_raw.rename(columns={
    "COUNTY": "county", "MUNICIPALITY": "municipality",
    "D": "dem", "G": "green", "L": "lib", "R": "rep", "U": "unenrolled", "TOTAL": "total",
})
reg_raw = reg_raw[["county", "municipality", "dem", "rep", "green", "lib", "unenrolled", "total"]]
reg_raw = reg_raw[reg_raw["municipality"].notna()].copy()

reg = (
    reg_raw
    .groupby(["county", "municipality"])[["dem", "rep", "green", "lib", "unenrolled", "total"]]
    .sum()
    .reset_index()
)
reg.columns = ["county", "municipality", "dem_registered", "rep_registered",
               "green_registered", "lib_registered", "unenrolled_registered", "total_registered"]

reg.to_csv(OUT_DIR / "registered_voters_by_town.csv", index=False)
print(f"  → registered_voters_by_town.csv ({len(reg)} towns)")


# ── November 2017 registration (2018 turnout denominator) ────────────────────
# 2018 had closed primaries: only enrolled party members could vote.
# Columns: COUNTY|MUNICIPALITY|W/P|CG|SS|SR|CC|D|G|L|R|U|TOTAL| (trailing pipe)

REG_2017_URL = "https://www.maine.gov/sos/sites/maine.gov.sos/files/data-text/r-e-active1117.txt"

print("\nFetching November 2017 voter registration file...")
with urlopen(REG_2017_URL) as f:
    text_2017 = f.read().decode("utf-8", errors="replace")

reg17_raw = pd.read_csv(StringIO(text_2017), sep="|", header=0)
reg17_raw = reg17_raw.iloc[:, :13]  # drop trailing empty column from trailing pipe
reg17_raw.columns = ["county", "municipality", "ward_precinct", "cg", "ss", "sr", "cc",
                     "dem", "green", "lib", "rep", "unenrolled", "total"]
reg17_raw = reg17_raw[reg17_raw["municipality"].notna()].copy()

reg17 = (
    reg17_raw
    .groupby(["county", "municipality"])[["dem", "rep"]]
    .sum()
    .reset_index()
)
reg17.columns = ["county", "municipality", "dem_registered_2017", "rep_registered_2017"]
reg17["municipality"] = reg17["municipality"].str.upper()
print(f"  → {len(reg17)} towns parsed from 2017 file")


# ── 2018 Democratic primary CVR processing ────────────────────────────────────

def extract_town(precinct):
    p = str(precinct).strip()
    if p.isdigit() or p.upper() == "UOCAVA":
        return None
    p = re.sub(r"\s+All$", "", p, flags=re.IGNORECASE)
    # "W3 P1", "W1 P2, P45", "W1" — strip from first W\d onward
    p = re.sub(r"\s+W\d+.*$", "", p, flags=re.IGNORECASE)
    p = re.sub(r"\s+P\d+.*$", "", p, flags=re.IGNORECASE)
    p = re.sub(r"\s+Ward\s+\d+.*$", "", p, flags=re.IGNORECASE)
    return p.strip() or None


def normalize_candidate(name):
    s = str(name).strip()
    if s.lower() in ("undervote", "overvote", "write-in", "nan", ""):
        return None
    return re.sub(r"\s*\(\d+\)\s*$", "", s).strip()


# govd-3 and govd-5 are UOCAVA-only (no town association) — still include
# them in the statewide totals but skip town-level attribution.
DEM_FILES = ["govd-1.xlsx", "govd-2.xlsx", "govd-3.xlsx", "govd-4.xlsx", "govd-5.xlsx"]

chunks = []
print("Processing 2018 Dem CVR files...")
for fname in DEM_FILES:
    path = DOWNLOADS / fname
    if not path.exists():
        print(f"  MISSING: {path} — skipping")
        continue
    df = pd.read_excel(path, header=0, engine="openpyxl")
    precinct_col = df.columns[1]
    first_col = df.columns[3]
    sub = df[[precinct_col, first_col]].copy()
    sub.columns = ["precinct", "first_choice_raw"]
    sub["town"] = sub["precinct"].apply(extract_town)
    sub["candidate"] = sub["first_choice_raw"].apply(normalize_candidate)
    sub = sub[sub["candidate"].notna()]
    chunks.append(sub)
    print(f"  {fname}: {len(df):,} ballots")

dem_all = pd.concat(chunks, ignore_index=True)

# First-choice by town (excludes UOCAVA rows where town is None)
town_dem = (
    dem_all[dem_all["town"].notna()]
    .groupby(["town", "candidate"])
    .size()
    .reset_index(name="first_choice_votes")
)

# Add town-level total ballots
town_totals = (
    dem_all[dem_all["town"].notna()]
    .groupby("town")
    .size()
    .reset_index(name="town_total_ballots")
)
town_dem = town_dem.merge(town_totals, on="town")
town_dem["first_choice_pct"] = (
    town_dem["first_choice_votes"] / town_dem["town_total_ballots"] * 100
).round(2)

# Canonical short names for readability
SHORT_NAME = {
    "Mills, Janet T.":       "Mills",
    "Eves, Mark W.":         "Eves",
    "Sweet, Elizabeth A.":   "Sweet",
    "Cote, Adam Roland":     "Cote",
    "Dion, Mark N.":         "Dion_Mark",
    "Dion, Donna J.":        "Dion_Donna",
    "Russell, Diane Marie":  "Russell",
}
town_dem["candidate_short"] = town_dem["candidate"].map(SHORT_NAME).fillna(town_dem["candidate"])

town_dem.to_csv(OUT_DIR / "gov_dem_2018_firstchoice_by_town.csv", index=False)
print(f"  → gov_dem_2018_firstchoice_by_town.csv ({town_dem['town'].nunique()} towns)")

# Statewide first-choice totals (for reference)
state_dem = (
    dem_all.groupby("candidate").size().reset_index(name="statewide_first_choice")
    .sort_values("statewide_first_choice", ascending=False)
)
state_dem["candidate_short"] = state_dem["candidate"].map(SHORT_NAME).fillna(state_dem["candidate"])
print("\n  2018 Dem statewide first-choice totals:")
print(state_dem.to_string(index=False))


# ── 2018 Republican primary ───────────────────────────────────────────────────

print("\nProcessing 2018 Rep results...")
rep_path = DOWNLOADS / "govr.xlsx"
rep_raw = pd.read_excel(rep_path, header=0, engine="openpyxl")

# Row 0 after header is the hometown row — drop it
rep_raw = rep_raw.iloc[1:].reset_index(drop=True)

rep = rep_raw[["CTY", "MUNICIPALITY",
               rep_raw.columns[2], rep_raw.columns[3],
               rep_raw.columns[4], rep_raw.columns[5],
               "BLANK", "Total Ballots Cast"]].copy()
rep.columns = ["county", "municipality",
               "fredette", "mason", "mayhew", "moody",
               "blank", "total_ballots"]

# Drop blank rows (totals rows at end of county blocks or grand total)
rep = rep[rep["municipality"].notna() & rep["county"].notna()].copy()
rep[["fredette", "mason", "mayhew", "moody", "blank", "total_ballots"]] = (
    rep[["fredette", "mason", "mayhew", "moody", "blank", "total_ballots"]]
    .apply(pd.to_numeric, errors="coerce")
    .fillna(0)
    .astype(int)
)

rep.to_csv(OUT_DIR / "gov_rep_2018_by_town.csv", index=False)
print(f"  → gov_rep_2018_by_town.csv ({len(rep)} towns)")

print(f"\n  2018 Rep statewide totals:")
for col in ["fredette", "mason", "mayhew", "moody"]:
    print(f"    {col.title()}: {rep[col].sum():,}")
print(f"    Total ballots: {rep['total_ballots'].sum():,}")


# ── Joined context table ──────────────────────────────────────────────────────

print("\nBuilding joined context table...")

# Dem ballots by town from CVR files
dem_pivot = (
    dem_all[dem_all["town"].notna()]
    .groupby("town")
    .size()
    .reset_index(name="dem_2018_ballots")
)
dem_pivot["municipality"] = dem_pivot["town"].str.upper()

# Rep ballots by town
rep_pivot = rep[["county", "municipality", "total_ballots"]].copy()
rep_pivot.columns = ["county", "municipality", "rep_2018_ballots"]
rep_pivot["municipality"] = rep_pivot["municipality"].str.upper()

reg_upper = reg.copy()
reg_upper["municipality"] = reg_upper["municipality"].str.upper()

ctx = reg_upper.merge(
    dem_pivot[["municipality", "dem_2018_ballots"]],
    on="municipality", how="left"
).merge(
    rep_pivot[["municipality", "rep_2018_ballots"]],
    on="municipality", how="left"
)

ctx["dem_2018_ballots"] = ctx["dem_2018_ballots"].fillna(0).astype(int)
ctx["rep_2018_ballots"] = ctx["rep_2018_ballots"].fillna(0).astype(int)

# Join Nov 2017 registration for valid 2018 turnout denominator
ctx = ctx.merge(reg17[["municipality", "dem_registered_2017", "rep_registered_2017"]],
                on="municipality", how="left")

# 2018 turnout: closed primary — enrolled members only
ctx["dem_turnout_2018_pct"] = (
    ctx["dem_2018_ballots"] / ctx["dem_registered_2017"].replace(0, float("nan")) * 100
).round(2)
ctx["rep_turnout_2018_pct"] = (
    ctx["rep_2018_ballots"] / ctx["rep_registered_2017"].replace(0, float("nan")) * 100
).round(2)

# 2026 eligible: semi-open — enrolled + unenrolled
ctx["dem_eligible_2026"] = ctx["dem_registered"] + ctx["unenrolled_registered"]
ctx["rep_eligible_2026"] = ctx["rep_registered"] + ctx["unenrolled_registered"]

ctx.to_csv(OUT_DIR / "primary_context.csv", index=False)
print(f"  → primary_context.csv ({len(ctx)} towns)")
print("  2018 turnout uses Nov 2017 registration (closed primary denominator).")
print("  2026 eligible counts include unenrolled voters (semi-open primary).")

print("\nDone.")
