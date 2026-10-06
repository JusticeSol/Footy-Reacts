/**
 * A dollar amount as the UI shows it. Space Mono draws "$" noticeably smaller
 * than its digits, so the sign is scaled up to sit level with the numerals.
 */
export function Money({ dollars, units }: { dollars?: number; units?: number }) {
  const value = dollars ?? (units ?? 0) / 1_000_000;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return (
    <span className="whitespace-nowrap">
      <span className="text-[1.3em] leading-none">$</span>
      {text}
    </span>
  );
}
