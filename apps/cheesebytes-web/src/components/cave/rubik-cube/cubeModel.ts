/**
 * cubeModel.ts
 *
 * Algebraic model for the pocket cube (2×2×2).
 *
 * State index = permIdx × 729 + oriIdx
 *   permIdx ∈ [0, 5040) — Lehmer-coded permutation of 7 mobile corners
 *   oriIdx  ∈ [0, 729)  — base-3 encoding of 6 corner orientations
 *   Corner 7 (DLB) is always fixed in place with twist 0.
 *
 * Extracted from RubikStateGraph.tsx for reuse across visualisation components.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const N_ORIENTATIONS = 3 ** 6; // 729

/** Human-readable corner names, indexed 0-7. */
export const CORNER_NAMES = [
  "ULB",
  "URB",
  "URF",
  "ULF",
  "DLF",
  "DRF",
  "DRB",
  "DLB",
];

// ─── Move tables (7-element permutation of mobile corners) ────────────────────

export const MOVES_PERM: Record<string, number[]> = {
  U: [3, 0, 1, 2, 4, 5, 6],
  F: [0, 1, 3, 4, 5, 2, 6],
  R: [0, 2, 5, 3, 4, 6, 1],
};
export const MOVES_ORI: Record<string, number[]> = {
  U: [0, 0, 0, 0, 0, 0],
  F: [0, 0, 1, 2, 1, 2],
  R: [0, 1, 2, 0, 0, 1],
};

function invertPerm(p: number[]): number[] {
  const inv = new Array(p.length);
  for (let i = 0; i < p.length; i++) inv[p[i]] = i;
  return inv;
}
function composePerm(p2: number[], p1: number[]): number[] {
  return p2.map((i) => p1[i]);
}

// Generate inverses and double moves
for (const k of ["U", "F", "R"]) {
  MOVES_PERM[k + "'"] = invertPerm(MOVES_PERM[k]);
  MOVES_ORI[k + "'"] = [...MOVES_ORI[k]];
  MOVES_PERM[k + "2"] = composePerm(MOVES_PERM[k], MOVES_PERM[k]);
  MOVES_ORI[k + "2"] = [0, 0, 0, 0, 0, 0];
}

export const MOVE_NAMES = Object.keys(MOVES_PERM);

// ─── Index ↔ (perm, ori) codec ───────────────────────────────────────────────

export function splitIndex(index: number): [number, number] {
  return [Math.floor(index / N_ORIENTATIONS), index % N_ORIENTATIONS];
}
export function combineIndex(permIdx: number, oriIdx: number): number {
  return permIdx * N_ORIENTATIONS + oriIdx;
}

export function decodePerm(permIdx: number): number[] {
  const n = 7;
  const code = new Array(n).fill(0);
  for (let i = 2; i <= n; i++) {
    code[n - i] = permIdx % i;
    permIdx = Math.floor(permIdx / i);
  }
  const perm = [...code];
  for (let i = n - 1; i >= 0; i--)
    for (let j = i + 1; j < n; j++) if (perm[j] >= perm[i]) perm[j]++;
  return perm;
}

export function encodePerm(perm: number[]): number {
  const p = [...perm];
  const n = p.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) if (p[j] > p[i]) p[j]--;
  let result = 0,
    fact = 1;
  const rev = [...p].reverse();
  for (let i = 0; i < rev.length; i++) {
    result += rev[i] * fact;
    fact *= i + 1;
  }
  return result;
}

/** Decode 6 stored + 1 implicit orientation (7 total, for corners 0-6). */
export function decodeOri(oriIdx: number): number[] {
  const r = new Array(7).fill(0);
  for (let i = 0; i < 6; i++) {
    r[i] = oriIdx % 3;
    oriIdx = Math.floor(oriIdx / 3);
  }
  r[6] = (3 - (r.slice(0, 6).reduce((a, b) => a + b, 0) % 3)) % 3;
  return r;
}

/** All 8 orientations (corners 0-7). Corner 7 (DLB) is always 0. */
export function decodeOri8(oriIdx: number): number[] {
  return [...decodeOri(oriIdx), 0];
}

