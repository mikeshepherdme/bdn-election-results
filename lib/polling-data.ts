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
  undecidedPct: number
  candidates: CandidatePollEntry[]
  // All deeper-choice tables keyed by the PREVIOUS choice:
  //   secondChoice[from1stId][to2ndId]   = raw % (Q8 / Q13 / Q31, by 1st-choice column)
  //   thirdChoice[from2ndId][to3rdId]    = raw % (Q9  / Q14 / Q32, by 2nd-choice column)
  //   fourthChoice[from3rdId][to4thId]   = raw % (Q10 / Q15,       by 3rd-choice column)
  //   fifthChoice[from4thId][to5thId]    = raw % (Q11,             by 4th-choice column) — GOP only
  // Diagonal (self-referential) cells in the original cross-tabs are impossible; encoded as 0.
  // ** (insufficient n) cells use the "All" column as a proxy; encoded and labelled below.
  // Normalization (excluding undecided / don't-rank rows, filtering already-ranked candidates)
  // happens at simulation time.
  secondChoice:  Record<number, Record<number, number>>
  thirdChoice?:  Record<number, Record<number, number>>
  fourthChoice?: Record<number, Record<number, number>>
  fifthChoice?:  Record<number, Record<number, number>>
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
      { candId: 950902, name: 'James Libby',      firstChoicePct: 0  }, // suspended
      { candId: 950903, name: 'Garrett Mason',    firstChoicePct: 10 },
      { candId: 950904, name: 'Owen McCarthy',    firstChoicePct: 7  },
      { candId: 950905, name: 'Benjamin Midgley', firstChoicePct: 10 },
      { candId: 950906, name: 'Robert Wessels',   firstChoicePct: 2  },
    ],

    // Q8 cross-tab "GOP 1st Choice" columns
    // Jones/Libby/Wessels 1st-choice cols all **: using Q8 "All" col as proxy
    secondChoice: {
      950899: { 950900:  9, 950901: 2, 950902: 6, 950903: 24, 950904:  4, 950905: 11, 950906: 1 },
      950900: { 950899: 14, 950901: 5, 950902: 1, 950903: 11, 950904:  2, 950905: 10, 950906: 0 },
      950901: { 950899: 15, 950900:10, 950902: 4, 950903: 12, 950904:  3, 950905: 10, 950906: 1 }, // proxy
      950902: { 950899: 15, 950900:10, 950901: 5, 950903: 12, 950904:  3, 950905: 10, 950906: 1 }, // proxy
      950903: { 950899: 24, 950900:11, 950901: 0, 950902:  0, 950904:  6, 950905: 17, 950906: 0 },
      950904: { 950899: 24, 950900: 9, 950901: 2, 950902:  0, 950903:  6, 950905: 30, 950906: 2 },
      950905: { 950899: 24, 950900:26, 950901: 7, 950902:  6, 950903: 17, 950904:  1, 950906: 2 },
      950906: { 950899: 15, 950900:10, 950901: 5, 950902:  4, 950903: 12, 950904:  3, 950905:10 }, // proxy
    },

    // Q9 cross-tab "GOP 2nd Choice" columns
    // Bush-2nd col all **: using Q9 "All" col  (Bush 18, Charles 9, Jones 10, Mason 14, McCarthy 6, Midgley 8, Wessels 2)
    // Midgley-2nd col all **: same proxy
    // Self-referential diagonals set to 0
    thirdChoice: {
      950899: { 950900: 9, 950901:10, 950902: 4, 950903:14, 950904: 6, 950905: 8, 950906: 2 }, // proxy (Bush 2nd → All col)
      950900: { 950899: 0, 950901: 8, 950902: 8, 950903:21, 950904: 8, 950905: 2, 950906: 4 }, // Charles 2nd
      950901: { 950899:24, 950900: 0, 950902: 0, 950903:13, 950904: 8, 950905: 2, 950906: 0 }, // Jones 2nd
      950902: { 950899:25, 950900:21, 950901: 0, 950903:12, 950904: 2, 950905:18, 950906: 4 }, // Libby 2nd
      950903: { 950899:34, 950900: 0, 950901: 9, 950902: 0, 950904: 2, 950905: 0, 950906: 7 }, // Mason 2nd
      950904: { 950899: 7, 950900:13, 950901:23, 950902: 4, 950903: 0, 950905:18, 950906: 2 }, // McCarthy 2nd
      950905: { 950899:18, 950900: 9, 950901:10, 950902: 4, 950903:14, 950904: 6, 950906: 2 }, // proxy (Midgley 2nd → All col)
      950906: { 950899:39, 950900: 7, 950901: 5, 950902: 2, 950903:20, 950904: 7, 950905: 0 }, // Wessels 2nd
    },

    // Q10 cross-tab "GOP 3rd Choice" columns
    // Bush-3rd col all **: using Q10 "All" col  (Bush 11, Charles 7, Jones 15, Libby 5, Mason 10, McCarthy 10, Midgley 7, Wessels 7)
    fourthChoice: {
      950899: { 950900: 7, 950901:15, 950902: 5, 950903:10, 950904:10, 950905: 7, 950906: 7 }, // proxy (Bush 3rd → All col)
      950900: { 950899: 0, 950901:11, 950902: 0, 950903:17, 950904:16, 950905: 5, 950906: 5 }, // Charles 3rd
      950901: { 950899:16, 950900: 0, 950902: 4, 950903:10, 950904:19, 950905: 8, 950906: 3 }, // Jones 3rd
      950902: { 950899:19, 950900:15, 950901: 0, 950903: 5, 950904: 0, 950905: 9, 950906:12 }, // Libby 3rd
      950903: { 950899:27, 950900: 9, 950901:18, 950902: 0, 950904: 4, 950905: 0, 950906:10 }, // Mason 3rd
      950904: { 950899:11, 950900: 0, 950901:35, 950902: 3, 950903: 0, 950905: 7, 950906: 0 }, // McCarthy 3rd
      950905: { 950899: 5, 950900:12, 950901:21, 950902: 9, 950903: 8, 950904: 0, 950906:17 }, // Midgley 3rd
      950906: { 950899:19, 950900: 5, 950901:10, 950902: 5, 950903:14, 950904: 4, 950905: 0 }, // Wessels 3rd
    },

    // Q11 cross-tab "GOP 4th Choice" columns
    // Bush-4th col all **: using Q11 "All" col  (Bush 6, Charles 6, Jones 12, Libby 10, Mason 9, McCarthy 14, Midgley 7, Wessels 16)
    fifthChoice: {
      950899: { 950900: 6, 950901:12, 950902:10, 950903: 9, 950904:14, 950905: 7, 950906:16 }, // proxy
      950900: { 950899: 0, 950901: 0, 950902:20, 950903: 0, 950904:15, 950905: 6, 950906: 7 }, // Charles 4th
      950901: { 950899: 8, 950900: 0, 950902: 9, 950903:23, 950904:31, 950905: 8, 950906:10 }, // Jones 4th
      950902: { 950899: 0, 950900:22, 950901: 0, 950903:10, 950904: 4, 950905: 6, 950906:23 }, // Libby 4th
      950903: { 950899: 0, 950900: 0, 950901: 0, 950902: 0, 950904:11, 950905: 0, 950906:26 }, // Mason 4th
      950904: { 950899: 0, 950900: 0, 950901:30, 950902: 0, 950903: 0, 950905: 5, 950906:30 }, // McCarthy 4th
      950905: { 950899: 0, 950900: 0, 950901:39, 950902: 6, 950903: 3, 950904: 0, 950906:23 }, // Midgley 4th
      950906: { 950899:11, 950900: 0, 950901:13, 950902: 6, 950903:29, 950904:22, 950905: 0 }, // Wessels 4th
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

    // Q13 cross-tab "Dem 1st Choice" columns
    secondChoice: {
      950890: { 950891: 32, 950892: 10, 950893: 33, 950894: 18 }, // Bellows 1st
      950891: { 950890: 48, 950892:  5, 950893: 23, 950894: 16 }, // Jackson 1st
      950892: { 950890: 26, 950891: 11, 950893: 18, 950894: 18 }, // King 1st
      950893: { 950890: 34, 950891: 15, 950892: 11, 950894: 28 }, // Pingree 1st
      950894: { 950890: 25, 950891: 16, 950892: 23, 950893: 26 }, // Shah 1st
    },

    // Q14 cross-tab "Dem 2nd Choice" columns
    // Self-referential diagonals (e.g. Bellows 2nd → Bellows 3rd) set to 0
    thirdChoice: {
      950890: { 950891: 11, 950892:  0, 950893: 40, 950894:  8 }, // Bellows 2nd
      950891: { 950890:  0, 950892: 14, 950893: 47, 950894: 19 }, // Jackson 2nd
      950892: { 950890: 36, 950891:  8, 950893: 25, 950894:  0 }, // King 2nd
      950893: { 950890: 15, 950891:  0, 950892:  7, 950894: 26 }, // Pingree 2nd
      950894: { 950890: 35, 950891: 10, 950892: 26, 950893:  0 }, // Shah 2nd
    },

    // Q15 cross-tab "Dem 3rd Choice" columns
    // Self-referential diagonals set to 0
    fourthChoice: {
      950890: { 950891: 18, 950892:  0, 950893: 26, 950894:  9 }, // Bellows 3rd
      950891: { 950890:  0, 950892: 28, 950893: 19, 950894: 12 }, // Jackson 3rd
      950892: { 950890: 20, 950891: 17, 950893: 23, 950894:  0 }, // King 3rd
      950893: { 950890: 27, 950891:  0, 950892: 16, 950894:  7 }, // Pingree 3rd
      950894: { 950890: 19, 950891: 11, 950892: 20, 950893:  0 }, // Shah 3rd
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

    // Q31 cross-tab "CD-2 1st Choice" columns
    secondChoice: {
      950886: { 950887: 35, 950888:  3, 950889: 28 }, // Baldacci 1st
      950887: { 950886: 52, 950888: 10, 950889: 25 }, // Dunlap 1st
      950888: { 950886: 34, 950887: 15, 950889: 40 }, // Loud 1st
      950889: { 950886: 33, 950887: 27, 950888: 14 }, // Wood 1st
    },

    // Q32 cross-tab "CD-2 2nd Choice" columns
    // Self-referential diagonals set to 0
    thirdChoice: {
      950886: { 950887: 27, 950888:  9, 950889:  0 }, // Baldacci 2nd
      950887: { 950886:  0, 950888: 13, 950889: 40 }, // Dunlap 2nd
      950888: { 950886: 13, 950887:  0, 950889: 38 }, // Loud 2nd
      950889: { 950886: 15, 950887: 24, 950888:  0 }, // Wood 2nd
    },

    turnoutEstimate: 38_000,
  },
}
