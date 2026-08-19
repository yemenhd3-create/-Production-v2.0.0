import { describe, expect, it } from 'vitest';
import { OPEN_IMAGE_MODELS } from '../client/src/lib/openImageModels';

describe('Open Image Models catalog', () => {
  it('keeps every catalog item informational with an HTTPS source and clear runtime state', () => {
    expect(OPEN_IMAGE_MODELS.length).toBeGreaterThanOrEqual(20);
    for (const model of OPEN_IMAGE_MODELS) {
      expect(model.sourceUrl).toMatch(/^https:\/\//);
      expect(model.license.trim()).not.toHaveLength(0);
      expect(model.minimumRam.trim()).not.toHaveLength(0);
      expect(model.minimumVram.trim()).not.toHaveLength(0);
      expect(model.localUse.trim()).not.toHaveLength(0);
    }
  });

  it('never marks a license-review model as commercially verified', () => {
    for (const model of OPEN_IMAGE_MODELS.filter(item => item.status === 'license-review')) {
      expect(model.commercialUse).not.toContain('نعم — مصدر تمت مراجعته');
    }
  });
});
