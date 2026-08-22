export type PixelMask = Uint8Array;
export type Point = { x: number; y: number };

export function createFloodMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number,
): PixelMask {
  const mask = new Uint8Array(width * height);
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return mask;
  const start = (startY * width + startX) * 4;
  if (pixels[start + 3] === 0) return mask;
  const reference = [pixels[start], pixels[start + 1], pixels[start + 2]];
  const queue = [startY * width + startX];
  const threshold = Math.max(0, Math.min(255, tolerance)) ** 2 * 3;

  while (queue.length) {
    const index = queue.pop()!;
    if (mask[index]) continue;
    const offset = index * 4;
    if (pixels[offset + 3] === 0) continue;
    const distance = (pixels[offset] - reference[0]) ** 2 + (pixels[offset + 1] - reference[1]) ** 2 + (pixels[offset + 2] - reference[2]) ** 2;
    if (distance > threshold) continue;
    mask[index] = 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) queue.push(index - 1);
    if (x + 1 < width) queue.push(index + 1);
    if (y > 0) queue.push(index - width);
    if (y + 1 < height) queue.push(index + width);
  }
  return mask;
}

export function createLassoMask(width: number, height: number, polygon: Point[]): PixelMask {
  const mask = new Uint8Array(width * height);
  if (polygon.length < 3) return mask;
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map(point => point.x))));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...polygon.map(point => point.x))));
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map(point => point.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...polygon.map(point => point.y))));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (isPointInsidePolygon({ x: x + .5, y: y + .5 }, polygon)) mask[y * width + x] = 1;
    }
  }
  return mask;
}

export function eraseMask(pixels: Uint8ClampedArray, mask: PixelMask) {
  const next = new Uint8ClampedArray(pixels);
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index]) next[index * 4 + 3] = 0;
  }
  return next;
}

export function countMask(mask: PixelMask) {
  return mask.reduce((count, selected) => count + selected, 0);
}

function isPointInsidePolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}
