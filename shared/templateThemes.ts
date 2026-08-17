import type { TemplateVisualTheme } from './types';

export interface TemplateThemePalette {
  background: string;
  primary: string;
  primarySoft: string;
  muted: string;
  accent: string;
  accentDark: string;
  onAccent: string;
}

export interface TemplateThemeDefinition {
  id: TemplateVisualTheme;
  title: string;
  description: string;
  palette: TemplateThemePalette;
}

/** سجل أنماط بصري محلي صغير؛ لا يحتوي صوراً أو نصوص متجر أو اتصالات شبكة. */
export const TEMPLATE_THEME_LIST: readonly TemplateThemeDefinition[] = [
  { id: 'classic', title: 'كلاسيكي', description: 'أبيض وبنفسجي للعرض الأساسي.', palette: { background: '#FFFFFF', primary: '#2A2865', primarySoft: '#F0ECFF', muted: '#737581', accent: '#D01720', accentDark: '#AD111A', onAccent: '#FFFFFF' } },
  { id: 'midnight', title: 'ليلي', description: 'خلفية داكنة ونص فاتح لعروض المساء.', palette: { background: '#121826', primary: '#F8FAFC', primarySoft: '#253145', muted: '#CBD5E1', accent: '#B45309', accentDark: '#92400E', onAccent: '#FFFFFF' } },
  { id: 'rose', title: 'وردي هادئ', description: 'نبرة ناعمة للقطع النسائية والهدايا.', palette: { background: '#FFF7FA', primary: '#7A284F', primarySoft: '#FCE7F3', muted: '#8A5A6C', accent: '#BE123C', accentDark: '#9F1239', onAccent: '#FFFFFF' } },
  { id: 'mint', title: 'نعناعي', description: 'أسلوب نظيف ومنعش لعرض القطع اليومية.', palette: { background: '#F5FFFB', primary: '#0F5F52', primarySoft: '#D1FAE5', muted: '#4B6F67', accent: '#B42318', accentDark: '#8F1D13', onAccent: '#FFFFFF' } },
  { id: 'sand', title: 'رملي', description: 'دفء محايد للعبايات والقطع الكلاسيكية.', palette: { background: '#FFFBF5', primary: '#5B4636', primarySoft: '#F3E8D7', muted: '#7E6958', accent: '#A94442', accentDark: '#873534', onAccent: '#FFFFFF' } },
] as const;

const byId = new Map(TEMPLATE_THEME_LIST.map((theme) => [theme.id, theme]));

export function getTemplateTheme(theme?: TemplateVisualTheme): TemplateThemeDefinition {
  return byId.get(theme || 'classic') || TEMPLATE_THEME_LIST[0];
}

export function isTemplateVisualTheme(value: unknown): value is TemplateVisualTheme {
  return typeof value === 'string' && byId.has(value as TemplateVisualTheme);
}
