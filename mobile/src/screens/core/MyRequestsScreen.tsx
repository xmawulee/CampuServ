import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import StatusDialog from '../../components/StatusDialog';
import {
  getMyRequests,
  cancelRequest,
  acceptCounterOffer,
  declineCounterOffer,
} from '../../services/requestService';
import { stompClient } from '../../services/socket';
import RequestCard from '../../components/RequestCard';
import RequestCardSkeleton from '../../components/RequestCardSkeleton';
import { useToast } from '../../styles/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function MyRequestsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user, accessToken } = useAuthStore();
  const insets = useSafeAreaInsets();

  // Tab State
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [requestsByTab, setRequestsByTab] = useState<{
    active: any[];
    completed: any[];
    cancelled: any[];
  }>({
    active: [],
    completed: [],
    cancelled: [],
  });

  const [counts, setCounts] = useState({ active: 0, completed: 0, cancelled: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasMore, setHasMore] = useState({
    active: false,
    completed: false,
    cancelled: false,
  });
  const [pageByTab, setPageByTab] = useState({
    active: 0,
    completed: 0,
    cancelled: 0,
  });

  // Per-card loading states using Sets of Request IDs
  const [cancellingRequestIds, setCancellingRequestIds] = useState<Set<string>>(new Set());
  const [respondingToOfferRequestIds, setRespondingToOfferRequestIds] = useState<Set<string>>(new Set());

  // Toast
  const { showToast } = useToast();

  // Dialog state — one dialog at a time
  type DialogConfig = {
    visible: boolean;
    status: 'warning' | 'error' | 'info' | 'success' | 'cta';
    headerLabel: string;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  };
  const [dialog, setDialog] = useState<DialogConfig>({
    visible: false,
    status: 'warning',
    headerLabel: '',
    title: '',
    description: '',
    confirmLabel: 'OK',
    onConfirm: () => {},
  });
  const closeDialog = () => setDialog(prev => ({ ...prev, visible: false }));

  // API load function
  const loadRequests = useCallback(
    async (tab: 'active' | 'completed' | 'cancelled', isInitialOrRefresh = false) => {
      if (!accessToken) return;

      const targetPage = isInitialOrRefresh ? 0 : pageByTab[tab];

      if (isInitialOrRefresh) {
        if (!isRefreshing) setIsLoading(true);
      } else {
        if (isFetchingNextPage || !hasMore[tab]) return;
        setIsFetchingNextPage(true);
      }

      try {
        const data = await getMyRequests(tab, targetPage, accessToken);

        setRequestsByTab(prev => {
          const currentList = prev[tab];
          const newList = isInitialOrRefresh ? data.requests : [...currentList, ...data.requests];
          return {
            ...prev,
            [tab]: newList,
          };
        });

        setCounts(data.counts);
        setHasMore(prev => ({
          ...prev,
          [tab]: data.hasMore,
        }));
        setPageByTab(prev => ({
          ...prev,
          [tab]: data.nextPage !== null ? data.nextPage : prev[tab],
        }));
      } catch (error: any) {
        console.warn('Error fetching requests:', error);
        showToast({ status: 'error', title: 'Load Failed', subtitle: error.message || 'Failed to fetch requests.' });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetchingNextPage(false);
      }
    },
    [accessToken, pageByTab, hasMore, isFetchingNextPage, isRefreshing]
  );

  // Trigger load when activeTab changes
  useEffect(() => {
    loadRequests(activeTab, true);
  }, [activeTab]);

  const loadRequestsRef = useRef(loadRequests);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    loadRequestsRef.current = loadRequests;
  }, [loadRequests]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Focus re-fetch & WebSocket connection hook
  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      loadRequestsRef.current(activeTabRef.current, true);

      // WebSocket live subscription
      let subId = '';
      try {
        stompClient.connect(accessToken);
        const destination = `/topic/client/${user?.id}/requests`;
        subId = stompClient.subscribe(destination, (message: any) => {
          console.log('WS Live Update: Received request status change:', message);
          // Refresh current tab data
          loadRequestsRef.current(activeTabRef.current, true);
        });
      } catch (wsError) {
        // Fallback to focus fetch without crashing
        console.warn('WS: Failed to connect or subscribe', wsError);
      }

      return () => {
        if (subId) {
          try {
            stompClient.unsubscribe(subId);
          } catch (e) {
            console.warn('WS: Failed to unsubscribe', e);
          }
        }
      };
    }, [user?.id, accessToken])
  );

  // Pull-to-refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRequests(activeTab, true);
  };

  // Pagination trigger
  const handleLoadMore = () => {
    if (hasMore[activeTab] && !isFetchingNextPage && !isLoading) {
      loadRequests(activeTab, false);
    }
  };

  // Cancel Request Flow
  const handleCancel = (requestId: string, currentStatus: string, providerName?: string) => {
    const isPending = currentStatus === 'PENDING';
    const description = isPending
      ? "This request hasn't been accepted yet. You can cancel it anytime."
      : `${providerName || 'The provider'} has already accepted this request. Cancelling now may affect their schedule. Are you sure?`;

    setDialog({
      visible: true,
      status: 'warning',
      headerLabel: 'Cancel Request',
      title: 'Cancel this request?',
      description,
      confirmLabel: isPending ? 'Cancel Request' : 'Cancel Anyway',
      cancelLabel: 'Keep Request',
      destructive: true,
      onConfirm: async () => {
        closeDialog();
        if (!accessToken) return;
        setCancellingRequestIds(prev => {
          const next = new Set(prev);
          next.add(requestId);
          return next;
        });
        try {
          await cancelRequest(requestId, accessToken);
          showToast({ status: 'info', title: 'Request cancelled.' });
          loadRequests(activeTab, true);
        } catch (error: any) {
          console.warn('Cancel Request Failed:', error);
          if (error.status === 409) {
            setDialog({
              visible: true,
              status: 'error',
              headerLabel: "Can't Cancel",
              title: "Can't Cancel",
              description: 'This request has already been completed and can no longer be cancelled.',
              confirmLabel: 'OK',
              onConfirm: () => { closeDialog(); loadRequests(activeTab, true); },
            });
          } else if (error.status === 401) {
            setDialog({
              visible: true,
              status: 'error',
              headerLabel: 'Session Expired',
              title: 'Session Expired',
              description: 'Please sign in again.',
              confirmLabel: 'Sign In',
              onConfirm: () => { closeDialog(); navigation.navigate('Auth'); },
            });
          } else {
            setDialog({
              visible: true,
              status: 'error',
              headerLabel: "Couldn't Cancel",
              title: "Couldn't Cancel",
              description: 'Something went wrong. Please check your connection and try again.',
              confirmLabel: 'OK',
              onConfirm: closeDialog,
            });
          }
        } finally {
          setCancellingRequestIds(prev => {
            const next = new Set(prev);
            next.delete(requestId);
            return next;
          });
        }
      },
    });
  };

  // Accept Counter Offer
  const handleAcceptOffer = async (requestId: string, providerName: string) => {
    if (!accessToken) return;

    setRespondingToOfferRequestIds(prev => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });

    try {
      await acceptCounterOffer(requestId, accessToken);
      showToast({ status: 'success', title: `Offer accepted!`, subtitle: `${providerName} will be in touch.` });
      loadRequests(activeTab, true);
    } catch (error: any) {
      console.warn('Accept Offer Failed:', error);
      if (error.status === 409) {
        setDialog({
          visible: true,
          status: 'error',
          headerLabel: 'Offer Unavailable',
          title: 'Offer No Longer Available',
          description: 'This offer is no longer valid. Refreshing your request.',
          confirmLabel: 'OK',
          onConfirm: () => { closeDialog(); loadRequests(activeTab, true); },
        });
      } else if (error.status === 401) {
        setDialog({
          visible: true,
          status: 'error',
          headerLabel: 'Session Expired',
          title: 'Session Expired',
          description: 'Please sign in again.',
          confirmLabel: 'Sign In',
          onConfirm: () => { closeDialog(); navigation.navigate('Auth'); },
        });
      } else {
        setDialog({
          visible: true,
          status: 'error',
          headerLabel: 'Something Went Wrong',
          title: 'Something Went Wrong',
          description: error.message || 'Please check your connection and try again.',
          confirmLabel: 'OK',
          onConfirm: closeDialog,
        });
      }
    } finally {
      setRespondingToOfferRequestIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // Decline Counter Offer
  const handleDeclineOffer = (requestId: string, providerName: string, deliveryMode: string) => {
    const isBroadcast = deliveryMode === 'broadcast';
    const description = `This will decline ${providerName}'s offer. Your request will return to pending and remain visible to other providers (${isBroadcast ? 'if broadcast' : "or you'll need to choose a different provider"}).`;

    setDialog({
      visible: true,
      status: 'warning',
      headerLabel: 'Decline Offer',
      title: 'Decline this offer?',
      description,
      confirmLabel: 'Decline',
      cancelLabel: 'Keep Offer',
      destructive: true,
      onConfirm: async () => {
        closeDialog();
        if (!accessToken) return;
        setRespondingToOfferRequestIds(prev => {
          const next = new Set(prev);
          next.add(requestId);
          return next;
        });
        try {
          await declineCounterOffer(requestId, accessToken);
          showToast({ status: 'info', title: 'Offer declined.' });
          loadRequests(activeTab, true);
        } catch (error: any) {
          console.warn('Decline Offer Failed:', error);
          if (error.status === 409) {
            setDialog({
              visible: true,
              status: 'error',
              headerLabel: 'Offer Unavailable',
              title: 'Offer No Longer Available',
              description: 'This offer is no longer valid. Refreshing your request.',
              confirmLabel: 'OK',
              onConfirm: () => { closeDialog(); loadRequests(activeTab, true); },
            });
          } else if (error.status === 401) {
            setDialog({
              visible: true,
              status: 'error',
              headerLabel: 'Session Expired',
              title: 'Session Expired',
              description: 'Please sign in again.',
              confirmLabel: 'Sign In',
              onConfirm: () => { closeDialog(); navigation.navigate('Auth'); },
            });
          } else {
            setDialog({
              visible: true,
              status: 'error',
              headerLabel: 'Something Went Wrong',
              title: 'Something Went Wrong',
              description: 'Please check your connection and try again.',
              confirmLabel: 'OK',
              onConfirm: closeDialog,
            });
          }
        } finally {
          setRespondingToOfferRequestIds(prev => {
            const next = new Set(prev);
            next.delete(requestId);
            return next;
          });
        }
      },
    });
  };

  // Render a Single Request Card
  const renderItem = ({ item }: { item: any }) => {
    return (
      <RequestCard
        request={item}
        variant={activeTab}
        onPress={() => {
          if (activeTab === 'completed' && item.status === 'COMPLETED' && !item.isReviewed && item.jobCompletedAt && new Date().getTime() - new Date(item.jobCompletedAt).getTime() < 7 * 24 * 60 * 60 * 1000) {
            navigation.navigate('RateProvider', {
              jobId: item.jobId,
              providerName: item.targetProvider?.name || item.acceptedOffer?.providerName,
              providerId: item.targetProvider?.id || item.acceptedOffer?.providerId,
              categoryName: item.category,
            });
          } else {
            navigation.navigate('RequestDetails', { requestId: item.id });
          }
        }}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
        onCancel={(id, status, pName) => handleCancel(id, status, pName || 'Provider')}
        isCancelling={cancellingRequestIds.has(item.id)}
        isResponding={respondingToOfferRequestIds.has(item.id)}
      />
    );
  };

  // Render Page Footer
  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  // Render Empty State
  const renderEmptyState = () => {
    if (isLoading) return null;

    let icon = 'document-text-outline';
    let title = 'No requests';
    let subtext = '';
    let showActionButton = false;

    if (activeTab === 'active') {
      icon = 'document-text-outline';
      title = 'No active requests';
      subtext = 'Tap the + button to post your first request.';
      showActionButton = true;
    } else if (activeTab === 'completed') {
      icon = 'checkmark-circle-outline';
      title = 'No completed requests yet';
      subtext = "Once a provider finishes a job, it'll show up here.";
    } else if (activeTab === 'cancelled') {
      icon = 'close-circle-outline';
      title = 'No cancelled requests';
      subtext = 'Requests you cancel will appear here.';
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon as any} size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>{subtext}</Text>
        {showActionButton && (
          <TouchableOpacity
            style={[styles.emptyPostButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('PostRequest')}
          >
            <Text style={styles.emptyPostButtonText}>Post a Request</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      {/* Tab bar header */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'active' }}
          style={[
            styles.tabButton,
            activeTab === 'active' && styles.activeTab,
            activeTab === 'active' && { borderBottomColor: '#1565C0' },
          ]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textMuted },
              activeTab === 'active' && { color: '#1565C0', fontWeight: '700' },
            ]}
          >
            Active {counts.active > 0 ? `(${counts.active})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'completed' }}
          style={[
            styles.tabButton,
            activeTab === 'completed' && styles.activeTab,
            activeTab === 'completed' && { borderBottomColor: '#1565C0' },
          ]}
          onPress={() => setActiveTab('completed')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textMuted },
              activeTab === 'completed' && { color: '#1565C0', fontWeight: '700' },
            ]}
          >
            Completed {counts.completed > 0 ? `(${counts.completed})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'cancelled' }}
          style={[
            styles.tabButton,
            activeTab === 'cancelled' && styles.activeTab,
            activeTab === 'cancelled' && { borderBottomColor: '#1565C0' },
          ]}
          onPress={() => setActiveTab('cancelled')}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textMuted },
              activeTab === 'cancelled' && { color: '#1565C0', fontWeight: '700' },
            ]}
          >
            Cancelled {counts.cancelled > 0 ? `(${counts.cancelled})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.listContainer}>
          <RequestCardSkeleton />
          <RequestCardSkeleton />
          <RequestCardSkeleton />
          <RequestCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={requestsByTab[activeTab]}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        accessibilityLabel="Post a new request"
        accessibilityRole="button"
        onPress={() => navigation.navigate('PostRequest')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Status Dialog */}
      <StatusDialog
        visible={dialog.visible}
        status={dialog.status}
        headerLabel={dialog.headerLabel}
        title={dialog.title}
        description={dialog.description}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={dialog.cancelLabel}
        destructive={dialog.destructive}
        onConfirm={dialog.onConfirm}
        onCancel={closeDialog}
        onClose={closeDialog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    height: 48,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  footerLoader: {
    marginVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyPostButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyPostButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
