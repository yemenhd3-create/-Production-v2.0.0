import { Share2, Download, Copy, MessageCircle, Mail, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { generateMarketingTextWithAI, generateProductTitle } from '@/lib/ai';
import { ProductData } from '@shared/types';

interface SharePanelProps {
  imageUrl?: string;
  productData: ProductData;
  onShare?: (platform: string) => void;
  isLoading?: boolean;
}

export default function SharePanel({
  imageUrl,
  productData,
  onShare,
  isLoading = false,
}: SharePanelProps) {
  const [generatingText, setGeneratingText] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');

  const handleGenerateText = async () => {
    setGeneratingText(true);
    try {
      const result = await generateMarketingTextWithAI(productData);
      setGeneratedText(result.text);
      
      const title = await generateProductTitle(productData);
      setGeneratedTitle(title);
    } catch (error) {
      console.error('Failed to generate text:', error);
      alert('فشل في توليد النص. تأكد من تكوين مفاتيح API');
    } finally {
      setGeneratingText(false);
    }
  };

  const handleShareWhatsApp = () => {
    const caption = generatedText || `${productData.productName}\n${productData.subtitle}\nالسعر: ${productData.newPrice} ${productData.currency}`;
    const url = `https://wa.me/?text=${encodeURIComponent(caption)}`;
    window.open(url, '_blank');
    onShare?.('whatsapp');
  };

  const handleShareEmail = () => {
    const subject = generatedTitle || productData.productName;
    const body = generatedText || productData.subtitle;
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    onShare?.('email');
  };

  const handleCopyText = () => {
    const text = generatedText || `${productData.productName}\n${productData.subtitle}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('تم نسخ النص');
    });
  };

  const handleDownloadImage = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${productData.productName}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShare?.('download');
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Text Generation */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-purple-600" />
          <h3 className="font-bold text-gray-900">توليد النص التسويقي بالذكاء الاصطناعي</h3>
        </div>

        <p className="text-sm text-gray-700">
          اضغط الزر أدناه لتوليد وصف تسويقي احترافي باستخدام Kimi AI
        </p>

        <Button
          onClick={handleGenerateText}
          disabled={generatingText || isLoading}
          className="w-full flex items-center justify-center gap-2"
        >
          {generatingText ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              جاري التوليد...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              توليد النص
            </>
          )}
        </Button>

        {/* Generated Text Display */}
        {generatedText && (
          <div className="bg-white rounded-lg p-4 space-y-3 border border-purple-200">
            {generatedTitle && (
              <div>
                <p className="text-xs text-gray-600 mb-1">العنوان:</p>
                <p className="font-bold text-gray-900">{generatedTitle}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-600 mb-1">الوصف:</p>
              <p className="text-gray-700 text-sm leading-relaxed">{generatedText}</p>
            </div>

            <Button
              onClick={handleCopyText}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <Copy size={16} />
              نسخ النص
            </Button>
          </div>
        )}
      </div>

      {/* Share Options */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-900">خيارات المشاركة</h3>

        <div className="grid grid-cols-2 gap-3">
          {/* WhatsApp */}
          <Button
            onClick={handleShareWhatsApp}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <MessageCircle size={18} />
            <span className="hidden sm:inline">واتساب</span>
          </Button>

          {/* Email */}
          <Button
            onClick={handleShareEmail}
            disabled={isLoading}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <Mail size={18} />
            <span className="hidden sm:inline">بريد</span>
          </Button>

          {/* Copy */}
          <Button
            onClick={handleCopyText}
            disabled={isLoading}
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <Copy size={18} />
            <span className="hidden sm:inline">نسخ</span>
          </Button>

          {/* Download */}
          <Button
            onClick={handleDownloadImage}
            disabled={!imageUrl || isLoading}
            className="flex items-center justify-center gap-2"
          >
            <Download size={18} />
            <span className="hidden sm:inline">تنزيل</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-gray-900">معلومات المشاركة:</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-600">المنتج</p>
            <p className="font-medium text-gray-900">{productData.productName}</p>
          </div>
          <div>
            <p className="text-gray-600">السعر</p>
            <p className="font-medium text-gray-900">{productData.newPrice} {productData.currency}</p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>نصيحة:</strong> استخدم النص المولد بالذكاء الاصطناعي للحصول على أفضل نتائج في المشاركة
        </p>
      </div>
    </div>
  );
}
