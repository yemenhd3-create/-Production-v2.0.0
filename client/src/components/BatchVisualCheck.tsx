import BatchWorkspace from './BatchWorkspace';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS } from '@shared/types';

const previewArtwork = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560"%3E%3Crect width="420" height="560" fill="%23f4ebff"/%3E%3Cpath d="M130 150h160l45 90-48 210H133L85 240z" fill="%2370238f"/%3E%3Cpath d="M155 150c0-44 110-44 110 0" fill="none" stroke="%2370238f" stroke-width="34"/%3E%3Ctext x="210" y="510" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="%2325255f"%3Eصورة الملابس%3C/text%3E%3C/svg%3E';

/** معاينة تطويرية فقط لمساحة الدفعة؛ تفتح في التطوير عبر ?batch-visual-check=1. */
export default function BatchVisualCheck() {
  const now = Date.now();
  const previewItems = ['فستان-بناتي.jpg', 'جاكيت-رمادي.png', 'قميص-قطن.webp'].map((fileName, index) => ({ id: `preview-${index}`, fileName, sourceUrl: previewArtwork, thumbnailUrl: previewArtwork, status: index === 2 ? 'success' as const : 'ready' as const, outputUrl: index === 2 ? previewArtwork : undefined, createdAt: now + index, updatedAt: now + index }));
  return <main className="min-h-screen bg-[#fffaf4] p-4" dir="rtl"><div className="mx-auto max-w-2xl"><BatchWorkspace details={DEFAULT_AD_DETAILS} template={DEFAULT_TEMPLATE_SETTINGS} previewItems={previewItems} onDetailsChange={() => undefined} onBack={() => undefined} /></div></main>;
}
