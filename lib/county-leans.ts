// County-level candidate lean multipliers for RCV geographic weighting.
//
// Each entry is a multiplier on the candidate's statewide poll share:
//   1.0 = exactly at poll average for this county
//   1.8 = 80% stronger than poll average (home territory)
//   0.6 = 40% weaker than poll average
//
// County vote-weight fractions (used as fallback totals when DDHQ turnout_mid
// is unavailable) are derived from the 2018 Republican Governor primary
// municipality-level results — the most recent statewide contested primary
// with town-level data — as a proxy for primary electorate size distribution.
//
// Candidate geography (2026):
//   Gov Dem:
//     Jackson  – Allagash (Aroostook): rural northern Maine legislator, Speaker
//     Shah     – South Portland (Cumberland): urban/suburban, young progressive
//     Pingree  – North Haven (Knox): coastal mid-Maine, former CD1 Congress.
//     Bellows  – Manchester (Kennebec): central Maine, current Sec. of State
//     King III – son of Sen. Angus King; broadly known statewide
//   Gov Rep:
//     Leans are used only to adjust remaining-vote estimates; 2018 round-1
//     data would be stale for a different 8-candidate field, so we leave them
//     uniform (leans = 1.0 everywhere) and let Bayesian updating do the work.
//   CD2 Dem:
//     Baldacci – Bangor (Penobscot): former Mayor, son of Gov. John Baldacci
//     Dunlap   – Old Town (Penobscot): former Secretary of State
//     Loud     – western Maine; lower geographic signal
//     Wood     – western/central CD2; lower geographic signal

export interface CountyLeans {
  /** county full name → candidate DDHQ ID → lean multiplier */
  leans: Record<string, Record<number, number>>
  /** county full name → fraction of total statewide primary electorate */
  weights: Record<string, number>
}

// ── County electorate weights (2018 GOP primary proxy) ────────────────────────
// These fractions sum to 1.0.  Used when DDHQ county estimated_votes is 0.
const GOV_COUNTY_WEIGHTS: Record<string, number> = {
  Cumberland:    0.2026,
  York:          0.1350,
  Penobscot:     0.1121,
  Kennebec:      0.0994,
  Androscoggin:  0.0689,
  Hancock:       0.0473,
  Oxford:        0.0464,
  Aroostook:     0.0459,
  Somerset:      0.0403,
  Lincoln:       0.0370,
  Waldo:         0.0326,
  Knox:          0.0323,
  Sagadahoc:     0.0306,
  Franklin:      0.0284,
  Washington:    0.0245,
  Piscataquis:   0.0167,
}

// CD2 excludes most of Cumberland and York; weight remaining CD2 counties.
// (DDHQ returns county objects only for the district, so this is just a
// fallback; we renormalize over whatever counties DDHQ includes.)
const CD2_COUNTY_WEIGHTS: Record<string, number> = {
  Penobscot:     0.2320,
  Androscoggin:  0.1420,
  Kennebec:      0.1390,  // partial — only CD2 towns
  Oxford:        0.0960,
  Aroostook:     0.0950,
  Somerset:      0.0830,
  Hancock:       0.0630,  // partial
  Franklin:      0.0590,
  Lincoln:       0.0360,  // partial
  Waldo:         0.0310,  // partial
  Washington:    0.0240,
  Piscataquis:   0.0200,
}

// ── Democratic Governor ────────────────────────────────────────────────────────
// candIds: Bellows=950890, Jackson=950891, King=950892, Pingree=950893, Shah=950894

