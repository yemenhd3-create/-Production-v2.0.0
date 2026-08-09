import { Download, Share2, Copy, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface AdPreviewProps {
  imageUrl?: string;
  isLoading?: boolean;
  onDownload?: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  discount?: number;
  storeName?: string;
  productName?: string;
}

export default function AdPreview({
  imageUrl,
  isLoading = false,
  onDownload,
  onShare,
  onCopy,
  discount = 0,
  storeName = 'متجري',
  productName = 'المنتج',
}: AdPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Preview Container */}
      <div className="bg-gray-100 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="w-full aspect-[9/13.5] flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto mb-2 text-gray-600" size={32} />
              <p className="text-gray-600">جاري إنشاء الإعلان...</p>
            </div>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Ad Preview"
            className="w-full h-auto"
          />
        ) : (
          <div className="w-full aspect-[9/13.5] flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <p className="text-gray-600 text-lg">لا توجد معاينة</p>
              <p className="text-gray-500 text-sm">قم برفع صورة وإدخال البيانات لإنشاء الإعلان</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Display */}
      {imageUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">اسم المتجر:</span>
            <span className="font-medium text-gray-900">{storeName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">المنتج:</span>
            <span className="font-medium text-gray-900">{productName}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">الخصم:</span>
              <span className="font-medium text-red-600">{discount}%</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={onDownload}
          disabled={!imageUrl || isLoading}
          className="flex items-center justify-center gap-2"
          variant="outline"
        >
          <Download size={18} />
          <span className="hidden sm:inline">تنزيل</span>
        </Button>

        <Button
          onClick={onCopy}
          disabled={!imageUrl || isLoading}
          className="flex items-center justify-center gap-2"
          variant="outline"
        >
          <Copy size={18} />
          <span className="hidden sm:inline">نسخ</span>
        </Button>

        <Button
          onClick={onShare}
          disabled={!imageUrl || isLoading}
          className="flex items-center justify-center gap-2"
        >
          <Share2 size={18} />
          <span className="hidden sm:inline">مشاركة</span>
        </Button>
      </div>

      {/* Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          💡 <strong>نصيحة:</strong> تأكد من جودة الصورة قبل المشاركة للحصول على أفضل النتائج
        </p>
      </div>
    </div>
  );
}
