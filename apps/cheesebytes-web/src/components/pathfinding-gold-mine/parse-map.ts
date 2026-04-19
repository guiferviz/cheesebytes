import type { MineMapState, Pos } from "./types";
import {
  posKey,
  WALL_CHAR,
  START_CHAR,
  EXIT_CHAR,
  PATH_CHAR,
  MONSTER_CHAR,
} from "./types";

// ── Parsing ─────────────────────────────────────────────────────────────────

export function parseRawMap(raw: string[]): MineMapState {
  const rows = raw.length;
  const cols = raw[0]?.length ?? 0;
  const walls = new Set<string>();
  let start: Pos = { r: 0, c: 0 };
  let exit: Pos = { r: 0, c: 0 };
  let monsterStart: Pos | null = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < (raw[r]?.length ?? 0); c++) {
      const ch = raw[r][c];
      if (ch === WALL_CHAR) walls.add(posKey(r, c));
      if (ch === START_CHAR) start = { r, c };
      if (ch === EXIT_CHAR) exit = { r, c };
      if (ch === MONSTER_CHAR) monsterStart = { r, c };
    }
  }
  return { rows, cols, walls, start, exit, monsterStart, version: 0 };
}

// ── Serialization ───────────────────────────────────────────────────────────

export function mapToStrings(map: MineMapState): string[] {
  const lines: string[] = [];
  for (let r = 0; r < map.rows; r++) {
    let row = "";
    for (let c = 0; c < map.cols; c++) {
      if (r === map.start.r && c === map.start.c) row += START_CHAR;
      else if (r === map.exit.r && c === map.exit.c) row += EXIT_CHAR;
      else if (map.monsterStart && r === map.monsterStart.r && c === map.monsterStart.c) row += MONSTER_CHAR;
      else if (map.walls.has(posKey(r, c))) row += WALL_CHAR;
      else row += PATH_CHAR;
    }
    lines.push(row);
  }
  return lines;
}

export function toPythonCode(lines: string[]): string {
  const rows = lines.map((l) => `    "${l}",`).join("\n");
  return `MINE_MAP = [\n${rows}\n]`;
}

export function fromPythonCode(code: string): string[] | null {
  const match = code.match(/\[([^\]]*)\]/s);
  if (!match) return null;
  const inner = match[1];
  const strs: string[] = [];
  const re = /"([^"]*)"|'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    strs.push(m[1] ?? m[2]);
  }
  if (strs.length === 0) return null;
  const len = strs[0].length;
  if (strs.some((s) => s.length !== len)) return null;
  return strs;
}

// ── Validation ──────────────────────────────────────────────────────────────

export function validateRawMap(lines: string[]): string | null {
  if (lines.length === 0) return "Invalid format — the map cannot be empty";

  const rows = lines.length;
  const cols = lines[0].length;
  const validChars = new Set([
    WALL_CHAR,
    PATH_CHAR,
    START_CHAR,
    EXIT_CHAR,
    MONSTER_CHAR,
  ]);
  let startCount = 0;
  let exitCount = 0;
  let monsterCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = lines[r][c];
      if (!validChars.has(ch)) {
        return "Invalid map — use only #, ., S, E, and optional M";
      }
      if (ch === START_CHAR) startCount += 1;
      if (ch === EXIT_CHAR) exitCount += 1;
      if (ch === MONSTER_CHAR) monsterCount += 1;
      const isBorder = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      if (isBorder && ch !== WALL_CHAR) {
        return "Invalid map — the entire border must be walls (#)";
      }
    }
  }

  if (startCount === 0) {
    return "Invalid map — missing start marker (S)";
  }
  if (exitCount === 0) {
    return "Invalid map — missing exit marker (E)";
  }
  if (startCount > 1) {
    return "Invalid map — use exactly one start marker (S)";
  }
  if (exitCount > 1) {
    return "Invalid map — use exactly one exit marker (E)";
  }
  if (monsterCount > 1) {
    return "Invalid map — use at most one monster marker (M)";
  }

  return null;
}

// ── Resize / border helpers ─────────────────────────────────────────────────

export function buildBorderWalls(rows: number, cols: number): Set<string> {
  const walls = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        walls.add(posKey(r, c));
      }
    }
  }
  return walls;
}

export function clampInterior(value: number, limit: number): number {
  return Math.min(Math.max(value, 1), limit - 2);
}
