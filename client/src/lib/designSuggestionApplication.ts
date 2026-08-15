import type { DesignSuggestion, TemplateSettings } from '@shared/types';

/** تطبيق صريح لقرار المستخدم؛ لا تستدعى هذه الدالة عند مجرد توليد الاقتراح. */
export function applyDesignSuggestion(template: TemplateSettings, suggestion: DesignSuggestion): TemplateSettings {
  const selected = suggestion.candidates.find(candidate => candidate.size === suggestion.selectedLayout) || suggestion.candidates[0];
  return {
    ...template,
    size: suggestion.selectedLayout,
    smartBackgroundColor: suggestion.suggestedBackground,
    smartTextColor: suggestion.suggestedTextColor,
    smartGarmentTransform: selected?.garmentTransform,
  };
}

/** يمكّن زر التراجع من إعادة الإعدادات السابقة كما كانت تماماً. */
export function restoreTemplateBeforeSuggestion(template: TemplateSettings): TemplateSettings {
  const { smartBackgroundColor: _background, smartTextColor: _text, smartGarmentTransform: _transform, ...rest } = template;
  return rest;
}
