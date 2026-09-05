/**
 * TFLiteEngine.ts
 * ─────────────────────────────────────────────────────────────────
 * Wraps react-native-fast-tflite for MobileFaceNet inference.
 *
 * Model specification (provisional — verify with actual model metadata):
 *   File   : assets/models/mobilefacenet.tflite
 *   Input  : [1, 112, 112, 3]  Float32  normalized to [-1.0, +1.0]
 *   Output : [1, 128]          Float32  raw face embedding
 *
 * CRITICAL: Until you inspect the actual model with TensorFlow Lite
 * metadata inspector, treat all shape/normalization values as provisional.
 * Run `python -c "import tensorflow as tf; i=tf.lite.Interpreter('mobilefacenet.tflite'); i.allocate_tensors(); print(i.get_input_details(), i.get_output_details())"
 * to confirm input shape, dtype, and output dim before deploying.
 * ─────────────────────────────────────────────────────────────────
 */

import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { AppConfig } from '@/constants/config';

// ─── Singleton Model Instance ──────────────────────────────────────────────

let _model: TensorflowModel | null = null;
let _loadPromise: Promise<TensorflowModel> | null = null;
let _modelLoadError: string | null = null;

/**
 * Load the TFLite model once and cache it.
 * Safe to call multiple times — returns same promise.
 */
export async function loadModel(): Promise<TensorflowModel> {
  if (_model) return _model;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const model = await loadTensorflowModel(
        require('../assets/models/mobilefacenet.tflite')
      );
      _model = model;
      _modelLoadError = null;
      console.log('[TFLiteEngine] Model loaded successfully');
      return model;
    } catch (e: any) {
      _modelLoadError = e?.message ?? 'Failed to load TFLite model';
      _loadPromise = null;
      console.error('[TFLiteEngine] Model load failed:', _modelLoadError);
      throw new Error(`TFLite model load failed: ${_modelLoadError}`);
    }
  })();

  return _loadPromise;
}

/**
 * Dispose model — call when app goes to background for memory savings.
 */
export function disposeModel(): void {
  if (_model) {
    try {
      // react-native-fast-tflite models don't have explicit dispose in all versions
      // but we clear our reference
      _model = null;
      _loadPromise = null;
      console.log('[TFLiteEngine] Model disposed');
    } catch (e) {
      console.warn('[TFLiteEngine] Dispose warning:', e);
    }
  }
}

/**
 * Check whether the model is currently loaded.
 */
export function isModelLoaded(): boolean {
  return _model !== null;
}

/**
 * Get last load error if any.
 */
export function getModelLoadError(): string | null {
  return _modelLoadError;
}

// ─── Tensor Preparation ────────────────────────────────────────────────────

/**
 * Convert a flat RGB number[] array (0–255 values, length = W×H×3)
 * into a normalized Float32Array for MobileFaceNet.
 *
 * Normalization: pixel / 127.5 - 1.0  →  range [-1.0, +1.0]
 *
 * NOTE: If your model uses different normalization (e.g., /255.0 or
 * mean/std subtraction), update AppConfig.MODEL_NORMALIZE_MEAN/SCALE
 * and adjust the formula below accordingly.
 */
export function buildInputTensor(rgbPixels: number[]): Float32Array {
  const expectedLength =
    AppConfig.MODEL_INPUT_SIZE * AppConfig.MODEL_INPUT_SIZE * AppConfig.MODEL_INPUT_CHANNELS;

  if (rgbPixels.length !== expectedLength) {
    throw new Error(
      `[TFLiteEngine] Input pixel array length mismatch: ` +
      `expected ${expectedLength}, got ${rgbPixels.length}. ` +
      `Check MODEL_INPUT_SIZE and MODEL_INPUT_CHANNELS in config.ts.`
    );
  }

  const mean = AppConfig.MODEL_NORMALIZE_MEAN;   // 127.5
  const scale = AppConfig.MODEL_NORMALIZE_SCALE;  // 127.5

  const tensor = new Float32Array(expectedLength);
  for (let i = 0; i < expectedLength; i++) {
    tensor[i] = (rgbPixels[i] - mean) / scale;
  }
  return tensor;
}

// ─── Inference ─────────────────────────────────────────────────────────────

