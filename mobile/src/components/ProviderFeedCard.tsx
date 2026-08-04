import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomIonicons as Ionicons } from './CustomIcons';
import RatingBadge from './RatingBadge';
import { ProviderResponse, toggleSaveListing } from '../services/userService';
import { BASE_URL } from '../services/api';
import { useTheme } from '../styles/ThemeContext';

interface ProviderFeedCardProps {
  provider: ProviderResponse;
  onPress: () => void;
  onSaveToggle?: (saved: boolean) => void;
}

const ProviderFeedCard = React.memo(function ProviderFeedCard({ provider, onPress, onSaveToggle }: ProviderFeedCardProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [isSaved, setIsSaved] = useState<boolean>(!!provider.isSaved);
  const [loadingSave, setLoadingSave] = useState<boolean>(false);

  const handleToggleSave = async (e: any) => {
    e.stopPropagation();
    if (loadingSave) return;

    const providerId = provider.id || provider.providerId;
    if (!providerId) return;

    const prevSaved = isSaved;
    const nextSaved = !prevSaved;

    // Optimistic UI update
    setIsSaved(nextSaved);
    if (onSaveToggle) onSaveToggle(nextSaved);
    setLoadingSave(true);

    try {
      await toggleSaveListing(providerId);
    } catch (error) {
      // Revert on failure
      setIsSaved(prevSaved);
      if (onSaveToggle) onSaveToggle(prevSaved);
    } finally {
      setLoadingSave(false);
    }
  };

  const getFullImageUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('data:')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const rawHeroUrl = provider.heroImageUrl || provider.portfolio?.[0];
  const heroUrl = getFullImageUrl(rawHeroUrl);

  const getInitials = (name?: string) => {
    if (!name) return 'CS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      {/* Hero Image / Premium Gradient Banner */}
      <View style={styles.imageContainer}>
        {heroUrl ? (
          <Image source={{ uri: heroUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={isDark ? ['#2E1A12', '#1C120C'] : ['#FFF5F0', '#FFEAE0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.placeholderBanner}
          >
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{getInitials(provider.fullName)}</Text>
            </View>
            <View style={styles.bannerWatermark}>
              <Ionicons name="sparkles" size={64} color={isDark ? 'rgba(255, 107, 53, 0.08)' : 'rgba(255, 107, 53, 0.12)'} />
            </View>
          </LinearGradient>
        )}

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
          <Text style={styles.statusBadgeText}>Verified Pro</Text>
        </View>

        {/* Save Toggle Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleToggleSave}
          disabled={loadingSave}
          activeOpacity={0.7}
        >
          {loadingSave ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? colors.primary : colors.textMuted}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{provider.fullName}</Text>
        </View>

        {/* Rating and Completed Jobs */}
        <View style={styles.ratingRow}>
          <RatingBadge rating={provider.rating || 0} reviewCount={provider.completedJobsCount} size="small" />
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.completedJobsText}>{provider.completedJobsCount || 0} completed jobs</Text>
        </View>

        {/* Service Categories Tags */}
        {!!provider.serviceCategory && (
          <View style={styles.categoriesContainer}>
            {provider.serviceCategory.split(',').map((cat, index) => {
              const trimmedCat = cat.trim();
              if (!trimmedCat) return null;
              return (
                <View key={index} style={styles.categoryBadge}>
                  <Ionicons name="pricetag-outline" size={11} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.categoryBadgeText} numberOfLines={1}>{trimmedCat}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Bio / Description */}
        {!!provider.bio && (
          <Text style={styles.bio} numberOfLines={2}>{provider.bio}</Text>
        )}

        {/* Key Services Tags */}
        {provider.keyServices && provider.keyServices.length > 0 && (
          <View style={styles.tagsContainer}>
            {provider.keyServices.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tagPill}>
                <Text style={styles.tagText} numberOfLines={1}>{tag}</Text>
              </View>
            ))}
            {provider.keyServices.length > 3 && (
              <View style={styles.tagPillMore}>
                <Text style={styles.tagTextMore}>+{provider.keyServices.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Footer Metrics */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeftMetrics}>
          <View style={styles.metricItem}>
            <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metricText}>{provider.viewCount || 0} views</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metricText}>{provider.location || 'Campus Area'}</Text>
          </View>
        </View>

        <View style={styles.viewProfileCta}>
          <Text style={styles.viewProfileText}>View Profile</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    height: 135,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBanner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  initialsCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  initialsText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  bannerWatermark: {
    position: 'absolute',
    right: 12,
    bottom: -10,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bullet: {
    marginHorizontal: 6,
    color: colors.textMuted,
    fontSize: 12,
  },
  completedJobsText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  bio: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderColor: isDark ? 'rgba(255, 107, 53, 0.2)' : '#FDECE4',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  tagPill: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 130,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tagPillMore: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagTextMore: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  footerLeftMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  viewProfileCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default ProviderFeedCard;
