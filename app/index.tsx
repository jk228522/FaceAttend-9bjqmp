// Login Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppConfig } from '@/constants/config';
import { Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';
import { getDatabase } from '@/services/DatabaseService';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isLoggedIn } = useAuth();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  // Initialize DB on first load
  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch((e) => showAlert('Database Error', e?.message ?? 'Failed to initialize database'));
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) router.replace('/home');
  }, [isLoggedIn]);

  const handleLogin = async () => {
    if (!username.trim()) {
      showAlert('Input Required', 'Please enter your username');
      return;
    }
    if (!password.trim()) {
      showAlert('Input Required', 'Please enter your password');
      return;
    }
    setLoading(true);
    try {
      const result = await login(username.trim().toLowerCase(), password);
      if (result.success) {
        router.replace('/home');
      } else {
        showAlert('Login Failed', result.error ?? 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Hero */}
        <View style={styles.hero}>
          <View style={[styles.logoRing, { borderColor: colors.primary }]}>
            <MaterialIcons name="face" size={52} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>FaceAttend</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Offline Face Recognition Attendance
          </Text>
        </View>

        {/* Login Card */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Admin Login</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Default: admin / admin123
          </Text>

          {!dbReady ? (
            <View style={styles.dbLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.dbLoadingText, { color: colors.textSecondary }]}>
                Initializing secure database...
              </Text>
            </View>
          ) : null}

          <AppInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={dbReady && !loading}
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
            secureToggle
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={dbReady && !loading}
          />

          <AppButton
            label={loading ? 'Verifying...' : 'Login'}
            onPress={handleLogin}
            loading={loading}
            disabled={!dbReady || loading}
            fullWidth
            style={{ marginTop: Spacing.sm }}
          />
        </View>

        {/* Security Notice */}
        <View style={[styles.notice, { borderColor: colors.border }]}>
          <MaterialIcons name="lock" size={14} color={colors.textMuted} />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            All data encrypted · Offline first · Login events audited
          </Text>
        </View>

        {/* Badge */}
        <View style={[styles.badgeRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.badgeLabel, { color: colors.textMuted }]}>Institution</Text>
          <Text style={[styles.badgeValue, { color: colors.textSecondary }]}>
            {AppConfig.BADGE_NAME} · {AppConfig.BADGE_DEPT}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    includeFontPadding: false,
  },
  tagline: {
    fontSize: FontSize.sm,
    marginTop: 4,
    textAlign: 'center',
    includeFontPadding: false,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
    includeFontPadding: false,
  },
  hint: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.lg,
    includeFontPadding: false,
  },
  dbLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  dbLoadingText: {
    fontSize: FontSize.sm,
    includeFontPadding: false,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    marginBottom: Spacing.sm,
  },
  noticeText: {
    fontSize: FontSize.xs,
    includeFontPadding: false,
  },
  badgeRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: 2,
  },
  badgeLabel: {
    fontSize: FontSize.xs,
    includeFontPadding: false,
  },
  badgeValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    includeFontPadding: false,
  },
});
