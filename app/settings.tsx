// Settings Screen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { getAllSettings, setSetting } from '@/services/DatabaseService';
import {
  inspectModelMetadata,
  formatMetadata,
  isModelLoaded,
  loadModel,
  getModelLoadError,
  type ModelMetadata,
} from '@/services/FaceRecognitionService';
import { AppConfig } from '@/constants/config';
import { Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

type Settings = {
  recognition_threshold: string;
  duplicate_threshold: string;
  dark_mode: string;
  sync_enabled: string;
  sync_endpoint: string;
  camera_timeout: string;
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { showAlert } = useAlert();

  const [settings, setSettings] = useState<Settings>({
    recognition_threshold: String(AppConfig.DEFAULT_RECOGNITION_THRESHOLD),
    duplicate_threshold: String(AppConfig.DUPLICATE_THRESHOLD),
    dark_mode: 'true',
    sync_enabled: 'false',
    sync_endpoint: '',
    camera_timeout: String(AppConfig.CAMERA_TIMEOUT_SECONDS),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modelInspecting, setModelInspecting] = useState(false);
  const [modelMeta, setModelMeta] = useState<ModelMetadata | null>(null);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [modelStatus, setModelStatus] = useState<'unknown' | 'loaded' | 'failed'>('unknown');

  useEffect(() => {
    getAllSettings()
      .then((s) => setSettings((prev) => ({ ...prev, ...s })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = useCallback((key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const recThr = parseFloat(settings.recognition_threshold);
      const dupThr = parseFloat(settings.duplicate_threshold);
      const timeout = parseInt(settings.camera_timeout);

      if (isNaN(recThr) || recThr < 0.5 || recThr > 1.0) {
        showAlert('Invalid Value', 'Recognition threshold must be between 0.5 and 1.0 (e.g., 0.85)');
        return;
      }
      if (isNaN(dupThr) || dupThr < 0.5 || dupThr > 1.0) {
        showAlert('Invalid Value', 'Duplicate threshold must be between 0.5 and 1.0 (e.g., 0.90)');
        return;
      }
      if (isNaN(timeout) || timeout < 3 || timeout > 30) {
        showAlert('Invalid Value', 'Camera timeout must be between 3 and 30 seconds');
        return;
      }

      await Promise.all([
        setSetting('recognition_threshold', String(recThr)),
        setSetting('duplicate_threshold', String(dupThr)),
        setSetting('dark_mode', settings.dark_mode),
        setSetting('sync_enabled', settings.sync_enabled),
        setSetting('sync_endpoint', settings.sync_endpoint),
        setSetting('camera_timeout', String(timeout)),
      ]);

      showAlert('Settings Saved', 'All settings have been saved successfully.');
    } catch (e: any) {
      showAlert('Save Failed', e?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const handleInspectModel = useCallback(async () => {
    setModelInspecting(true);
    try {
      const meta = await inspectModelMetadata();
      setModelMeta(meta);
      setModelStatus(meta.loaded ? 'loaded' : 'failed');
      setModelModalVisible(true);
    } catch (e: any) {
      setModelMeta({ inputs: [], outputs: [], loaded: false, error: e?.message });
      setModelStatus('failed');
      setModelModalVisible(true);
    } finally {
      setModelInspecting(false);
    }
  }, []);

  const handlePreloadModel = useCallback(async () => {
    setModelInspecting(true);
    try {
      await loadModel();
      setModelStatus('loaded');
      showAlert('Model Loaded', 'mobilefacenet.tflite loaded successfully into memory.');
    } catch (e: any) {
      setModelStatus('failed');
      showAlert('Model Load Failed', e?.message ?? 'Could not load TFLite model. Ensure mobilefacenet.tflite exists in assets/models/');
    } finally {
      setModelInspecting(false);
    }
  }, []);

  const handleThemeToggle = useCallback((value: boolean) => {
    updateSetting('dark_mode', value ? 'true' : 'false');
    toggleTheme();
  }, [updateSetting, toggleTheme]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
        <AppCard style={{ marginBottom: Spacing.lg }}>
          <View style={styles.settingRow}>
            <MaterialIcons name="dark-mode" size={22} color={colors.primary} />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>Switch between dark and light theme</Text>
            </View>
            <Switch
              value={settings.dark_mode === 'true'}
              onValueChange={handleThemeToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings.dark_mode === 'true' ? colors.primaryDark : colors.textMuted}
            />
          </View>
        </AppCard>

        {/* Recognition */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>FACE RECOGNITION</Text>
        <AppCard style={{ marginBottom: Spacing.lg }}>
          <View style={styles.sliderSection}>
            <View style={styles.sliderRow}>
              <MaterialIcons name="face" size={22} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Recognition Threshold</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Cosine similarity cutoff (0.5–1.0). Default: 0.85{'\n'}
                  Higher = stricter matching. NOT accuracy percentage.
                </Text>
              </View>
              <TextInput
                style={[styles.threshInput, { color: colors.textPrimary, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                value={settings.recognition_threshold}
                onChangeText={(t) => updateSetting('recognition_threshold', t)}
                keyboardType="decimal-pad"
                maxLength={4}
                accessibilityLabel="Recognition threshold"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.sliderRow}>
              <MaterialIcons name="person-off" size={22} color={colors.warning} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Duplicate Detection Threshold</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Cosine similarity for duplicate check (0.5–1.0). Default: 0.90{'\n'}
                  Higher = stricter duplicate rejection.
                </Text>
              </View>
              <TextInput
                style={[styles.threshInput, { color: colors.textPrimary, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                value={settings.duplicate_threshold}
                onChangeText={(t) => updateSetting('duplicate_threshold', t)}
                keyboardType="decimal-pad"
                maxLength={4}
                accessibilityLabel="Duplicate threshold"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.sliderRow}>
              <MaterialIcons name="timer" size={22} color={colors.info} />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Camera Timeout (seconds)</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Max recognition window (3–30s). Default: 8s
                </Text>
              </View>
              <TextInput
                style={[styles.threshInput, { color: colors.textPrimary, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                value={settings.camera_timeout}
                onChangeText={(t) => updateSetting('camera_timeout', t)}
                keyboardType="number-pad"
                maxLength={2}
                accessibilityLabel="Camera timeout"
              />
            </View>
          </View>

          <View style={[styles.noteBox, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
            <MaterialIcons name="warning" size={16} color={colors.warning} />
            <Text style={[styles.noteText, { color: colors.warning }]}>
              Thresholds must be calibrated with real registered users and test photos. Adjust only after proper testing.
            </Text>
          </View>
        </AppCard>

        {/* Sync */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>OPTIONAL SYNC</Text>
        <AppCard style={{ marginBottom: Spacing.lg }}>
          <View style={styles.settingRow}>
            <MaterialIcons name="sync" size={22} color={colors.info} />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Enable Online Sync</Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                Sync to server when connected. Core attendance works offline.
              </Text>
            </View>
            <Switch
              value={settings.sync_enabled === 'true'}
              onValueChange={(v) => updateSetting('sync_enabled', v ? 'true' : 'false')}
              trackColor={{ false: colors.border, true: colors.info }}
              thumbColor={settings.sync_enabled === 'true' ? '#2196F3' : colors.textMuted}
            />
          </View>

          {settings.sync_enabled === 'true' ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary, marginBottom: 6 }]}>
                Sync Endpoint URL
              </Text>
              <TextInput
                style={[styles.endpointInput, { color: colors.textPrimary, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                value={settings.sync_endpoint}
                onChangeText={(t) => updateSetting('sync_endpoint', t)}
                placeholder="https://your-server.com/api/sync"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                accessibilityLabel="Sync endpoint"
              />
              <Text style={[styles.settingDesc, { color: colors.textMuted, marginTop: 4 }]}>
                Sync interval: ~20 seconds when connected. Failures do not affect local attendance.
              </Text>
            </>
          ) : null}
        </AppCard>

        {/* Security Info */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SECURITY & DATABASE</Text>
        <AppCard style={{ marginBottom: Spacing.lg }}>
          {[
            { icon: 'lock', label: 'Database Encryption', desc: 'SQLite · Upgrade path: SQLCipher + Android Keystore key' },
            { icon: 'password', label: 'Password Storage', desc: 'SHA-256 hashed · Production: Argon2id via react-native-argon2' },
            { icon: 'face', label: 'Face Embeddings', desc: 'Stored in encrypted DB · Never sent to server without consent' },
            { icon: 'photo-camera', label: 'Login Audit', desc: 'Every login attempt logged in admin_logs table' },
            { icon: 'backup', label: 'Auto Backup', desc: 'WorkManager backup ~every 3 hours (production)' },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <View style={styles.settingRow}>
                <MaterialIcons name={item.icon as any} size={20} color={colors.primary} />
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.settingDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                </View>
              </View>
              {i < arr.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            </React.Fragment>
          ))}
        </AppCard>

        {/* TFLite Model Inspector */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TFLITE MODEL</Text>
        <AppCard style={{ marginBottom: Spacing.lg }}>
          <View style={styles.settingRow}>
            <MaterialIcons name="memory" size={22} color={colors.primary} />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>mobilefacenet.tflite</Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                Status: {
                  modelStatus === 'loaded' ? '✅ Loaded in memory' :
                  modelStatus === 'failed' ? '❌ Not loaded / file missing' :
                  isModelLoaded() ? '✅ Loaded' : '⏳ Not yet loaded'
                }
              </Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted, marginTop: 2 }]}>
                Path: assets/models/mobilefacenet.tflite
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={[styles.noteBox, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
            <MaterialIcons name="info" size={15} color={colors.info} />
            <Text style={[styles.noteText, { color: colors.info }]}>
              Place mobilefacenet.tflite in assets/models/ before using real inference.
              Provisional input: [1,112,112,3] Float32 → output: [1,128] Float32.
              Verify with Inspect before production.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
            <AppButton
              label={modelInspecting ? 'Loading...' : 'Preload Model'}
              onPress={handlePreloadModel}
              loading={modelInspecting}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <AppButton
              label={modelInspecting ? 'Inspecting...' : 'Inspect Metadata'}
              onPress={handleInspectModel}
              loading={modelInspecting}
              style={{ flex: 1 }}
            />
          </View>
        </AppCard>

        {/* App Info */}
        <AppCard elevated>
          <View style={styles.appInfoRow}>
            <MaterialIcons name="info" size={20} color={colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>
                FaceAttend v{AppConfig.VERSION}
              </Text>
              <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                Offline Face Recognition Attendance · {AppConfig.BADGE_NAME} · {AppConfig.BADGE_DEPT}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Model Metadata Modal */}
        <Modal
          visible={modelModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModelModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <MaterialIcons
                  name={modelMeta?.loaded ? 'check-circle' : 'error'}
                  size={22}
                  color={modelMeta?.loaded ? colors.success : colors.error}
                />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>TFLite Model Inspector</Text>
                <Pressable onPress={() => setModelModalVisible(false)} accessibilityLabel="Close">
                  <MaterialIcons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                <View style={[styles.metaBox, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
                  <Text style={[styles.metaText, { color: modelMeta?.loaded ? colors.textPrimary : colors.error }]}>
                    {modelMeta ? formatMetadata(modelMeta) : 'No data'}
                  </Text>
                </View>

                {modelMeta?.loaded ? (
                  <>
                    <Text style={[styles.settingDesc, { color: colors.textMuted, marginTop: Spacing.md }]}>
                      ✅ Verify these values match constants/config.ts:
                    </Text>
                    {[
                      `MODEL_INPUT_SIZE: ${AppConfig.MODEL_INPUT_SIZE}`,
                      `MODEL_INPUT_CHANNELS: ${AppConfig.MODEL_INPUT_CHANNELS}`,
                      `MODEL_EMBEDDING_DIM: ${AppConfig.MODEL_EMBEDDING_DIM}`,
                      `Normalize: (pixel - ${AppConfig.MODEL_NORMALIZE_MEAN}) / ${AppConfig.MODEL_NORMALIZE_SCALE}`,
                    ].map((line) => (
                      <Text key={line} style={[styles.settingDesc, { color: colors.textSecondary, marginTop: 2 }]}>
                        • {line}
                      </Text>
                    ))}
                  </>
                ) : (
                  <>
                    <Text style={[styles.settingDesc, { color: colors.warning, marginTop: Spacing.md }]}>
                      ⚠ Model file missing or incompatible.
                    </Text>
                    <Text style={[styles.settingDesc, { color: colors.textMuted, marginTop: 4 }]}>
                      Copy mobilefacenet.tflite to assets/models/ and rebuild the APK.
                      The app will use mock embeddings until the model is present.
                    </Text>
                  </>
                )}
              </ScrollView>

              <AppButton
                label="Close"
                onPress={() => setModelModalVisible(false)}
                fullWidth
                variant="secondary"
                style={{ marginTop: Spacing.lg }}
              />
            </View>
          </View>
        </Modal>

        {/* Save Button */}
        <AppButton
          label={saving ? 'Saving...' : 'Save Settings'}
          onPress={saveSettings}
          loading={saving}
          fullWidth
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
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
  content: { padding: Spacing.lg },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, letterSpacing: 1.2, includeFontPadding: false },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 4 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: FontSize.body, fontWeight: FontWeight.medium, includeFontPadding: false },
  settingDesc: { fontSize: FontSize.xs, marginTop: 2, lineHeight: 16, includeFontPadding: false },
  divider: { height: 1, marginVertical: Spacing.md },
  sliderSection: {},
  sliderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 4 },
  threshInput: {
    width: 60,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    includeFontPadding: false,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  noteText: { flex: 1, fontSize: FontSize.xs, lineHeight: 16, includeFontPadding: false },
  endpointInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    fontSize: FontSize.body,
    includeFontPadding: false,
  },
  appInfoRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    includeFontPadding: false,
  },
  metaBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  metaText: {
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
    lineHeight: 18,
    includeFontPadding: false,
  },
});
