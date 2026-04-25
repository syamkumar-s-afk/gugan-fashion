import heroFallbackUrl from '../assets/hero.png';

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

export const FALLBACK_IMAGE_URL = heroFallbackUrl;

export const parseImageList = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseImageList(item)).filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    try {
      return parseImageList(JSON.parse(trimmed));
    } catch (_) {
      // Fall through to plain-string handling.
    }
  }

  if (trimmed.includes(',')) {
    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [trimmed];
};

export const getImageUrl = (value, fallback = FALLBACK_IMAGE_URL) => {
  const candidate = parseImageList(value)[0];
  if (!candidate) return fallback;

  if (/^data:image\//i.test(candidate) || candidate.startsWith('blob:')) {
    return candidate;
  }

  if (/^(\/|\.\/|\.\.\/)/.test(candidate)) {
    return candidate;
  }

  try {
    const url = new URL(candidate, window.location.origin);
    if (HTTP_PROTOCOLS.has(url.protocol)) {
      return url.href;
    }
  } catch (_) {
    // Ignore malformed URLs and use the local fallback.
  }

  return fallback;
};
