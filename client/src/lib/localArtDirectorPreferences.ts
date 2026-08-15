import type { CompositionScore, DesignDecisionReason, DesignLayoutCandidate, PreferenceProfile, TemplateSize } from '@shared/types';

const KEY = 'clothing_ad_local_art_director_preferences_v1';
const LAYOUTS: TemplateSize[] = ['portrait', 'square', 'story', 'whatsapp', 'landscape'];

export function defaultPreferenceProfile(): PreferenceProfile {
  return { version: 1, enabled: true, acceptedLayouts: {}, rejectedLayouts: {}, updatedAt: Date.now() };
}

export function loadPreferenceProfile(): PreferenceProfile {
  try {
    if (typeof localStorage === 'undefined') return defaultPreferenceProfile();
    return normalizePreferenceProfile(JSON.parse(localStorage.getItem(KEY) || 'null'));
  } catch { return defaultPreferenceProfile(); }
}

export function normalizePreferenceProfile(value: unknown): PreferenceProfile {
  const fallback = defaultPreferenceProfile();
  if (!value || typeof value !== 'object') return fallback;
  const source = value as Record<string, unknown>;
  if (source.version !== 1) return fallback;
  const normalizeCounts = (raw: unknown): Partial<Record<TemplateSize, number>> => {
    if (!raw || typeof raw !== 'object') return {};
    return LAYOUTS.reduce<Partial<Record<TemplateSize, number>>>((result, size) => {
      const count = Number((raw as Record<string, unknown>)[size]);
      if (Number.isFinite(count) && count > 0) result[size] = Math.min(100000, Math.floor(count));
      return result;
    }, {});
  };
  return {
    version: 1,
    enabled: source.enabled !== false,
    acceptedLayouts: normalizeCounts(source.acceptedLayouts),
    rejectedLayouts: normalizeCounts(source.rejectedLayouts),
    updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : fallback.updatedAt,
  };
}

export function savePreferenceProfile(profile: PreferenceProfile) {
  const safe = normalizePreferenceProfile(profile);
  try { localStorage.setItem(KEY, JSON.stringify({ ...safe, updatedAt: Date.now() })); } catch { /* التخزين اختياري */ }
  return safe;
}

export function setPreferenceEnabled(profile: PreferenceProfile, enabled: boolean) {
  return savePreferenceProfile({ ...profile, enabled });
}

export function clearPreferenceProfile() {
  try { localStorage.removeItem(KEY); } catch { /* التخزين اختياري */ }
  return defaultPreferenceProfile();
}

export function recordLayoutPreference(profile: PreferenceProfile, size: TemplateSize, accepted: boolean) {
  const field = accepted ? 'acceptedLayouts' : 'rejectedLayouts';
  const next = { ...profile, [field]: { ...profile[field], [size]: (profile[field][size] || 0) + 1 } };
  return savePreferenceProfile(next);
}

export function scoreComposition(candidate: DesignLayoutCandidate, qualityScore: number, profile: PreferenceProfile): CompositionScore {
  const sourceRatio = candidate.reasons[0]?.metrics.sourceRatio ?? 1;
  const ratioFit = candidate.reasons[0]?.metrics.ratioFit ?? candidate.score;
  const coverage = candidate.reasons[1]?.metrics.coverage ?? .4;
  const safeArea = candidate.reasons[1]?.metrics.safeScore ?? 80;
  const geometrySafe = candidate.garmentTransform.x >= .04 && candidate.garmentTransform.y >= 0 && candidate.garmentTransform.x + candidate.garmentTransform.width <= .96 ? 100 : 30;
  const priceSafety = candidate.size === 'landscape' ? 92 : 96;
  const logoSafety = candidate.size === 'story' ? 90 : 96;
  const preferenceDelta = !profile.enabled ? 0 : Math.max(-4, Math.min(4, (profile.acceptedLayouts[candidate.size] || 0) - (profile.rejectedLayouts[candidate.size] || 0)));
  const score = Math.round(Math.max(0, Math.min(100, qualityScore * .18 + ratioFit * .24 + safeArea * .16 + geometrySafe * .18 + priceSafety * .12 + logoSafety * .08 + (1 - Math.abs(coverage - .42)) * 100 * .04 + preferenceDelta)));
  const metrics = { quality: qualityScore, ratioFit, safeArea, geometrySafe, priceSafety, logoSafety, sourceRatio, preferenceDelta };
  const reason: DesignDecisionReason = { title: score >= 82 ? 'تركيب متوازن' : 'تركيب قابل للتحسين', explanation: `النتيجة ${score}/100: وضوح القطعة ${qualityScore}، تناسب الصورة ${Math.round(ratioFit)}، أمان العناصر ${Math.round(geometrySafe)}، ووضوح السعر ${priceSafety}.${preferenceDelta ? ` أثرت تفضيلاتك بوزن محدود ${preferenceDelta}.` : ''}`, metrics };
  return { size: candidate.size, score, metrics, reason, garmentTransform: candidate.garmentTransform };
}

export function rankCompositionCandidates(candidates: DesignLayoutCandidate[], qualityScore: number, profile = loadPreferenceProfile()) {
  return candidates.map(candidate => scoreComposition(candidate, qualityScore, profile)).sort((a, b) => b.score - a.score || LAYOUTS.indexOf(a.size) - LAYOUTS.indexOf(b.size));
}
