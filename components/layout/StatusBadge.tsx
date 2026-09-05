import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AppConfig } from '@/constants/config';
import { Radius, FontSize, Spacing, FontWeight } from '@/constants/theme';

export function StatusBadge() {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <MaterialIcons name="account-circle" size={28} color={colors.primary} />
      <View style={styles.text}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{AppConfig.BADGE_NAME}</Text>
        <Text style={[styles.dept, { color: colors.primary }]}>{AppConfig.BADGE_DEPT}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  text: {},
  name: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    includeFontPadding: false,
  },
  dept: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    includeFontPadding: false,
  },
});