const DEM_GOV_LEANS: Record<string, Record<number, number>> = {
  // Jackson's stronghold: northern / rural Maine
  Aroostook:   { 950891: 2.2, 950894: 0.65, 950893: 0.55, 950892: 0.90, 950890: 0.70 },
  Piscataquis: { 950891: 1.9, 950894: 0.70, 950893: 0.60, 950892: 0.90, 950890: 0.80 },
  Washington:  { 950891: 1.8, 950894: 0.70, 950893: 0.65, 950892: 0.85, 950890: 0.80 },
  Somerset:    { 950891: 1.6, 950894: 0.75, 950893: 0.70, 950892: 0.95, 950890: 0.90 },
  Oxford:      { 950891: 1.5, 950894: 0.80, 950893: 0.75, 950892: 0.95, 950890: 0.90 },
  Franklin:    { 950891: 1.4, 950894: 0.80, 950893: 0.75, 950892: 1.00, 950890: 1.10 },
  // Penobscot: Jackson's regional center (Bangor is here), also some Shah
  Penobscot:   { 950891: 1.35, 950894: 1.00, 950893: 0.85, 950892: 0.95, 950890: 0.90 },
  // Pingree's coastal stronghold
  Knox:        { 950893: 2.10, 950892: 1.10, 950894: 0.90, 950891: 0.65, 950890: 0.80 },
  Lincoln:     { 950893: 1.75, 950892: 1.15, 950894: 0.90, 950891: 0.70, 950890: 0.85 },
  Waldo:       { 950893: 1.45, 950892: 1.10, 950894: 0.90, 950891: 0.90, 950890: 0.90 },
  Hancock:     { 950893: 1.35, 950892: 1.15, 950894: 0.85, 950891: 0.85, 950890: 0.80 },
  // Shah + Pingree: southern coastal / urban
  Cumberland:  { 950894: 1.45, 950893: 1.25, 950891: 0.50, 950890: 1.15, 950892: 1.05 },
  York:        { 950894: 1.40, 950893: 1.15, 950891: 0.55, 950890: 1.05, 950892: 1.00 },
  Sagadahoc:   { 950894: 1.20, 950893: 1.15, 950891: 0.75, 950890: 1.05, 950892: 1.05 },
  // Bellows home + King's father base: central Maine
  Kennebec:    { 950890: 1.55, 950892: 1.20, 950894: 0.95, 950891: 0.90, 950893: 0.90 },
  Androscoggin:{ 950890: 1.10, 950892: 1.00, 950894: 1.05, 950891: 1.05, 950893: 0.90 },
}

// ── Republican Governor ───────────────────────────────────────────────────────
// 2026 GOP field (Bush/Charles/Jones/Libby/Mason/McCarthy/Midgley/Wessels) is
// completely different from 2018; we have no reliable geographic priors.
// Returning empty → forecast uses statewide Bayesian update only.
const GOP_GOV_LEANS: Record<string, Record<number, number>> = {}

// ── CD2 Democratic ─────────────────────────────────────────────────────────────
// candIds: Baldacci=950886, Dunlap=950887, Loud=950888, Wood=950889

const CD2_DEM_LEANS: Record<string, Record<number, number>> = {
  // Both Baldacci and Dunlap are from Penobscot County (Bangor/Old Town)
  Penobscot:   { 950886: 1.80, 950887: 1.70, 950888: 0.80, 950889: 0.75 },
  Aroostook:   { 950886: 1.30, 950887: 1.10, 950888: 0.85, 950889: 0.85 },
  Washington:  { 950886: 1.25, 950887: 1.05, 950888: 0.90, 950889: 0.90 },
  Piscataquis: { 950886: 1.20, 950887: 1.10, 950888: 0.90, 950889: 0.90 },
  Somerset:    { 950886: 1.10, 950887: 1.00, 950888: 0.95, 950889: 0.95 },
  // Androscoggin / Oxford: working-class western Maine, Loud and Wood base
  Androscoggin:{ 950886: 0.85, 950887: 0.90, 950888: 1.15, 950889: 1.20 },
  Oxford:      { 950886: 0.85, 950887: 0.90, 950888: 1.15, 950889: 1.20 },
  Franklin:    { 950886: 0.90, 950887: 0.90, 950888: 1.10, 950889: 1.15 },
  // Kennebec / Hancock / coastal
  Kennebec:    { 950886: 1.00, 950887: 1.05, 950888: 1.00, 950889: 0.95 },
  Hancock:     { 950886: 0.90, 950887: 0.95, 950888: 1.05, 950889: 1.10 },
  Waldo:       { 950886: 0.95, 950887: 0.95, 950888: 1.05, 950889: 1.05 },
  Lincoln:     { 950886: 0.90, 950887: 0.95, 950888: 1.05, 950889: 1.10 },
}

export const COUNTY_LEANS: Record<string, CountyLeans> = {
  'governor-democratic-primary': {
    leans: DEM_GOV_LEANS,
    weights: GOV_COUNTY_WEIGHTS,
  },
  'governor-republican-primary': {
    leans: GOP_GOV_LEANS,
    weights: GOV_COUNTY_WEIGHTS,
  },
  'us-house-district-2-democratic-primary': {
    leans: CD2_DEM_LEANS,
    weights: CD2_COUNTY_WEIGHTS,
  },
}
