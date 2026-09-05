/**
 * TFLiteEngine.web.ts
 * ─────────────────────────────────────────────────────────────────
 * Web stub — react-native-fast-tflite does not support web/browser.
 * Metro auto-selects this file for web builds.
 * Native Android/iOS builds use TFLiteEngine.ts.
 * ─────────────────────────────────────────────────────────────────
 */

import type { TensorInfo, ModelMetadata } from './TFLiteEngine';
export type { TensorInfo, ModelMetadata };

export async function loadModel(): Promise<any> {
  console.warn('[TFLiteEngine.web] TFLite not available on web — using mock inference');
  return null;
}

export function disposeModel(): void {}

export function isModelLoaded(): boolean {
  return false;
}

export function getModelLoadError(): string | null {
  return 'TFLite not available on web platform';
}

export function buildInputTensor(rgbPixels: number[]): Float32Array {
  return new Float32Array(rgbPixels.length);
}

export async function runInference(rgbPixels: number[]): Promise<Float32Array> {
  // Web fallback: return a deterministic pseudo-embedding for preview
  const dim = 128;
  const out = new Float32Array(dim);
  let seed = rgbPixels.length > 0 ? rgbPixels[0] : 42;
  for (let i = 0; i < dim; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    out[i] = (seed / 0x80000000) - 1.0;
  }
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm);
  for (let i = 0; i < dim; i++) out[i] /= norm;
  return out;
}

export async function inspectModelMetadata(): Promise<ModelMetadata> {
  return {
    inputs: [],
    outputs: [],
    loaded: false,
    error: 'TFLite is not supported on web. Build and run on Android/iOS device.',
  };
}

export function formatMetadata(meta: ModelMetadata): string {
  return meta.error ?? 'TFLite not available on web.';
}
