import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import { useTheme } from '../styles/ThemeContext';
import { getCategoryStyles, CategoryIcon } from '../utils/categoryIcons';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

function getRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

interface RequestCardProps {
  request: any;
  variant: 'active' | 'completed' | 'cancelled';
  onPress: () => void;
  onRateTask?: () => void;
  onAccept?: (id: string, providerName: string) => void;
  onDecline?: (id: string, providerName: string, mode: string) => void;
  onCancel?: (id: string, status: string, providerName: string) => void;
  isCancelling?: boolean;
  isResponding?: boolean;
}

export default function RequestCard({ 
  request, variant, onPress, onRateTask, 
  onAccept, onDecline, onCancel, isCancelling, isResponding 
}: RequestCardProps) {
  const { colors, isDark } = useTheme();
  const catName = request.category?.name || '';
  const catStyle = getCategoryStyles(catName);
  const { accessToken } = useAuthStore();

  const isCancellable =
    request.status === 'PENDING' ||
    request.status === 'ACCEPTED' ||
    request.status === 'IN_PROGRESS';

  const providerName =
    request.targetProvider?.name ||
    request.counterOffer?.providerName ||
    'Provider';

  const [clientRating, setClientRating] = useState<number | null>(null);

  useEffect(() => {
    if (variant === 'completed' && accessToken) {
      // Try to fetch review rating
      api.get(`/supporting-service/reviews/job/${request.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      .then(res => {
        if (res.data && res.data.rating) {
          setClientRating(res.data.rating);
        }
      })
      .catch(e => {
        // Normal 404 if unrated
      });
    }
  }, [variant, request.id, accessToken]);

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' }; // Orange-ish for awaiting bids
      case 'ACCEPTED':
        return { bg: 'rgba(115, 110, 105, 0.15)', text: '#736E69' }; // Secondary neutral (Ironside Gray)
      case 'IN_PROGRESS':
        return { bg: colors.primaryLight, text: colors.primary }; // Accent Orange (active state)
      case 'COMPLETED':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' }; // Green
      case 'CANCELLED':
      default:
        return { bg: 'rgba(100, 116, 139, 0.15)', text: colors.textMuted }; // Grey
    }
  };

  const statusCol = getStatusColors(request.status);
  
  // Format specific display text based on status
  let statusText = request.status;
  if (statusText === 'PENDING') statusText = 'AWAITING BIDS';
  if (statusText === 'ACCEPTED') statusText = 'PROVIDER ASSIGNED';

  // Handle cancelled opacity
  const cardOpacity = variant === 'cancelled' ? 0.85 : 1;

  // Render Provider Mini-Row
  const renderProviderRow = (provider: any) => {
    if (!provider) return null;
    return (
      <View style={styles.providerRow}>
        {provider.providerAvatar ? (
          <Image source={{ uri: provider.providerAvatar }} style={styles.providerAvatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
            <Ionicons name="person" size={14} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.providerInfo}>
          <Text style={[styles.providerName, { color: colors.text }]}>{provider.providerName}</Text>
          <View style={styles.ratingWrap}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={[styles.ratingText, { color: colors.textMuted }]}>
              {(provider.providerCompletedJobs > 0 || provider.providerTotalReviews > 0)
                ? `${Number(provider.providerRating || 0).toFixed(1)} per ${provider.providerCompletedJobs || provider.providerTotalReviews} jobs done`
                : 'New provider'}
            </Text>
          </View>
        </View>
        {(variant === 'active') && (
          <TouchableOpacity style={styles.messageIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.card, 
        { 
          backgroundColor: colors.cardBackground, 
          borderColor: isDark ? colors.border : '#E2E8F0',
          opacity: cardOpacity 
        }
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {/* Top Row */}
      <View style={styles.topRow}>
        <View style={styles.categoryWrap}>
          <View style={[styles.iconBg, { backgroundColor: catStyle.bg }]}>
            <CategoryIcon name={catName} size={16} color={catStyle.iconColor} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {request.title}
          </Text>
          {request.serviceMode === 'REMOTE' && (
            <View style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 }}>
              <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Remote</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCol.bg }]}>
          <Text style={[styles.statusText, { color: statusCol.text }]}>
            {statusText}
          </Text>
        </View>
      </View>

      {/* Middle Row */}
      <View style={styles.middleRow}>
        {/* Active Tab Elements */}
        {variant === 'active' && request.status === 'PENDING' && (
          <Text style={[styles.bidCount, { color: colors.primary }]}>
            {request.bidCount || 0} {(request.bidCount === 1) ? 'bid received' : 'bids received'}
          </Text>
        )}

        {variant === 'active' && (request.status === 'ACCEPTED' || request.status === 'IN_PROGRESS') && (
          <>
            {renderProviderRow(request.acceptedOffer)}
            {request.status === 'IN_PROGRESS' && (
              <View style={styles.progressWrap}>
                <View style={[styles.progressBar, { backgroundColor: colors.primary }]} />
                <Text style={[styles.progressText, { color: colors.primary }]}>Job in progress...</Text>
              </View>
            )}
            {request.escrowHeld && (
              <View style={styles.escrowWrap}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text style={styles.escrowText}>Payment secured</Text>
              </View>
            )}
          </>
        )}

        {/* Completed Tab Elements */}
        {variant === 'completed' && request.acceptedOffer && (
          <>
            {renderProviderRow(request.acceptedOffer)}
            {clientRating ? (
              <Text style={[styles.clientRatingText, { color: colors.textMuted }]}>
                You rated: {'★'.repeat(clientRating)}{'☆'.repeat(5 - clientRating)}
              </Text>
            ) : (
              <TouchableOpacity onPress={onRateTask} style={[styles.rateButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.rateButtonText}>Rate this task</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Cancelled Tab Elements */}
        {variant === 'cancelled' && request.cancellationReason && (
          <Text style={[styles.cancelReasonText, { color: '#EF4444' }]} numberOfLines={2}>
            Cancelled: {request.cancellationReason}
          </Text>
        )}

        {/* Counter Offer Sub-card */}
        {variant === 'active' && request.status === 'PENDING' && request.counterOffer && (
          <View style={styles.counterCard}>
            <Text style={styles.counterText}>
              {request.counterOffer.providerName} proposed ₵{request.counterOffer.amount}
            </Text>
            <View style={styles.counterButtons}>
              <TouchableOpacity
                style={[styles.acceptButton, isResponding && styles.disabledBtn]}
                disabled={isResponding || isCancelling}
                onPress={() => onAccept && onAccept(request.id, request.counterOffer.providerName)}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.acceptBtnText}>Accept</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineButton, isResponding && styles.disabledBtn]}
                disabled={isResponding || isCancelling}
                onPress={() => onDecline && onDecline(request.id, request.counterOffer.providerName, request.deliveryMode)}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Cancel Link */}
        {isCancellable && (
          <View style={styles.cancelWrap}>
            {isCancelling ? (
              <ActivityIndicator size="small" color="#D32F2F" />
            ) : (
              <TouchableOpacity onPress={() => onCancel && onCancel(request.id, request.status, providerName)}>
                <Text style={styles.cancelText}>Cancel Request</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        <View style={styles.priceWrap}>
          {request.acceptedOffer ? (
            <>
              <Text style={[styles.priceText, { color: colors.text, textDecorationLine: 'line-through', opacity: 0.5, marginRight: 6 }]}>
                ₵{request.budgetMax || request.budgetMin}
              </Text>
              <Text style={[styles.priceText, { color: colors.text, fontWeight: '700' }]}>
                ₵{request.acceptedOffer.amount}
              </Text>
            </>
          ) : (
            <Text style={[styles.priceText, { color: colors.text, fontWeight: '700' }]}>
              ₵{request.budgetMin}
              {request.budgetMax && request.budgetMax !== request.budgetMin ? ` – ₵${request.budgetMax}` : ''}
            </Text>
          )}
        </View>
        <View style={styles.timeWrap}>
          {variant === 'completed' && request.status === 'COMPLETED' && !request.isReviewed && request.jobCompletedAt && (
            new Date().getTime() - new Date(request.jobCompletedAt).getTime() < 7 * 24 * 60 * 60 * 1000
          ) && (
            <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2', marginRight: 8 }]}>
              <Text style={[styles.statusText, { color: '#EF4444' }]}>Awaiting Review</Text>
            </View>
          )}
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {variant === 'completed' ? 'Completed ' : 'Posted '}
            {getRelativeTime(request.createdAt)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </View>
      </View>
    </TouchableOpacity>
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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
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
    marginRight: 8,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  middleRow: {
    marginBottom: 12,
  },
  bidCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  messageIcon: {
    padding: 6,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressBar: {
    height: 4,
    width: 40,
    borderRadius: 2,
    marginRight: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  escrowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  escrowText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  clientRatingText: {
    fontSize: 12,
    marginTop: 4,
  },
  rateButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rateButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelReasonText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 15,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
  },
  counterCard: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  counterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  cancelWrap: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  cancelText: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
