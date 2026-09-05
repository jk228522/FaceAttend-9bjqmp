// Attendance Camera Screen
// Flow: Camera ON → 8s countdown → ML Kit detect → largest face → quality check
//       → crop → align → resize → TFLite embedding → cosine similarity → threshold check
//       → recognized (2-3s display) → camera OFF | not-recognized → camera OFF

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { usePersons } from '@/hooks/usePersons';
import { useAttendance } from '@/hooks/useAttendance';
import { RecognitionOverlay } from '@/components/feature/RecognitionOverlay';
import {
  detectFacesInImage,
  selectLargestFace,
  checkFaceQuality,
  computeCropRegion,
  generateFaceEmbedding,
  recognizeFace,
} from '@/services/FaceRecognitionService';
import { getSetting } from '@/services/DatabaseService';
import { AppConfig } from '@/constants/config';
import { Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

type RecognitionStatus = 'idle' | 'scanning' | 'processing' | 'recognized' | 'not_recognized' | 'error';

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const { loadStoredEmbeddings } = usePersons();
  const { addAttendance } = useAttendance();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>('front');
  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [countdown, setCountdown] = useState(AppConfig.CAMERA_TIMEOUT_SECONDS);
  const [recognizedName, setRecognizedName] = useState('');
  const [recognizedScore, setRecognizedScore] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    countdownRef.current = null;
    timeoutRef.current = null;
  }, []);

  const stopCamera = useCallback((finalStatus: RecognitionStatus) => {
    clearTimers();
    setStatus(finalStatus);
    isProcessingRef.current = false;
  }, [clearTimers]);

  const performRecognition = useCallback(async () => {
    if (isProcessingRef.current || !cameraRef.current) return;
    isProcessingRef.current = true;
    setStatus('processing');

    try {
      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      if (!photo) throw new Error('Photo capture failed');

      // Detect faces (mock ML Kit)
      const detection = await detectFacesInImage(
        photo.uri,
        photo.width ?? 640,
        photo.height ?? 480
      );

      if (!detection.faces || detection.faces.length === 0) {
        // No face — continue scanning if time remains
        isProcessingRef.current = false;
        setStatus('scanning');
        return;
      }

      // Largest face selection (attendance mode)
      const targetFace = selectLargestFace(detection.faces);
      if (!targetFace) {
        isProcessingRef.current = false;
        setStatus('scanning');
        return;
      }

      // Quality check
      const quality = checkFaceQuality(targetFace, detection.imageWidth, detection.imageHeight);
      if (!quality.valid) {
        isProcessingRef.current = false;
        setStatus('scanning');
        return;
      }

      // Crop region
      const cropRegion = computeCropRegion(targetFace, detection.imageWidth, detection.imageHeight);

      // Generate embedding (mock TFLite)
      const embedding = await generateFaceEmbedding(photo.uri, cropRegion);

      // Load stored embeddings from DB
      const stored = await loadStoredEmbeddings();

      // Get threshold from settings
      const thresholdStr = await getSetting('recognition_threshold');
      const threshold = thresholdStr ? parseFloat(thresholdStr) : AppConfig.DEFAULT_RECOGNITION_THRESHOLD;

      // Recognize
      const match = recognizeFace(embedding, stored, threshold);

      clearTimers();

      if (match && match.recognized) {
        // Save attendance
        await addAttendance(match.personId, match.personName);
        setRecognizedName(match.personName);
        setRecognizedScore(match.score);
        stopCamera('recognized');

        // Auto-close after display seconds
        setTimeout(() => {
          router.back();
        }, AppConfig.RESULT_DISPLAY_SECONDS * 1000);
      } else {
        stopCamera('not_recognized');
        setTimeout(() => {
          router.back();
        }, 2500);
      }
    } catch (e: any) {
      isProcessingRef.current = false;
      stopCamera('error');
      setErrorMessage(e?.message ?? 'Recognition error');
      setTimeout(() => router.back(), 2000);
    }
  }, [clearTimers, loadStoredEmbeddings, addAttendance, stopCamera, router]);

  const startRecognition = useCallback(() => {
    setStatus('scanning');
    setCountdown(AppConfig.CAMERA_TIMEOUT_SECONDS);
    isProcessingRef.current = false;

    let remaining = AppConfig.CAMERA_TIMEOUT_SECONDS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearTimers();
        stopCamera('not_recognized');
        setTimeout(() => router.back(), 2500);
      }
    }, 1000);

    // Try recognition every 1.5 seconds
    const tryRecognition = async () => {
      if (status !== 'scanning' && status !== 'idle') return;
      await performRecognition();
      if (!isProcessingRef.current) {
        timeoutRef.current = setTimeout(tryRecognition, 1500);
      }
    };
    timeoutRef.current = setTimeout(tryRecognition, 800);
  }, [clearTimers, stopCamera, performRecognition, router]);

  useEffect(() => {
    if (!permission) return;
    if (permission.granted && cameraReady) {
      startRecognition();
    }
    return () => clearTimers();
  }, [permission, cameraReady]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Permission handling
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.permText, { color: colors.textSecondary }]}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
        <MaterialIcons name="no-photography" size={64} color={colors.error} />
        <Text style={[styles.permTitle, { color: colors.textPrimary }]}>Camera Permission Required</Text>
        <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
          Camera access is needed for face recognition attendance.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={[styles.permBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.permBtnText, { color: colors.textOnPrimary }]}>Grant Permission</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: FontSize.body }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Dark vignette overlay */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* Recognition UI Overlay */}
      <RecognitionOverlay
        countdown={countdown}
        status={status === 'idle' ? 'scanning' : status}
        recognizedName={recognizedName}
        score={recognizedScore}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => { clearTimers(); router.back(); }}
          style={[styles.closeBtn]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Close camera"
        >
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.topBarTitle}>Face Recognition</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Error overlay */}
      {status === 'error' ? (
        <View style={[styles.errorOverlay, { backgroundColor: colors.errorBg }]}>
          <MaterialIcons name="error" size={32} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage || 'Recognition failed'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    includeFontPadding: false,
  },
  permText: { textAlign: 'center', fontSize: FontSize.body, includeFontPadding: false },
  permTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginTop: Spacing.lg,
    includeFontPadding: false,
  },
  permDesc: {
    fontSize: FontSize.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    lineHeight: 24,
    includeFontPadding: false,
  },
  permBtn: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
  },
  permBtnText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    includeFontPadding: false,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
