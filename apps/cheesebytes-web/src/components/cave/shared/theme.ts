/**
 * CheeseBytes Design System - Theme Configuration
 *
 * Unified color palette and styling tokens for all cave slide components.
 * Pastel, warm, cheese-inspired colors for a consistent visual identity.
 */

// ===========================================
// COLOR PALETTE
// ===========================================

export const CHEESE_COLORS = {
  // Primary cheese tones
  cheese: {
    light: "#FFF8DC", // Cornsilk - lightest cheese
    cream: "#FFEFD5", // Papaya whip
    yellow: "#FFE4B5", // Moccasin
    golden: "#FFD700", // Gold
    cheddar: "#FFA500", // Orange
    aged: "#DAA520", // Goldenrod
  },

  // Pastel accent colors
  pastel: {
    pink: "#FFE4E1", // Misty rose
    peach: "#FFDAB9", // Peach puff
    lavender: "#E6E6FA", // Lavender
    mint: "#F0FFF0", // Honeydew
    sky: "#E0F7FA", // Light cyan
    butter: "#FFFACD", // Lemon chiffon
  },

  // Functional colors
  state: {
    success: "#A8E6CF", // Mint green
    warning: "#FFD93D", // Warm yellow
    error: "#FF8A8A", // Soft red
    info: "#AED6F1", // Light blue
  },

  // Neutral tones
  neutral: {
    50: "#FEFEFE",
    100: "#F8F8F8",
    200: "#E8E8E8",
    300: "#D0D0D0",
    400: "#A0A0A0",
    500: "#707070",
    600: "#505050",
    700: "#383838",
    800: "#282828",
    900: "#181818",
  },
} as const;

// ===========================================
// GRADIENTS
// ===========================================

export const CHEESE_GRADIENTS = {
  // Warm cheese gradients
  warmCheese: "linear-gradient(135deg, #FFF8DC 0%, #FFE4B5 50%, #FFDAB9 100%)",
  goldenHour: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
  creamyButter: "linear-gradient(180deg, #FFFACD 0%, #FFE4B5 100%)",

  // Soft pastel gradients
  softPink: "linear-gradient(135deg, #FFE4E1 0%, #FFDAB9 100%)",
  mintFresh: "linear-gradient(135deg, #F0FFF0 0%, #A8E6CF 100%)",
  skyDream: "linear-gradient(135deg, #E0F7FA 0%, #AED6F1 100%)",

  // Card backgrounds
  cardDefault:
    "linear-gradient(180deg, rgba(255,248,220,0.9) 0%, rgba(255,229,181,0.9) 100%)",
  cardGlass:
    "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,248,220,0.6) 100%)",
} as const;

// ===========================================
// BUTTON STYLES
// ===========================================

export const BUTTON_STYLES = {
  primary: {
    base: "bg-amber-400 text-white font-bold shadow-md hover:shadow-lg dark:bg-amber-600 transition-colors",
    hover: "hover:bg-amber-500 dark:hover:bg-amber-500",
    disabled:
      "disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:bg-gray-700 dark:disabled:text-gray-500",
  },
  secondary: {
    base: "bg-stone-200 text-stone-700 font-medium shadow-sm dark:bg-stone-700 dark:text-stone-200 transition-colors",
    hover: "hover:bg-stone-300 dark:hover:bg-stone-600",
    disabled:
      "disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:bg-stone-800 dark:disabled:text-stone-600",
  },
  success: {
    base: "bg-emerald-500 text-white font-bold shadow-md dark:bg-emerald-600 transition-colors",
    hover: "hover:bg-emerald-600 dark:hover:bg-emerald-500",
    disabled:
      "disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700",
  },
  danger: {
    base: "bg-rose-500 text-white font-bold shadow-md dark:bg-rose-600 transition-colors",
    hover: "hover:bg-rose-600 dark:hover:bg-rose-500",
    disabled:
      "disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700",
  },
} as const;

// ===========================================
// CONTAINER STYLES
// ===========================================

export const CONTAINER_STYLES = {
  slide: `
    flex flex-col items-center gap-5 p-6 
    bg-gradient-to-b from-amber-50/80 to-orange-50/60 dark:from-stone-900/90 dark:to-stone-950/90
    rounded-3xl
    select-none
  `,
  card: `
    bg-white/95 backdrop-blur-sm dark:bg-stone-800/95
    border border-amber-200/50 dark:border-amber-700/30
    rounded-2xl shadow-lg p-5
  `,
  panel: `
    bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-800 dark:to-stone-900
    border border-stone-200 dark:border-stone-700
    rounded-xl shadow-inner p-4
  `,
} as const;

// ===========================================
// TEXT STYLES
// ===========================================

export const TEXT_STYLES = {
  title: "text-2xl font-bold text-amber-800 dark:text-amber-200",
  subtitle: "text-lg font-semibold text-amber-700 dark:text-amber-300",
  label: "text-sm font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wider",
  body: "text-base text-stone-700 dark:text-stone-300",
  mono: "font-mono text-sm text-stone-600 dark:text-stone-400",
} as const;

// ===========================================
// ANIMATIONS
// ===========================================

export const CHEESE_ANIMATIONS = `
  @keyframes cheesePop {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
  }
  
  @keyframes cheeseFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes cheeseGlow {
    0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); }
    50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); }
  }
  
  @keyframes cheeseBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  @keyframes cheeseShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes counterPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
`;

// ===========================================
// SVG FILTERS
// ===========================================

export const SVG_FILTERS = `
  <defs>
    <filter id="cheeseGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <linearGradient id="cheeseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="100%" style="stop-color:#FFA500"/>
    </linearGradient>
    
    <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#87CEEB"/>
      <stop offset="100%" style="stop-color:#4A90D9"/>
    </linearGradient>
  </defs>
`;
