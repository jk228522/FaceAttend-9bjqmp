// Face Recognition Service
// Architecture: ML Kit (detection) → TFLite (embedding) → Cosine Similarity (recognition)
// V1: Mock pipeline with full production interface — swap implementations when native modules ready

import { AppConfig } from '@/constants/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FaceBoundingBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type FaceAngles = {
  rotationX: number; // Pitch: negative = look up, positive = look down
  rotationY: number; // Yaw: negative = turn left, positive = turn right
  rotationZ: number; // Roll: tilt
};

export type FaceLandmarks = {
  leftEye?: { x: number; y: number };
  rightEye?: { x: number; y: number };
};

export type DetectedFace = {
  boundingBox: FaceBoundingBox;
  angles: FaceAngles;
  landmarks: FaceLandmarks;
  trackingId?: number;
};

export type FaceDetectionResult = {
  faces: DetectedFace[];
  imageWidth: number;
  imageHeight: number;
};

export type FaceQualityResult = {
  valid: boolean;
  reason?: 'too_far' | 'too_close' | 'tilted' | 'ok';
  message?: string;
};

export type AngleStep = 'FRONT' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

export type EmbeddingVector = number[]; // 128-dim (provisional)

export type RecognitionMatch = {
  personId: number;
  personName: string;
  score: number;
  recognized: boolean;
};

// ─── Mock ML Kit Face Detector ───────────────────────────────────────────────
// TODO: Replace with @react-native-ml-kit/face-detection or native module
// Native module signature preserved for drop-in replacement

export async function detectFacesInImage(
  imageUri: string,
  imageWidth: number,
  imageHeight: number
): Promise<FaceDetectionResult> {
  // MOCK: Simulate ML Kit detection
  // Production: Use native MLKitFaceDetector.detectFacesInPhoto(imageUri)
  await new Promise((r) => setTimeout(r, 150));

  const mockFace: DetectedFace = {
    boundingBox: {
      left: imageWidth * 0.3,
      top: imageHeight * 0.2,
      width: imageWidth * 0.4,
      height: imageHeight * 0.45,
    },
    angles: { rotationX: 2, rotationY: 3, rotationZ: 1 },
    landmarks: {
      leftEye: { x: imageWidth * 0.38, y: imageHeight * 0.38 },
      rightEye: { x: imageWidth * 0.58, y: imageHeight * 0.38 },
    },
    trackingId: Math.floor(Math.random() * 1000),
  };

  return { faces: [mockFace], imageWidth, imageHeight };
}

// ─── Largest Face Selection (Attendance mode) ────────────────────────────────

export function selectLargestFace(faces: DetectedFace[]): DetectedFace | null {
  if (!faces || faces.length === 0) return null;
  return faces.reduce((largest, face) => {
    const largestArea = largest.boundingBox.width * largest.boundingBox.height;
    const faceArea = face.boundingBox.width * face.boundingBox.height;
    return faceArea > largestArea ? face : largest;
  });
}

// ─── Face Quality Check ──────────────────────────────────────────────────────

export function checkFaceQuality(
  face: DetectedFace,
  imageWidth: number,
  imageHeight: number
): FaceQualityResult {
  const { boundingBox, angles } = face;
  const widthRatio = boundingBox.width / imageWidth;
  const heightRatio = boundingBox.height / imageHeight;

  if (widthRatio < AppConfig.FACE_MIN_RATIO || heightRatio < AppConfig.FACE_MIN_RATIO) {
    return { valid: false, reason: 'too_far', message: 'Please move closer to camera' };
  }

  if (widthRatio > AppConfig.FACE_MAX_RATIO || heightRatio > AppConfig.FACE_MAX_RATIO) {
    return { valid: false, reason: 'too_close', message: 'Please move away from camera' };
  }

  if (Math.abs(angles.rotationZ) > AppConfig.FACE_MAX_TILT_DEG) {
    return { valid: false, reason: 'tilted', message: 'Please keep your face straight' };
  }

  return { valid: true, reason: 'ok' };
}

// ─── Registration Angle Validation ──────────────────────────────────────────

export function checkRegistrationAngle(face: DetectedFace, step: AngleStep): {
  valid: boolean;
  message?: string;
} {
  const { rotationX, rotationY, rotationZ } = face.angles;
  const config = AppConfig.ANGLES[step];

  if (Math.abs(rotationZ) > AppConfig.FACE_MAX_TILT_DEG) {
    return { valid: false, message: 'Keep face straight (no tilt)' };
  }

  if (rotationY < config.rotY[0] || rotationY > config.rotY[1]) {
    const direction = step === 'LEFT' ? 'Turn your face LEFT' :
                      step === 'RIGHT' ? 'Turn your face RIGHT' :
                      'Face the camera directly';
    return { valid: false, message: direction };
  }

  if ('rotX' in config) {
    const [minX, maxX] = (config as any).rotX;
    if (rotationX < minX || rotationX > maxX) {
      const direction = step === 'UP' ? 'Tilt face slightly UP' :
                        step === 'DOWN' ? 'Tilt face slightly DOWN' :
                        'Keep face level';
      return { valid: false, message: direction };
    }
  }

  return { valid: true };
}

