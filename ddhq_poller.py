"""
DDHQ API poller — fetches race results and writes to Supabase.

Usage:
    python3 ddhq_poller.py               # poll once
    python3 ddhq_poller.py --loop        # poll every 60s
    python3 ddhq_poller.py --dry-run     # fetch and print, no DB write

Requires .env.local:
    DDHQ_CLIENT_ID=...
    DDHQ_CLIENT_SECRET=...
    SUPABASE_URL=...
    SUPABASE_SERVICE_KEY=...

DDHQ API base: https://votes.decisiondeskhq.com
Token endpoint: POST /oauth/token  (client_credentials)
Races endpoint: GET  /api/v4/races?election_id=<id>&state=ME
Race endpoint:  GET  /api/v4/race/<race_id>         (includes vcu_results)
Calls endpoint: GET  /api/v4/race-calls?election_id=<id>
"""

import os, sys, time, json, argparse, logging
from datetime import datetime, timezone
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ddhq_poller")

# ── config ────────────────────────────────────────────────────────────────────

def load_env(path=".env.local"):
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    except FileNotFoundError:
        pass
    return env

ENV = load_env()

DDHQ_BASE       = "https://resultsapi.decisiondeskhq.com"
DDHQ_CLIENT_ID  = ENV.get("DDHQ_CLIENT_ID")  or os.environ.get("DDHQ_CLIENT_ID")
DDHQ_CLIENT_SECRET = ENV.get("DDHQ_CLIENT_SECRET") or os.environ.get("DDHQ_CLIENT_SECRET")
SUPABASE_URL    = ENV.get("SUPABASE_URL")     or os.environ.get("SUPABASE_URL")
SUPABASE_KEY    = ENV.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")

# Maine June 2026 primary election ID — confirm with DDHQ once connected
ELECTION_ID     = ENV.get("DDHQ_ELECTION_ID") or os.environ.get("DDHQ_ELECTION_ID", "")

POLL_INTERVAL   = 60   # seconds between polls on election night
TOKEN_MARGIN    = 120  # refresh token 2 min before expiry


# ── OAuth ─────────────────────────────────────────────────────────────────────

class DDHQClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers["Accept"] = "application/json"
        self._token: str | None = None
        self._token_expires: float = 0

    def _ensure_token(self):
        if self._token and time.time() < self._token_expires - TOKEN_MARGIN:
            return
        log.info("Fetching DDHQ OAuth token…")
        resp = self.session.post(
            f"{DDHQ_BASE}/api/v4/oauth/token",
            json={
                "grant_type": "client_credentials",
                "client_id": DDHQ_CLIENT_ID,
                "client_secret": DDHQ_CLIENT_SECRET,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]
        expires_in  = data.get("expires_in", 3600)
        self._token_expires = time.time() + expires_in
        self.session.headers["Authorization"] = f"Bearer {self._token}"
        log.info(f"Token acquired, expires in {expires_in}s")

    def get(self, path: str, **params) -> dict:
        self._ensure_token()
        resp = self.session.get(f"{DDHQ_BASE}{path}", params=params, timeout=20)
        resp.raise_for_status()
        return resp.json()

    def get_races(self) -> list:
        """Paginate through all Maine June 9 races."""
        all_races = []
        page = 1
        while True:
            data = self.get("/api/v4/races", state="ME", race_date="2026-06-09", limit=100, page=page)
            all_races.extend(data.get("data", []))
            if page >= data.get("total_pages", 1):
                break
            page += 1
        return all_races

    def get_race(self, race_id) -> dict:
        return self.get(f"/api/v4/race/{race_id}")

    def get_calls(self) -> list:
        return self.get("/api/v4/race-calls", state="ME", race_date="2026-06-09")


# ── Supabase writer ───────────────────────────────────────────────────────────

class SupabaseWriter:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        })

    def upsert(self, table: str, rows: list):
        if not rows:
            return
        resp = self.session.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            json=rows,
            timeout=20,
        )
        if not resp.ok:
            log.error(f"Supabase upsert {table} failed: {resp.status_code} {resp.text[:200]}")
        else:
            log.info(f"Upserted {len(rows)} rows → {table}")


# ── transform ─────────────────────────────────────────────────────────────────

