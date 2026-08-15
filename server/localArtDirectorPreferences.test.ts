import { describe, expect, it } from 'vitest';
import type { DesignLayoutCandidate } from '@shared/types';
import { defaultPreferenceProfile, normalizePreferenceProfile, rankCompositionCandidates, recordLayoutPreference } from '../client/src/lib/localArtDirectorPreferences';

const candidates: DesignLayoutCandidate[] = [
  { size: 'portrait', score: 76, garmentTransform: { x: .14, y: .03, width: .72, height: .93 }, reasons: [{ title: 'نسبة', explanation: 'مناسب', metrics: { sourceRatio: .8, ratioFit: 92 } }, { title: 'مساحة', explanation: 'آمنة', metrics: { coverage: .42, safeScore: 100 } }] },
  { size: 'square', score: 76, garmentTransform: { x: .14, y: .03, width: .72, height: .93 }, reasons: [{ title: 'نسبة', explanation: 'مناسب', metrics: { sourceRatio: 1, ratioFit: 90 } }, { title: 'مساحة', explanation: 'آمنة', metrics: { coverage: .42, safeScore: 100 } }] },
];

describe('تفضيلات المخرج المحلي', () => {
  it('يرفض التخزين الفاسد والمفاتيح غير المعروفة والقيم غير المنتهية', () => {
    const profile = normalizePreferenceProfile({ version: 1, enabled: true, acceptedLayouts: { portrait: Infinity, evil: 500 }, rejectedLayouts: { square: -3 } });
    expect(profile.acceptedLayouts).toEqual({});
    expect(profile.rejectedLayouts).toEqual({});
  });

  it('يرتب نتائج التكوين بصورة حتمية ويضيف التفضيل بوزن محدود فقط', () => {
    const profile = { ...defaultPreferenceProfile(), acceptedLayouts: { square: 99 } };
    const first = rankCompositionCandidates(candidates, 84, profile);
    const second = rankCompositionCandidates(candidates, 84, profile);
    expect(first).toEqual(second);
    expect(first[0].size).toBe('square');
    expect(first[0].score - first[1].score).toBeLessThanOrEqual(8);
    expect(first[0].metrics.geometrySafe).toBe(100);
  });

  it('يسجل قبول التخطيط محلياً من دون صورة أو بيانات متجر', () => {
    const next = recordLayoutPreference({ ...defaultPreferenceProfile(), enabled: false }, 'portrait', true);
    expect(next.acceptedLayouts.portrait).toBe(1);
    expect(Object.keys(next)).not.toContain('image');
    expect(Object.keys(next)).not.toContain('storePhone');
  });
});
