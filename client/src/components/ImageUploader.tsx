import { AlertTriangle, BadgeCheck, Camera, ImageUp, LoaderCircle, ScanLine, Upload, X } from 'lucide-react';
import * as React from 'react';
import { useRef, useState } from 'react';
import { prepareSelectedFile, readImageWithFallback } from '@/lib/imageUploadFlow';
import { getImagePreparationErrorMessage } from '@/lib/imageUploadSupport';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
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
      setErrorMessage(getImagePreparationErrorMessage(error));
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

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      // بعض موفري ملفات Android يلغون صلاحية القراءة عندما يُمسح الحقل فوراً.
      // ننتظر اكتمال تجهيز الصورة بكل مساراته قبل السماح باختيار الملف نفسه ثانية.
      await prepareSelectedFile(e.currentTarget, () => handleFileSelect(files[0]));
      return;
    }
    // يسمح بإعادة اختيار الملف نفسه بعد تصحيح مشكلة أو تغيير أذونات الصور.
    e.currentTarget.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Image Preview */}
      {currentImage ? (
        <div className="relative">
          <div className="w-full overflow-hidden rounded-3xl border border-primary/10 bg-secondary/60">
            <img
              src={currentImage}
              alt="معاينة صورة الملابس المختارة"
              className="h-auto max-h-96 w-full object-cover"
            />
          </div>

          {/* Remove Button */}
          {onImageRemove && (
            <button
              type="button"
              onClick={onImageRemove}
              className="absolute left-3 top-3 rounded-xl bg-red-600 p-2 text-white shadow-sm transition active:scale-95"
              aria-label="حذف صورة الملابس"
            >
              <X size={20} />
            </button>
          )}

          {/* Change Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-sm transition active:scale-95"
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
          className={`rounded-3xl border-2 border-dashed p-7 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-stone-200 bg-secondary/35 hover:border-primary/40'
          }`}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><ImageUp size={29} /></div>

          <h3 className="mb-2 text-lg font-black text-foreground">اختر صورة الملابس</h3>
          <p className="mb-3 text-sm leading-6 text-muted-foreground">من المعرض أو بالكاميرا. الأفضل أن تظهر القطعة وحدها بوضوح.</p>

          <div className="mb-4 flex flex-wrap justify-center gap-2 text-[11px] font-bold text-muted-foreground"><span className="rounded-full bg-white px-2.5 py-1 shadow-sm">قطعة واحدة واضحة</span><span className="rounded-full bg-white px-2.5 py-1 shadow-sm">حتى 10 ميجابايت</span><span className="rounded-full bg-white px-2.5 py-1 shadow-sm">يُحسَّن تلقائياً</span></div>

          {isLoading && <div role="status" aria-live="polite" className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-primary/10 bg-primary/5 px-3 py-3 text-sm font-black text-primary"><LoaderCircle className="animate-spin" size={18} />جارٍ قراءة الصورة وتحسينها للهاتف…</div>}
          {errorMessage && <div role="alert" className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-medium leading-6 text-red-800"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 shrink-0" size={17} /><p>{errorMessage}</p></div><button type="button" onClick={() => cameraInputRef.current?.click()} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-black text-red-800 shadow-sm" disabled={isLoading}><Camera size={14} />جرّب التقاط صورة الآن</button></div>}

          <div className="mx-auto grid max-w-xs grid-cols-2 gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex min-h-12 items-center justify-center gap-2"
            >
              <ImageUp size={17} /> {isLoading ? 'جارٍ التحميل…' : 'من المعرض'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isLoading}
              className="flex min-h-12 items-center justify-center gap-2 border-primary/20 bg-white text-primary"
            >
              <Camera size={17} /> بالكاميرا
            </Button>
          </div>
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Image Info */}
      {currentImage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><BadgeCheck size={19} /></div>
          <p className="text-sm font-bold text-emerald-900">تم تجهيز الصورة بنجاح. انتقل الآن إلى بيانات الإعلان.</p>
        </div>
      )}
    </div>
  );
}

async function createOptimizedImage(file: File): Promise<string> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    return await readImageWithFallback(
      () => optimizeLoadedImageFromUrl(sourceUrl, file.type),
      () => optimizeFileWithImageBitmap(file, file.type),
      async () => optimizeLoadedImageFromUrl(await readFileAsDataUrl(file), file.type),
    );
  } catch (error) {
    // لا نتابع إلى الإعلان بمصدر لا يمكن للـ Canvas رسمه، كي لا تظهر رسالة فشل متأخرة ومربكة.
    throw error;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function optimizeLoadedImageFromUrl(sourceUrl: string, mimeType: string) {
  return optimizeLoadedImage(await loadFileImage(sourceUrl), mimeType);
}

async function optimizeFileWithImageBitmap(file: File, mimeType: string): Promise<string> {
  if (typeof createImageBitmap !== 'function') throw new Error('ImageBitmap is unavailable');
  const bitmap = await createImageBitmap(file);
  try {
    return await optimizeLoadedImage(bitmap, mimeType);
  } finally {
    bitmap.close();
  }
}

async function optimizeLoadedImage(image: CanvasImageSource & { width: number; height: number; naturalWidth?: number; naturalHeight?: number }, mimeType: string): Promise<string> {
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
    reader.onerror = () => reject(new Error('FILE_READ_UNAVAILABLE'));
    reader.onabort = () => reject(new Error('FILE_READ_UNAVAILABLE'));
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
