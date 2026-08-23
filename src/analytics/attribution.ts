import { isAuthCallbackUrl } from '../auth/callback';

export type EntrySource =
  | 'direct'
  | 'search'
  | 'social'
  | 'paid'
  | 'share'
  | 'auth'
  | 'other';

export type UtmSource =
  | 'facebook'
  | 'instagram'
  | 'meta'
  | 'google'
  | 'reddit'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'other';

export type UtmMedium =
  | 'paid'
  | 'social'
  | 'organic'
  | 'email'
  | 'referral'
  | 'share'
  | 'other';

export type ArrivalAttribution = {
  entry_source: EntrySource;
  has_utm_campaign: boolean;
  utm_source?: UtmSource;
  utm_medium?: UtmMedium;
};

const UTM_SOURCE_ALIASES: Record<string, UtmSource> = {
  facebook: 'facebook',
  fb: 'facebook',
  'fb-ads': 'facebook',
  instagram: 'instagram',
  ig: 'instagram',
  'ig-ads': 'instagram',
  meta: 'meta',
  an: 'meta',
  google: 'google',
  'google-ads': 'google',
  googleads: 'google',
  reddit: 'reddit',
  twitter: 'twitter',
  x: 'twitter',
  tiktok: 'tiktok',
  youtube: 'youtube',
  yt: 'youtube',
};

const UTM_MEDIUM_ALIASES: Record<string, UtmMedium> = {
  paid: 'paid',
  cpc: 'paid',
  ppc: 'paid',
  paidsocial: 'paid',
  paid_social: 'paid',
  'paid-social': 'paid',
  social: 'social',
  organic: 'organic',
  email: 'email',
  referral: 'referral',
  share: 'share',
};

const SEARCH_HOST_MARKERS = [
  'google.',
  'bing.',
  'duckduckgo.',
  'yahoo.',
  'baidu.',
];

const SOCIAL_HOST_MARKERS = [
  'facebook.',
  'fb.com',
  'instagram.',
  'l.instagram',
  'meta.com',
  't.co',
  'twitter.',
  'x.com',
  'reddit.',
  'youtube.',
  'youtu.be',
  'tiktok.',
];

const SOCIAL_UTM_SOURCES: ReadonlySet<UtmSource> = new Set([
  'facebook',
  'instagram',
  'meta',
  'reddit',
  'twitter',
  'tiktok',
  'youtube',
]);

export function resolveAttribution(input: {
  href?: string | null;
  referrer?: string | null;
}): ArrivalAttribution {
  const href = input.href?.trim() ?? '';
  if (href && isAuthCallbackUrl(href)) {
    return { entry_source: 'auth', has_utm_campaign: false };
  }

  const params = queryParamsFrom(href);
  const rawSource = firstQueryValue(params, 'utm_source');
  const rawMedium = firstQueryValue(params, 'utm_medium');
  const rawCampaign = firstQueryValue(params, 'utm_campaign');

  const utm_source = rawSource ? bucketUtmSource(rawSource) : undefined;
  const utm_medium = rawMedium ? bucketUtmMedium(rawMedium) : undefined;
  const referrerKind = classifyReferrerHost(hostFrom(input.referrer));

  return {
    entry_source: deriveEntrySource({
      utm_source,
      utm_medium,
      referrerKind,
      hasUtm: Boolean(rawSource || rawMedium || rawCampaign),
    }),
    has_utm_campaign: Boolean(rawCampaign),
    ...(utm_source ? { utm_source } : {}),
    ...(utm_medium ? { utm_medium } : {}),
  };
}

export function isLandingArrival(input: {
  isWeb: boolean;
  hasHref: boolean;
  entry_source: EntrySource;
}): boolean {
  if (input.isWeb) return true;
  return input.hasHref && input.entry_source !== 'auth';
}

function deriveEntrySource(input: {
  utm_source?: UtmSource;
  utm_medium?: UtmMedium;
  referrerKind: 'search' | 'social' | null;
  hasUtm: boolean;
}): EntrySource {
  if (input.utm_medium === 'paid') return 'paid';
  if (input.utm_medium === 'share') return 'share';
  if (input.referrerKind === 'search' || input.utm_medium === 'organic') {
    return 'search';
  }
  if (
    input.referrerKind === 'social' ||
    input.utm_medium === 'social' ||
    (input.utm_source !== undefined && SOCIAL_UTM_SOURCES.has(input.utm_source))
  ) {
    return 'social';
  }
  if (input.hasUtm) return 'other';
  return 'direct';
}

function bucketUtmSource(value: string): UtmSource {
  return UTM_SOURCE_ALIASES[normalizeToken(value)] ?? 'other';
}

function bucketUtmMedium(value: string): UtmMedium {
  return UTM_MEDIUM_ALIASES[normalizeToken(value)] ?? 'other';
}

function classifyReferrerHost(host: string | null): 'search' | 'social' | null {
  if (!host) return null;
  if (SEARCH_HOST_MARKERS.some((marker) => host.includes(marker))) return 'search';
  if (SOCIAL_HOST_MARKERS.some((marker) => host.includes(marker))) return 'social';
  return null;
}

function queryParamsFrom(url: string): URLSearchParams {
  const start = url.indexOf('?');
  if (start < 0) return new URLSearchParams();
  const rest = url.slice(start + 1);
  const hash = rest.indexOf('#');
  return new URLSearchParams(hash >= 0 ? rest.slice(0, hash) : rest);
}

function firstQueryValue(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value ? value : null;
}

function hostFrom(referrer: string | null | undefined): string | null {
  const value = referrer?.trim();
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}
