/** رسالة مفهومة عندما يمنع موفر ملفات Android قراءة الصورة بعد اختيارها. */
export function getImagePreparationErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : '';
  if (detail.includes('FILE_READ_UNAVAILABLE')) {
    return 'تعذّرت قراءة ملف الصورة من معرض الهاتف. افتح الصورة في المعرض، اختر «حفظ نسخة» أو «تنزيل»، ثم اختر النسخة المحفوظة من جديد. لا تغلق نافذة الاختيار قبل اكتمال التحميل.';
  }
  return 'تعذّر تجهيز هذه الصورة. جرّب نسخة JPG أو PNG محفوظة في معرض الهاتف، وتأكد أن المتصفح يملك إذن الوصول للصور.';
}
