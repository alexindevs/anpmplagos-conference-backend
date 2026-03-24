import type { RegType } from '@prisma/client';

/** e.g. `special_guest` → `special-guest` for public profile paths */
export function regTypeToUrlSegment(regType: RegType): string {
  return regType.replace(/_/g, '-');
}

export function buildPublicProfileUrl(
  frontendUrl: string,
  regType: RegType,
  slug: string,
): string {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/${regTypeToUrlSegment(regType)}/${slug}`;
}

/** Matches typical frontend routes alongside public API `/api/speakers` and `/api/special-guests`. */
export function buildConferenceProfileUrl(
  frontendUrl: string,
  kind: 'speaker' | 'special_guest',
  slug: string,
): string {
  const base = frontendUrl.replace(/\/$/, '');
  const segment = kind === 'speaker' ? 'speakers' : 'special-guests';
  return `${base}/${segment}/${slug}`;
}
