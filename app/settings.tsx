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
});
