// Shared components and utilities for the Gold Mine pathfinding series.

// Types
export type { Pos, MineMapState } from "./types";
export { posKey, parseKey, WALL_CHAR, PATH_CHAR, START_CHAR, EXIT_CHAR } from "./types";

// Map parsing & serialization
export {
  parseRawMap,
  mapToStrings,
  toPythonCode,
  fromPythonCode,
  validateRawMap,
  buildBorderWalls,
  clampInterior,
} from "./parse-map";

// Viewer shared constants
export {
  ATLAS_SRC,
  TS,
  GRID_LINE_COLOR,
  GRID_HOVER_FILL,
  GRID_HOVER_OUTLINE,
  GOLD_SPECKS,
  buildTilemapData,
  cellCenterX,
  cellCenterY,
} from "./mine-viewer-shared";

// Maps
export { simpleMap, mediumMap } from "./maps";

// React components
export { MineMapViewer } from "./MineMapViewer";
export { MineGridOverlay } from "./MineGridOverlay";

// Fullscreen hook
export {
  useFullscreen,
  fullscreenRootStyle,
  fullscreenInnerStyle,
} from "./useFullscreen";

// Article-scoped store
export {
  useArticleMap,
  useArticleGrid,
  getArticleGrid,
  getArticleMapPython,
  setArticleMap,
  ARTICLE_DEFAULT_MAP,
} from "./article-store";
