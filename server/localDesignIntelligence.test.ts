import { describe, expect, it } from 'vitest';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS, type DesignSuggestion } from '@shared/types';
import { applyDesignSuggestion, restoreTemplateBeforeSuggestion } from '../client/src/lib/designSuggestionApplication';
import { buildEvidenceBoundText, chooseReadableBackground, contrastRatio, createSuggestionFromMetrics, decideSafeCrop, rankLayoutCandidates } from '../client/src/lib/localDesignIntelligence';

const metrics = {
  width: 1080,
  height: 1350,
  brightness: 132,
  contrast: 62,
  sharpness: 58,
  foreground: { x: .16, y: .1, width: .54, height: .72, coverage: .39 },
  colors: [{ hex: '#C62828', label: 'أحمر', weight: .56 }, { hex: '#FFFFFF', label: 'أبيض', weight: .2 }],
};

describe('المصمم المحلي الذكي', () => {
  it('ينتج اقتراحاً حتمياً من القياسات نفسها من دون شبكة', () => {
    const details = { ...DEFAULT_AD_DETAILS, productName: 'قميص', price: '15', features: [] };
    const first = createSuggestionFromMetrics(metrics, details, 1_700_000_000_000);
    const second = createSuggestionFromMetrics(metrics, details, 1_700_000_000_000);
    expect(first).toEqual(second);
    expect(first.candidates).toHaveLength(3);
    expect(first.candidates[0].score).toBeGreaterThanOrEqual(first.candidates[1].score);
    expect(first.candidates[0].reasons[0].metrics).toHaveProperty('ratioFit');
  });

  it('يرتب التخطيطات الخمسة ويعيد قصاً آمناً داخل الحدود', () => {
    const candidates = rankLayoutCandidates(metrics);
    expect(candidates).toHaveLength(5);
    expect(candidates[0].score).toBeGreaterThanOrEqual(candidates[4].score);
    const crop = decideSafeCrop({ x: .03, y: .02, width: .9, height: .92, coverage: .5 });
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
    expect(crop.width).toBeLessThanOrEqual(1);
    expect(crop.height).toBeLessThanOrEqual(1);
  });

  it('يختار خلفية مقروءة ويحسب تبايناً معيارياً', () => {
    expect(contrastRatio('#FFFFFF', '#111111')).toBeGreaterThan(15);
    expect(chooseReadableBackground([{ hex: '#111111', label: 'أسود', weight: 1 }])).toMatch(/^#/);
  });

  it('لا يخترع خصائص تسويقية لم يدخلها المستخدم', () => {
    const text = buildEvidenceBoundText({ ...DEFAULT_AD_DETAILS, productName: 'فستان', price: '20', features: [], colors: [] });
    expect(text).toContain('فستان');
    expect(text).toContain('20');
    expect(text).not.toContain('قطن');
    expect(text).not.toContain('جودة عالية');
  });

  it('لا يغير القالب إلا عند الاعتماد ويسمح بالتراجع عنه', () => {
    const suggestion = createSuggestionFromMetrics(metrics, { ...DEFAULT_AD_DETAILS, features: [] }, 1) as DesignSuggestion;
    const before = { ...DEFAULT_TEMPLATE_SETTINGS };
    const applied = applyDesignSuggestion(before, suggestion);
    expect(before.size).toBe('portrait');
    expect(applied.size).toBe(suggestion.selectedLayout);
    expect(applied.smartGarmentTransform).toBeDefined();
    expect(restoreTemplateBeforeSuggestion(applied)).toEqual(before);
  });
});
