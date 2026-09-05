// Home Screen
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

type MenuItem = {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: string;
  requiresAuth: boolean;
  danger?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', route: '/dashboard', requiresAuth: true },
  { id: 'persons', label: 'Add New Person', icon: 'person-add', route: '/persons', requiresAuth: true },
  { id: 'export', label: 'Export Attendance', icon: 'picture-as-pdf', route: '/export', requiresAuth: true },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings', requiresAuth: true },
  { id: 'logout', label: 'Logout', icon: 'logout', route: '', requiresAuth: true, danger: true },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLoggedIn, username, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [menuVisible, setMenuVisible] = useState(false);
  const startScaleAnim = useRef(new Animated.Value(1)).current;
  const startGlowAnim = useRef(new Animated.Value(0)).current;

  const handleStartPress = useCallback(() => {
    if (!isLoggedIn) {
      showAlert('Login Required', 'Please login first to take attendance');
      return;
    }
    Animated.sequence([
      Animated.parallel([
        Animated.timing(startScaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
        Animated.timing(startGlowAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(startScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(startGlowAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    ]).start(() => {
      router.push('/camera');
    });
  }, [isLoggedIn, router]);

  const handleMenuItem = useCallback((item: MenuItem) => {
    setMenuVisible(false);
    if (item.id === 'logout') {
      showAlert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => {
          logout();
          router.replace('/');
        }},
      ]);
      return;
    }
    if (item.requiresAuth && !isLoggedIn) {
      showAlert('Login Required', 'Please login to access this feature');
      return;
    }
    router.push(item.route as any);
  }, [isLoggedIn, logout, router]);

  const glowOpacity = startGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        {isLoggedIn ? (
          <StatusBadge />
        ) : (
          <Pressable
            onPress={() => router.push('/')}
            style={[styles.loginBadge, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          >
            <MaterialIcons name="login" size={18} color={colors.primary} />
            <Text style={[styles.loginBadgeText, { color: colors.textSecondary }]}>Login to continue</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => setMenuVisible(true)}
          style={[styles.menuBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Open menu"
        >
          <MaterialIcons name="more-vert" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Center Content */}
      <View style={styles.center}>
        <Text style={[styles.greeting, { color: colors.textMuted }]}>
          {isLoggedIn ? `Welcome, ${username ?? 'Admin'}` : 'Offline · Face Recognition'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isLoggedIn ? 'Tap START to take attendance' : 'Login to start taking attendance'}
        </Text>

        {/* START Button */}
        <Animated.View
          style={[
            styles.startGlow,
            { backgroundColor: colors.scanGlow, opacity: glowOpacity },
          ]}
        />
        <Animated.View style={[styles.startOuter, { transform: [{ scale: startScaleAnim }] }]}>
          <Pressable
            onPress={handleStartPress}
            style={[
              styles.startBtn,
              { backgroundColor: isLoggedIn ? colors.primary : colors.bgElevated,
                borderColor: isLoggedIn ? colors.primaryLight : colors.border },
            ]}
            accessibilityLabel="Start attendance"
            accessibilityRole="button"
          >
            <MaterialIcons
              name="camera-front"
              size={52}
              color={isLoggedIn ? colors.textOnPrimary : colors.textMuted}
            />
            <Text style={[
              styles.startText,
              { color: isLoggedIn ? colors.textOnPrimary : colors.textMuted },
            ]}>
              START
            </Text>
          </Pressable>
        </Animated.View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <MaterialIcons name="wifi-off" size={16} color={colors.success} />
            <Text style={[styles.statText, { color: colors.success }]}>Offline Ready</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <MaterialIcons name="security" size={16} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.primary }]}>Encrypted DB</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {AppConfig_Footer}
        </Text>
      </View>

      {/* Three-dot Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[
            styles.menuDropdown,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleMenuItem(item)}
                style={({ pressed }) => [
                  styles.menuItem,
                  { borderBottomColor: colors.border },
                  pressed && { backgroundColor: colors.bgElevated },
                ]}
                accessibilityLabel={item.label}
              >
                <MaterialIcons
                  name={item.icon}
                  size={20}
                  color={item.danger ? colors.error : (item.requiresAuth && !isLoggedIn ? colors.textMuted : colors.textPrimary)}
                />
                <Text style={[
                  styles.menuItemText,
                  {
                    color: item.danger ? colors.error :
                           (item.requiresAuth && !isLoggedIn ? colors.textMuted : colors.textPrimary)
                  },
                ]}>
                  {item.label}
                </Text>
                {item.requiresAuth && !isLoggedIn ? (
                  <MaterialIcons name="lock" size={14} color={colors.textMuted} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const AppConfig_Footer = 'FaceAttend v1.0 · Offline Face Recognition';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  loginBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  loginBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    includeFontPadding: false,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: 4,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    includeFontPadding: false,
  },
  startGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  startOuter: {
    width: 180,
    height: 180,
    marginBottom: Spacing.xl,
  },
  startBtn: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  startText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 3,
    includeFontPadding: false,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.round,
    borderWidth: 1,
  },
  statText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    includeFontPadding: false,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.xs,
    includeFontPadding: false,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: Spacing.lg,
  },
  menuDropdown: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 220,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  menuItemText: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    includeFontPadding: false,
  },
});
