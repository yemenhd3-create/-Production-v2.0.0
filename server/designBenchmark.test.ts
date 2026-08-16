import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATE_SETTINGS } from '../shared/const';
import type { AdDetails } from '../shared/types';
import type { LocalImageMetrics } from '../client/src/lib/localDesignIntelligence';
import { createSuggestionFromMetrics } from '../client/src/lib/localDesignIntelligence';
import { buildDesignBenchmarks, createQualityFingerprint, detectDesignRegression } from '../client/src/lib/designBenchmark';

const fixtureMetrics: Record<string, LocalImageMetrics> = {
  'short-arabic-title': { width: 1080, height: 1350, brightness: 138, contrast: 46, sharpness: 62, foreground: { x: .2, y: .08, width: .55, height: .7, coverage: .39 }, colors: [{ hex: '#3d3c74', label: 'بنفسجي', weight: .8 }] },
  'long-arabic-title': { width: 1080, height: 1350, brightness: 152, contrast: 38, sharpness: 56, foreground: { x: .18, y: .1, width: .6, height: .68, coverage: .43 }, colors: [{ hex: '#a05a47', label: 'بني', weight: .8 }] },
  'square-logo': { width: 1000, height: 1000, brightness: 124, contrast: 52, sharpness: 64, foreground: { x: .26, y: .12, width: .48, height: .66, coverage: .32 }, colors: [{ hex: '#1d3c68', label: 'أزرق', weight: .8 }] },
  'wide-footer': { width: 1920, height: 1080, brightness: 168, contrast: 44, sharpness: 51, foreground: { x: .2, y: .13, width: .6, height: .65, coverage: .41 }, colors: [{ hex: '#60411f', label: 'بني', weight: .8 }] },
  'dark-product': { width: 1200, height: 1500, brightness: 66, contrast: 55, sharpness: 58, foreground: { x: .21, y: .1, width: .56, height: .72, coverage: .4 }, colors: [{ hex: '#121212', label: 'أسود', weight: .8 }] },
  'light-product': { width: 1200, height: 1500, brightness: 220, contrast: 32, sharpness: 52, foreground: { x: .22, y: .1, width: .54, height: .7, coverage: .37 }, colors: [{ hex: '#eeeeee', label: 'أبيض', weight: .8 }] },
  'extreme-whitespace': { width: 1200, height: 1500, brightness: 144, contrast: 36, sharpness: 44, foreground: { x: .4, y: .25, width: .19, height: .35, coverage: .1 }, colors: [{ hex: '#167a5d', label: 'أخضر', weight: .8 }] },
};

const details: AdDetails = { productName: 'قطعة اختبار', headline: '', discount: '', quantity: '', colors: [], price: '100', currency: 'ريال', features: [], storeName: '', storePhone: '', marketingText: '' };
const suggestionFor = (metrics: LocalImageMetrics) => createSuggestionFromMetrics(metrics, details, 1);

function random(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(1664525, value) + 1013904223) >>> 0; return value / 4294967296; };
}

describe('Design Benchmark وGolden fixtures', () => {
  it('يمرر Golden fixtures السبعة ويعطي نتائج حتمية ومقيدة', () => {
    expect(Object.keys(fixtureMetrics)).toHaveLength(7);
    for (const metrics of Object.values(fixtureMetrics)) {
      const suggestion = suggestionFor(metrics);
      const first = buildDesignBenchmarks(details, DEFAULT_TEMPLATE_SETTINGS, suggestion);
      const second = buildDesignBenchmarks(details, DEFAULT_TEMPLATE_SETTINGS, suggestion);
      expect(first).toEqual(second);
      expect(first).toHaveLength(3);
      expect(first.every(item => Number.isFinite(item.score) && Number.isFinite(item.safetyScore) && Number.isFinite(item.balanceScore))).toBe(true);
      expect(first.every(item => item.score >= 0 && item.score <= 100 && item.safetyScore >= 0 && item.safetyScore <= 100)).toBe(true);
    }
  });

  it('يعرض Pareto ولا يخفي البديل الأكثر أماناً أو توازناً عند اختلاف المحاور', () => {
    const benchmarks = buildDesignBenchmarks(details, DEFAULT_TEMPLATE_SETTINGS, suggestionFor(fixtureMetrics['extreme-whitespace']));
    expect(benchmarks.some(item => item.labels.includes('best-overall'))).toBe(true);
    expect(benchmarks.some(item => item.labels.includes('safest'))).toBe(true);
    expect(benchmarks.some(item => item.labels.includes('best-balanced'))).toBe(true);
    expect(benchmarks.some(item => item.labels.includes('pareto'))).toBe(true);
  });

  it('يكشف Regression مصطنعاً ولا يعتبر فرقاً صغيراً جداً تراجعاً', () => {
    const suggestion = suggestionFor(fixtureMetrics['short-arabic-title']);
    const benchmarks = buildDesignBenchmarks(details, DEFAULT_TEMPLATE_SETTINGS, suggestion);
    const baseline = createQualityFingerprint(details, DEFAULT_TEMPLATE_SETTINGS, suggestion, benchmarks[0]);
    const minor = { ...baseline, score: baseline.score - .005 };
    const broken = { ...baseline, score: baseline.score - 10, safetyScore: baseline.safetyScore - 8, violations: [...baseline.violations, 'footer-avoids-price'] };
    expect(detectDesignRegression(baseline, minor).status).toBe('stable');
    expect(detectDesignRegression(baseline, broken).status).toBe('regressed');
  });

  it('يفحص 1000 حالة هندسية مولدة بحتمية من دون NaN أو Infinity أو أبعاد سالبة', () => {
    const next = random(20260816);
    for (let index = 0; index < 1000; index += 1) {
      const metrics: LocalImageMetrics = { width: 400 + Math.floor(next() * 2400), height: 400 + Math.floor(next() * 2400), brightness: next() * 255, contrast: next() * 100, sharpness: next() * 100, foreground: { x: next() * .5, y: next() * .4, width: .1 + next() * .7, height: .1 + next() * .8, coverage: .05 + next() * .85 }, colors: [{ hex: '#336699', label: 'أزرق', weight: 1 }] };
      const results = buildDesignBenchmarks(details, DEFAULT_TEMPLATE_SETTINGS, suggestionFor(metrics));
      for (const result of results) {
        expect(Object.values(result.metrics).every(value => Number.isFinite(value) && value >= 0 && value <= 100)).toBe(true);
        expect(Number.isFinite(result.score) && Number.isFinite(result.safetyScore) && Number.isFinite(result.balanceScore)).toBe(true);
      }
    }
  });
});
