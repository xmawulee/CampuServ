import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProviderJobs } from '../../services/jobService';
import { useAuthStore } from '../../store/authStore';
import { stompClient } from '../../services/socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZE = 10;

type TabType = 'active' | 'history';

export default function ProviderJobListScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [jobsByTab, setJobsByTab] = useState<{ active: any[], history: any[] }>({ active: [], history: [] });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [hasMore, setHasMore] = useState({ active: true, history: true });
  const [pageByTab, setPageByTab] = useState({ active: 0, history: 0 });

  const fetchJobs = useCallback(async (tab: TabType, page: number, isRefresh = false) => {
    if (!user) return;
    try {
      const statuses = tab === 'active' 
        ? 'ACTIVE,IN_PROGRESS,AWAITING_CODE,PROOF_SUBMITTED,DISPUTED'
        : 'COMPLETED,CANCELLED';
        
      const res = await getProviderJobs(user.id, statuses, page, PAGE_SIZE);
      const data = res.content || [];
      const totalPages = res.totalPages || 1;

      setJobsByTab(prev => ({
        ...prev,
        [tab]: isRefresh || page === 0 ? data : [...prev[tab], ...data]
      }));
      setHasMore(prev => ({ ...prev, [tab]: page < totalPages - 1 }));
      setPageByTab(prev => ({ ...prev, [tab]: page }));
    } catch {
      // Silent error
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
      setLoading(true);
      fetchJobs(activeTab, 0, true);
    }, [activeTab, fetchJobs])
  );

  React.useEffect(() => {
    let subId: string | null = null;
    let debounceTimer: NodeJS.Timeout;

    const setupStomp = async () => {
      if (!user) return;
      try {
        const token = useAuthStore.getState().accessToken;
        if (!token) return;

        stompClient.connect(token);
        const topic = `/topic/provider/${user.id}/job-updates`;
        
        subId = stompClient.subscribe(topic, (msg: any) => {
          console.log('STOMP WS: Job update for provider list:', msg);
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchJobs(activeTab, 0, true);
          }, 300);
        });
      } catch (err) {
        console.warn('Failed to setup STOMP in Provider Job List:', err);
      }
    };

    setupStomp();

    return () => {
      clearTimeout(debounceTimer);
      if (subId) stompClient.unsubscribe(subId);
    };
  }, [user, activeTab, fetchJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs(activeTab, 0, true);
  };

  const onEndReached = () => {
    if (!loadingMore && hasMore[activeTab]) {
      setLoadingMore(true);
      fetchJobs(activeTab, pageByTab[activeTab] + 1);
    }
  };

  const switchTab = (tab: TabType) => {
    if (activeTab === tab) return;
    setActiveTab(tab);
    setLoading(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return colors.primary;
      case 'IN_PROGRESS': return colors.success;
      case 'PROOF_SUBMITTED': return colors.warning;
      case 'COMPLETED': return colors.success;
      case 'CANCELLED': return colors.error;
      case 'DISPUTED': return colors.error;
      default: return colors.textMuted;
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={[styles.jobCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => navigation.navigate('ActiveJob', { jobId: item.id })}
        activeOpacity={0.85}
      >
        <View style={styles.jobTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.jobId, { color: colors.textMuted }]}>
              Job #{item.id.slice(-6).toUpperCase()}
            </Text>
            <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>
              Request: {item.requestId}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        
        {item.serviceMode === 'REMOTE' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <View style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Remote</Text>
            </View>
          </View>
        )}
        
        <View style={[styles.jobFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.jobDate, { color: colors.textMuted }]}>
            Updated: {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Jobs</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' ? { backgroundColor: colors.primary, shadowColor: colors.primary, elevation: 4 } : { backgroundColor: colors.inputBackground }]}
          onPress={() => switchTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, { color: activeTab === 'active' ? '#FFF' : colors.textMuted }]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' ? { backgroundColor: colors.primary, shadowColor: colors.primary, elevation: 4 } : { backgroundColor: colors.inputBackground }]}
          onPress={() => switchTab('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#FFF' : colors.textMuted }]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobsByTab[activeTab]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={60} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No jobs found</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-SemiBold' },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 100,
  },
  tabText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  jobCard: {
    borderWidth: 0,
    borderRadius: 24,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  jobTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobId: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  jobTitle: {
    fontSize: 17,
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.3,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
  },
  jobFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  jobDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    marginTop: 12,
  }
});
