import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  noPad?: boolean;
};

export function AppCard({ children, style, elevated = false, noPad = false }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.bgElevated : colors.bgCard,
          borderColor: colors.border,
        },
        noPad && { padding: 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
});