export function encodeOri(ori: number[]): number {
  let result = 0,
    pos = 1;
  for (let i = 0; i < 6; i++) {
    result += ori[i] * pos;
    pos *= 3;
  }
  return result;
}

// ─── Move application ─────────────────────────────────────────────────────────

function applyPermArr<T>(state: T[], perm: number[]): T[] {
  return perm.map((i) => state[i]);
}

export function applyMove(index: number, move: string): number {
  const [permIdx, oriIdx] = splitIndex(index);
  const perm = decodePerm(permIdx);
  const newPerm = applyPermArr(perm, MOVES_PERM[move]);
  const newPermIdx = encodePerm(newPerm);
  const ori = decodeOri(oriIdx);
  const permutedOri = applyPermArr(ori, MOVES_PERM[move]);
  const movOri = MOVES_ORI[move];
  const newOri = new Array(6);
  for (let i = 0; i < 6; i++) newOri[i] = (permutedOri[i] + movOri[i]) % 3;
  const newOriIdx = encodeOri(newOri);
  return combineIndex(newPermIdx, newOriIdx);
}

// ─── Sticker colours ──────────────────────────────────────────────────────────

export const FACE_SOLVED_COLOR: Record<string, string> = {
  U: "#0033cc", // Blue
  D: "#00aa00", // Green
  F: "#ffff00", // Yellow
  B: "#dddddd", // White
  R: "#ff6600", // Orange
  L: "#cc0000", // Red
};

/**
 * Corner → (face, stickerIndex) for each of its 3 facets.
 * Facet 0 = U/D face (natural), facet 1 = CW, facet 2 = CCW.
 */
export const CORNER_FACETS: [string, number][][] = [
  /* 0 ULB */ [
    ["U", 0],
    ["L", 0],
    ["B", 1],
  ],
  /* 1 URB */ [
    ["U", 1],
    ["B", 0],
    ["R", 1],
  ],
  /* 2 URF */ [
    ["U", 3],
    ["R", 0],
    ["F", 1],
  ],
  /* 3 ULF */ [
    ["U", 2],
    ["F", 0],
    ["L", 1],
  ],
  /* 4 DLF */ [
    ["D", 0],
    ["L", 3],
    ["F", 2],
  ],
  /* 5 DRF */ [
    ["D", 1],
    ["F", 3],
    ["R", 2],
  ],
  /* 6 DRB */ [
    ["D", 3],
    ["R", 3],
    ["B", 2],
  ],
  /* 7 DLB */ [
    ["D", 2],
    ["B", 3],
    ["L", 2],
  ],
];

/**
 * Return the 3 sticker hex colours for each of the 8 corner slots.
 * colours[slot][0] = colour on the U/D face position
 * colours[slot][1] = colour on the CW  face position
 * colours[slot][2] = colour on the CCW face position
 */
export function getCornerColors(perm: number[], ori: number[]): string[][] {
  const result: string[][] = [];
  for (let slot = 0; slot < 8; slot++) {
    const piece = slot < 7 ? perm[slot] : 7;
    const twist = slot < 7 ? ori[slot] : 0;
    const pieceFacets = CORNER_FACETS[piece];
    const colors: string[] = [];
    for (let f = 0; f < 3; f++) {
      const [srcFace] = pieceFacets[(3 + f - twist) % 3];
      colors.push(FACE_SOLVED_COLOR[srcFace]);
    }
    result.push(colors);
  }
  return result;
}

/**
 * Convert a state index to the 24-char sticker string used by the 3D component.
 * Face order: U(4) L(4) F(4) R(4) B(4) D(4), chars: B G Y W O R.
 */
