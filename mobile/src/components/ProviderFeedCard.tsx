import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
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
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Hero Image / Banner */}
      <View style={styles.imageContainer}>
        {heroUrl ? (
          <Image source={{ uri: heroUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderBanner}>
            <Ionicons name="briefcase-outline" size={36} color={colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>No photo preview</Text>
          </View>
        )}

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
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
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={20} 
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
                  <Ionicons name="pricetag-outline" size={10} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.categoryBadgeText} numberOfLines={1}>Category: {trimmedCat}</Text>
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
      <View style={[styles.footerRow, { backgroundColor: colors.primaryLight }]}>
        <View style={styles.metricItem}>
          <Ionicons name="eye-outline" size={14} color={colors.primary} />
          <Text style={[styles.metricText, { color: colors.primary }]}>{provider.viewCount || 0} views</Text>
        </View>
        <View style={styles.metricItem}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={[styles.metricText, { color: colors.primary }]}>{provider.location || 'Campus Area'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    height: 150,
    width: '100%',
    backgroundColor: colors.background,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.background,
    gap: 6,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
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
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  priceContainer: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bullet: {
    marginHorizontal: 6,
    color: colors.textMuted,
    fontSize: 12,
  },
  completedJobsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  bio: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    marginTop: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  tagPill: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
});

export default ProviderFeedCard;
