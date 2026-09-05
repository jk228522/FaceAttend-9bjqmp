import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Radius, FontSize, Spacing, FontWeight } from '@/constants/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  secureToggle?: boolean;
};

export function AppInput({ label, error, secureToggle, secureTextEntry, style, ...props }: Props) {
  const { colors } = useTheme();
  const [secure, setSecure] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: colors.bgInput,
          borderColor: error ? colors.error : colors.border,
        },
      ]}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure}
          accessibilityLabel={label}
          {...props}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setSecure((s) => !s)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={secure ? 'Show password' : 'Hide password'}
          >
            <MaterialIcons
              name={secure ? 'visibility-off' : 'visibility'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>
          <MaterialIcons name="error-outline" size={12} /> {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: 6,
    includeFontPadding: false,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    paddingVertical: Spacing.sm,
    includeFontPadding: false,
  },
  errorText: {
    fontSize: FontSize.xs,
    marginTop: 4,
    includeFontPadding: false,
  },
});
