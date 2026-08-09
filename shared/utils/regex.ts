/** Escape regex metacharacters so user input is safe to embed in a RegExp / MongoDB $regex. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
