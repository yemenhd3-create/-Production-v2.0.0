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

export const DISCOUNT_BADGE_COLOR = '#C41A1A';
export const DISCOUNT_BADGE_GOLD = '#F5C200';
export const FOOTER_COLOR = '#8B0000';
export const QUALITY_BADGE_COLOR = '#4CAF50';
