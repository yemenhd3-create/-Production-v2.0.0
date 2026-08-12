import { Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './ui/button';

interface ImageUploaderProps {
  onImageSelect: (imageUrl: string, file: File) => void;
  currentImage?: string;
  onImageRemove?: () => void;
}

export default function ImageUploader({
  onImageSelect,
  currentImage,
  onImageRemove,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileSelect = async (file: File) => {
    setErrorMessage('');
    if (!isSupportedImage(file)) {
      setErrorMessage('اختر صورة بصيغة JPG أو PNG أو WebP. إذا كانت الصورة من واتساب، احفظها أولاً في معرض الهاتف ثم اخترها من جديد.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('حجم الصورة أكبر من 10 ميجابايت. اختر نسخة أصغر أو قصّ الصورة من معرض الهاتف ثم أعد المحاولة.');
      return;
    }

    setIsLoading(true);

    try {
      const imageUrl = await createOptimizedImage(file);
      onImageSelect(imageUrl, file);
    } catch (error) {
      console.error('Failed to prepare image:', error);
      setErrorMessage('تعذّر تجهيز هذه الصورة. جرّب نسخة JPG أو PNG محفوظة في معرض الهاتف، وتأكد أن المتصفح يملك إذن الوصول للصور.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
    // يسمح بإعادة اختيار الملف نفسه بعد تصحيح مشكلة أو تغيير أذونات الصور.
    e.currentTarget.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Image Preview */}
      {currentImage ? (
        <div className="relative">
          <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={currentImage}
              alt="Product"
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>

          {/* Remove Button */}
          {onImageRemove && (
            <button
              onClick={onImageRemove}
              className="absolute top-2 left-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <X size={20} />
            </button>
          )}

          {/* Change Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 left-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Upload size={18} />
            تغيير الصورة
          </button>
        </div>
      ) : (
        /* Upload Area */
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-red-600 bg-red-50'
              : 'border-gray-300 bg-gray-50 hover:border-red-600'
          }`}
        >
          <Upload size={48} className="mx-auto mb-4 text-gray-400" />

          <h3 className="text-lg font-semibold mb-2">اسحب الصورة هنا</h3>
          <p className="text-gray-600 mb-4">أو اضغط لاختيار صورة من جهازك</p>

          <p className="text-sm text-gray-500 mb-4">
            الصيغ المدعومة: JPG, PNG, WebP
            <br />
            الحد الأقصى للحجم: 10 ميجابايت
          </p>

          {errorMessage && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3 py-3 text-sm font-medium leading-6 text-red-800">{errorMessage}</p>}

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-2 mx-auto"
          >
            {isLoading ? 'جاري التحميل...' : 'اختر صورة'}
          </Button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Image Info */}
      {currentImage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            ✓ تم تحميل الصورة بنجاح. يمكنك الآن الانتقال للخطوة التالية.
          </p>
        </div>
      )}
    </div>
  );
}

async function createOptimizedImage(file: File): Promise<string> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    try {
      return await optimizeLoadedImage(await loadFileImage(sourceUrl), file.type);
    } catch (objectUrlError) {
      // بعض متصفحات Android تفشل أحياناً في فك ملف المختار عبر Blob URL رغم أن FileReader يستطيع قراءته.
      console.warn('Blob URL image read failed; retrying through FileReader.', objectUrlError);
      const dataUrl = await readFileAsDataUrl(file);
      return await optimizeLoadedImage(await loadFileImage(dataUrl), file.type);
    }
  } catch (error) {
    // لا نتابع إلى الإعلان بمصدر لا يمكن للـ Canvas رسمه، كي لا تظهر رسالة فشل متأخرة ومربكة.
    throw error;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function optimizeLoadedImage(image: HTMLImageElement, mimeType: string): Promise<string> {
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  const outputType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, outputType, 0.88);
  return URL.createObjectURL(blob);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذرت قراءة ملف الصورة من الهاتف'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function isSupportedImage(file: File) {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function loadFileImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => reject(new Error('Image preparation timed out')), 10_000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Image file could not be loaded'));
    };
    image.decoding = 'async';
    image.src = sourceUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Could not optimize image'));
    }, type, quality);
  });
}
