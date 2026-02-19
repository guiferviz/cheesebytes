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

  const logoRenderW = LOGO_W * pixelScale;
  const logoRenderH = LOGO_H * pixelScale;
  const logoOriginX = (width - logoRenderW) / 2;
  const logoOriginY = (height - logoRenderH) / 2;

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
      const LOGO_DELAY = 0.2;
      const logoT = Math.max(0, t - LOGO_DELAY) / (1 - LOGO_DELAY);
      const FORM_SPEED = 1.6; // logo finishes at ~62% of its window
      const waveFront = Math.min(1, logoT * FORM_SPEED);

      // ── 1. Draw logo pixels (behind shards) ──
      for (const p of pixels) {
        if (waveFront < p.order) continue;

        // Quick pop-in
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
      const TEXT_DELAY = 0.08; // slight delay after shards
      const TEXT_END = 0.66; // finish with logo formation
      const textWindow = TEXT_END - TEXT_DELAY;

      const fontSize = Math.round(pixelScale * 24);
      //ctx.font = `bold ${fontSize}px 'IosevkaTermSlab Nerd Font Mono', monospace`;
      ctx.font = `bold ${fontSize}px 'BigBlueTerm437 Nerd Font Mono', monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      const textY = height / 2;
      const textGap = pixelScale * 1.5;
      const charW = ctx.measureText("M").width; // monospace → all equal

      // ── CHEESE (left of logo, outside→inside: C, H, E, E, S, E) ──
      const cheeseChars = ["C", "H", "E", "E", "S", "E"];
      const cheeseRight = logoOriginX - textGap;

      for (let i = 0; i < cheeseChars.length; i++) {
        const letterT =
          TEXT_DELAY + (i / Math.max(1, cheeseChars.length - 1)) * textWindow;
        if (t < letterT) continue;

        const age = (t - letterT) / 0.04;
        const popT = Math.min(1, age);
        const scale = easeOutCubic(popT);

        // Position: right-aligned against logo, character i from the left
        const lx = cheeseRight - (cheeseChars.length - i - 0.5) * charW;

        ctx.save();
        ctx.globalAlpha = scale;
        ctx.translate(lx, textY);
        ctx.scale(scale, scale);
        //ctx.fillStyle = "#fce501";
        ctx.fillStyle = "white";
        ctx.fillText(cheeseChars[i], 0, 0);
        ctx.restore();
      }

      // ── BYTES (right of logo, outside→inside: S, E, T, Y, B) ──
      const bytesChars = ["B", "Y", "T", "E", "S"];
      const bytesLeft = logoOriginX + logoRenderW + textGap * 3;

      for (let i = 0; i < bytesChars.length; i++) {
        // Reverse: index 4 (S) appears first, index 0 (B) appears last
        const appearIdx = bytesChars.length - 1 - i;
        const letterT =
          TEXT_DELAY +
          (appearIdx / Math.max(1, bytesChars.length - 1)) * textWindow;
        if (t < letterT) continue;

        const age = (t - letterT) / 0.04;
        const popT = Math.min(1, age);
        const scale = easeOutCubic(popT);

        // Position: left-aligned after logo, character i from the left
        const lx = bytesLeft + (i + 0.5) * charW;

        ctx.save();
        ctx.globalAlpha = scale;
        ctx.translate(lx, textY);
        ctx.scale(scale, scale);
        //ctx.fillStyle = "#fce501";
        ctx.fillStyle = "white";
        ctx.fillText(bytesChars[i], 0, 0);
        ctx.restore();
      }
    },
    [width, height, pixelScale, duration, logoOriginX, logoRenderW],
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
