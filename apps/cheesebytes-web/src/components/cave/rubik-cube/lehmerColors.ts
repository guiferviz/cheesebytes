/** Softer Rubik face colours — easier on the eyes.
 *  9 entries so the interactive widget supports n up to 9. */
export const FACE_COLORS = [
  { label: "B", hex: "#4a7fd4", name: "Blue" },
  { label: "R", hex: "#d44040", name: "Red" },
  { label: "Y", hex: "#e8c832", name: "Yellow" },
  { label: "G", hex: "#48a860", name: "Green" },
  { label: "O", hex: "#c8541a", name: "Orange" },
  { label: "W", hex: "#d8d8d0", name: "White" },
  { label: "P", hex: "#9b59b6", name: "Purple" },
  { label: "C", hex: "#50c8c8", name: "Cyan" },
  { label: "K", hex: "#e8a0b4", name: "Pink" },
] as const;

const DARK_ON_BG = new Set(["#e8c832", "#d8d8d0", "#50c8c8", "#e8a0b4"]);

/** Readable text colour on top of each face hex. */
export function textColor(hex: string): string {
  return DARK_ON_BG.has(hex) ? "#1a1a1a" : "#fff";
}
