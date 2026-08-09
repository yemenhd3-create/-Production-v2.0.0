import { Lock, LogOut, Trash2, Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import Modal from './Modal';
import { exportStorageData, importStorageData, clearStorage } from '@/lib/storage';

interface DeveloperPanelProps {
  open: boolean;
  unlocked: boolean;
  password: string;
  keyValue: string;
  setPassword: (password: string) => void;
  setKeyValue: (key: string) => void;
  onClose: () => void;
  onLogin: () => void;
}

export default function DeveloperPanel({
  open,
  unlocked,
  password,
  keyValue,
  setPassword,
  setKeyValue,
  onClose,
  onLogin,
}: DeveloperPanelProps) {
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importData, setImportData] = useState('');

  const handleExport = () => {
    const data = exportStorageData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ad-generator-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportConfirm(false);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (importStorageData(data)) {
          alert('تم استيراد البيانات بنجاح');
          window.location.reload();
        } else {
          alert('فشل في استيراد البيانات');
        }
      } catch (error) {
        alert('خطأ في قراءة الملف');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (clearStorage()) {
      alert('تم حذف جميع البيانات');
      window.location.reload();
    }
    setShowClearConfirm(false);
  };

  const handleLogout = () => {
    setPassword('');
    setKeyValue('');
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="لوحة المطور"
      size="lg"
    >
      {!unlocked ? (
        /* Login Form */
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
            <Lock size={20} className="text-yellow-600 flex-shrink-0 mt-1" />
            <p className="text-sm text-yellow-800">
              هذه اللوحة محمية بشكل مزدوج. أدخل كلمة المرور ومفتاح الوصول للمتابعة.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="devPassword">كلمة المرور</Label>
            <Input
              id="devPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onLogin();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="devKey">مفتاح الوصول</Label>
            <Input
              id="devKey"
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="أدخل مفتاح الوصول"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onLogin();
                }
              }}
            />
          </div>

          <Button onClick={onLogin} className="w-full">
            دخول
          </Button>
        </div>
      ) : (
        /* Developer Tools */
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <Lock size={20} className="text-green-600 flex-shrink-0 mt-1" />
            <p className="text-sm text-green-800">
              ✓ تم فتح لوحة المطور. لديك وصول كامل لأدوات التطوير.
            </p>
          </div>

          {/* Data Management Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">إدارة البيانات</h3>

            <div className="grid grid-cols-2 gap-2">
              {/* Export Button */}
              <Button
                onClick={() => setShowExportConfirm(true)}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <Download size={18} />
                تصدير
              </Button>

              {/* Import Button */}
              <Button
                onClick={() => document.getElementById('importFile')?.click()}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                استيراد
              </Button>

              <input
                id="importFile"
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>

            {/* Clear Data Button */}
            <Button
              onClick={() => setShowClearConfirm(true)}
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              حذف جميع البيانات
            </Button>
          </div>

          {/* System Info Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">معلومات النظام</h3>

            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">إصدار التطبيق:</span>
                <span className="font-mono">v1.0.0</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">نظام التشغيل:</span>
                <span className="font-mono">{navigator.userAgent.split('(')[1]?.split(')')[0]}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">المتصفح:</span>
                <span className="font-mono">{navigator.userAgent.split(' ').pop()}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">حجم التخزين:</span>
                <span className="font-mono">
                  {(() => {
                    let size = 0;
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key) {
                        const value = localStorage.getItem(key);
                        if (value) {
                          size += key.length + value.length;
                        }
                      }
                    }
                    return `${(size / 1024).toFixed(2)} KB`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full text-red-600 hover:text-red-700 flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </Button>
        </div>
      )}

      {/* Confirmation Modals */}
      <Modal
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        title="تصدير البيانات"
        footer={
          <>
            <Button onClick={() => setShowExportConfirm(false)} variant="outline">
              إلغاء
            </Button>
            <Button onClick={handleExport}>تصدير</Button>
          </>
        }
      >
        <p className="text-gray-700">
          سيتم تصدير جميع البيانات المحفوظة محلياً (الإعدادات، المفاتيح، الرموز) إلى ملف JSON.
        </p>
      </Modal>

      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="حذف جميع البيانات"
        footer={
          <>
            <Button onClick={() => setShowClearConfirm(false)} variant="outline">
              إلغاء
            </Button>
            <Button onClick={handleClear} className="bg-red-600 hover:bg-red-700">
              حذف
            </Button>
          </>
        }
      >
        <p className="text-gray-700 mb-2">
          ⚠️ <strong>تحذير:</strong> هذا الإجراء لا يمكن التراجع عنه!
        </p>
        <p className="text-gray-700">
          سيتم حذف جميع البيانات المحفوظة محلياً بما فيها الإعدادات والمفاتيح والرموز.
        </p>
      </Modal>
    </Modal>
  );
}
