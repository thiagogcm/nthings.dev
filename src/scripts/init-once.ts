/**
 * Run `setup` only once per page session, keyed by `key`. Guards document-level
 * listeners against re-binding across view-transition navigations, where the
 * module persists but `astro:page-load` drives per-page re-setup.
 */
export function initOnce(key: string, setup: () => void): void {
  const store = window as unknown as { __nthingsInit?: Set<string> };
  const seen = store.__nthingsInit ?? new Set<string>();
  store.__nthingsInit = seen;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  setup();
}
