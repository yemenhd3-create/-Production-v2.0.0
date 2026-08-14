export type ArtworkCropFit = 'contain' | 'cover' | 'stretch';

export type ArtworkCropAdjustment = {
  fit: ArtworkCropFit;
  positionX: number;
  positionY: number;
  zoom: number;
};

export function calculateArtworkDrawBox(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, adjustment: ArtworkCropAdjustment) {
  if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) throw new Error('أبعاد الصورة غير صالحة');
  if (adjustment.fit === 'stretch') return { x: 0, y: 0, width: targetWidth, height: targetHeight };
  const baseScale = adjustment.fit === 'cover'
    ? Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
    : Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const scale = baseScale * adjustment.zoom;
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2 + (targetWidth - width) * adjustment.positionX / 2,
    y: (targetHeight - height) / 2 + (targetHeight - height) * adjustment.positionY / 2,
    width,
    height,
  };
}

export function drawArtworkCrop(context: CanvasRenderingContext2D, image: CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }, targetWidth: number, targetHeight: number, adjustment: ArtworkCropAdjustment) {
  const sourceWidth = image.naturalWidth || image.width || 0;
  const sourceHeight = image.naturalHeight || image.height || 0;
  const box = calculateArtworkDrawBox(sourceWidth, sourceHeight, targetWidth, targetHeight, adjustment);
  context.clearRect(0, 0, targetWidth, targetHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, box.x, box.y, box.width, box.height);
}
