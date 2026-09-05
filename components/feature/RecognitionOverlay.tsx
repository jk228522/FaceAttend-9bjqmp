import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

type Props = {
  countdown: number;
  status: 'scanning' | 'recognized' | 'not_recognized' | 'processing';
  recognizedName?: string;
  score?: number;
};

export function RecognitionOverlay({ countdown, status, recognizedName, score }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (status === 'scanning') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const ringColor =
    status === 'recognized' ? Colors.success :
    status === 'not_recognized' ? Colors.error :
    Colors.primary;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Scan Ring */}
      <Animated.View
        style={[
          styles.scanRing,
          {
            borderColor: ringColor,
            shadowColor: ringColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
      </Animated.View>

      {/* Countdown */}
      {status === 'scanning' ? (
        <View style={styles.countdownContainer}>
          <Text style={[styles.countdown, { color: countdown <= 3 ? Colors.error : Colors.primary }]}>
            {countdown}
          </Text>
          <Text style={styles.countdownLabel}>seconds</Text>
        </View>
      ) : null}

      {/* Status Message */}
      <View style={styles.statusContainer}>
        {status === 'processing' ? (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(245,166,35,0.15)', borderColor: Colors.primary }]}>
            <Text style={[styles.statusText, { color: Colors.primary }]}>Processing...</Text>
          </View>
        ) : status === 'recognized' ? (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(76,175,80,0.2)', borderColor: Colors.success }]}>
            <MaterialIcons name="check-circle" size={18} color={Colors.success} />
            <Text style={[styles.statusText, { color: Colors.success }]}>{recognizedName}</Text>
            {score ? (
              <Text style={[styles.scoreText, { color: Colors.success }]}>
                {(score * 100).toFixed(1)}%
              </Text>
            ) : null}
          </View>
        ) : status === 'not_recognized' ? (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(244,67,54,0.2)', borderColor: Colors.error }]}>
            <MaterialIcons name="cancel" size={18} color={Colors.error} />
            <Text style={[styles.statusText, { color: Colors.error }]}>Face Not Recognized</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: Colors.primary }]}>
            <Text style={[styles.statusText, { color: Colors.primary }]}>Scanning... Position your face</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const RING_SIZE = 240;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute', top: -3, left: -3,
    width: 28, height: 28,
    borderTopWidth: 4, borderLeftWidth: 4,
    borderColor: Colors.primary,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: 'absolute', top: -3, right: -3,
    width: 28, height: 28,
    borderTopWidth: 4, borderRightWidth: 4,
    borderColor: Colors.primary,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: 'absolute', bottom: -3, left: -3,
    width: 28, height: 28,
    borderBottomWidth: 4, borderLeftWidth: 4,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: 'absolute', bottom: -3, right: -3,
    width: 28, height: 28,
    borderBottomWidth: 4, borderRightWidth: 4,
    borderColor: Colors.primary,
    borderBottomRightRadius: 8,
  },
  countdownContainer: {
    position: 'absolute',
    top: '15%',
    alignItems: 'center',
  },
  countdown: {
    fontSize: 64,
    fontWeight: FontWeight.bold,
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    includeFontPadding: false,
  },
  statusContainer: {
    position: 'absolute',
    bottom: '12%',
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
  },
  statusText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    includeFontPadding: false,
  },
  scoreText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    includeFontPadding: false,
    opacity: 0.8,
  },
});
