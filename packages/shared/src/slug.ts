export const RESERVED_SLUGS = ['admin', 'www', 'api', 'app', 'mail', 'static', 'cdn', 'assets', 'status', 'help', 'support'];
export const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$/;

export function validateSlug(slug: string): string | null {
  if (!SLUG_REGEX.test(slug)) return 'Use 3-32 lowercase letters, numbers or hyphens';
  if (slug.endsWith('-admin')) return 'Slug cannot end with "-admin"';
  if (slug.includes('--')) return 'Slug cannot contain consecutive hyphens';
  if (RESERVED_SLUGS.includes(slug)) return 'This slug is reserved';
  return null;
}

export type HostTarget =
  | { kind: 'landing' }
  | { kind: 'superadmin' }
  | { kind: 'store-admin'; slug: string }
  | { kind: 'storefront'; slug: string }
  | { kind: 'unknown' };

/** Resolve which surface a hostname belongs to. rootDomain may include a port (localhost:3000). */
export function resolveHost(host: string, rootDomain: string): HostTarget {
  const h = host.toLowerCase();
  const root = rootDomain.toLowerCase();
  if (h === root || h === `www.${root}`) return { kind: 'landing' };
  if (!h.endsWith(`.${root}`)) return { kind: 'unknown' };
  const sub = h.slice(0, -(root.length + 1));
  if (sub.includes('.')) return { kind: 'unknown' };
  if (sub === 'admin') return { kind: 'superadmin' };
  if (sub.endsWith('-admin')) return { kind: 'store-admin', slug: sub.slice(0, -'-admin'.length) };
  return { kind: 'storefront', slug: sub };
}
