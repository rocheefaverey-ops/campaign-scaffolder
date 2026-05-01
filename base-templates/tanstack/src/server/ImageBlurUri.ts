import path from 'node:path';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import sharp from 'sharp';

const blurUriSchema = z.object({
  imageUrl: z.string(),
  size: z.number().optional(),
  blur: z.number().optional(),
});

const uriCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

function resolveAssetPath(imageUrl: string): string {
  const cleanPath = imageUrl.replace(/^\//, '');
  if (import.meta.env.DEV) {
    return path.resolve(process.cwd(), cleanPath);
  }
  return path.resolve(process.cwd(), '.output', 'public', cleanPath);
}

// TODO: Implement TTL for remote images
async function processImage(imageSource: string, isRelative: boolean, size: number, blur: number): Promise<string> {
  try {
    if (!isRelative) {
      console.warn('Remote URLs are not supported for image blur URI generation:', imageSource);
      return '';
    }

    // Process image with sharp
    const filePath = resolveAssetPath(imageSource);
    const blurred = sharp(filePath)
      .resize(size, undefined, { fit: 'inside' })
      .blur(blur);

    // Determine output format
    const metadata = await blurred.metadata();
    let outputBuffer: Buffer;
    let mimeType: string;

    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      outputBuffer = await blurred.jpeg({ quality: 80 }).toBuffer();
      mimeType = 'image/jpeg';
    } else {
      outputBuffer = await blurred.png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer();
      mimeType = 'image/png';
    }

    // Return result
    return `data:${mimeType};base64,${outputBuffer.toString('base64')}`;
  } catch (e) {
    console.error('Error processing image for blur URI:', e);
    return '';
  }
}

function isRelativeUrl(url: string): boolean {
  try {
    new URL(url);
    return false;
  } catch {
    return true;
  }
}

const imageBlurUri = createServerFn()
  .inputValidator(blurUriSchema)
  .handler(async ({ data }) => {
    const size = data.size || 16;
    const blur = data.blur || 2;
    const cacheKey = `${data.imageUrl}_${size}_${blur}`;

    // Return cached result
    if (uriCache.has(cacheKey)) {
      return uriCache.get(cacheKey)!;
    }

    // Return pending promise if already processing
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)!;
    }

    // Begin processing image
    const relative = isRelativeUrl(data.imageUrl);
    const processingPromise = processImage(data.imageUrl, relative, size, blur);
    pendingRequests.set(cacheKey, processingPromise);

    // Await result and cache it
    const result = await processingPromise;
    uriCache.set(cacheKey, result);
    pendingRequests.delete(cacheKey);
    return result;
  });


// Expose function for usage in loaders
export function getBlurUri(imageUrl: string, size?: number, blur?: number): Promise<string> {
  return imageBlurUri({ data: { imageUrl, size, blur } });
}
