import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import { ProviderResponse, toggleSaveListing } from '../services/userService';
import { BASE_URL } from '../services/api';

interface ProviderGridCardProps {
  provider: ProviderResponse;
  onPress: () => void;
  onSaveToggle?: (saved: boolean) => void;
}

const { width } = Dimensions.get('window');
// Padding: 16px on left/right edges, 12px gap in middle = (width - 32 - 12) / 2
const CARD_WIDTH = (width - 44) / 2;

const ProviderGridCard = React.memo(function ProviderGridCard({ provider, onPress, onSaveToggle }: ProviderGridCardProps) {
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
            <Ionicons name="briefcase-outline" size={28} color="#94A3B8" />
          </View>
        )}

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={10} color="#10B981" />
          <Text style={styles.statusBadgeText}>Verified</Text>
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
              size={16} 
              color={isSaved ? "#0056D2" : "#64748B"} 
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{provider.fullName}</Text>

        {/* Rating and Completed Jobs */}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.ratingText}>
            {provider.rating ? provider.rating.toFixed(1) : '0.0'} ({provider.completedJobsCount || 0})
          </Text>
        </View>

        {/* Price */}
        <Text style={styles.priceText} numberOfLines={1}>
          Contact for quote
        </Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color="#64748B" />
          <Text style={styles.locationText} numberOfLines={1}>
            {provider.location || 'Campus'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: CARD_WIDTH,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    height: 100,
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
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0F172A',
  },
  saveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0056D2',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
});

export default ProviderGridCard;
