import { describe, expect, it, vi } from 'vitest';
import { prepareSelectedFile, readImageWithFallback } from '../client/src/lib/imageUploadFlow';

describe('مسار قراءة صورة الهاتف البديل', () => {
  it('يجرب Blob URL ثم ImageBitmap ثم FileReader عند الفشل', async () => {
    const fromBlobUrl = vi.fn().mockRejectedValue(new Error('blob failed'));
    const fromImageBitmap = vi.fn().mockRejectedValue(new Error('bitmap failed'));
    const fromFileReader = vi.fn().mockResolvedValue('prepared-image');

    await expect(readImageWithFallback(fromBlobUrl, fromImageBitmap, fromFileReader)).resolves.toBe('prepared-image');
    expect(fromBlobUrl).toHaveBeenCalledOnce();
    expect(fromImageBitmap).toHaveBeenCalledOnce();
    expect(fromFileReader).toHaveBeenCalledOnce();
  });

  it('يتوقف عند ImageBitmap الناجح ولا يستخدم FileReader', async () => {
    const fromFileReader = vi.fn().mockResolvedValue('unused');
    await expect(readImageWithFallback(
      vi.fn().mockRejectedValue(new Error('blob failed')),
      vi.fn().mockResolvedValue('bitmap-image'),
      fromFileReader,
    )).resolves.toBe('bitmap-image');
    expect(fromFileReader).not.toHaveBeenCalled();
  });
});

describe('حقل اختيار الصورة', () => {
  it('يبقي قيمة الحقل حتى تنتهي عملية تجهيز الملف ثم يمسحها', async () => {
    let complete!: (value: string) => void;
    const input = { value: 'content://android-photo' };
    const pending = prepareSelectedFile(input, () => new Promise<string>(resolve => { complete = resolve; }));

    expect(input.value).toBe('content://android-photo');
    complete('prepared-image');
    await expect(pending).resolves.toBe('prepared-image');
    expect(input.value).toBe('');
  });
});
