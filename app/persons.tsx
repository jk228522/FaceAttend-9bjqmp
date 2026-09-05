// Persons Management + Add New Person Screen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AppCard } from '@/components/ui/AppCard';
import {
  getAllPersons,
  Person,
  getAllEmbeddings,
  registerPersonAtomic,
  deletePerson,
} from '@/services/DatabaseService';
import {
  detectFacesInImage,
  checkFaceQuality,
  checkRegistrationAngle,
  computeCropRegion,
  generateFaceEmbedding,
  checkDuplicateFace,
  EmbeddingVector,
  AngleStep,
} from '@/services/FaceRecognitionService';
import { AppConfig } from '@/constants/config';
import { Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

type RegistrationStep = 'form' | 'photos' | 'processing' | 'done';
type PhotoStep = 'FRONT' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

const PHOTO_STEPS: PhotoStep[] = ['FRONT', 'LEFT', 'RIGHT', 'UP', 'DOWN'];
const PHOTO_STEP_LABELS: Record<PhotoStep, string> = {
  FRONT: 'Look straight at camera',
  LEFT: 'Turn slightly to LEFT',
  RIGHT: 'Turn slightly to RIGHT',
  UP: 'Tilt face slightly UP',
  DOWN: 'Tilt face slightly DOWN',
};

export default function PersonsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [view, setView] = useState<'list' | 'add'>('list');
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [age, setAge] = useState('');
  const [nameError, setNameError] = useState('');

  // Registration camera
  const [regStep, setRegStep] = useState<RegistrationStep>('form');
  const [currentPhotoStep, setCurrentPhotoStep] = useState(0);
  const [capturedEmbeddings, setCapturedEmbeddings] = useState<EmbeddingVector[]>([]);
  const [photoFeedback, setPhotoFeedback] = useState('');
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'capturing' | 'processing' | 'ok' | 'error'>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);
  const [processingMsg, setProcessingMsg] = useState('');

  const loadPersons = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllPersons();
      setPersons(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPersons();
  }, []);

  const filteredPersons = persons.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.father_name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = useCallback((person: Person) => {
    showAlert(`Delete ${person.name}?`, 'This will remove the person and all their face data permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePerson(person.id);
          await loadPersons();
        },
      },
    ]);
  }, [loadPersons]);

  const startRegistration = () => {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    setRegStep('photos');
    setCurrentPhotoStep(0);
    setCapturedEmbeddings([]);
    setPhotoFeedback(PHOTO_STEP_LABELS['FRONT']);
    setPhotoStatus('idle');
  };

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || photoStatus === 'capturing' || photoStatus === 'processing') return;

    const step = PHOTO_STEPS[currentPhotoStep] as AngleStep;
    setPhotoStatus('capturing');
    setPhotoFeedback('Capturing...');

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo) throw new Error('Capture failed');

      setPhotoStatus('processing');
      setPhotoFeedback(`Processing photo ${currentPhotoStep + 1}...`);

      // Detect faces
      const detection = await detectFacesInImage(photo.uri, photo.width ?? 640, photo.height ?? 480);

      if (!detection.faces || detection.faces.length === 0) {
        setPhotoStatus('error');
        setPhotoFeedback('No face detected. Please try again.');
        setTimeout(() => { setPhotoStatus('idle'); setPhotoFeedback(PHOTO_STEP_LABELS[step]); }, 2000);
        return;
      }

      if (detection.faces.length > 1) {
        setPhotoStatus('error');
        setPhotoFeedback('Multiple faces detected. Only one face allowed.');
        setTimeout(() => { setPhotoStatus('idle'); setPhotoFeedback(PHOTO_STEP_LABELS[step]); }, 2000);
        return;
      }

      const face = detection.faces[0];

      // Quality check
      const quality = checkFaceQuality(face, detection.imageWidth, detection.imageHeight);
      if (!quality.valid) {
        setPhotoStatus('error');
        setPhotoFeedback(quality.message ?? 'Face quality check failed');
        setTimeout(() => { setPhotoStatus('idle'); setPhotoFeedback(PHOTO_STEP_LABELS[step]); }, 2000);
        return;
      }

      // Angle check
      const angleCheck = checkRegistrationAngle(face, step);
      if (!angleCheck.valid) {
        setPhotoStatus('error');
        setPhotoFeedback(angleCheck.message ?? 'Wrong angle. Please adjust.');
        setTimeout(() => { setPhotoStatus('idle'); setPhotoFeedback(PHOTO_STEP_LABELS[step]); }, 2000);
        return;
      }

      // Generate embedding
      const cropRegion = computeCropRegion(face, detection.imageWidth, detection.imageHeight);
      const embedding = await generateFaceEmbedding(photo.uri, cropRegion);

      const newEmbeddings = [...capturedEmbeddings, embedding];
      setCapturedEmbeddings(newEmbeddings);

      const nextStep = currentPhotoStep + 1;

      if (nextStep >= AppConfig.MIN_REGISTRATION_PHOTOS) {
        // Minimum photos reached — proceed if user captured enough
        if (nextStep >= PHOTO_STEPS.length) {
          // All 5 done — finalize
          await finalizeRegistration(newEmbeddings);
        } else {
          setPhotoStatus('ok');
          setPhotoFeedback(`Photo ${nextStep} captured! (${nextStep}/${AppConfig.MAX_REGISTRATION_PHOTOS})`);
          setTimeout(() => {
            setCurrentPhotoStep(nextStep);
            setPhotoStatus('idle');
            setPhotoFeedback(PHOTO_STEP_LABELS[PHOTO_STEPS[nextStep]]);
          }, 1200);
        }
      } else {
        setPhotoStatus('ok');
        setPhotoFeedback(`Photo ${nextStep} captured!`);
        setTimeout(() => {
          setCurrentPhotoStep(nextStep);
          setPhotoStatus('idle');
          setPhotoFeedback(PHOTO_STEP_LABELS[PHOTO_STEPS[nextStep]]);
        }, 1200);
      }
    } catch (e: any) {
      setPhotoStatus('error');
      setPhotoFeedback(e?.message ?? 'Capture failed');
      setTimeout(() => {
        setPhotoStatus('idle');
        const step = PHOTO_STEPS[currentPhotoStep] as AngleStep;
        setPhotoFeedback(PHOTO_STEP_LABELS[step]);
      }, 2000);
    }
  }, [cameraRef, cameraReady, photoStatus, currentPhotoStep, capturedEmbeddings]);

  const finalizeRegistration = async (embeddings: EmbeddingVector[]) => {
    setRegStep('processing');
    setProcessingMsg('Checking for duplicate faces...');

    try {
      // Check duplicates against existing DB
      const allEmbs = await getAllEmbeddings();
      const storedList = allEmbs.map((e) => ({
        personId: e.person_id,
        personName: 'Existing Person',
        embedding: JSON.parse(e.embedding) as number[],
      }));

      const dupCheck = checkDuplicateFace(embeddings, storedList);
      if (dupCheck.isDuplicate) {
        setRegStep('photos');
        showAlert('Duplicate Face', `This face already exists in the database (matched ${dupCheck.matchedPersonName ?? 'an existing person'}).`);
        return;
      }

      setProcessingMsg('Saving to encrypted database...');
      const result = await registerPersonAtomic(
        name.trim(),
        fatherName.trim(),
        parseInt(age) || 0,
        embeddings
      );

      if (result.success) {
        setRegStep('done');
        await loadPersons();
      } else {
        setRegStep('photos');
        showAlert('Registration Failed', result.error ?? 'Failed to save person');
      }
    } catch (e: any) {
      setRegStep('photos');
      showAlert('Registration Error', e?.message ?? 'Unexpected error');
    }
  };

  const skipToFinalize = async () => {
    if (capturedEmbeddings.length < AppConfig.MIN_REGISTRATION_PHOTOS) {
      showAlert('Not Enough Photos', `Minimum ${AppConfig.MIN_REGISTRATION_PHOTOS} photos required`);
      return;
    }
    await finalizeRegistration(capturedEmbeddings);
  };

  const resetForm = () => {
    setView('list');
    setName('');
    setFatherName('');
    setAge('');
    setNameError('');
    setRegStep('form');
    setCurrentPhotoStep(0);
    setCapturedEmbeddings([]);
    setPhotoFeedback('');
    setPhotoStatus('idle');
    setCameraReady(false);
  };

  // ─── List View ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Registered Persons</Text>
          <Pressable
            onPress={() => setView('add')}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Add person"
          >
            <MaterialIcons name="person-add" size={20} color={colors.textOnPrimary} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by name..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search persons"
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : (
          <FlatList
            data={filteredPersons}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialIcons name="person-off" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No persons registered</Text>
                <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                  Tap + to register a new person
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <AppCard style={{ marginBottom: Spacing.sm }}>
                <View style={styles.personRow}>
                  <View style={[styles.personAvatar, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                    <MaterialIcons name="face" size={28} color={colors.primary} />
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: colors.textPrimary }]}>{item.name}</Text>
                    {item.father_name ? (
                      <Text style={[styles.personSub, { color: colors.textSecondary }]}>
                        Father: {item.father_name}
                      </Text>
                    ) : null}
                    {item.age ? (
                      <Text style={[styles.personSub, { color: colors.textMuted }]}>Age: {item.age}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Delete ${item.name}`}
                  >
                    <MaterialIcons name="delete-outline" size={22} color={colors.error} />
                  </Pressable>
                </View>
              </AppCard>
            )}
          />
        )}
      </View>
    );
  }

  // ─── Add Person Form ─────────────────────────────────────────────────────
  if (regStep === 'form') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border }]}>
          <Pressable onPress={resetForm} style={styles.backBtn} accessibilityLabel="Go back">
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add New Person</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppInput
            label="Full Name *"
            value={name}
            onChangeText={(t) => { setName(t); setNameError(''); }}
            placeholder="Enter full name"
            error={nameError}
            autoCapitalize="words"
          />
          <AppInput
            label="Father's Name"
            value={fatherName}
            onChangeText={setFatherName}
            placeholder="Enter father's name (optional)"
            autoCapitalize="words"
          />
          <AppInput
            label="Age"
            value={age}
            onChangeText={setAge}
            placeholder="Enter age (optional)"
            keyboardType="numeric"
          />

          <AppCard elevated style={{ marginTop: Spacing.md }}>
            <View style={styles.infoRow}>
              <MaterialIcons name="info-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                3 to 5 face photos will be captured at different angles (front, left, right, up, down) to ensure accurate recognition.
              </Text>
            </View>
          </AppCard>

          <AppButton
            label="Next: Capture Face Photos"
            onPress={startRegistration}
            fullWidth
            style={{ marginTop: Spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Photo Capture ─────────────────────────────────────────────────────────
  if (regStep === 'photos') {
    if (!permission?.granted) {
      return (
        <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
          <MaterialIcons name="camera" size={64} color={colors.primary} />
          <Text style={[styles.permTitle, { color: colors.textPrimary }]}>Camera Permission Required</Text>
          <AppButton label="Grant Permission" onPress={requestPermission} style={{ marginTop: Spacing.lg }} />
          <AppButton label="Go Back" onPress={resetForm} variant="ghost" style={{ marginTop: Spacing.sm }} />
        </View>
      );
    }

    const step = PHOTO_STEPS[currentPhotoStep] as AngleStep;
    const isLastRequiredDone = capturedEmbeddings.length >= AppConfig.MIN_REGISTRATION_PHOTOS;

    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar style="light" />
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          onCameraReady={() => setCameraReady(true)}
        />
        <View style={styles.vignette} pointerEvents="none" />

        {/* Top bar */}
        <View style={[styles.regTopBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={resetForm} style={styles.backBtn} accessibilityLabel="Cancel registration">
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.regTitle}>{name}</Text>
          <Text style={styles.regProgress}>
            {capturedEmbeddings.length}/{AppConfig.MAX_REGISTRATION_PHOTOS}
          </Text>
        </View>

        {/* Step dots */}
        <View style={styles.stepDots}>
          {PHOTO_STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                i < capturedEmbeddings.length
                  ? { backgroundColor: '#4CAF50' }
                  : i === currentPhotoStep
                  ? { backgroundColor: '#F5A623' }
                  : { backgroundColor: 'rgba(255,255,255,0.3)' },
              ]}
            />
          ))}
        </View>

        {/* Face guide ring */}
        <View style={styles.faceGuide} pointerEvents="none">
          <View style={[styles.faceRing, {
            borderColor: photoStatus === 'ok' ? '#4CAF50' : photoStatus === 'error' ? '#F44336' : '#F5A623',
          }]} />
        </View>

        {/* Instruction */}
        <View style={[styles.instructionBox, {
          backgroundColor: photoStatus === 'ok' ? 'rgba(76,175,80,0.2)' :
                           photoStatus === 'error' ? 'rgba(244,67,54,0.2)' : 'rgba(0,0,0,0.6)',
          borderColor: photoStatus === 'ok' ? '#4CAF50' : photoStatus === 'error' ? '#F44336' : '#F5A623',
        }]}>
          <Text style={styles.photoStepLabel}>
            Photo {Math.min(currentPhotoStep + 1, 5)} of {AppConfig.MAX_REGISTRATION_PHOTOS}
          </Text>
          <Text style={styles.instructionText}>{photoFeedback || PHOTO_STEP_LABELS[step]}</Text>
        </View>

        {/* Capture / Skip buttons */}
        <View style={[styles.captureBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          {isLastRequiredDone ? (
            <Pressable
              onPress={skipToFinalize}
              style={[styles.skipBtn, { borderColor: '#F5A623' }]}
            >
              <Text style={[styles.skipBtnText, { color: '#F5A623' }]}>
                Done ({capturedEmbeddings.length} photos)
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={capturePhoto}
            disabled={!cameraReady || photoStatus === 'capturing' || photoStatus === 'processing'}
            style={[
              styles.captureBtn,
              (!cameraReady || photoStatus === 'capturing' || photoStatus === 'processing') && { opacity: 0.5 },
            ]}
            accessibilityLabel="Capture photo"
          >
            {photoStatus === 'processing' || photoStatus === 'capturing' ? (
              <ActivityIndicator color="#000" size="large" />
            ) : (
              <View style={styles.captureBtnInner} />
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Processing ────────────────────────────────────────────────────────────
  if (regStep === 'processing') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.processingMsg, { color: colors.textPrimary }]}>{processingMsg}</Text>
      </View>
    );
  }

  // ─── Done ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
      <View style={[styles.doneIcon, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
        <MaterialIcons name="check-circle" size={64} color={colors.success} />
      </View>
      <Text style={[styles.doneTitle, { color: colors.textPrimary }]}>Registration Complete!</Text>
      <Text style={[styles.doneSub, { color: colors.textSecondary }]}>
        {name} has been registered with {capturedEmbeddings.length} face photos.
      </Text>
      <AppButton label="Register Another Person" onPress={() => { setView('add'); setRegStep('form'); setName(''); setFatherName(''); setAge(''); setCapturedEmbeddings([]); }} style={{ marginTop: Spacing.xl, minWidth: 240 }} />
      <AppButton label="Back to List" onPress={resetForm} variant="secondary" style={{ marginTop: Spacing.sm, minWidth: 240 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', includeFontPadding: false },
  addBtn: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: FontSize.body, includeFontPadding: false },
  listContent: { padding: Spacing.md, paddingTop: 0, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginTop: Spacing.md, includeFontPadding: false },
  emptyDesc: { fontSize: FontSize.body, marginTop: 4, textAlign: 'center', includeFontPadding: false },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  personAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  personInfo: { flex: 1 },
  personName: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, includeFontPadding: false },
  personSub: { fontSize: FontSize.sm, includeFontPadding: false, marginTop: 2 },
  formContent: { padding: Spacing.lg, flexGrow: 1 },
  infoRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20, includeFontPadding: false },
  permTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center', marginTop: Spacing.lg, includeFontPadding: false },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  regTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  regTitle: { flex: 1, color: '#FFF', fontSize: FontSize.body, fontWeight: FontWeight.semibold, textAlign: 'center', includeFontPadding: false },
  regProgress: { color: '#F5A623', fontSize: FontSize.body, fontWeight: FontWeight.bold, includeFontPadding: false },
  stepDots: {
    position: 'absolute', top: 100, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  faceGuide: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  faceRing: { width: 200, height: 260, borderRadius: 100, borderWidth: 3, borderStyle: 'dashed' },
  instructionBox: {
    position: 'absolute', bottom: 140, left: Spacing.lg, right: Spacing.lg,
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center',
  },
  photoStepLabel: { color: '#F5A623', fontSize: FontSize.xs, fontWeight: FontWeight.medium, includeFontPadding: false },
  instructionText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: FontWeight.semibold, textAlign: 'center', includeFontPadding: false, marginTop: 4 },
  captureBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingTop: Spacing.md, gap: Spacing.sm,
  },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: Radius.round, borderWidth: 1 },
  skipBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, includeFontPadding: false },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFFFFF', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF' },
  processingMsg: { fontSize: FontSize.md, fontWeight: FontWeight.medium, marginTop: Spacing.lg, textAlign: 'center', includeFontPadding: false },
  doneIcon: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.lg, includeFontPadding: false },
  doneSub: { fontSize: FontSize.body, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 24, includeFontPadding: false },
});
