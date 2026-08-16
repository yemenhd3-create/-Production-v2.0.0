import { getArtworkTransform, getDefaultArtworkTransform } from '@shared/artworkLayout';
import type { AdDetails, DesignSuggestion, TemplateSettings } from '@shared/types';
import { getDesignGeometry, type NormalizedBox } from '@shared/designGeometry';
import type { DesignDocument, DesignElementDocument, DesignRepairId } from '@shared/designDocument';

const asBox = (box: NormalizedBox): NormalizedBox => ({
  x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height),
});

function resolveProductBox(hero: NormalizedBox, transform?: TemplateSettings['smartGarmentTransform']): NormalizedBox {
  if (!transform) return asBox(hero);
  const x = clamp(transform.x, 0, .92);
  const y = clamp(transform.y, 0, .92);
  const width = clamp(transform.width, .35, 1 - x);
  const height = clamp(transform.height, .35, 1 - y);
  return asBox({ x: hero.x + hero.width * x, y: hero.y + hero.height * y, width: hero.width * width, height: hero.height * height });
}

/** يحول حالة الإعلان الحالية إلى تصميم حتمي بلا نصوص أو صورة أو بيانات متجر. */
export function compileDesignDocument(details: AdDetails, template: TemplateSettings, suggestion?: DesignSuggestion | null): DesignDocument {
  const geometry = getDesignGeometry(template.size);
  const logo = getArtworkTransform(template, 'logo');
  const footer = getArtworkTransform(template, 'footer');
  const hasStoreFooter = template.showStoreInfo && Boolean(details.storeName.trim() || details.storePhone.trim());
  const elements: DesignElementDocument[] = [
    { id: 'header', visible: template.showProductName || template.showHeadline, required: false, box: asBox(geometry.header) },
    { id: 'logo', visible: template.showStoreLogo && Boolean(template.storeLogoArtwork), required: false, box: asBox(logo) },
    { id: 'product', visible: true, required: true, box: resolveProductBox(geometry.hero, template.smartGarmentTransform) },
    { id: 'badge', visible: Boolean(template.badgeTypes?.length || (template.badgeType && template.badgeType !== 'none') || (template.showDiscount && details.discount.trim())), required: false, box: asBox(geometry.badge) },
    { id: 'info', visible: Boolean((template.showQuantity && details.quantity.trim()) || (template.showColors && details.colors.filter(Boolean).length)), required: false, box: asBox(geometry.info) },
    { id: 'price', visible: template.showPrice && Boolean(details.price.trim()), required: template.showPrice && Boolean(details.price.trim()), box: asBox(geometry.price) },
    { id: 'features', visible: template.showFeatures && details.features.filter(Boolean).length > 0, required: false, box: asBox(geometry.features) },
    { id: 'footer', visible: (template.showFooterArtwork && Boolean(template.footerArtwork)) || hasStoreFooter, required: false, box: asBox(footer) },
  ];
  return {
    schemaVersion: 1,
    template: template.size,
    elements,
    constraints: ['inside-canvas', 'product-inside-hero', 'logo-avoids-product', 'footer-avoids-price', 'footer-avoids-features', 'price-required'],
    evidence: suggestion ? { layout: suggestion.selectedLayout, confidence: round(suggestion.confidence), decisionSha256: undefined } : undefined,
    privacy: { includedImage: false, includedPersonalFields: false, networkUsed: false },
  };
}

/** يطبق إصلاحاً معروفاً فقط؛ لا يغير النصوص أو يخفي أي عنصر إلزامي. */
export function applyDesignRepair(template: TemplateSettings, repairId: DesignRepairId): TemplateSettings {
  if (repairId === 'reset-garment-transform') return { ...template, smartGarmentTransform: undefined };
  const layer = repairId === 'reset-logo-transform' ? 'logo' : 'footer';
  return {
    ...template,
    artworkLayouts: {
      ...template.artworkLayouts,
      [template.size]: {
        ...template.artworkLayouts?.[template.size],
        [layer]: getDefaultArtworkTransform(template.size, layer),
      },
    },
  };
}

function clamp(value: number, minimum: number, maximum: number) { return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum)); }
function round(value: number) { return Math.round(value * 10_000) / 10_000; }
