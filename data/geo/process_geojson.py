"""
Processes the Maine town boundary GeoJSON for the BDN election results map.

Input:  ~/Downloads/Maine_Town_and_Townships_Boundary_Polygons_Dissolved_Feature.geojson
Output:
  maine-results.geojson     — 504 election-reporting municipalities, simplified
  maine-unorganized.geojson — dissolved unorganized territories (single polygon), simplified

Each feature in maine-results.geojson has:
  municipality  — canonical name matching registered_voters_by_town.csv
  category      — "results" | "tribal"

Features with no election data (unorganized territories, townships, gores) are
dissolved into a single background polygon in maine-unorganized.geojson.

"Indian Township" (Passamaquoddy) has registration data but no GeoJSON geometry —
logged as a warning. It will appear in town-page data but not on the map.

Geometry is simplified to SIMPLIFY_TOLERANCE degrees (~100m at Maine latitudes).
Target output: maine-results.geojson ~1.5 MB, maine-unorganized.geojson ~200 KB.
"""

import json
import sys
from pathlib import Path

try:
    from shapely.geometry import shape, mapping
    from shapely.ops import unary_union
except ImportError:
    sys.exit("Run: pip3 install shapely")

IN_FILE  = Path.home() / "Downloads" / "Maine_Town_and_Townships_Boundary_Polygons_Dissolved_Feature.geojson"
OUT_DIR  = Path(__file__).parent
SIMPLIFY_TOLERANCE = 0.0008  # ~80m in decimal degrees at Maine latitudes

# ── Name lookup: GeoJSON TOWN → canonical municipality name ──────────────────
# Handles case mismatches, abbreviation differences, and merged features.
# Values must match municipality column in registered_voters_by_town.csv (Title Case).

NAME_MAP = {
    # Simple case/spelling fixes
    "Isle au Haut":              "Isle Au Haut",
    "Sinclair Twp":              "Sinclair",
    "Madawaska Lake Twp":        "Madawaska Lake",
    "Cross Lake Twp":            "Cross Lake Twp (T17 R5)",
    "Prentiss Twp T7 R3 NBPP":  "Prentiss Twp T7 R3 Nbpp",
    # Rockwood Strip is split into two GeoJSON features — both map to one VCU
    "Rockwood Strip T1 R1 NBKP": "Rockwood Strip Twp",
    "Rockwood Strip T2 R1 NBKP": "Rockwood Strip Twp",
    # Tribal voting districts
    "Pleasant Point":            "Pleasant Point Voting District",
    "Indian Island":             "Penobscot Nation Voting District",
    # "Indian Township" (Passamaquoddy at Indian Township) has no GeoJSON feature.
    # It will be logged as missing below.
}

TRIBAL_MUNICIPALITIES = {
    "Pleasant Point Voting District",
    "Penobscot Nation Voting District",
    "Indian Township",  # no geometry — data-only
}

# ── Load registration town list ───────────────────────────────────────────────
REG_FILE = Path(__file__).parent.parent / "historical" / "registered_voters_by_town.csv"
if not REG_FILE.exists():
    sys.exit(f"Run process_historical.py first — missing {REG_FILE}")

import csv
reg_towns = set()
with open(REG_FILE) as f:
    for row in csv.DictReader(f):
        reg_towns.add(row["municipality"].strip().title())

# ── Load GeoJSON ──────────────────────────────────────────────────────────────
print(f"Loading {IN_FILE.name}...")
with open(IN_FILE) as f:
    gj = json.load(f)

features = gj["features"]
print(f"  {len(features)} features")

# ── Classify and process features ────────────────────────────────────────────
results_features   = {}  # municipality → list of shapely geometries (merged for Rockwood)
unorganized_geoms  = []
unmatched_geojson  = []

for feat in features:
    raw_name = feat["properties"]["TOWN"]
    geom = shape(feat["geometry"])

    # Apply name map first
    canonical = NAME_MAP.get(raw_name, raw_name)

    if canonical in reg_towns:
        # Election-reporting municipality
        if canonical not in results_features:
            results_features[canonical] = []
        results_features[canonical].append(geom)
    else:
        # Unorganized territory / no results
        unorganized_geoms.append(geom)
        if not any(kw in raw_name for kw in ("Twp", "Plt", "Gore", "Grant", "Strip",
                                              "Island", "Patent", " R ", "BPP", "WELS",
                                              "NBKP", "NWP", "NBPP", "BKP", "Surplus",
                                              "Township", "T1 ", "T2 ", "T3 ", "T4 ",
                                              "T5 ", "T6 ", "T7 ", "T8 ", "T9 ",
                                              "TA ", "TB ", "TC ", "TD ", "TX ")):
            unmatched_geojson.append(raw_name)

# Registration towns with no GeoJSON geometry
no_geom = sorted(t for t in reg_towns if t not in results_features)
if no_geom:
    print(f"\n  WARNING — {len(no_geom)} registration town(s) with no GeoJSON geometry:")
    for t in no_geom:
        label = " (tribal — data-only)" if t in TRIBAL_MUNICIPALITIES else ""
        print(f"    {t}{label}")

if unmatched_geojson:
    print(f"\n  WARNING — {len(unmatched_geojson)} unexpected unmatched GeoJSON feature(s):")
    for t in unmatched_geojson:
        print(f"    {t}")

# ── Build results GeoJSON ─────────────────────────────────────────────────────
print(f"\nBuilding maine-results.geojson ({len(results_features)} municipalities)...")

out_features = []
for municipality, geoms in sorted(results_features.items()):
    # Merge multi-part features (e.g. Rockwood Strip)
    geom = unary_union(geoms) if len(geoms) > 1 else geoms[0]
    geom = geom.simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
    category = "tribal" if municipality in TRIBAL_MUNICIPALITIES else "results"
    out_features.append({
        "type": "Feature",
        "properties": {"municipality": municipality, "category": category},
        "geometry": mapping(geom),
    })

results_geojson = {"type": "FeatureCollection", "features": out_features}
out_path = OUT_DIR / "maine-results.geojson"
with open(out_path, "w") as f:
    json.dump(results_geojson, f, separators=(",", ":"))

size_kb = out_path.stat().st_size / 1024
print(f"  → maine-results.geojson ({size_kb:.0f} KB)")

# ── Build unorganized territory GeoJSON (dissolved) ──────────────────────────
print(f"Building maine-unorganized.geojson (dissolving {len(unorganized_geoms)} features)...")

dissolved = unary_union(unorganized_geoms)
dissolved = dissolved.simplify(SIMPLIFY_TOLERANCE * 2, preserve_topology=True)

unorg_geojson = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {"category": "unorganized", "label": "Unorganized Territory"},
        "geometry": mapping(dissolved),
    }]
}
out_path2 = OUT_DIR / "maine-unorganized.geojson"
with open(out_path2, "w") as f:
    json.dump(unorg_geojson, f, separators=(",", ":"))

size_kb2 = out_path2.stat().st_size / 1024
print(f"  → maine-unorganized.geojson ({size_kb2:.0f} KB)")

print("\nDone.")
