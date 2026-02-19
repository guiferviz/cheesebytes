import React, { useEffect, useRef, useCallback } from "react";

// ── Pixel data for the 49×39 cheese logo ─────────────────────────────
// Extracted from public/logo/pixel_logo.png
// Colors: #fce501 (yellow), #feab02 (orange), #933209 (brown),
//         #fe7601 (red-orange), #fcf870 (light yellow), #d24805 (dark orange)

const LOGO_W = 49;
const LOGO_H = 39;

// prettier-ignore
const PIXELS: (string | null)[][] = [[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02",null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02",null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02",null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02",null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02",null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02",null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02",null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,"#fe7601","#fe7601","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02",null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,"#fe7601","#fe7601","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02",null,null,null],[null,null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#933209","#feab02","#feab02","#feab02",null,null,null],[null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#933209","#933209","#933209","#933209","#933209","#feab02","#feab02",null,null,null],[null,null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#fe7601",null,null],[null,null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#d24805","#d24805","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#fe7601",null,null],[null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#d24805","#d24805","#d24805","#d24805","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#fe7601",null,null],[null,null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#d24805","#d24805","#d24805","#d24805","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#fe7601","#fe7601",null],[null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#d24805","#d24805","#d24805","#d24805","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#fe7601","#fe7601",null],[null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#d24805","#d24805","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#fe7601","#fe7601",null],[null,null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601",null],[null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#933209","#933209","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#933209","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601",null],[null,null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601"],[null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601"],[null,null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#933209","#933209","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601"],[null,null,null,"#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#fe7601","#fe7601"],[null,null,null,"#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#933209","#933209","#feab02","#feab02","#fe7601","#fe7601"],[null,null,"#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#d24805","#d24805","#d24805","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#933209","#933209","#feab02","#feab02","#feab02","#fe7601","#fe7601"],[null,null,"#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#d24805","#d24805","#d24805","#d24805","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#933209","#933209","#feab02","#feab02","#feab02","#fe7601","#fe7601"],[null,"#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#d24805","#d24805","#d24805","#d24805","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601"],[null,"#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#d24805","#d24805","#d24805","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#d24805","#d24805","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#933209","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601"],[null,"#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#933209","#933209","#933209","#933209","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#d24805","#d24805","#d24805","#d24805","#feab02","#feab02","#feab02","#feab02","#933209","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601"],["#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#d24805","#d24805","#d24805","#d24805","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601"],["#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#d24805","#d24805","#d24805","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601",null,null,null],["#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601",null,null,null,null,null,null],[null,null,null,null,null,"#feab02","#feab02","#feab02","#feab02","#feab02","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601",null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,"#feab02","#feab02","#feab02","#feab02","#feab02","#fce501","#fce501","#fce501","#fce501","#fce501","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601",null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,"#feab02","#feab02","#feab02","#feab02","#feab02","#fcf870","#fcf870","#feab02","#feab02","#feab02","#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,"#feab02","#feab02","#feab02","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601","#fe7601",null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]];

// ── Palette ──────────────────────────────────────────────────────────
const PALETTE = [
  "#fce501",
  "#feab02",
  "#933209",
  "#fe7601",
  "#fcf870",
  "#d24805",
];

// ── Types ────────────────────────────────────────────────────────────

/** A pixel of the final image */
interface Pixel {
  tx: number;
  ty: number;
  color: string;
  /** Noisy distance-based order value (0–1). NOT a perfect circle. */
  order: number;
}

/**
 * Big, slow-moving decorative square that spawns from the frontier
 * and drifts outward while the logo forms underneath.
 */
interface Shard {
  ox: number;
  oy: number;
  /** When this shard spawns (0-1 time scale) */
  spawnT: number;
  angle: number;
  /** Drift speed in px/s */
  speed: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  /** How long (in t-scale) to grow from 0 to full size */
  growDuration: number;
}

interface LogoAnimationProps {
  width?: number;
  height?: number;
  pixelScale?: number;
  duration?: number;
  loop?: boolean;
}

// ── Easing ───────────────────────────────────────────────────────────
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Seeded-ish noise: give each pixel a unique but deterministic jitter
// so the expansion looks organic, not circular
function pixelNoise(row: number, col: number): number {
  // Simple hash-like noise
  const n = Math.sin(row * 127.1 + col * 311.7) * 43758.5453;
  return n - Math.floor(n); // 0–1
}

// ── Component ────────────────────────────────────────────────────────
const LogoAnimation: React.FC<LogoAnimationProps> = ({
  width = 1080,
  height = 720,
  pixelScale = 100,
  duration = 3200,
  loop = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const pixelsRef = useRef<Pixel[]>([]);
  const shardsRef = useRef<Shard[]>([]);
  const hdImgRef = useRef<HTMLImageElement | null>(null);

  const logoRenderW = LOGO_W * pixelScale;
  const logoRenderH = LOGO_H * pixelScale;
  const logoOriginX = (width - logoRenderW) / 2;
  const logoOriginY = (height - logoRenderH) / 2;

  // Load HD logo image
  useEffect(() => {
    const img = new Image();
    img.src = "/logo/hd_logo_bigger.png";
    img.onload = () => {
      hdImgRef.current = img;
    };
  }, []);

  /* ── Build pixel list with organic ordering ──────────────────────── */
  const buildPixels = useCallback(() => {
    const pixels: Pixel[] = [];
    const cx = width / 2;
    const cy = height / 2;

    let maxDist = 0;
    for (let row = 0; row < LOGO_H; row++) {
      for (let col = 0; col < LOGO_W; col++) {
        if (!PIXELS[row][col]) continue;
        const px = logoOriginX + col * pixelScale + pixelScale / 2;
        const py = logoOriginY + row * pixelScale + pixelScale / 2;
        const d = Math.hypot(px - cx, py - cy);
        if (d > maxDist) maxDist = d;
      }
    }

    for (let row = 0; row < LOGO_H; row++) {
      for (let col = 0; col < LOGO_W; col++) {
        const color = PIXELS[row][col];
        if (!color) continue;
        const tx = logoOriginX + col * pixelScale;
        const ty = logoOriginY + row * pixelScale;
        const dx = tx + pixelScale / 2 - cx;
        const dy = ty + pixelScale / 2 - cy;
        const dist = Math.hypot(dx, dy);
        const normDist = maxDist > 0 ? dist / maxDist : 0;

        // Add noise to break the perfect circle. Pixels near center get
        // less noise so the very first pixels still pop from the middle.
        const noise = pixelNoise(row, col) * 0.3 * normDist;
        // Cap at 0.92 so the wave always fully paints every pixel
        const order = Math.min(0.92, Math.max(0, normDist * 0.85 + noise));

        pixels.push({ tx, ty, color, order });
      }
    }

    pixels.sort((a, b) => a.order - b.order);
    return pixels;
  }, [width, height, pixelScale, logoOriginX, logoOriginY]);

  /* ── Build shards: big rectangles that burst from center before logo ─ */
  const buildShards = useCallback(
    (_pixels: Pixel[]) => {
      const shards: Shard[] = [];
      const cx = width / 2;
      const cy = height / 2;

      const count = 45;
      for (let i = 0; i < count; i++) {
        const outAngle = Math.random() * Math.PI * 2;

        shards.push({
          ox: cx,
          oy: cy,
          // Spawn early: first batch immediately, rest staggered up to t=0.35
          spawnT: Math.random() * 0.35,
          angle: outAngle,
          speed: 90 + Math.random() * 60, // slow drift in px/s
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          size: pixelScale * (3 + Math.random() * 6), // BIG
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 1.5, // slow spin
          growDuration: 0.16 + Math.random() * 0.08, // quick grow from 0→full
        });
      }
      return shards;
    },
    [width, height, pixelScale],
  );

  /* ── Draw frame ──────────────────────────────────────────────────── */
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, t: number, dtSec: number) => {
      ctx.clearRect(0, 0, width, height);

      const pixels = pixelsRef.current;
      const shards = shardsRef.current;

      // Shards start at t=0. Logo starts forming after LOGO_DELAY so
      // the big rectangles mask most of the formation process.
      const LOGO_DELAY = 0.05;
      const logoT = Math.max(0, t - LOGO_DELAY) / (1 - LOGO_DELAY);
      const FORM_SPEED = 1.6; // logo finishes at ~62% of its window
      const waveFront = Math.min(1, logoT * FORM_SPEED);

      // ── Pulse + HD transition state ──
      const LOGO_DONE_T = 0.78;
      let pulseScale = 1;
      let glowIntensity = 0;
      let hdOpacity = 0;

      if (t > LOGO_DONE_T) {
        const postT = (t - LOGO_DONE_T) / (1 - LOGO_DONE_T);
        // Pulse 1: subtle
        const p1Center = 0.25,
          p1Width = 0.18;
        const p1Dist = Math.abs(postT - p1Center);
        const p1 =
          p1Dist < p1Width ? Math.cos((p1Dist / p1Width) * Math.PI * 0.5) : 0;
        // Pulse 2: more intense + triggers HD swap
        const p2Center = 0.6,
          p2Width = 0.22;
        const p2Dist = Math.abs(postT - p2Center);
        const p2 =
          p2Dist < p2Width ? Math.cos((p2Dist / p2Width) * Math.PI * 0.5) : 0;
        pulseScale = 1 + p1 * 0.03 + p2 * 0.06;
        glowIntensity = p1 * 0.15 + p2 * 0.4;
        // HD crossfade starts at pulse 2 peak
        if (postT > p2Center) {
          hdOpacity = Math.min(1, (postT - p2Center) / 0.12);
        }
      }

      // Apply pulse scale from center
      ctx.save();
      if (pulseScale !== 1) {
        ctx.translate(width / 2, height / 2);
        ctx.scale(pulseScale, pulseScale);
        ctx.translate(-width / 2, -height / 2);
      }

      // ── 1. Draw pixel logo (fades out during HD transition) ──
      if (hdOpacity < 0.99) {
        ctx.globalAlpha = 1 - hdOpacity;
        for (const p of pixels) {
          if (waveFront < p.order) continue;
          const age = waveFront - p.order;
          const popT = Math.min(1, age / 0.04);
          if (popT >= 1) {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.tx, p.ty, pixelScale, pixelScale);
          } else {
            const scale = easeOutCubic(popT) * (1 + 0.25 * (1 - popT));
            const sz = pixelScale * scale;
            ctx.fillStyle = p.color;
            ctx.fillRect(
              p.tx + pixelScale / 2 - sz / 2,
              p.ty + pixelScale / 2 - sz / 2,
              sz,
              sz,
            );
          }
        }
        ctx.globalAlpha = 1;
      }

      // ── 1b. Draw HD logo (fades in during transition) ──
      if (hdOpacity > 0.01 && hdImgRef.current) {
        ctx.globalAlpha = hdOpacity;
        ctx.drawImage(
          hdImgRef.current,
          logoOriginX,
          logoOriginY,
          logoRenderW,
          logoRenderH,
        );
        ctx.globalAlpha = 1;
      }

      // ── 2. Draw shards (on top — they obscure logo while it forms) ──
      for (const s of shards) {
        if (t < s.spawnT) continue;
        const age = t - s.spawnT;
        const life = Math.min(1, age / (1 - s.spawnT + 0.001));

        // Grow from tiny to full size very quickly
        const growT = Math.min(1, age / s.growDuration);
        const currentSize = s.size * easeOutCubic(growT);

        // Drift position
        const driftDist = s.speed * age * (duration / 1000);
        const sx = s.ox + Math.cos(s.angle) * driftDist;
        const sy = s.oy + Math.sin(s.angle) * driftDist;

        // Fade — high opacity while logo forms, then fade out to reveal
        const fadeStart = 0.5;
        const maxAlpha = 0.009;
        const alpha =
          life < fadeStart
            ? maxAlpha
            : maxAlpha *
              (1 - easeOutCubic((life - fadeStart) / (1 - fadeStart)));
        if (alpha < 0.01) continue;

        // Slow rotation
        s.rotation += s.rotationSpeed * dtSec;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(sx, sy);
        ctx.rotate(s.rotation);
        ctx.fillStyle = s.color;
        ctx.fillRect(
          -currentSize / 2,
          -currentSize / 2,
          currentSize,
          currentSize,
        );
        ctx.restore();
      }

      // ── 3. Draw text "CHEESE" (left) and "BYTES" (right) ──
      const TEXT_DELAY = 0.25;
      const TEXT_END = 0.66;
      const textWindow = TEXT_END - TEXT_DELAY;
      const fontSize = Math.round(pixelScale * 24);
      const textY = height / 2;
      const textGap = pixelScale * 1.5;

      // Helper: draw CHEESE + BYTES with a given font and alpha
      const drawText = (font: string, alpha: number) => {
        if (alpha < 0.01) return;
        ctx.font = `bold ${fontSize}px '${font}', monospace`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const cW = ctx.measureText("M").width;

        const cheeseChars = ["C", "H", "E", "E", "S", "E"];
        const cheeseRight = logoOriginX - textGap;
        for (let i = 0; i < cheeseChars.length; i++) {
          const letterT =
            TEXT_DELAY + (i / Math.max(1, cheeseChars.length - 1)) * textWindow;
          if (t < letterT) continue;
          const age = (t - letterT) / 0.04;
          const popT = Math.min(1, age);
          const sc = easeOutCubic(popT);
          const lx = cheeseRight - (cheeseChars.length - i - 0.5) * cW;
          ctx.save();
          ctx.globalAlpha = sc * alpha;
          ctx.translate(lx, textY);
          ctx.scale(sc, sc);
          ctx.fillStyle = "white";
          ctx.fillText(cheeseChars[i], 0, 0);
          ctx.restore();
        }

        const bytesChars = ["B", "Y", "T", "E", "S"];
        const bytesLeft = logoOriginX + logoRenderW + textGap * 3;
        for (let i = 0; i < bytesChars.length; i++) {
          const appearIdx = bytesChars.length - 1 - i;
          const letterT =
            TEXT_DELAY +
            (appearIdx / Math.max(1, bytesChars.length - 1)) * textWindow;
          if (t < letterT) continue;
          const age = (t - letterT) / 0.04;
          const popT = Math.min(1, age);
          const sc = easeOutCubic(popT);
          const lx = bytesLeft + (i + 0.5) * cW;
          ctx.save();
          ctx.globalAlpha = sc * alpha;
          ctx.translate(lx, textY);
          ctx.scale(sc, sc);
          ctx.fillStyle = "white";
          ctx.fillText(bytesChars[i], 0, 0);
          ctx.restore();
        }
      };

      // 8-bit font (fades out during HD transition)
      drawText("BigBlueTerm437 Nerd Font Mono", 1 - hdOpacity);
      // HD font (fades in during transition)
      drawText("IosevkaTermSlab Nerd Font Mono", hdOpacity);

      // ── 4. Glow overlay ──
      if (glowIntensity > 0) {
        const grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(logoRenderW, logoRenderH) * 0.8,
        );
        grad.addColorStop(0, `rgba(252, 229, 1, ${glowIntensity * 0.4})`);
        grad.addColorStop(0.5, `rgba(254, 171, 2, ${glowIntensity * 0.15})`);
        grad.addColorStop(1, "rgba(252, 229, 1, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore(); // matches pulse scale save
    },
    [
      width,
      height,
      pixelScale,
      duration,
      logoOriginX,
      logoOriginY,
      logoRenderW,
      logoRenderH,
    ],
  );

  /* ── Animation loop ──────────────────────────────────────────────── */
  const startAnimation = useCallback(() => {
    const px = buildPixels();
    pixelsRef.current = px;
    shardsRef.current = buildShards(px);
    startRef.current = 0;
    let lastTimestamp = 0;

    const tick = (timestamp: number) => {
      if (!startRef.current) {
        startRef.current = timestamp;
        lastTimestamp = timestamp;
      }
      const elapsed = timestamp - startRef.current;
      const dtSec = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      const t = Math.min(1, elapsed / duration);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      draw(ctx, t, dtSec);

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        if (loop) {
          setTimeout(() => startAnimation(), 2500);
        }
      }
    };

    animRef.current = requestAnimationFrame(tick);
  }, [buildPixels, buildShards, draw, duration, loop]);

  useEffect(() => {
    startAnimation();
    return () => cancelAnimationFrame(animRef.current);
  }, [startAnimation]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
};

export default LogoAnimation;
export { LogoAnimation };
