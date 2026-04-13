import React, { useEffect, useRef, useCallback, useState } from "react";

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
  /** "auto" plays the full animation automatically (default).
   *  "interactive" shows a static HD logo; hover blurs, clicks intensify glitches. */
  mode?: "auto" | "interactive";
  /** Starting click count for interactive mode. Useful for restoring pixel mode state. */
  initialClicks?: number;
  /** Fired once when the user clicks through the final interactive glitch state. */
  onPixelModeUnlocked?: () => void;
}

interface DrawOptions {
  glitchBoost?: number;
  glitchSeed?: number;
  glitchPhase?: number;
  /** When set, overrides the timeline-computed HD opacity (0 = pixel, 1 = full HD). */
  hdOpacityOverride?: number;
}

type BubblePhase = "hidden" | "enter" | "active" | "exit";

// ── Easing ───────────────────────────────────────────────────────────
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
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
  width = 2080,
  height = 600,
  pixelScale = 8,
  duration = 2700,
  loop = true,
  mode = "auto",
  initialClicks = 0,
  onPixelModeUnlocked,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const pixelsRef = useRef<Pixel[]>([]);
  const shardsRef = useRef<Shard[]>([]);
  const hdImgRef = useRef<HTMLImageElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const bubbleTimersRef = useRef<number[]>([]);

  // Interactive mode state
  const [clickCount, setClickCount] = useState(initialClicks);
  const [isHovering, setIsHovering] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );
  const [interactiveIntroDone, setInteractiveIntroDone] = useState(false);

  useEffect(() => {
    setClickCount(initialClicks);
  }, [initialClicks]);

  const [bubblePhase, setBubblePhase] = useState<BubblePhase>("hidden");
  const [bubbleText, setBubbleText] = useState("Oops!");
  const [pointerPos, setPointerPos] = useState({
    x: width / 2,
    y: height / 2,
  });
  const clicksToReveal = 5; // clicks needed to unlock the hidden mode
  const hoverSeedRef = useRef(Math.random() * 10_000);

  const logoRenderW = LOGO_W * pixelScale;
  const logoRenderH = LOGO_H * pixelScale;
  const logoOriginX = (width - logoRenderW) / 2;
  const logoOriginY = (height - logoRenderH) / 2;
  const interactiveHdIntroMs = 560;
  const interactiveRestMs = 2100; // start at HD

  // Load HD logo image
  useEffect(() => {
    const img = new Image();
    img.src = "/logo/hd_logo_bigger.png";
    // Pre-decode to avoid a first-frame hiccup during glitch transition
    const setReady = () => {
      hdImgRef.current = img;
      setImageReady(true);
    };
    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(setReady).catch(setReady);
      } else {
        setReady();
      }
    };
    return () => {
      hdImgRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      setFontsReady(true);
      return;
    }

    let cancelled = false;
    const textFontSize = Math.round(pixelScale * 24);

    Promise.allSettled([
      document.fonts.load(
        `bold ${textFontSize}px "BigBlueTerm437 Nerd Font Mono"`,
      ),
      document.fonts.load(
        `bold ${textFontSize}px "IosevkaTermSlab Nerd Font Mono"`,
      ),
    ]).then(() => {
      if (!cancelled) setFontsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [pixelScale]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    document.addEventListener("themeChanged", syncTheme);
    return () => {
      observer.disconnect();
      document.removeEventListener("themeChanged", syncTheme);
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

  const clearBubbleTimers = useCallback(() => {
    for (const timer of bubbleTimersRef.current) window.clearTimeout(timer);
    bubbleTimersRef.current = [];
  }, []);

  const updatePointerFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      setPointerPos({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    },
    [],
  );

  const onPixelModeUnlockedRef = useRef(onPixelModeUnlocked);
  onPixelModeUnlockedRef.current = onPixelModeUnlocked;

  const clickMessages = [
    "Oops!",
    "Did I fix it?",
    "It's getting worse…",
    "Definitely broken.",
    "Pixel mode unblocked! Press 'x' to toggle.",
  ];

  const showBubble = useCallback(
    (clientX: number, clientY: number, text: string, durationMult = 1) => {
      updatePointerFromClient(clientX, clientY);
      clearBubbleTimers();
      setBubbleText(text);
      setBubblePhase("enter");

      const activateTimer = window.setTimeout(() => {
        setBubblePhase("active");
      }, 16);
      const exitTimer = window.setTimeout(() => {
        setBubblePhase("exit");
      }, 1320 * durationMult);
      const hideTimer = window.setTimeout(() => {
        setBubblePhase("hidden");
      }, 1500 * durationMult);

      bubbleTimersRef.current = [activateTimer, exitTimer, hideTimer];
    },
    [clearBubbleTimers, updatePointerFromClient],
  );

  /* ── Draw frame ──────────────────────────────────────────────────── */
  const draw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      ms: number,
      dtSec: number,
      options: DrawOptions = {},
    ) => {
      ctx.clearRect(0, 0, width, height);

      const pixels = pixelsRef.current;
      const shards = shardsRef.current;

      // ──────────────────────────────────────────────────────────
      //  TIMELINE — all values in milliseconds, easy to tweak!
      //  Just change these numbers to adjust timing.
      // ──────────────────────────────────────────────────────────
      const logoStart = 50; // pixel logo starts forming
      const textStart = 300; // letters start typing
      const logoEnd = 850; // pixel logo fully formed
      const textEnd = 850; // all letters visible
      const glitch1Start = 1350; // 1st glitch (try HD… fail!)
      const glitch1End = 1600; // snaps back to pixel
      const glitch2Start = 1800; // 2nd glitch (try again…)
      const glitch2End = 2050; // HD revealed! ✨
      // ──────────────────────────────────────────────────────────

      // ── Logo formation progress (0→1) ──
      const waveFront = clamp01(
        ((ms - logoStart) / (logoEnd - logoStart)) * 1.1,
      );

      // ── Glitch intensity (0 = none, 0.7 = glitch1 peak, 1.0 = glitch2 peak) ──
      let glitch = 0;
      if (ms >= glitch1Start && ms <= glitch1End) {
        const half = (glitch1End - glitch1Start) / 2;
        const d = Math.abs(ms - (glitch1Start + half)) / half;
        glitch = (1 - d * d) * 0.7;
      }
      if (ms >= glitch2Start && ms <= glitch2End) {
        const half = (glitch2End - glitch2Start) / 2;
        const d = Math.abs(ms - (glitch2Start + half)) / half;
        glitch = Math.max(glitch, (1 - d * d) * 1.0);
      }
      glitch = Math.max(glitch, options.glitchBoost ?? 0);
      const glitchSeed = options.glitchSeed ?? 0;
      const glitchPhase = options.glitchPhase ?? ms;

      // ── HD crossfade (starts DURING glitch2 for the desired look) ──
      const g2Mid = (glitch2Start + glitch2End) / 2;
      const hdOpacity =
        options.hdOpacityOverride !== undefined
          ? options.hdOpacityOverride
          : ms > g2Mid
            ? clamp01((ms - g2Mid) / 90)
            : 0;

      // ── 1. Pixel logo (stays at FULL alpha — HD logo draws on top) ──
      if (hdOpacity < 0.99) {
        for (const p of pixels) {
          if (waveFront < p.order) continue;
          const age = waveFront - p.order;
          const pop = clamp01(age / 0.04);
          if (pop >= 1) {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.tx, p.ty, pixelScale, pixelScale);
          } else {
            const s = easeOutCubic(pop) * (1 + 0.25 * (1 - pop));
            const sz = pixelScale * s;
            ctx.fillStyle = p.color;
            ctx.fillRect(
              p.tx + pixelScale / 2 - sz / 2,
              p.ty + pixelScale / 2 - sz / 2,
              sz,
              sz,
            );
          }
        }
      }

      // ── 2. HD logo (fades in ON TOP of pixel logo — no background gap) ──
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

      // ── 3. Shards ──
      const t01 = clamp01(ms / duration); // normalized 0-1 for shard lifecycle
      for (const s of shards) {
        if (t01 < s.spawnT) continue;
        const age = t01 - s.spawnT;
        const life = clamp01(age / (1 - s.spawnT + 0.001));
        const growT = clamp01(age / s.growDuration);
        const currentSize = s.size * easeOutCubic(growT);
        const driftDist = s.speed * age * (duration / 1000);
        const sx = s.ox + Math.cos(s.angle) * driftDist;
        const sy = s.oy + Math.sin(s.angle) * driftDist;
        const fadeStart = 0.5;
        const maxAlpha = 0.009;
        const alpha =
          life < fadeStart
            ? maxAlpha
            : maxAlpha *
              (1 - easeOutCubic((life - fadeStart) / (1 - fadeStart)));
        if (alpha < 0.01) continue;
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

      // ── 4. Text ──
      const fontSize = Math.round(pixelScale * 24);
      const textY = height / 2;
      const textGap = pixelScale * 1.5;

      const drawText = (font: string, alpha: number) => {
        if (alpha < 0.01) return;
        ctx.font = `bold ${fontSize}px '${font}', monospace`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const cW = ctx.measureText("M").width;
        const textColor = isDark ? "#ffffff" : "#111827";

        const cheeseChars = ["C", "H", "E", "E", "S", "E"];
        const cheeseRight = logoOriginX - textGap;
        for (let i = 0; i < cheeseChars.length; i++) {
          const letterMs =
            textStart + (i / (cheeseChars.length - 1)) * (textEnd - textStart);
          if (ms < letterMs) continue;
          const pop = clamp01((ms - letterMs) / 60);
          const sc = easeOutCubic(pop);
          const lx = cheeseRight - (cheeseChars.length - i - 0.5) * cW;
          ctx.save();
          ctx.globalAlpha = sc * alpha;
          ctx.translate(lx, textY);
          ctx.scale(sc, sc);
          ctx.fillStyle = textColor;
          ctx.fillText(cheeseChars[i], 0, 0);
          ctx.restore();
        }

        const bytesChars = ["B", "Y", "T", "E", "S"];
        const bytesLeft = logoOriginX + logoRenderW + textGap * 3;
        for (let i = 0; i < bytesChars.length; i++) {
          const appearIdx = bytesChars.length - 1 - i;
          const letterMs =
            textStart +
            (appearIdx / (bytesChars.length - 1)) * (textEnd - textStart);
          if (ms < letterMs) continue;
          const pop = clamp01((ms - letterMs) / 60);
          const sc = easeOutCubic(pop);
          const lx = bytesLeft + (i + 0.5) * cW;
          ctx.save();
          ctx.globalAlpha = sc * alpha;
          ctx.translate(lx, textY);
          ctx.scale(sc, sc);
          ctx.fillStyle = textColor;
          ctx.fillText(bytesChars[i], 0, 0);
          ctx.restore();
        }
      };

      // Old font stays full alpha; new font draws on top (same trick as logo)
      if (hdOpacity < 0.99) drawText("BigBlueTerm437 Nerd Font Mono", 1);
      if (hdOpacity > 0.01)
        drawText("IosevkaTermSlab Nerd Font Mono", hdOpacity);

      // ── 5. Glitch effect (uses offscreen canvas to avoid grey leak) ──
      if (glitch > 0.01) {
        if (!offscreenRef.current)
          offscreenRef.current = document.createElement("canvas");
        const off = offscreenRef.current;
        off.width = width;
        off.height = height;
        const offCtx = off.getContext("2d");
        if (offCtx) {
          // Copy current frame → offscreen, clear, redraw slices shifted
          offCtx.clearRect(0, 0, width, height);
          offCtx.drawImage(ctx.canvas, 0, 0);
          ctx.clearRect(0, 0, width, height);

          const sliceCount = 8 + Math.floor(glitch * 12);
          const sliceH = Math.ceil(height / sliceCount);
          for (let i = 0; i < sliceCount; i++) {
            const seed =
              Math.sin(i * 73.1 + glitchSeed * 17.17 + glitchPhase * 0.0097) *
              43758.5;
            const rnd = seed - Math.floor(seed);
            const y0 = i * sliceH;
            const h = Math.min(sliceH, height - y0);
            let shift = 0;
            if (rnd > 0.4) {
              shift = Math.round(
                (Math.sin(i * 17.3 + glitchSeed * 3.1 + glitchPhase * 0.005) -
                  0.5) *
                  2 *
                  glitch *
                  40,
              );
            }
            const maxShift = Math.max(0, width - 1);
            shift = Math.max(-maxShift, Math.min(maxShift, shift));
            ctx.drawImage(off, 0, y0, width, h, shift, y0, width, h);

            // Wrap edges so shifted slices never leave transparent gaps.
            if (shift > 0) {
              ctx.drawImage(off, width - shift, y0, shift, h, 0, y0, shift, h);
            } else if (shift < 0) {
              const wrapW = -shift;
              ctx.drawImage(off, 0, y0, wrapW, h, width - wrapW, y0, wrapW, h);
            }
          }
        }

        // Color channel offset
        if (glitch > 0.3) {
          if (offCtx) {
            offCtx.clearRect(0, 0, width, height);
            offCtx.drawImage(ctx.canvas, 0, 0);
          }
          const colorShift = Math.round(glitch * 6);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = glitch * 0.15;
          if (offCtx && colorShift > 0) {
            ctx.drawImage(off, colorShift, 0);
            ctx.drawImage(
              off,
              width - colorShift,
              0,
              colorShift,
              height,
              0,
              0,
              colorShift,
              height,
            );
          } else if (offCtx && colorShift < 0) {
            const wrapW = -colorShift;
            ctx.drawImage(off, colorShift, 0);
            ctx.drawImage(
              off,
              0,
              0,
              wrapW,
              height,
              width - wrapW,
              0,
              wrapW,
              height,
            );
          } else if (offCtx) {
            ctx.drawImage(off, 0, 0);
          }
          ctx.restore();
        }

        // Scan-line noise blocks
        const blockCount = Math.floor(glitch * 8);
        for (let b = 0; b < blockCount; b++) {
          ctx.save();
          ctx.globalAlpha = glitch * 0.5;
          ctx.fillStyle =
            PALETTE[
              Math.floor(
                Math.abs(
                  Math.sin(b * 77.7 + glitchSeed * 11.3 + glitchPhase * 0.0022),
                ) * PALETTE.length,
              )
            ];
          ctx.fillRect(
            Math.sin(b * 331.7 + glitchSeed * 5.7 + glitchPhase * 0.0078) *
              width *
              0.5 +
              width * 0.5,
            Math.sin(b * 127.3 + glitchSeed * 9.2 + glitchPhase * 0.0033) *
              height *
              0.5 +
              height * 0.5,
            20 +
              Math.abs(
                Math.sin(b * 51.1 + glitchSeed * 13.1 + glitchPhase * 0.001),
              ) *
                80,
            2 +
              Math.abs(
                Math.sin(b * 91.3 + glitchSeed * 19.9 + glitchPhase * 0.0044),
              ) *
                6,
          );
          ctx.restore();
        }
      }
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
      isDark,
    ],
  );

  const drawInteractiveHdIntroFrame = useCallback(
    (ctx: CanvasRenderingContext2D, ms: number) => {
      ctx.clearRect(0, 0, width, height);

      const introT = clamp01(ms / interactiveHdIntroMs);
      const fontSize = Math.round(pixelScale * 24);
      const textY = height / 2;
      const textGap = pixelScale * 1.5;
      const textColor = isDark ? "#ffffff" : "#111827";

      if (hdImgRef.current) {
        const sliceCount = 20;
        const sliceW = logoRenderW / sliceCount;
        const centerSlice = (sliceCount - 1) / 2;
        const centerX = logoOriginX + logoRenderW / 2;
        const centerY = logoOriginY + logoRenderH / 2;
        const scale = 0.975 + easeOutCubic(introT) * 0.025;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        for (let i = 0; i < sliceCount; i++) {
          const distanceFromCenter = Math.abs(i - centerSlice) / centerSlice;
          const sliceStart = 24 + distanceFromCenter * 150;
          const sliceT = clamp01((ms - sliceStart) / 95);
          if (sliceT <= 0) continue;

          const reveal = easeOutCubic(sliceT);
          const dx = logoOriginX + i * sliceW;
          const revealH = Math.max(1, logoRenderH * reveal);

          ctx.save();
          ctx.globalAlpha = 0.28 + reveal * 0.72;
          ctx.beginPath();
          ctx.rect(
            dx - 0.5,
            logoOriginY + (logoRenderH - revealH) / 2,
            sliceW + 1,
            revealH,
          );
          ctx.clip();
          ctx.drawImage(
            hdImgRef.current,
            logoOriginX,
            logoOriginY,
            logoRenderW,
            logoRenderH,
          );
          ctx.restore();
        }

        ctx.restore();
      }

      const drawText = (font: string, alpha: number) => {
        if (alpha < 0.01) return;
        ctx.font = `bold ${fontSize}px '${font}', monospace`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const cW = ctx.measureText("M").width;

        const cheeseChars = ["C", "H", "E", "E", "S", "E"];
        const cheeseRight = logoOriginX - textGap;
        for (let i = 0; i < cheeseChars.length; i++) {
          const letterMs = 42 + i * 38;
          if (ms < letterMs) continue;

          const pop = clamp01((ms - letterMs) / 78);
          const sc = easeOutCubic(pop);
          const lx = cheeseRight - (cheeseChars.length - i - 0.5) * cW;

          ctx.save();
          ctx.globalAlpha = sc * alpha;
          ctx.translate(lx, textY);
          ctx.scale(sc, sc);
          ctx.fillStyle = textColor;
          ctx.fillText(cheeseChars[i], 0, 0);
          ctx.restore();
        }

        const bytesChars = ["B", "Y", "T", "E", "S"];
        const bytesLeft = logoOriginX + logoRenderW + textGap * 3;
        for (let i = 0; i < bytesChars.length; i++) {
          const appearIdx = bytesChars.length - 1 - i;
          const letterMs = 42 + appearIdx * 38;
          if (ms < letterMs) continue;

          const pop = clamp01((ms - letterMs) / 78);
          const sc = easeOutCubic(pop);
          const lx = bytesLeft + (i + 0.5) * cW;

          ctx.save();
          ctx.globalAlpha = sc * alpha;
          ctx.translate(lx, textY);
          ctx.scale(sc, sc);
          ctx.fillStyle = textColor;
          ctx.fillText(bytesChars[i], 0, 0);
          ctx.restore();
        }
      };

      drawText(
        "IosevkaTermSlab Nerd Font Mono",
        0.2 + easeOutCubic(introT) * 0.8,
      );
    },
    [
      height,
      interactiveHdIntroMs,
      isDark,
      logoOriginX,
      logoOriginY,
      logoRenderH,
      logoRenderW,
      pixelScale,
      width,
    ],
  );

  /* ── Animation loop ──────────────────────────────────────────────── */
  const startAnimation = useCallback(() => {
    if (!fontsReady || !imageReady) return;

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

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      draw(ctx, elapsed, dtSec);

      if (elapsed < duration) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        if (loop) {
          setTimeout(() => startAnimation(), 2500);
        }
      }
    };

    animRef.current = requestAnimationFrame(tick);
  }, [buildPixels, buildShards, draw, duration, fontsReady, imageReady, loop]);

  const clickCountRef = useRef(clickCount);
  clickCountRef.current = clickCount;

  const startInteractiveIntro = useCallback(() => {
    if (!fontsReady || !imageReady) return;

    const px = buildPixels();
    pixelsRef.current = px;
    shardsRef.current = buildShards(px);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startsPixelated = clickCountRef.current >= clicksToReveal;
    const targetMs = startsPixelated ? 930 : interactiveHdIntroMs;
    let startTimestamp = 0;
    let lastTimestamp = 0;

    const tick = (timestamp: number) => {
      if (!startTimestamp) {
        startTimestamp = timestamp;
        lastTimestamp = timestamp;
      }
      const elapsed = timestamp - startTimestamp;
      const dtSec = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
      lastTimestamp = timestamp;

      if (elapsed < targetMs) {
        if (startsPixelated) {
          draw(ctx, elapsed, dtSec, { hdOpacityOverride: 0 });
        } else {
          drawInteractiveHdIntroFrame(ctx, elapsed);
        }
        animRef.current = requestAnimationFrame(tick);
      } else {
        if (startsPixelated) {
          draw(ctx, targetMs, 0, { hdOpacityOverride: 0 });
        } else {
          drawInteractiveHdIntroFrame(ctx, targetMs);
        }
        setInteractiveIntroDone(true);
      }
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);
  }, [
    buildPixels,
    buildShards,
    draw,
    drawInteractiveHdIntroFrame,
    fontsReady,
    interactiveHdIntroMs,
    imageReady,
  ]);

  /* ── Interactive mode: draw a single static frame based on click progress ── */
  const drawInteractiveFrame = useCallback(() => {
    if (!fontsReady || !imageReady) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (pixelsRef.current.length === 0) {
      pixelsRef.current = buildPixels();
      shardsRef.current = buildShards(pixelsRef.current);
    }

    if (clickCount >= clicksToReveal) {
      draw(ctx, 930, 0, { hdOpacityOverride: 0 });
    } else {
      const stages = [0, 0.2, 0.45, 0.75, 1.0];
      const glitchBoost = stages[Math.min(clickCount, stages.length - 1)];

      draw(ctx, interactiveRestMs, 0, {
        glitchBoost,
        hdOpacityOverride: 1,
        glitchSeed: clickCount * 1337,
        glitchPhase: clickCount * 97,
      });
    }
  }, [
    buildPixels,
    buildShards,
    clickCount,
    draw,
    fontsReady,
    imageReady,
    interactiveRestMs,
  ]);

  useEffect(() => {
    if (mode !== "interactive" || !fontsReady || !imageReady) return;

    setInteractiveIntroDone(false);
    setIsHovering(false);
    setBubblePhase("hidden");
    clearBubbleTimers();
    startInteractiveIntro();

    return () => {
      clearBubbleTimers();
      cancelAnimationFrame(animRef.current);
    };
  }, [clearBubbleTimers, fontsReady, imageReady, mode, startInteractiveIntro]);

  // Interactive mode: redraw on state changes
  useEffect(() => {
    if (
      mode !== "interactive" ||
      !fontsReady ||
      !imageReady ||
      !interactiveIntroDone ||
      isHovering
    ) {
      return;
    }
    drawInteractiveFrame();
  }, [
    drawInteractiveFrame,
    fontsReady,
    imageReady,
    interactiveIntroDone,
    isHovering,
    mode,
  ]);

  useEffect(() => {
    if (
      mode !== "interactive" ||
      !fontsReady ||
      !imageReady ||
      !interactiveIntroDone ||
      !isHovering ||
      clickCount > 0
    ) {
      return;
    }

    let cancelled = false;
    let lastTimestamp = 0;
    let startTimestamp = 0;
    const hoverGlitchDurationMs = 320;

    const tick = (timestamp: number) => {
      if (cancelled) return;

      if (!startTimestamp) startTimestamp = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dtSec = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
      lastTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const burstT = Math.min(elapsed / hoverGlitchDurationMs, 1);
      const burstEnvelope = Math.sin(Math.PI * burstT);
      const hoverGlitch = Math.min(0.28 * burstEnvelope, 0.9);

      draw(ctx, interactiveRestMs, dtSec, {
        glitchBoost: hoverGlitch,
        glitchSeed: hoverSeedRef.current,
        glitchPhase: timestamp,
        hdOpacityOverride: 1,
      });

      if (burstT < 1) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      setIsHovering(false);
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
    };
  }, [
    clickCount,
    draw,
    fontsReady,
    imageReady,
    interactiveIntroDone,
    interactiveRestMs,
    isHovering,
    mode,
  ]);

  useEffect(() => {
    if (bubblePhase === "hidden") return;

    const handlePointerMove = (event: MouseEvent) => {
      updatePointerFromClient(event.clientX, event.clientY);
    };

    window.addEventListener("mousemove", handlePointerMove);
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
    };
  }, [bubblePhase, updatePointerFromClient]);

  useEffect(() => {
    return () => {
      clearBubbleTimers();
    };
  }, [clearBubbleTimers]);

  useEffect(() => {
    if (mode === "interactive" || !fontsReady || !imageReady) return;

    // Listen for Reveal.js slide changes to start/restart animation
    // only when this slide is visible. Falls back to IntersectionObserver.
    const canvas = canvasRef.current;
    if (!canvas) return;

    const section = canvas.closest("section");
    const isSlideVisible = () =>
      section?.classList.contains("present") ?? false;

    const tryStart = () => {
      cancelAnimationFrame(animRef.current);
      if (isSlideVisible()) startAnimation();
    };

    // Reveal fires 'slidechanged' on the deck element
    const deck = canvas.closest(".reveal") ?? document.querySelector(".reveal");
    if (deck) {
      const handler = () => tryStart();
      deck.addEventListener("slidechanged", handler);
      // Also start if already visible (first load)
      if (isSlideVisible()) startAnimation();
      return () => {
        deck.removeEventListener("slidechanged", handler);
        cancelAnimationFrame(animRef.current);
      };
    }

    // Fallback: IntersectionObserver
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startAnimation();
        else cancelAnimationFrame(animRef.current);
      },
      { threshold: 0.5 },
    );
    obs.observe(canvas);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, [fontsReady, imageReady, mode, startAnimation]);

  const bubbleVisible = bubblePhase !== "hidden";
  const bubbleBackground = isDark ? "#fff8d6" : "#ffffff";
  const bubbleBorder = isDark ? "#111827" : "#1f2937";
  const bubbleTextColor = isDark ? "#111827" : "#111827";
  const bubbleShadow = isDark
    ? "0 8px 0 rgba(0,0,0,0.28)"
    : "0 8px 0 rgba(31,41,55,0.2)";
  const bubbleTransform =
    bubblePhase === "enter"
      ? "translate(-50%, calc(-100% - 6px)) scale(0.7) rotate(-9deg)"
      : bubblePhase === "exit"
        ? "translate(-48%, calc(-100% - 30px)) scale(0.82) rotate(7deg)"
        : "translate(-50%, calc(-100% - 18px)) scale(1) rotate(-2deg)";
  const bubbleOpacity =
    bubblePhase === "enter" ? 0.75 : bubblePhase === "exit" ? 0 : 1;
  const bubbleFilter =
    bubblePhase === "enter"
      ? "blur(1px)"
      : bubblePhase === "exit"
        ? "blur(1.4px)"
        : "blur(0px)";

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={
          mode === "interactive"
            ? (event) => {
                if (!interactiveIntroDone) return;
                updatePointerFromClient(event.clientX, event.clientY);
                setClickCount((currentCount) => {
                  const msgIndex = Math.min(
                    currentCount,
                    clickMessages.length - 1,
                  );
                  if (currentCount < clickMessages.length) {
                    const isLast = msgIndex === clickMessages.length - 1;
                    showBubble(
                      event.clientX,
                      event.clientY,
                      clickMessages[msgIndex],
                      isLast ? 2 : 1,
                    );
                  }
                  const next = currentCount + 1;
                  if (next === clicksToReveal) {
                    onPixelModeUnlockedRef.current?.();
                  }
                  return Math.min(next, clicksToReveal);
                });
              }
            : undefined
        }
        onMouseMove={
          mode === "interactive"
            ? (event) => {
                updatePointerFromClient(event.clientX, event.clientY);
              }
            : undefined
        }
        onMouseEnter={
          mode === "interactive"
            ? () => {
                if (!interactiveIntroDone || clickCount > 0) return;
                hoverSeedRef.current = Math.random() * 10_000;
                setIsHovering(true);
              }
            : undefined
        }
        onMouseLeave={
          mode === "interactive"
            ? () => {
                setIsHovering(false);
              }
            : undefined
        }
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: pointerPos.x,
          top: pointerPos.y,
          transform: bubbleTransform,
          opacity: bubbleOpacity,
          filter: bubbleFilter,
          transition:
            "transform 110ms cubic-bezier(0.2, 1.2, 0.4, 1), opacity 110ms ease-out, filter 110ms ease-out",
          pointerEvents: "none",
          zIndex: 2,
          visibility: bubbleVisible ? "visible" : "hidden",
        }}
      >
        <div
          style={{
            position: "relative",
            border: `3px solid ${bubbleBorder}`,
            borderRadius: "999px",
            background: bubbleBackground,
            color: bubbleTextColor,
            padding: "0.45rem 0.85rem 0.55rem",
            fontFamily: "'IosevkaTermSlab Nerd Font Mono', monospace",
            fontWeight: 700,
            fontSize: "0.95rem",
            lineHeight: 1.3,
            boxShadow: bubbleShadow,
            whiteSpace: "nowrap",
          }}
        >
          {bubbleText}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -11,
              width: 18,
              height: 18,
              background: bubbleBackground,
              borderRight: `3px solid ${bubbleBorder}`,
              borderBottom: `3px solid ${bubbleBorder}`,
              transform: "translateX(-50%) rotate(45deg)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LogoAnimation;
export { LogoAnimation };
