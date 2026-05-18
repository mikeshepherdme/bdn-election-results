// cand_id → public photo path. Only populated for gubernatorial and congressional races.
const PHOTO_MAP: Record<number, string> = {
  // Governor — Democratic
  950890: '/candidate-photos/Bellows.JPG',
  950891: '/candidate-photos/Jackson.JPG',
  950892: '/candidate-photos/King.JPG',
  950893: '/candidate-photos/Hannah_Pingree.JPG',
  950894: '/candidate-photos/Shah.JPG',

  // Governor — Republican
  950899: '/candidate-photos/Bush.JPG',
  950900: '/candidate-photos/Charles.JPG',
  950901: '/candidate-photos/Jones.JPEG',
  950902: '/candidate-photos/Libby.webp',
  950903: '/candidate-photos/Mason.jpg',
  950904: '/candidate-photos/McCarthy.jpg',
  950905: '/candidate-photos/Midgley.jpg',
  950906: '/candidate-photos/Wessels.jpg',

  // US Senate — Democratic
  950882: '/candidate-photos/Costello.PNG',
  950883: '/candidate-photos/Mills.jpg',
  950884: '/candidate-photos/Platner.JPG',

  // US Senate — Republican
  950895: '/candidate-photos/Collins.jpg',

  // US House CD1 — Democratic
  950885: '/candidate-photos/chellie-pingree.jpg',

  // US House CD1 — Republican
  950896: '/candidate-photos/pietrowicz.jpeg',
  950897: '/candidate-photos/Russell.png',

  // US House CD2 — Democratic
  950886: '/candidate-photos/Baldacci.jpg',
  950887: '/candidate-photos/Dunlap.JPG',
  950888: '/candidate-photos/Loud.PNG',
  950889: '/candidate-photos/Wood.JPG',

  // US House CD2 — Republican
  950898: '/candidate-photos/LePage.jpg',
}

// Per-candidate objectPosition overrides for photos where 'top' cuts off the face.
const PHOTO_POSITION_MAP: Record<number, string> = {
  950892: '60% top',   // King — profile shot, face right of center
  950893: '50% 20%',  // Hannah Pingree — background above head, face sits low
  950900: '50% 10%',  // Charles — trees/background above face
  950884: '50% 25%',  // Platner — cap at top, face in middle third
}

export function candidatePhoto(candId: number): string | null {
  return PHOTO_MAP[candId] ?? null
}

export function candidatePhotoPosition(candId: number): string {
  return PHOTO_POSITION_MAP[candId] ?? 'top'
}
