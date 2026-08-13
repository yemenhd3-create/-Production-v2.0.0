/** يجرب مصادر القراءة بالترتيب الأكثر كفاءة، من دون تعطيل مسار الرجوع عند فشل مصدر واحد. */
export async function readImageWithFallback<T>(
  fromBlobUrl: () => Promise<T>,
  fromImageBitmap: () => Promise<T>,
  fromFileReader: () => Promise<T>,
) {
  try {
    return await fromBlobUrl();
  } catch {
    try {
      return await fromImageBitmap();
    } catch {
      return await fromFileReader();
    }
  }
}

/** لا يمسح حقل الملف قبل انتهاء القراءة؛ بعض هواتف Android تلغي صلاحية FileReader عند المسح المبكر. */
export async function prepareSelectedFile<T>(input: Pick<HTMLInputElement, 'value'>, prepare: () => Promise<T>) {
  try {
    return await prepare();
  } finally {
    input.value = '';
  }
}
