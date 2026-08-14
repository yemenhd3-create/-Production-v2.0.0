import { useState } from 'react';
import type { AdDetails } from '@shared/types';
import { DEFAULT_AD_DETAILS, DEFAULT_TEMPLATE_SETTINGS } from '@shared/types';
import BatchWorkspace from './BatchWorkspace';

const personImage = '/manus-storage/model-preview-visual-check_7f7efbe1.svg';
const garmentImage = '/manus-storage/model-preview-garment-check_f3a95eeb.svg';

export default function ModelPreviewBatchFlowCheck() {
  const [details, setDetails] = useState<AdDetails>({
    ...DEFAULT_AD_DETAILS,
    productName: 'قطعة توضيحية للدفعة',
    modelPreview: { enabled: true, transform: { x: 0.5, y: 0.46, scale: 0.58, rotation: 0 } },
  });
  const now = Date.now();
  return <main className="min-h-screen bg-[#fffdf6] p-3 sm:p-6"><div className="mx-auto max-w-xl"><BatchWorkspace details={details} template={DEFAULT_TEMPLATE_SETTINGS} onDetailsChange={setDetails} onBack={() => undefined} modelPersonImage={personImage} previewItems={[{ id: 'model-preview-check-item', fileName: 'قطعة-توضيحية.svg', sourceUrl: garmentImage, thumbnailUrl: garmentImage, status: 'ready', createdAt: now, updatedAt: now }]} /></div></main>;
}