def transform_race(raw: dict) -> dict:
    """Flatten DDHQ /api/v4/race/{id} response into our DB schema."""
    topline = raw.get("topline_results") or {}
    precincts = topline.get("precincts") or {}
    called = len(topline.get("called_candidates") or []) > 0

    race_name = f"{raw.get('office','')} {raw.get('party','')} Primary"
    if raw.get("district"):
        race_name = f"{raw.get('office','')} District {raw['district']} {raw.get('party','')} Primary"

    return {
        "race_id":            str(raw["race_id"]),
        "office":             raw.get("office", ""),
        "district":           raw.get("district"),
        "party":              raw.get("party", ""),
        "state":              raw.get("state", "ME"),
        "slug":               slugify(race_name),
        "called":             called,
        "test_data":          raw.get("test_data", False),
        "reporting_type":     raw.get("reporting_type", "precincts"),
        "precincts_reporting": precincts.get("reporting", 0),
        "precincts_total":    precincts.get("total", 0),
        "total_votes":        topline.get("total_votes", 0),
        "candidate_votes":    json.dumps(topline.get("votes") or {}),
        "called_candidates":  json.dumps(topline.get("called_candidates") or []),
        "last_updated":       datetime.now(timezone.utc).isoformat(),
    }


def transform_vcu(race_id: str, county_name: str, vcu: dict) -> dict:
    return {
        "vcu_id":      str(vcu["id"]),
        "race_id":     race_id,
        "vcu_name":    vcu.get("vcu", ""),
        "county_name": county_name,
        "votes":       json.dumps(vcu.get("votes") or {}),
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }


def slugify(s: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# ── poll loop ─────────────────────────────────────────────────────────────────

def poll_once(client: DDHQClient, db, dry_run=False):
    log.info("Polling DDHQ…")
    races = client.get_races()

    # Filter out test data
    live_races = [r for r in races if not r.get("test_data", False)]
    log.info(f"{len(live_races)} live races (filtered {len(races)-len(live_races)} test)")

    race_rows  = []
    vcu_rows   = []
    cand_rows  = []

    for race_summary in live_races:
        rid = str(race_summary["race_id"])
        try:
            race = client.get_race(rid)
        except Exception as e:
            log.warning(f"Failed to fetch race {rid}: {e}")
            continue

        race_rows.append(transform_race(race))

        for county in race.get("counties") or []:
            for vcu in county.get("vcus") or []:
                vcu_rows.append(transform_vcu(rid, county.get("county", ""), vcu))

        for c in race.get("candidates") or []:
            cand_rows.append({
                "cand_id":    str(c["cand_id"]),
                "race_id":    rid,
                "first_name": c.get("first_name", ""),
                "last_name":  c.get("last_name", ""),
                "incumbent":  c.get("incumbent", False),
                "party":      c.get("party_name", ""),
            })

    if dry_run:
        print(json.dumps({"races": race_rows[:2], "vcus": vcu_rows[:5]}, indent=2))
        return

    if db:
        db.upsert("races",      race_rows)
        db.upsert("vcu_results", vcu_rows)
        db.upsert("candidates", cand_rows)

    # Snapshot for momentum tracker
    snap_rows = [
        {
            "race_id":    r["race_id"],
            "ts":         r["last_updated"],
            "pct_reporting": (r["precincts_reporting"] / r["precincts_total"] * 100)
                             if r["precincts_total"] else 0,
            "candidate_votes": r["candidate_votes"],
        }
        for r in race_rows if r["precincts_total"] > 0
    ]
    if db and snap_rows:
        db.upsert("race_snapshots", snap_rows)

    log.info(f"Done — {len(race_rows)} races, {len(vcu_rows)} VCUs")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--loop",    action="store_true", help="Poll every 60s")
    parser.add_argument("--dry-run", action="store_true", help="Print output, skip DB")
    args = parser.parse_args()

    if not DDHQ_CLIENT_ID or not DDHQ_CLIENT_SECRET:
        sys.exit("Missing DDHQ_CLIENT_ID / DDHQ_CLIENT_SECRET in .env.local")

    if not args.dry_run and (not SUPABASE_URL or not SUPABASE_KEY):
        sys.exit("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local (or use --dry-run)")

    client = DDHQClient()
    db     = SupabaseWriter() if not args.dry_run else None

    if args.loop:
        log.info(f"Polling every {POLL_INTERVAL}s. Ctrl-C to stop.")
        while True:
            try:
                poll_once(client, db, dry_run=args.dry_run)
            except Exception as e:
                log.error(f"Poll failed: {e}")
            time.sleep(POLL_INTERVAL)
    else:
        poll_once(client, db, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
