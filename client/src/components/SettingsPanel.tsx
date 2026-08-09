import { StoreSettings, AIProvider } from '@shared/types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Trash2, Plus } from 'lucide-react';
import { useState } from 'react';

interface SettingsPanelProps {
  settings: StoreSettings;
  onSettingsChange: (settings: StoreSettings) => void;
  providers?: AIProvider[];
  onProvidersChange?: (providers: AIProvider[]) => void;
  showKeys?: boolean;
  onShowKeysChange?: (show: boolean) => void;
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
  providers = [],
  onProvidersChange,
  showKeys = false,
  onShowKeysChange,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'store' | 'ai'>('store');

  const handleSettingChange = (field: keyof StoreSettings, value: unknown) => {
    onSettingsChange({
      ...settings,
      [field]: value,
    });
  };

  const handleAddProvider = () => {
    if (onProvidersChange) {
      const newProvider: AIProvider = {
        id: `provider_${Date.now()}`,
        name: 'نموذج جديد',
        baseUrl: '',
        model: '',
        apiKey: '',
        enabled: true,
      };
      onProvidersChange([...providers, newProvider]);
    }
  };

  const handleUpdateProvider = (id: string, field: keyof AIProvider, value: unknown) => {
    if (onProvidersChange) {
      const updated = providers.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      );
      onProvidersChange(updated);
    }
  };

  const handleRemoveProvider = (id: string) => {
    if (onProvidersChange) {
      onProvidersChange(providers.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('store')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'store'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          إعدادات المتجر
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'ai'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          نماذج الذكاء الاصطناعي
        </button>
      </div>

      {/* Store Settings Tab */}
      {activeTab === 'store' && (
        <div className="space-y-4">
          {/* Store Name */}
          <div className="space-y-2">
            <Label htmlFor="storeName">اسم المتجر</Label>
            <Input
              id="storeName"
              value={settings.storeName}
              onChange={(e) => handleSettingChange('storeName', e.target.value)}
              placeholder="متجري"
            />
          </div>

          {/* Store Phone */}
          <div className="space-y-2">
            <Label htmlFor="storePhone">رقم الهاتف</Label>
            <Input
              id="storePhone"
              value={settings.storePhone}
              onChange={(e) => handleSettingChange('storePhone', e.target.value)}
              placeholder="966501234567"
            />
          </div>

          {/* Store Location */}
          <div className="space-y-2">
            <Label htmlFor="storeLocation">الموقع</Label>
            <Input
              id="storeLocation"
              value={settings.storeLocation}
              onChange={(e) => handleSettingChange('storeLocation', e.target.value)}
              placeholder="الرياض"
            />
          </div>

          {/* Default Currency */}
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">العملة الافتراضية</Label>
            <Input
              id="defaultCurrency"
              value={settings.defaultCurrency}
              onChange={(e) => handleSettingChange('defaultCurrency', e.target.value)}
              placeholder="ريال"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bgColor">لون الخلفية</Label>
              <div className="flex gap-2">
                <Input
                  id="bgColor"
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={settings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textColor">لون النص</Label>
              <div className="flex gap-2">
                <Input
                  id="textColor"
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => handleSettingChange('textColor', e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={settings.textColor}
                  onChange={(e) => handleSettingChange('textColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showQualityBadge}
                onChange={(e) => handleSettingChange('showQualityBadge', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">عرض شارة الجودة</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showDiscount}
                onChange={(e) => handleSettingChange('showDiscount', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium">عرض شارة الخصم</span>
            </label>
          </div>
        </div>
      )}

      {/* AI Providers Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          {/* Show/Hide Keys Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showKeys}
              onChange={(e) => onShowKeysChange?.(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">عرض مفاتيح API</span>
          </label>

          {/* Providers List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {providers.map((provider) => (
              <div key={provider.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                {/* Provider Name */}
                <div className="space-y-2">
                  <Label>اسم النموذج</Label>
                  <Input
                    value={provider.name}
                    onChange={(e) => handleUpdateProvider(provider.id, 'name', e.target.value)}
                    placeholder="مثال: GPT-4"
                  />
                </div>

                {/* Base URL */}
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={provider.baseUrl}
                    onChange={(e) => handleUpdateProvider(provider.id, 'baseUrl', e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label>اسم النموذج</Label>
                  <Input
                    value={provider.model}
                    onChange={(e) => handleUpdateProvider(provider.id, 'model', e.target.value)}
                    placeholder="gpt-4-turbo"
                  />
                </div>

                {/* API Key */}
                {showKeys && (
                  <div className="space-y-2">
                    <Label>مفتاح API</Label>
                    <Input
                      type="password"
                      value={provider.apiKey}
                      onChange={(e) => handleUpdateProvider(provider.id, 'apiKey', e.target.value)}
                      placeholder="sk-..."
                    />
                  </div>
                )}

                {/* Enabled Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={provider.enabled}
                    onChange={(e) => handleUpdateProvider(provider.id, 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">تفعيل</span>
                </label>

                {/* Remove Button */}
                <Button
                  onClick={() => handleRemoveProvider(provider.id)}
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                  حذف
                </Button>
              </div>
            ))}
          </div>

          {/* Add Provider Button */}
          <Button onClick={handleAddProvider} className="w-full flex items-center gap-2">
            <Plus size={18} />
            إضافة نموذج جديد
          </Button>
        </div>
      )}
    </div>
  );
}
