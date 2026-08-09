import { ProductData } from '@shared/types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface ProductFormProps {
  data: ProductData;
  onChange: (data: ProductData) => void;
  onSubmit?: () => void;
}

export default function ProductForm({ data, onChange, onSubmit }: ProductFormProps) {
  const handleChange = (field: keyof ProductData, value: unknown) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const handleColorAdd = (color: string) => {
    if (color.trim()) {
      const colors = data.colors || [];
      if (!colors.includes(color)) {
        handleChange('colors', [...colors, color]);
      }
    }
  };

  const handleColorRemove = (color: string) => {
    const colors = (data.colors || []).filter((c) => c !== color);
    handleChange('colors', colors);
  };

  const handleSizeAdd = (size: string) => {
    if (size.trim()) {
      const sizes = data.sizes || [];
      if (!sizes.includes(size)) {
        handleChange('sizes', [...sizes, size]);
      }
    }
  };

  const handleSizeRemove = (size: string) => {
    const sizes = (data.sizes || []).filter((s) => s !== size);
    handleChange('sizes', sizes);
  };

  return (
    <div className="space-y-6">
      {/* Product Name */}
      <div className="space-y-2">
        <Label htmlFor="productName">اسم المنتج *</Label>
        <Input
          id="productName"
          value={data.productName}
          onChange={(e) => handleChange('productName', e.target.value)}
          placeholder="مثال: فستان صيفي للأطفال"
          required
        />
      </div>

      {/* Subtitle */}
      <div className="space-y-2">
        <Label htmlFor="subtitle">العنوان الفرعي *</Label>
        <Input
          id="subtitle"
          value={data.subtitle}
          onChange={(e) => handleChange('subtitle', e.target.value)}
          placeholder="مثال: أنيق وراقي"
          required
        />
      </div>

      {/* Store Name */}
      <div className="space-y-2">
        <Label htmlFor="storeName">اسم المتجر *</Label>
        <Input
          id="storeName"
          value={data.storeName}
          onChange={(e) => handleChange('storeName', e.target.value)}
          placeholder="مثال: متجري"
          required
        />
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="oldPrice">السعر القديم</Label>
          <Input
            id="oldPrice"
            type="number"
            value={data.oldPrice}
            onChange={(e) => handleChange('oldPrice', e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPrice">السعر الجديد *</Label>
          <Input
            id="newPrice"
            type="number"
            value={data.newPrice}
            onChange={(e) => handleChange('newPrice', e.target.value)}
            placeholder="0"
            required
          />
        </div>
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <Label htmlFor="currency">العملة</Label>
        <Input
          id="currency"
          value={data.currency}
          onChange={(e) => handleChange('currency', e.target.value)}
          placeholder="ريال"
        />
      </div>

      {/* Season */}
      <div className="space-y-2">
        <Label htmlFor="season">الموسم</Label>
        <select
          id="season"
          value={data.season || ''}
          onChange={(e) => handleChange('season', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">اختر موسماً</option>
          <option value="الصيف">الصيف</option>
          <option value="الشتاء">الشتاء</option>
          <option value="الربيع">الربيع</option>
          <option value="الخريف">الخريف</option>
          <option value="عام">عام</option>
        </select>
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <Label>الألوان</Label>
        <div className="flex gap-2">
          <Input
            id="colorInput"
            placeholder="أدخل لون وأضغط إضافة"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleColorAdd((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <Button
            type="button"
            onClick={() => {
              const input = document.getElementById('colorInput') as HTMLInputElement;
              if (input) {
                handleColorAdd(input.value);
                input.value = '';
              }
            }}
            className="flex-shrink-0"
          >
            إضافة
          </Button>
        </div>

        {/* Color Tags */}
        <div className="flex flex-wrap gap-2 mt-2">
          {(data.colors || []).map((color) => (
            <div
              key={color}
              className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              {color}
              <button
                type="button"
                onClick={() => handleColorRemove(color)}
                className="hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sizes */}
      <div className="space-y-2">
        <Label>المقاسات</Label>
        <div className="flex gap-2">
          <Input
            id="sizeInput"
            placeholder="أدخل مقاس وأضغط إضافة"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSizeAdd((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <Button
            type="button"
            onClick={() => {
              const input = document.getElementById('sizeInput') as HTMLInputElement;
              if (input) {
                handleSizeAdd(input.value);
                input.value = '';
              }
            }}
            className="flex-shrink-0"
          >
            إضافة
          </Button>
        </div>

        {/* Size Tags */}
        <div className="flex flex-wrap gap-2 mt-2">
          {(data.sizes || []).map((size) => (
            <div
              key={size}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              {size}
              <button
                type="button"
                onClick={() => handleSizeRemove(size)}
                className="hover:text-blue-600"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">الكمية</Label>
        <Input
          id="quantity"
          type="number"
          value={data.quantity || 1}
          onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
          placeholder="1"
          min="1"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">الوصف</Label>
        <textarea
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="أضف وصفاً تفصيلياً للمنتج"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
          rows={3}
        />
      </div>

      {/* Submit Button */}
      {onSubmit && (
        <Button onClick={onSubmit} className="w-full">
          حفظ البيانات
        </Button>
      )}
    </div>
  );
}
