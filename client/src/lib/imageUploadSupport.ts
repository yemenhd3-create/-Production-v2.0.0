/** رسالة مفهومة عندما يمنع موفر ملفات Android قراءة الصورة بعد اختيارها. */
export function getImagePreparationErrorMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : '';
  if (detail.includes('FILE_READ_UNAVAILABLE')) {
    return 'تعذّرت قراءة ملف الصورة من مزود المعرض. جرّب زر «التقاط صورة» داخل التطبيق، أو افتح الصورة في المعرض واختر «حفظ نسخة» ثم اختر النسخة الجديدة. لا تغلق نافذة الاختيار قبل اكتمال التحميل.';
  }
  return 'تعذّر تجهيز هذه الصورة. جرّب نسخة JPG أو PNG محفوظة في معرض الهاتف، وتأكد أن المتصفح يملك إذن الوصول للصور.';
}
