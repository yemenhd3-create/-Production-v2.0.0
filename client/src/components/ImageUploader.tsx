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

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار صورة');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً (الحد الأقصى 10 ميجابايت)');
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      onImageSelect(imageUrl, file);
      setIsLoading(false);
    };

    reader.onerror = () => {
      alert('فشل في قراءة الصورة');
      setIsLoading(false);
    };

    reader.readAsDataURL(file);
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
