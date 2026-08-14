/**
 * Core Types for Clothing Ad Generator
 * All types are shared between client and server
 */

// ========== Product Data Types ==========
export interface ProductData {
  id?: string;
  productName: string;
  subtitle: string;
  storeName: string;
  oldPrice: string;
  newPrice: string;
  currency: string;
  season?: string;
  colors?: string[];
  sizes?: string[];
  quantity?: number;
  description?: string;
}

// ========== Three-step Ad Workflow ==========
/**
 * Data entered by a regular user on the second screen. Every field is optional
 * so the local poster can always be generated from the uploaded garment image.
 */
export interface AdDetails {
  productName: string;
  headline: string;
  discount: string;
  quantity: string;
  colors: string[];
  price: string;
  currency: string;
  features: string[];
  storeName: string;
  storePhone: string;
  marketingText: string;
  marketingPreferences?: MarketingTextPreferences;
  marketingTextEngine?: MarketingTextEngine;
  /** إعدادات موضع قطعة الملابس في معاينة العارض المحلية؛ لا تحفظ صورة الشخص نفسها. */
  modelPreview?: ModelPreviewSettings;
}

export interface ModelPreviewTransform {
  /** مركز القطعة كنسبة من أبعاد صورة العارض. */
  x: number;
  y: number;
  /** عرض القطعة كنسبة من عرض صورة العارض. */
  scale: number;
  /** ميل القطعة بالدرجات، ويقترحه كشف الكتفين عند توافره. */
  rotation: number;
}

export interface ModelPreviewSettings {
  enabled: boolean;
  transform: ModelPreviewTransform;
}

export type MarketingTextTone = 'exciting' | 'persuasive' | 'formal' | 'playful';
export type MarketingTextLength = 'short' | 'medium' | 'long';
export type MarketingTextGoal = 'purchase' | 'inquiry' | 'showcase';
export type MarketingTextEngine = 'local' | 'cloud';
export type MarketingTextFormat = 'whatsapp' | 'plain';

/** اختيارات توليد النص، وهي اختيارية حتى تبقى المسودات القديمة متوافقة. */
export interface MarketingTextPreferences {
  tone: MarketingTextTone;
  length: MarketingTextLength;
  goal: MarketingTextGoal;
  format: MarketingTextFormat;
}

export type AdWorkflowStep = 'upload' | 'details' | 'final';

export type TryOnStatus = 'idle' | 'processing' | 'success' | 'fallback' | 'unavailable';

export interface TryOnResult {
  status: TryOnStatus;
  imageUrl?: string;
  message: string;
  providerId?: string;
  isTransparent?: boolean;
  transparentSubject?: 'person' | 'garment';
}

// ========== Batch advertisement workflow ==========
export const BATCH_MAX_IMAGES = 10;
export const BATCH_EXPIRY_MS = 24 * 60 * 60 * 1000;
export type BatchItemStatus = 'ready' | 'preparing' | 'processing' | 'success' | 'failed' | 'stopped';

/** بيانات عنصر واحد في دفعة محلية؛ تحفظ الصور نفسها في IndexedDB وليس localStorage. */
export interface BatchAdItem {
  id: string;
  fileName: string;
  sourceUrl: string;
  thumbnailUrl: string;
  status: BatchItemStatus;
  outputUrl?: string;
  error?: string;
  usedLocalRemoval?: boolean;
  /** نص مستقل اختياري لهذا الإعلان عند اعتماد وضع النصوص الفردية. */
  marketingText?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BatchAdDraft {
  id: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  details: AdDetails;
  template: TemplateSettings;
  useLocalBackgroundRemoval: boolean;
  marketingTextMode?: BatchMarketingTextMode;
  items: BatchAdItem[];
}

export type BatchMarketingTextMode = 'shared' | 'perItem';

export type TemplateSize = 'portrait' | 'square' | 'story' | 'whatsapp' | 'landscape';
export type TemplateBadgeType = 'none' | 'discount' | 'new' | 'offer' | 'price' | 'quality';
export type ArtworkLayerKey = 'header' | 'footer' | 'logo';
export type ArtworkFitMode = 'contain' | 'cover' | 'stretch';

/** موضع وحجم نسبيان داخل مساحة الإعلان، حتى يحفظان بصورة مستقلة لكل مقاس تصدير. */
export interface ArtworkLayerTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  fit: ArtworkFitMode;
}

export type ArtworkLayoutsBySize = Partial<Record<TemplateSize, Partial<Record<ArtworkLayerKey, ArtworkLayerTransform>>>>;

/** Settings exposed to the regular user. AI providers and API keys are deliberately excluded. */
export interface TemplateSettings {
  size: TemplateSize;
  showProductName: boolean;
  showHeadline: boolean;
  showDiscount: boolean;
  showQuantity: boolean;
  showColors: boolean;
  showFeatures: boolean;
  showPrice: boolean;
  showStoreInfo: boolean;
  showFrame: boolean;
  showQualityMark: boolean;
  badgeType: TemplateBadgeType;
  /** قائمة الشارات المختارة؛ يبقى badgeType لقراءة الإعدادات القديمة. */
  badgeTypes?: Array<Exclude<TemplateBadgeType, 'none'>>;
  badgeText: string;
  showHeaderArtwork: boolean;
  headerArtwork?: string;
  showStoreLogo: boolean;
  storeLogoArtwork?: string;
  showFooterArtwork: boolean;
  footerArtwork?: string;
  artworkLayouts?: ArtworkLayoutsBySize;
}

