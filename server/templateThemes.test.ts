import { describe, expect, it } from 'vitest';
import { applyDesignDocument, compileDesignDocument } from '../client/src/lib/designCompiler';
import { appendDesignHistory, createDesignHistory, replayDesignHistory } from '../client/src/lib/designHistory';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS, type TemplateVisualTheme } from '../shared/types';
import { TEMPLATE_THEME_LIST, getTemplateTheme, isTemplateVisualTheme } from '../shared/templateThemes';

describe('Theme Registry المحلي', () => {
  it('يسجل خمسة أنماط ثابتة بألوان صالحة ويعيد الكلاسيكي للقيم غير المعروفة', () => {
    expect(TEMPLATE_THEME_LIST).toHaveLength(5);
    expect(new Set(TEMPLATE_THEME_LIST.map((theme) => theme.id)).size).toBe(5);
    TEMPLATE_THEME_LIST.forEach((theme) => {
      expect(isTemplateVisualTheme(theme.id)).toBe(true);
      expect(theme.palette.background).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.palette.primary).toMatch(/^#[0-9A-F]{6}$/i);
      expect(theme.palette.accent).toMatch(/^#[0-9A-F]{6}$/i);
    });
    expect(getTemplateTheme('unknown' as TemplateVisualTheme).id).toBe('classic');
  });

  it('يحفظ النمط داخل وثيقة التصميم ويعيد تطبيقه على إعدادات القالب بلا صورة أو بيانات متجر', () => {
    const document = compileDesignDocument(DEFAULT_AD_DETAILS, { ...DEFAULT_TEMPLATE_SETTINGS, visualTheme: 'mint' });
    const restored = applyDesignDocument({ ...DEFAULT_TEMPLATE_SETTINGS, visualTheme: 'classic' }, document);

    expect(document.visualTheme).toBe('mint');
    expect(document.privacy).toEqual({ includedImage: false, includedPersonalFields: false, networkUsed: false });
    expect(restored.visualTheme).toBe('mint');
  });

  it('يعيد تشغيل تغيير النمط كعملية دلالية مستقلة وحتمية', () => {
    const before = compileDesignDocument(DEFAULT_AD_DETAILS, { ...DEFAULT_TEMPLATE_SETTINGS, visualTheme: 'classic' });
    const after = compileDesignDocument(DEFAULT_AD_DETAILS, { ...DEFAULT_TEMPLATE_SETTINGS, visualTheme: 'midnight' });
    const history = appendDesignHistory(createDesignHistory(before), before, after, 'اختيار نمط ليلي');

    expect(history.entries[0]?.operations).toContainEqual({ type: 'set-visual-theme', from: 'classic', to: 'midnight' });
    expect(replayDesignHistory(history)).toEqual(after);
  });
});
