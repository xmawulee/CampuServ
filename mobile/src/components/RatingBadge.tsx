import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';

interface RatingBadgeProps {
  rating: number;
  reviewCount?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
}

export default function RatingBadge({
  rating,
  reviewCount,
  size = 'small',
  color = '#FFB800',
  textColor,
}: RatingBadgeProps) {
  const iconSize = size === 'small' ? 12 : size === 'medium' ? 16 : 20;
  const fontSize = size === 'small' ? 12 : size === 'medium' ? 14 : 18;

  if (rating === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noRatingText, { fontSize: fontSize - 1, color: textColor }]}>
          New
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="star" size={iconSize} color={color} />
      <Text style={[styles.ratingText, { fontSize, color: textColor }]}>
        {rating.toFixed(1)}
      </Text>
      {reviewCount !== undefined && reviewCount > 0 && (
        <Text style={[styles.reviewCountText, { fontSize: fontSize - 2, color: textColor }]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Inter-Medium',
  },
  reviewCountText: {
    fontFamily: 'Inter-Regular',
    opacity: 0.7,
  },
  noRatingText: {
    fontFamily: 'Inter-Medium',
    opacity: 0.7,
  },
});
