import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../styles/ThemeContext';

export default function RequestCardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Top Row */}
      <View style={styles.topRow}>
        <View style={styles.categoryWrap}>
          <View style={[styles.iconSkeleton, { backgroundColor: colors.border }]} />
          <View style={[styles.titleSkeleton, { backgroundColor: colors.border }]} />
        </View>
        <View style={[styles.statusSkeleton, { backgroundColor: colors.border }]} />
      </View>

      {/* Middle Row */}
      <View style={[styles.descSkeleton, { backgroundColor: colors.border }]} />
      <View style={[styles.descSkeleton, { backgroundColor: colors.border, width: '70%' }]} />

      {/* Provider Mini Row Skeleton */}
      <View style={styles.providerRow}>
        <View style={[styles.avatarSkeleton, { backgroundColor: colors.border }]} />
        <View style={[styles.providerTextSkeleton, { backgroundColor: colors.border }]} />
      </View>

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        <View style={[styles.budgetSkeleton, { backgroundColor: colors.border }]} />
        <View style={[styles.timeSkeleton, { backgroundColor: colors.border }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconSkeleton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    opacity: 0.5,
  },
  titleSkeleton: {
    height: 16,
    width: '60%',
    borderRadius: 4,
    opacity: 0.5,
  },
  statusSkeleton: {
    width: 80,
    height: 24,
    borderRadius: 12,
    opacity: 0.5,
  },
  descSkeleton: {
    height: 12,
    width: '100%',
    borderRadius: 4,
    marginBottom: 8,
    opacity: 0.5,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  avatarSkeleton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    opacity: 0.5,
  },
  providerTextSkeleton: {
    height: 14,
    width: '40%',
    borderRadius: 4,
    opacity: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  budgetSkeleton: {
    height: 14,
    width: 60,
    borderRadius: 4,
    opacity: 0.5,
  },
  timeSkeleton: {
    height: 12,
    width: 80,
    borderRadius: 4,
    opacity: 0.5,
  },
});
