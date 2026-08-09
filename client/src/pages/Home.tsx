import { useState, useEffect } from 'react';
import { ProductData, StoreSettings, AIProvider, DEFAULT_STORE_SETTINGS, StorageKeys } from '@shared/types';
import Stepper from '@/components/Stepper';
import ImageUploader from '@/components/ImageUploader';
import ProductForm from '@/components/ProductForm';
import SettingsPanel from '@/components/SettingsPanel';
import AdPreview from '@/components/AdPreview';
import DeveloperPanel from '@/components/DeveloperPanel';
import { renderAd } from '@/lib/canvasRenderer';
import { shareToWhatsApp, downloadImage, copyToClipboard } from '@/lib/share';
import { getFromStorage, saveToStorage } from '@/lib/storage';
import { Settings, Code2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = ['الصورة', 'البيانات', 'الإعدادات', 'النشر'];

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [productImage, setProductImage] = useState<string>('');
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  const [productData, setProductData] = useState<ProductData>({
    productName: '',
    subtitle: '',
    storeName: '',
    oldPrice: '',
    newPrice: '',
    currency: 'ريال',
  });

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([]);
  const [showAiKeys, setShowAiKeys] = useState(false);

  const [generatedAd, setGeneratedAd] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [devKey, setDevKey] = useState('');

  // Load saved data on mount
  useEffect(() => {
    const savedProduct = getFromStorage<ProductData>(StorageKeys.LAST_PRODUCT_DATA);
    if (savedProduct) {
      setProductData(savedProduct);
    }

    const savedSettings = getFromStorage<StoreSettings>(StorageKeys.STORE_SETTINGS);
    if (savedSettings) {
      setStoreSettings(savedSettings);
    }

    const savedProviders = getFromStorage<AIProvider[]>(StorageKeys.AI_PROVIDERS, []);
    if (savedProviders) {
      setAiProviders(savedProviders);
    }
  }, []);

  // Save product data whenever it changes
  useEffect(() => {
    saveToStorage(StorageKeys.LAST_PRODUCT_DATA, productData);
  }, [productData]);

  // Save store settings whenever they change
  useEffect(() => {
    saveToStorage(StorageKeys.STORE_SETTINGS, storeSettings);
  }, [storeSettings]);

  // Save AI providers whenever they change
  useEffect(() => {
    saveToStorage(StorageKeys.AI_PROVIDERS, aiProviders);
  }, [aiProviders]);

  // Generate ad when moving to preview step
  useEffect(() => {
    if (currentStep === 3 && productImage && !generatedAd) {
      generateAd();
    }
  }, [currentStep]);

  const generateAd = async () => {
    if (!productImage) {
      alert('الرجاء اختيار صورة أولاً');
      return;
    }

    if (!productData.productName || !productData.newPrice) {
      alert('الرجاء ملء البيانات المطلوبة');
      return;
    }

    setIsGenerating(true);

    try {
      const canvasSettings = {
        ...storeSettings,
        ...productData,
      };

      const adImage = await renderAd(canvasSettings, productImage);
      setGeneratedAd(adImage);
    } catch (error) {
      console.error('Failed to generate ad:', error);
      alert('فشل في إنشاء الإعلان');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageSelect = (imageUrl: string, file: File) => {
    setProductImage(imageUrl);
    setProductImageFile(file);
  };

  const handleImageRemove = () => {
    setProductImage('');
    setProductImageFile(null);
    setGeneratedAd('');
  };

  const handleDownload = () => {
    if (generatedAd) {
      const filename = `${productData.productName || 'إعلان'}-${Date.now()}.png`;
      downloadImage(generatedAd, filename);
    }
  };

  const handleShare = () => {
    if (generatedAd) {
      const caption = `${productData.productName}\n${productData.subtitle}\nالسعر: ${productData.newPrice} ${productData.currency}\n\nمن ${productData.storeName}`;
      shareToWhatsApp(generatedAd, caption);
    }
  };

  const handleCopy = async () => {
    if (generatedAd) {
      const success = await copyToClipboard(generatedAd);
      if (success) {
        alert('تم نسخ الصورة إلى الحافظة');
      }
    }
  };

  const calculateDiscount = () => {
    const oldPrice = parseFloat(productData.oldPrice) || 0;
    const newPrice = parseFloat(productData.newPrice) || 0;

    if (oldPrice > newPrice && oldPrice > 0) {
      return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    }

    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
              إ
            </div>
            <h1 className="text-2xl font-bold text-gray-900">مولد الإعلانات</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setDevPanelOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Code2 size={18} />
              <span className="hidden sm:inline">مطور</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stepper */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <Stepper
                steps={STEPS}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                isLoading={isGenerating}
              />
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {currentStep === 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">رفع صورة المنتج</h2>
                  <ImageUploader
                    onImageSelect={handleImageSelect}
                    currentImage={productImage}
                    onImageRemove={handleImageRemove}
                  />
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">بيانات المنتج</h2>
                  <ProductForm
                    data={productData}
                    onChange={setProductData}
                  />
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">الإعدادات</h2>
                  <SettingsPanel
                    settings={storeSettings}
                    onSettingsChange={setStoreSettings}
                    providers={aiProviders}
                    onProvidersChange={setAiProviders}
                    showKeys={showAiKeys}
                    onShowKeysChange={setShowAiKeys}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={24} className="text-red-600" />
                    <h2 className="text-xl font-bold text-gray-900">معاينة الإعلان</h2>
                  </div>
                  <AdPreview
                    imageUrl={generatedAd}
                    isLoading={isGenerating}
                    onDownload={handleDownload}
                    onShare={handleShare}
                    onCopy={handleCopy}
                    discount={calculateDiscount()}
                    storeName={productData.storeName}
                    productName={productData.productName}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-4">
            {/* Quick Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Settings size={20} />
                ملخص الإعلان
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">اسم المنتج</p>
                  <p className="font-medium text-gray-900">{productData.productName || '-'}</p>
                </div>

                <div>
                  <p className="text-gray-600">المتجر</p>
                  <p className="font-medium text-gray-900">{productData.storeName || '-'}</p>
                </div>

                <div>
                  <p className="text-gray-600">السعر</p>
                  <p className="font-medium text-gray-900">
                    {productData.newPrice ? `${productData.newPrice} ${productData.currency}` : '-'}
                  </p>
                </div>

                {calculateDiscount() > 0 && (
                  <div>
                    <p className="text-gray-600">الخصم</p>
                    <p className="font-medium text-red-600">{calculateDiscount()}%</p>
                  </div>
                )}

                <div>
                  <p className="text-gray-600">الصورة</p>
                  <p className="font-medium text-gray-900">{productImage ? '✓ تم الرفع' : '-'}</p>
                </div>
              </div>

              {/* Generate Button */}
              {currentStep === 3 && !generatedAd && (
                <Button
                  onClick={generateAd}
                  disabled={isGenerating || !productImage}
                  className="w-full"
                >
                  {isGenerating ? 'جاري الإنشاء...' : 'إنشاء الإعلان'}
                </Button>
              )}

              {/* Regenerate Button */}
              {currentStep === 3 && generatedAd && (
                <Button
                  onClick={generateAd}
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full"
                >
                  {isGenerating ? 'جاري الإنشاء...' : 'إعادة الإنشاء'}
                </Button>
              )}
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-blue-900">💡 نصائح للحصول على أفضل النتائج:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• استخدم صور عالية الجودة</li>
                <li>• ملء جميع البيانات المطلوبة</li>
                <li>• تحقق من الإعدادات قبل النشر</li>
                <li>• شارك الإعلان عبر واتساب</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Developer Panel */}
      <DeveloperPanel
        open={devPanelOpen}
        unlocked={devUnlocked}
        password={devPassword}
        keyValue={devKey}
        setPassword={setDevPassword}
        setKeyValue={setDevKey}
        onClose={() => {
          setDevPanelOpen(false);
          setDevUnlocked(false);
        }}
        onLogin={() => {
          if (devPassword === 'dev1234' && devKey === 'OPEN-DEV-KEY') {
            setDevUnlocked(true);
          } else {
            alert('بيانات المطور غير صحيحة');
          }
        }}
      />
    </div>
  );
}
