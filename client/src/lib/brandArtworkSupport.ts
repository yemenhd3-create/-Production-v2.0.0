export const PRACTICAL_HEADER_RATIO = 2688 / 494;
export const PRACTICAL_HEADER_RATIO_RANGE = { min: 4.8, max: 6.2 };

export function getArtworkRatioError(kind: 'header' | 'footer', actualRatio: number, footerRatio: number) {
  if (kind === 'header') {
    if (actualRatio < PRACTICAL_HEADER_RATIO_RANGE.min || actualRatio > PRACTICAL_HEADER_RATIO_RANGE.max) {
      return `بانر العنوان يجب أن يكون عريضاً تقريباً بين ${PRACTICAL_HEADER_RATIO_RANGE.min} و${PRACTICAL_HEADER_RATIO_RANGE.max} : 1. النموذج المفضل هو 2688 × 494 (5.44 : 1).`;
    }
    return '';
  }
  if (Math.abs(actualRatio - footerRatio) / footerRatio > 0.025) {
    return `نسبة صورة التذييل غير مناسبة. المطلوب تقريباً ${footerRatio.toFixed(1)} : 1 لهذا المقاس.`;
  }
  return '';
}
