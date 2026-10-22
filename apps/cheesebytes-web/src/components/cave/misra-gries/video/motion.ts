/** Frame-independent, zero-velocity easing at each teaching beat. */
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const slotX = (index: number, capacity: number) =>
  800 + (index - (capacity - 1) / 2) * (capacity === 2 ? 370 : 325);
export const ribbonX = (index: number) => 212 + index * 84;
export function transferPose(fromX: number, toX: number, p: number) {
  const q = smooth(p);
  return {
    x: mix(fromX, toX, q),
    y: mix(190, 445, q) - Math.sin(Math.PI * q) * 35,
    size: mix(50, 88, q),
    opacity: 1 - smooth((p - 0.83) / 0.17),
  };
}
export function cancellationPose(x: number, y: number, p: number) {
  const q = smooth(p / 0.78);
  return {
    x: mix(x, 800, q),
    y: mix(y, 330, q),
    opacity: 1 - smooth((p - 0.68) / 0.24),
  };
}
