export const PROVIDER_NAMES = {
  GOOGLE_VISION: 'google_vision',
  NSFWJS: 'nsfwjs',
} as const;

// SafeSearch likelihood values from Google Vision SDK mapped to normalized scores (0-1)
export const GOOGLE_LIKELIHOOD_SCORES: Record<string, number> = {
  UNKNOWN: 0.0,
  VERY_UNLIKELY: 0.1,
  UNLIKELY: 0.3,
  POSSIBLE: 0.5,
  LIKELY: 0.8,
  VERY_LIKELY: 1.0,
};