// ─── Face Crop with Padding ───────────────────────────────────────────────────

export function computeCropRegion(
  face: DetectedFace,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  const { boundingBox } = face;
  const padX = boundingBox.width * AppConfig.CROP_PADDING_X;
  const padY = boundingBox.height * AppConfig.CROP_PADDING_Y;

  const x = Math.max(0, boundingBox.left - padX);
  const y = Math.max(0, boundingBox.top - padY);
  const right = Math.min(imageWidth, boundingBox.left + boundingBox.width + padX);
  const bottom = Math.min(imageHeight, boundingBox.top + boundingBox.height + padY);

  return { x, y, width: right - x, height: bottom - y };
}

// ─── Face Alignment ───────────────────────────────────────────────────────────

export function computeAlignmentAngle(landmarks: FaceLandmarks): number {
  if (!landmarks.leftEye || !landmarks.rightEye) return 0;
  const dx = landmarks.rightEye.x - landmarks.leftEye.x;
  const dy = landmarks.rightEye.y - landmarks.leftEye.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

// ─── Mock TFLite Embedding Engine ────────────────────────────────────────────
// TODO: Replace with react-native-fast-tflite after adding model to assets/models/mobilefacenet.tflite
// Production: Load model once, run inference synchronously on normalized Float32 tensor
// Input: [1, 112, 112, 3] Float32 normalized to [-1, +1]
// Output: [1, 128] Float32 embedding

export async function generateFaceEmbedding(
  imageUri: string,
  cropRegion: { x: number; y: number; width: number; height: number }
): Promise<EmbeddingVector> {
  // MOCK: Returns deterministic pseudo-embedding based on URI hash
  // Production pipeline: crop → align → resize(112x112) → RGB → normalize → TFLite → embedding
  await new Promise((r) => setTimeout(r, 200));

  let seed = 0;
  for (let i = 0; i < imageUri.length; i++) {
    seed = (seed * 31 + imageUri.charCodeAt(i)) & 0xFFFFFFFF;
  }

  const embedding = new Array(AppConfig.MODEL_EMBEDDING_DIM).fill(0).map((_, i) => {
    const val = Math.sin(seed * (i + 1) * 0.001) * 0.5 + Math.cos(seed * (i + 2) * 0.003) * 0.5;
    return val;
  });

  return normalizeEmbedding(embedding);
}

// ─── Embedding Normalization (L2) ─────────────────────────────────────────────

export function normalizeEmbedding(embedding: EmbeddingVector): EmbeddingVector {
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return embedding;
  return embedding.map((v) => v / norm);
}

// ─── Cosine Similarity ────────────────────────────────────────────────────────

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dot / denominator;
}

// ─── Recognition Against Database ────────────────────────────────────────────

export type StoredEmbedding = {
  personId: number;
  personName: string;
  embedding: EmbeddingVector;
};

export function recognizeFace(
  queryEmbedding: EmbeddingVector,
  storedEmbeddings: StoredEmbedding[],
  threshold: number = AppConfig.DEFAULT_RECOGNITION_THRESHOLD
): RecognitionMatch | null {
  if (!storedEmbeddings || storedEmbeddings.length === 0) {
    return null;
  }

  let bestScore = -1;
  let bestMatch: StoredEmbedding | null = null;

  for (const stored of storedEmbeddings) {
    const score = cosineSimilarity(queryEmbedding, stored.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = stored;
    }
  }

  if (!bestMatch) return null;

  return {
    personId: bestMatch.personId,
    personName: bestMatch.personName,
    score: bestScore,
    recognized: bestScore >= threshold,
  };
}

// ─── Duplicate Face Detection ─────────────────────────────────────────────────

export function checkDuplicateFace(
  newEmbeddings: EmbeddingVector[],
  existingEmbeddings: StoredEmbedding[],
  duplicateThreshold: number = AppConfig.DUPLICATE_THRESHOLD
): { isDuplicate: boolean; matchedPersonId?: number; matchedPersonName?: string; score?: number } {
  for (const newEmb of newEmbeddings) {
    for (const stored of existingEmbeddings) {
      const score = cosineSimilarity(newEmb, stored.embedding);
      if (score >= duplicateThreshold) {
        return {
          isDuplicate: true,
          matchedPersonId: stored.personId,
          matchedPersonName: stored.personName,
          score,
        };
      }
    }
  }
  return { isDuplicate: false };
}
