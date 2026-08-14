export type BackgroundAssessment = 'analyzing' | 'simple' | 'mixed' | 'unknown';

/**
 * يفحص زوايا مصغرة فقط. النتيجة اقتراح للمستخدم وليست قرار قص أو إزالة تلقائي.
 * القيم المحافظة تتطلب أن تكون الزوايا متجانسة ومتقاربة اللون معاً.
 */
export function assessCornerBackground(data: Uint8ClampedArray, width: number, height: number): BackgroundAssessment {
  if (!width || !height || data.length < width * height * 4) return 'unknown';
  const patch = Math.max(2, Math.floor(Math.min(width, height) * .12));
  const origins = [[0, 0], [width - patch, 0], [0, height - patch], [width - patch, height - patch]];
  const means = origins.map(([originX, originY]) => {
    let red = 0; let green = 0; let blue = 0; let samples = 0;
    for (let y = originY; y < originY + patch; y += 1) for (let x = originX; x < originX + patch; x += 1) {
      const offset = (y * width + x) * 4;
      red += data[offset]; green += data[offset + 1]; blue += data[offset + 2]; samples += 1;
    }
    return [red / samples, green / samples, blue / samples] as const;
  });
  const average = means.reduce((accumulator, value) => [accumulator[0] + value[0] / means.length, accumulator[1] + value[1] / means.length, accumulator[2] + value[2] / means.length] as const, [0, 0, 0] as const);
  const spread = means.reduce((maximum, value) => Math.max(maximum, Math.hypot(value[0] - average[0], value[1] - average[1], value[2] - average[2])), 0);
  let variance = 0; let count = 0;
  origins.forEach(([originX, originY], cornerIndex) => {
    const mean = means[cornerIndex];
    for (let y = originY; y < originY + patch; y += 1) for (let x = originX; x < originX + patch; x += 1) {
      const offset = (y * width + x) * 4;
      variance += Math.hypot(data[offset] - mean[0], data[offset + 1] - mean[1], data[offset + 2] - mean[2]);
      count += 1;
    }
  });
  return spread < 18 && variance / count < 12 ? 'simple' : 'mixed';
}

export async function assessImageBackground(source: string): Promise<BackgroundAssessment> {
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('image-load'));
      element.decoding = 'async';
      element.src = source;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 96; canvas.height = 96;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return 'unknown';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return assessCornerBackground(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  } catch {
    return 'unknown';
  }
}