export function indexToStickerString(index: number): string {
  const [permIdx, oriIdx] = splitIndex(index);
  const perm = decodePerm(permIdx);
  const ori = decodeOri(oriIdx);

  const stickers = new Array(24).fill("?");
  const faceOff: Record<string, number> = {
    U: 0,
    L: 4,
    F: 8,
    R: 12,
    B: 16,
    D: 20,
  };
  const faceToChar: Record<string, string> = {
    U: "B",
    D: "G",
    F: "Y",
    B: "W",
    R: "O",
    L: "R",
  };

  for (let slot = 0; slot < 7; slot++) {
    const piece = perm[slot];
    const twist = ori[slot];
    const slotFacets = CORNER_FACETS[slot];
    const pieceFacets = CORNER_FACETS[piece];
    for (let f = 0; f < 3; f++) {
      const [srcFace] = pieceFacets[(3 + f - twist) % 3];
      const [dstFace, dstIdx] = slotFacets[f];
      stickers[faceOff[dstFace] + dstIdx] = faceToChar[srcFace];
    }
  }

  // Fixed corner (DLB = corner 7)
  const fixedSlotFacets = CORNER_FACETS[7];
  const homeColors = ["D", "B", "L"];
  for (let f = 0; f < 3; f++) {
    const [face, idx] = fixedSlotFacets[f];
    stickers[faceOff[face] + idx] = faceToChar[homeColors[f]];
  }

  return stickers.join("");
}

/**
 * Read corner orientations (twist 0/1/2) for all 8 corners directly from a
 * 24-char sticker string.  Works for ANY valid cube state, including those
 * reached by D, L, B moves (which the algebraic index can't represent because
 * corner 7 is assumed fixed).
 *
 * Returns orientations indexed by **piece identity** (not by slot).
 * ori[p] = twist of the piece whose home position is corner p, regardless
 * of which physical slot it currently occupies.  This means moves that only
 * permute (like U and D) never change the returned array.
 */
export function stickerStringToOrientations(s: string): number[] {
  const faceOff: Record<string, number> = {
    U: 0,
    L: 4,
    F: 8,
    R: 12,
    B: 16,
    D: 20,
  };
  const charToFace: Record<string, string> = {
    B: "U",
    G: "D",
    Y: "F",
    W: "B",
    O: "R",
    R: "L",
  };

  // Build lookup: sorted face triplet → piece index
  const lookup = new Map<string, number>();
  for (let p = 0; p < 8; p++) {
    const key = CORNER_FACETS[p]
      .map(([f]) => f)
      .sort()
      .join("");
    lookup.set(key, p);
  }

  const ori = new Array(8).fill(0);
  for (let slot = 0; slot < 8; slot++) {
    const facets = CORNER_FACETS[slot];
    const faces: string[] = [];
    for (let f = 0; f < 3; f++) {
      const [dstFace, dstIdx] = facets[f];
      faces.push(charToFace[s[faceOff[dstFace] + dstIdx]]);
    }
    // Identify which piece is in this slot
    const piece = lookup.get([...faces].sort().join(""))!;
    // Twist = facet index where the U/D sticker ended up
    const twist = faces.findIndex((f) => f === "U" || f === "D");
    // Store indexed by piece identity, not by slot
    ori[piece] = twist < 0 ? 0 : twist;
  }
  return ori;
}

/**
 * Convert a 24-char sticker string back to a state index.
 * Inverse of `indexToStickerString`.
 * NOTE: only valid for states reachable via R, U, F moves (corner 7 = DLB
 * must be in its home slot).
 */
export function stickerStringToIndex(s: string): number {
  const faceOff: Record<string, number> = {
    U: 0,
    L: 4,
    F: 8,
    R: 12,
    B: 16,
    D: 20,
  };
  const charToFace: Record<string, string> = {
    B: "U",
    G: "D",
    Y: "F",
    W: "B",
    O: "R",
    R: "L",
  };

  // Build lookup: sorted face triplet → piece index
  const lookup = new Map<string, number>();
  for (let p = 0; p < 8; p++) {
    const key = CORNER_FACETS[p]
      .map(([f]) => f)
      .sort()
      .join("");
    lookup.set(key, p);
  }

  const perm: number[] = [];
  const ori: number[] = [];

  for (let slot = 0; slot < 7; slot++) {
    const facets = CORNER_FACETS[slot];
    const faces: string[] = [];
    for (let f = 0; f < 3; f++) {
      const [dstFace, dstIdx] = facets[f];
      faces.push(charToFace[s[faceOff[dstFace] + dstIdx]]);
    }
    perm.push(lookup.get([...faces].sort().join(""))!);
    // Twist = facet position where the U/D sticker landed
    const twist = faces.findIndex((f) => f === "U" || f === "D");
    ori.push(twist < 0 ? 0 : twist);
  }

  return combineIndex(encodePerm(perm), encodeOri(ori));
}
