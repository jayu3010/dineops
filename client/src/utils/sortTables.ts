/** Natural order: T1, T2, … T9, T10 (not T1, T10, T2). */
export function sortTablesByNumber<T extends { tableNumber?: string }>(tables: T[]): T[] {
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  return [...tables].sort((a, b) =>
    collator.compare(String(a.tableNumber ?? ''), String(b.tableNumber ?? ''))
  );
}
