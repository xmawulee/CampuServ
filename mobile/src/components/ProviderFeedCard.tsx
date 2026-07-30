import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import RatingBadge from './RatingBadge';
import { ProviderResponse, toggleSaveListing } from '../services/userService';
import { BASE_URL } from '../services/api';

interface ProviderFeedCardProps {
  provider: ProviderResponse;
  onPress: () => void;
  onSaveToggle?: (saved: boolean) => void;
}

const ProviderFeedCard = React.memo(function ProviderFeedCard({ provider, onPress, onSaveToggle }: ProviderFeedCardProps) {
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
            <Ionicons name="briefcase-outline" size={40} color="#94A3B8" />
          </View>
        )}

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
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
            <ActivityIndicator size="small" color="#0056D2" />
          ) : (
            <Ionicons 
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={20} 
              color={isSaved ? "#0056D2" : "#64748B"} 
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{provider.fullName}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>Contact for quote</Text>
          </View>
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
                  <Ionicons name="pricetag-outline" size={10} color="#0056D2" style={{ marginRight: 4 }} />
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

        {/* Footer Metrics */}
        <View style={styles.footerRow}>
          <View style={styles.metricItem}>
            <Ionicons name="eye-outline" size={14} color="#64748B" />
            <Text style={styles.metricText}>{provider.viewCount || 0} views</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.metricText}>{provider.location || 'Campus Area'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
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
    borderColor: '#F1F5F9',
  },
  imageContainer: {
    height: 140,
    width: '100%',
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#E2E8F0',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    color: '#0F172A',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  priceContainer: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0056D2',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bullet: {
    marginHorizontal: 6,
    color: '#94A3B8',
    fontSize: 12,
  },
  completedJobsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  bio: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#475569',
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
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
    textTransform: 'capitalize',
  },
  tagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 120,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#334155',
  },
  tagPillMore: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagTextMore: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#475569',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
});

export default ProviderFeedCard;
