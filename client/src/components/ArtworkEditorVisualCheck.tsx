import { useState } from 'react';
import { DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings, type TemplateSize } from '@shared/types';
import UserTemplateSettings from './UserTemplateSettings';

const sizes: { key: TemplateSize; label: string }[] = [
  { key: 'portrait', label: 'منشور' }, { key: 'square', label: 'مربع' }, { key: 'story', label: 'قصة' }, { key: 'whatsapp', label: 'واتساب' }, { key: 'landscape', label: 'أفقي' },
];

const previewSettings: TemplateSettings = {
  ...DEFAULT_TEMPLATE_SETTINGS,
  showHeaderArtwork: true,
  headerArtwork: '/manus-storage/trend-banner_97366a10.jpg',
  showStoreLogo: true,
  storeLogoArtwork: '/manus-storage/trend-logo_14e4740a.png',
  showFooterArtwork: true,
  footerArtwork: '/manus-storage/trend-banner_97366a10.jpg',
};

const params = new URLSearchParams(window.location.search);
const requestedSize = params.get('size') as TemplateSize | null;
const initialSize = requestedSize && sizes.some((size) => size.key === requestedSize) ? requestedSize : previewSettings.size;
const usesMovedLayerCheck = params.get('moved') === '1';
const initialPreviewSettings: TemplateSettings = {
  ...previewSettings,
  size: initialSize,
  ...(usesMovedLayerCheck ? { artworkLayouts: { [initialSize]: { header: { x: .26, y: .38, width: .5, height: .16, fit: 'contain' }, logo: { x: .32, y: .42, width: .14, height: .14, fit: 'cover' }, footer: { x: .22, y: .48, width: .58, height: .16, fit: 'stretch' } } } } : {}),
};

export default function ArtworkEditorVisualCheck() {
  const [settings, setSettings] = useState(initialPreviewSettings);
  return <div className="min-h-screen bg-[#fffdf6] p-4" dir="rtl"><div className="mx-auto mb-3 max-w-md rounded-xl bg-amber-50 p-3 text-center"><p className="text-xs font-bold text-amber-900">فحص تطويري لمحرر موضع وحجم طبقات الهوية</p>{usesMovedLayerCheck && <p className="mt-1 text-[10px] font-semibold text-amber-800">وضع اختبار: المواضع المطلوبة بدأت داخل منطقة الملابس ثم أعادها القيد تلقائياً إلى مناطق آمنة.</p>}<div className="mt-2 flex flex-wrap justify-center gap-1.5">{sizes.map((size) => <button key={size.key} type="button" data-testid={`artwork-check-size-${size.key}`} onClick={() => setSettings((current) => ({ ...current, size: size.key }))} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${settings.size === size.key ? 'bg-[#2A2865] text-white' : 'bg-white text-[#2A2865]'}`}>{size.label}</button>)}</div></div><UserTemplateSettings settings={settings} onChange={setSettings} onBack={() => undefined} onAbout={() => undefined} /></div>;
}