// ========== Store Settings ==========
export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeLocation: string;
  storeCategory?: string;
  storeLogo?: string;
  defaultCurrency: string;
  defaultColors?: string[];
  defaultFonts?: {
    title: string;
    subtitle: string;
    body: string;
  };
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  showQualityBadge: boolean;
  showDiscount: boolean;
}

// ========== Canvas Settings ==========
export interface CanvasSettings extends StoreSettings {
  productName: string;
  subtitle: string;
  oldPrice: string;
  newPrice: string;
  currency: string;
  season?: string;
  colors?: string[];
  sizes?: string[];
  quantity?: number;
}

// ========== AI Provider Configuration ==========
export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  enabled: boolean;
  type?: 'text' | 'image' | 'both';
}

/** Public provider metadata shown to the authenticated developer. API keys are never returned. */
export interface DeveloperProviderSummary {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  updatedAt: number;
}

// ========== Subscription Token ==========
export interface SubscriptionToken {
  id: string;
  token: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
}

// ========== User Preferences ==========
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
  notifications: boolean;
  autoSave: boolean;
  defaultFormat: 'png' | 'jpg' | 'webp';
}

// ========== Generated Ad ==========
export interface GeneratedAd {
  id: string;
  imageUrl: string;
  productData: ProductData;
  settings: CanvasSettings;
  createdAt: number;
  updatedAt: number;
  shareCount: number;
  downloadCount: number;
}

// ========== API Response Types ==========
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TextGenerationResponse {
  text: string;
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface ImageGenerationResponse {
  imageUrl: string;
  imageBase64?: string;
  format: string;
  width: number;
  height: number;
}

// ========== Developer Panel Types ==========
export interface DeveloperPanelState {
  unlocked: boolean;
  password: string;
  devKey: string;
  lastAccessTime?: number;
  accessCount: number;
}

// ========== Canvas Render Options ==========
export interface CanvasRenderOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'png' | 'jpg' | 'webp';
  includeWatermark?: boolean;
}

// ========== Share Options ==========
export interface ShareOptions {
  platform: 'whatsapp' | 'email' | 'clipboard' | 'download';
  includeCaption: boolean;
  caption?: string;
  fileName?: string;
}

// ========== Error Types ==========
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

// ========== Notification Types ==========
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ========== Local Storage Keys ==========
export enum StorageKeys {
  STORE_SETTINGS = 'clothing_ad_store_settings',
  AI_PROVIDERS = 'clothing_ad_ai_providers',
  SUBSCRIPTION_TOKENS = 'clothing_ad_subscription_tokens',
  USER_PREFERENCES = 'clothing_ad_user_preferences',
  GENERATED_ADS = 'clothing_ad_generated_ads',
  DEVELOPER_STATE = 'clothing_ad_developer_state',
  LAST_PRODUCT_DATA = 'clothing_ad_last_product_data',
  LAST_AD_DETAILS = 'clothing_ad_last_ad_details',
  TEMPLATE_SETTINGS = 'clothing_ad_template_settings',
  LAST_WORKFLOW_STEP = 'clothing_ad_last_workflow_step',
}

// ========== Constants ==========
export const DEFAULT_CANVAS_WIDTH = 1080;
export const DEFAULT_CANVAS_HEIGHT = 1350;
export const DEFAULT_CURRENCY = 'ريال';
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'متجري',
  storePhone: '',
  storeLocation: '',
  defaultCurrency: DEFAULT_CURRENCY,
  backgroundColor: '#FFFFFF',
  textColor: '#000000',
  accentColor: '#C41A1A',
  showQualityBadge: true,
  showDiscount: true,
};

export const DEFAULT_AD_DETAILS: AdDetails = {
  productName: '',
  headline: '',
  discount: '',
  quantity: '',
  colors: [],
  price: '',
  currency: DEFAULT_CURRENCY,
  features: ['خامة عالية الجودة', 'قطن ناعم ومريح'],
  storeName: '',
  storePhone: '',
  marketingText: '',
  marketingPreferences: {
    tone: 'persuasive',
    length: 'medium',
    goal: 'purchase',
    format: 'whatsapp',
  },
  marketingTextEngine: 'local',
  modelPreview: {
    enabled: false,
    transform: { x: 0.5, y: 0.46, scale: 0.58, rotation: 0 },
  },
};

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  size: 'portrait',
  showProductName: true,
  showHeadline: true,
  showDiscount: true,
  showQuantity: true,
  showColors: true,
  showFeatures: true,
  showPrice: true,
  showStoreInfo: true,
  showFrame: false,
  showQualityMark: true,
  badgeType: 'discount',
  badgeTypes: ['discount'],
  badgeText: '',
  showHeaderArtwork: false,
  headerArtwork: '',
  showStoreLogo: false,
  storeLogoArtwork: '',
  showFooterArtwork: false,
  footerArtwork: '',
  artworkLayouts: {},
};

export const DISCOUNT_BADGE_COLOR = '#C41A1A';
export const DISCOUNT_BADGE_GOLD = '#F5C200';
export const FOOTER_COLOR = '#8B0000';
export const QUALITY_BADGE_COLOR = '#4CAF50';
