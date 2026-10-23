/** Folga (px) até o fim em que o usuário ainda conta como "colado no fim" do console. */
export const BOTTOM_THRESHOLD_PX = 24;

/** O contêiner rolável está no fim (ou a menos de `threshold` px dele)? */
export function isNearBottom(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  threshold: number = BOTTOM_THRESHOLD_PX
): boolean {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}
