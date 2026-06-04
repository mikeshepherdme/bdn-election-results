// cand_id → public photo path. Only populated for gubernatorial and congressional races.
// Note: cand_ids updated June 2026 after DDHQ reassigned IDs for most candidates.
const PHOTO_MAP: Record<number, string> = {
  // Governor — Democratic
  812260: '/candidate-photos/Hannah_Pingree.JPG',
  812261: '/candidate-photos/Bellows.JPG',
  950892: '/candidate-photos/King.JPG',
  950894: '/candidate-photos/Shah.JPG',
  1322:   '/candidate-photos/Jackson.JPG',

  // Governor — Republican
  371382: '/candidate-photos/Bush.JPG',
  950900: '/candidate-photos/Charles.JPG',
  44837:  '/candidate-photos/Jones.JPEG',
  24030:  '/candidate-photos/Libby.webp',
  8670:   '/candidate-photos/Mason.jpg',
  371385: '/candidate-photos/McCarthy.jpg',
  950905: '/candidate-photos/Midgley.jpg',
  371383: '/candidate-photos/Wessels.jpg',

  // US Senate — Democratic
  75257:  '/candidate-photos/Costello.PNG',
  8638:   '/candidate-photos/Mills.jpg',
  421737: '/candidate-photos/Platner.JPG',

  // US Senate — Republican
  8245:   '/candidate-photos/Collins.jpg',

  // US House CD1 — Democratic
  1323:   '/candidate-photos/chellie-pingree.jpg',

  // US House CD1 — Republican
  950896: '/candidate-photos/pietrowicz.jpeg',
  24312:  '/candidate-photos/Russell.png',

  // US House CD2 — Democratic
  23982:  '/candidate-photos/Baldacci.jpg',
  432040: '/candidate-photos/Dunlap.JPG',
  840111: '/candidate-photos/Loud.PNG',
  319445: '/candidate-photos/Wood.JPG',

  // US House CD2 — Republican
  23973:  '/candidate-photos/LePage.jpg',
}

// Per-candidate objectPosition overrides for photos where 'top' cuts off the face.
const PHOTO_POSITION_MAP: Record<number, string> = {
  950892: '60% top',   // King — profile shot, face right of center
  812260: '50% 20%',  // Hannah Pingree — background above head, face sits low
  950900: '50% 10%',  // Charles — trees/background above face
  421737: '50% 25%',  // Platner — cap at top, face in middle third
  950905: '50% 30%',  // Midgley — close crop, chin cut at top anchor
  75257:  '50% 30%',  // Costello — close crop, chin cut at top anchor
  319445: '50% 25%',  // Wood — face fills frame, chin cut
  950896: '50% 25%',  // Pietrowicz — chin cut at top anchor
  24312:  '50% 25%',  // Russell — chin cut at top anchor
}

export function candidatePhoto(candId: number): string | null {
  return PHOTO_MAP[candId] ?? null
}

export function candidatePhotoPosition(candId: number): string {
  return PHOTO_POSITION_MAP[candId] ?? 'top'
}
