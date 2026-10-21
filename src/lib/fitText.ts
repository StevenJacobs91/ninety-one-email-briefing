/**
 * The largest whole-pixel font size, between `min` and `max`, at which the text still fits. `fits(px)` reports
 * whether it does at that size. If it never fits, the minimum is used. A binary search, so it stays quick.
 */
export function fitFontSize(max: number, min: number, fits: (px: number) => boolean): number {
  let lo = Math.ceil(min)
  let hi = Math.floor(max)
  if (hi <= lo) return lo
  if (fits(hi)) return hi
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (fits(mid)) lo = mid
    else hi = mid - 1
  }
  return lo
}
