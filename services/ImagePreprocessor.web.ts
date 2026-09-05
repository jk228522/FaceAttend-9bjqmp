/**
 * ImagePreprocessor.web.ts
 * Web stub — expo-image-manipulator works on web but JPEG pixel decoding
 * is handled differently. This stub provides the same API.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { AppConfig } from '@/constants/config';

export type CropRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PreprocessResult = {
  rgbPixels: number[];
  resizedUri: string;
};

export async function preprocessFaceImage(
  imageUri: string,
  cropRegion: CropRegion,
  alignAngle: number = 0
): Promise<PreprocessResult> {
  const size = AppConfig.MODEL_INPUT_SIZE;

  const actions: ImageManipulator.Action[] = [
    {
      crop: {
        originX: Math.max(0, Math.round(cropRegion.x)),
        originY: Math.max(0, Math.round(cropRegion.y)),
        width: Math.max(1, Math.round(cropRegion.width)),
        height: Math.max(1, Math.round(cropRegion.height)),
      },
    },
    { resize: { width: size, height: size } },
  ];

  const result = await ImageManipulator.manipulateAsync(imageUri, actions, {
    compress: 1.0,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  // Web: use Canvas API for accurate pixel extraction
  const rgbPixels = await extractPixelsViaCanvas(result.uri, size);

  return { rgbPixels, resizedUri: result.uri };
}

async function extractPixelsViaCanvas(uri: string, size: number): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data; // RGBA
        const rgb: number[] = [];
        for (let i = 0; i < pixels.length; i += 4) {
          rgb.push(pixels[i]);     // R
          rgb.push(pixels[i + 1]); // G
          rgb.push(pixels[i + 2]); // B
          // skip A
        }
        resolve(rgb);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = uri;
  });
}

export function clampCropRegion(
  crop: CropRegion,
  imageWidth: number,
  imageHeight: number
): CropRegion {
  const x = Math.max(0, Math.min(crop.x, imageWidth - 1));
  const y = Math.max(0, Math.min(crop.y, imageHeight - 1));
  const w = Math.max(1, Math.min(crop.width, imageWidth - x));
  const h = Math.max(1, Math.min(crop.height, imageHeight - y));
  return { x, y, width: w, height: h };
}