/**
 * Run face embedding inference.
 *
 * @param rgbPixels  Flat RGB array, length = 112×112×3 = 37,632
 * @returns          Float32Array of length MODEL_EMBEDDING_DIM (128)
 *
 * Implementation note on performance:
 *   Currently we pass the Float32Array through the JS bridge.
 *   For production, consider using react-native-fast-tflite's
 *   direct buffer binding if the version supports it, to avoid
 *   bridge serialization overhead.
 */
export async function runInference(rgbPixels: number[]): Promise<Float32Array> {
  const model = await loadModel();
  const inputTensor = buildInputTensor(rgbPixels);

  // react-native-fast-tflite API:
  //   model.run(inputs: Record<string, TypedArray>) → Record<string, TypedArray>
  // Input tensor name is typically '0' or 'input' — inspect model metadata to confirm.
  const outputs = model.run({ '0': inputTensor });

  // Output tensor name is typically '0' or 'output' — verify with metadata.
  const embeddingRaw = outputs['0'] as Float32Array;

  if (!embeddingRaw || embeddingRaw.length !== AppConfig.MODEL_EMBEDDING_DIM) {
    throw new Error(
      `[TFLiteEngine] Output shape mismatch: ` +
      `expected [${AppConfig.MODEL_EMBEDDING_DIM}], got [${embeddingRaw?.length ?? 'undefined'}]. ` +
      `Run inspectModelMetadata() to check actual output tensor name and shape.`
    );
  }

  return embeddingRaw;
}

// ─── Model Metadata Inspector ──────────────────────────────────────────────

export type TensorInfo = {
  name: string;
  shape: number[];
  dataType: string;
};

export type ModelMetadata = {
  inputs: TensorInfo[];
  outputs: TensorInfo[];
  loaded: boolean;
  error?: string;
};

/**
 * Inspect TFLite model input/output tensor metadata.
 *
 * Use this utility during development to confirm:
 *   - Input tensor name, shape, and dtype
 *   - Output tensor name, shape (embedding dimension), and dtype
 *   - Whether quantization is applied (int8 vs float32)
 *
 * Call this from Settings screen or a debug panel during testing.
 * CRITICAL: Verify all provisional assumptions before production deployment.
 *
 * Example output for MobileFaceNet:
 *   inputs:  [{ name: '0', shape: [1, 112, 112, 3], dataType: 'float32' }]
 *   outputs: [{ name: '0', shape: [1, 128], dataType: 'float32' }]
 */
export async function inspectModelMetadata(): Promise<ModelMetadata> {
  try {
    const model = await loadModel();

    // react-native-fast-tflite exposes inputs/outputs as typed arrays after run()
    // To inspect shapes, we run a zeroed inference and check output dimensions
    const dummyPixels = new Array(
      AppConfig.MODEL_INPUT_SIZE * AppConfig.MODEL_INPUT_SIZE * AppConfig.MODEL_INPUT_CHANNELS
    ).fill(0);
    const dummyInput = buildInputTensor(dummyPixels);

    const outputs = model.run({ '0': dummyInput });

    const inputInfo: TensorInfo[] = [
      {
        name: '0',
        shape: [1, AppConfig.MODEL_INPUT_SIZE, AppConfig.MODEL_INPUT_SIZE, AppConfig.MODEL_INPUT_CHANNELS],
        dataType: 'float32 (assumed — verify with model file)',
      },
    ];

    const outputInfos: TensorInfo[] = Object.entries(outputs).map(([key, value]) => ({
      name: key,
      shape: Array.isArray(value) ? [value.length] : [(value as Float32Array).length],
      dataType: value instanceof Float32Array ? 'float32' : 'unknown',
    }));

    return { inputs: inputInfo, outputs: outputInfos, loaded: true };
  } catch (e: any) {
    return {
      inputs: [],
      outputs: [],
      loaded: false,
      error: e?.message ?? 'Inspection failed',
    };
  }
}

/**
 * Format metadata as a human-readable string for display in Settings/debug UI.
 */
export function formatMetadata(meta: ModelMetadata): string {
  if (!meta.loaded) {
    return `Model not loaded.\nError: ${meta.error ?? 'Unknown'}`;
  }
  const ins = meta.inputs
    .map((t) => `  "${t.name}": shape=[${t.shape.join(',')}] dtype=${t.dataType}`)
    .join('\n');
  const outs = meta.outputs
    .map((t) => `  "${t.name}": shape=[${t.shape.join(',')}] dtype=${t.dataType}`)
    .join('\n');
  return `✅ Model Loaded\n\nINPUTS:\n${ins}\n\nOUTPUTS:\n${outs}`;
}
