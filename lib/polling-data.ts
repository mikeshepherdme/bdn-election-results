// SurveyUSA Election Poll #27905 (FairVote / Bangor Daily News)
// Conducted 2026-05-28 through 2026-06-03
// n=466 likely GOP primary voters, n=484 likely Dem primary voters, n=190 CD-2 Dem voters

export interface CandidatePollEntry {
  candId: number
  name: string
  firstChoicePct: number // raw poll %, includes undecided universe
}

export interface RacePollingData {
  source: string
  conductedDates: string
  sampleSize: number
  undecidedPct: number // % who said undecided
  candidates: CandidatePollEntry[]
  // secondChoice[fromCandId][toCandId] = raw % of fromCand's first-choice supporters
  // who name toCand as their second choice (from crosstab "1st choice" columns in Q8/Q13/Q31)
  // ** (too few n) → 0; normalization happens in simulation
  secondChoice: Record<number, Record<number, number>>
  // fallback total turnout estimate when DDHQ hasn't populated it yet
  turnoutEstimate: number
}

// DDHQ candidate IDs (from ddhq_races.json):
// Gov Dem: Bellows=950890  Jackson=950891  King=950892  Pingree=950893  Shah=950894
// Gov Rep: Bush=950899  Charles=950900  Jones=950901  Libby=950902  Mason=950903
//          McCarthy=950904  Midgley=950905  Wessels=950906
// CD2 Dem: Baldacci=950886  Dunlap=950887  Loud=950888  Wood=950889

export const POLLING: Record<string, RacePollingData> = {

  // ── Republican Governor ────────────────────────────────────────────────────
  'governor-republican-primary': {
    source: 'SurveyUSA #27905 for FairVote / Bangor Daily News',
    conductedDates: '2026-05-28 – 2026-06-03',
    sampleSize: 466,
    undecidedPct: 18,
    candidates: [
      { candId: 950899, name: 'Jonathan Bush',    firstChoicePct: 17 },
      { candId: 950900, name: 'Bobby Charles',    firstChoicePct: 34 },
      { candId: 950901, name: 'David Jones',      firstChoicePct: 2  },
      { candId: 950902, name: 'James Libby',      firstChoicePct: 0  }, // suspended, rounds to 0%
      { candId: 950903, name: 'Garrett Mason',    firstChoicePct: 10 },
      { candId: 950904, name: 'Owen McCarthy',    firstChoicePct: 7  },
      { candId: 950905, name: 'Benjamin Midgley', firstChoicePct: 10 },
      { candId: 950906, name: 'Robert Wessels',   firstChoicePct: 2  },
    ],
    // Source: Q8 crosstab "GOP 1st Choice" columns — who each candidate's supporters name 2nd
    // Jones/Libby/Wessels cols were all ** (insufficient n); using "All" col as fallback
    secondChoice: {
      // Bush 1st → 2nd choices (column 29 in Q8)
      950899: { 950900: 9, 950901: 2, 950902: 6, 950903: 24, 950904: 4, 950905: 11, 950906: 1 },
      // Charles 1st → 2nd choices (column 30)
      950900: { 950899: 14, 950901: 5, 950902: 1, 950903: 11, 950904: 2, 950905: 10, 950906: 0 },
      // Jones 1st → 2nd choices (all ** → use Q8 "All" column as proxy)
      950901: { 950899: 15, 950900: 10, 950902: 4, 950903: 12, 950904: 3, 950905: 10, 950906: 1 },
      // Libby 1st → 2nd choices (all ** → use Q8 "All" column as proxy)
      950902: { 950899: 15, 950900: 10, 950901: 5, 950903: 12, 950904: 3, 950905: 10, 950906: 1 },
      // Mason 1st → 2nd choices (column 33)
      950903: { 950899: 24, 950900: 11, 950901: 0, 950902: 0, 950904: 6, 950905: 17, 950906: 0 },
      // McCarthy 1st → 2nd choices (column 34)
      950904: { 950899: 24, 950900: 9, 950901: 2, 950902: 0, 950903: 6, 950905: 30, 950906: 2 },
      // Midgley 1st → 2nd choices (column 35)
      950905: { 950899: 24, 950900: 26, 950901: 7, 950902: 6, 950903: 17, 950904: 1, 950906: 2 },
      // Wessels 1st → 2nd choices (all ** → use Q8 "All" column as proxy)
      950906: { 950899: 15, 950900: 10, 950901: 5, 950902: 4, 950903: 12, 950904: 3, 950905: 10 },
    },
    turnoutEstimate: 120_000,
  },

  // ── Democratic Governor ────────────────────────────────────────────────────
  'governor-democratic-primary': {
    source: 'SurveyUSA #27905 for FairVote / Bangor Daily News',
    conductedDates: '2026-05-28 – 2026-06-03',
    sampleSize: 484,
    undecidedPct: 11,
    candidates: [
      { candId: 950890, name: 'Shenna Bellows', firstChoicePct: 11 },
      { candId: 950891, name: 'Troy Jackson',   firstChoicePct: 20 },
      { candId: 950892, name: 'Angus King III', firstChoicePct: 14 },
      { candId: 950893, name: 'Hannah Pingree', firstChoicePct: 19 },
      { candId: 950894, name: 'Nirav Shah',     firstChoicePct: 25 },
    ],
    // Source: Q13 crosstab "Dem 1st Choice" columns
    secondChoice: {
      // Bellows 1st → 2nd choices
      950890: { 950891: 32, 950892: 10, 950893: 33, 950894: 18 },
      // Jackson 1st → 2nd choices
      950891: { 950890: 48, 950892: 5,  950893: 23, 950894: 16 },
      // King 1st → 2nd choices
      950892: { 950890: 26, 950891: 11, 950893: 18, 950894: 18 },
      // Pingree 1st → 2nd choices
      950893: { 950890: 34, 950891: 15, 950892: 11, 950894: 28 },
      // Shah 1st → 2nd choices
      950894: { 950890: 25, 950891: 16, 950892: 23, 950893: 26 },
    },
    turnoutEstimate: 140_000,
  },

  // ── CD2 Democratic ─────────────────────────────────────────────────────────
  'us-house-district-2-democratic-primary': {
    source: 'SurveyUSA #27905 for FairVote / Bangor Daily News',
    conductedDates: '2026-05-28 – 2026-06-03',
    sampleSize: 190,
    undecidedPct: 19,
    candidates: [
      { candId: 950886, name: 'Joseph Baldacci', firstChoicePct: 27 },
      { candId: 950887, name: 'Matthew Dunlap',  firstChoicePct: 22 },
      { candId: 950888, name: 'Paige Loud',      firstChoicePct: 11 },
      { candId: 950889, name: 'Jordan Wood',     firstChoicePct: 21 },
    ],
    // Source: Q31 crosstab "CD-2 1st Choice" columns
    secondChoice: {
      // Baldacci 1st → 2nd choices
      950886: { 950887: 35, 950888: 3,  950889: 28 },
      // Dunlap 1st → 2nd choices
      950887: { 950886: 52, 950888: 10, 950889: 25 },
      // Loud 1st → 2nd choices
      950888: { 950886: 34, 950887: 15, 950889: 40 },
      // Wood 1st → 2nd choices
      950889: { 950886: 33, 950887: 27, 950888: 14 },
    },
    turnoutEstimate: 38_000,
  },
}
