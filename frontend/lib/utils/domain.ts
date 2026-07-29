/** Strips scheme, credentials, path, and a trailing dot from user input. */
export function normaliseDomain(raw: string): string {
  return (
    raw
      .trim()
      .toLowerCase()
      .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
      .replace(/^[^/@]*@/, '')
      .split(/[/?#]/)[0]
      ?.replace(/\.$/, '')
      ?.replace(/:\d+$/, '')
      .trim() ?? ''
  );
}

const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const DOMAIN_PATTERN = new RegExp(`^(?:${LABEL}\\.)+[a-z]{2,63}$`);

/** Format check only. Reachability is verified server-side before a scan runs. */
export function isValidDomain(domain: string): boolean {
  if (domain.length === 0 || domain.length > 253) return false;
  return DOMAIN_PATTERN.test(domain);
}
