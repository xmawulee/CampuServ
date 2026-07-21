import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import WalletTxnCard from '../../components/wallet/WalletTxnCard';
import WalletEmptyState from '../../components/wallet/WalletEmptyState';

export default function ProviderWalletScreen() {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletData = useCallback(async () => {
    try {
      const response = await api.get('/payments/provider/wallet');
      setWallet(response.data);
      
      const txResponse = await api.get('/payments/provider/wallet/transactions');
      setTransactions(txResponse.data || []);
    } catch (e) {
      console.warn("Provider wallet fetch error details:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWalletData(); }, [fetchWalletData]);
  const onRefresh = () => { setRefreshing(true); fetchWalletData(); };

  const handleWithdrawal = () => {
    navigation.navigate('Withdrawal');
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const txnList = Array.isArray(transactions) ? transactions : [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Balance Card ── */}
      <View style={[styles.balanceCard, { backgroundColor: '#0B132B' }]}>
        <Text style={styles.balanceCardLabel}>
          Provider Earnings Balance
        </Text>
        <Text style={styles.balanceCardAmount}>
          GHS {wallet ? Number(wallet.balance).toFixed(2) : '0.00'}
        </Text>
        <Text style={styles.balanceCardSub}>
          Available for bank withdrawal & payout
        </Text>

        {/* Quick actions row */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={[styles.quickAction, { backgroundColor: colors.primary }]} 
            onPress={handleWithdrawal}
            activeOpacity={0.88}
          >
            <Ionicons name="arrow-up-circle-outline" size={20} color="#FFF" />
            <Text style={styles.quickActionLabel}>Request Payout</Text>
          </TouchableOpacity>
        </View>
      </View>



      {/* ── Transaction History ── */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Recent Transactions</Text>

      {(!txnList || txnList.length === 0) ? (
        <WalletEmptyState onDepositPress={() => {}} />
      ) : (
        txnList.map((tx: any) => (
          <WalletTxnCard
            key={tx.walletTxnId}
            transaction={tx}
            onPress={(id) => navigation.navigate('WalletReceiptScreen', { walletTxnId: id })}
          />
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  balanceCard: {
    margin: 20, borderRadius: 32, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2, shadowRadius: 32, elevation: 12,
  },
  balanceCardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceCardAmount: { color: '#FFFFFF', fontSize: 48, fontWeight: '900', marginVertical: 8, letterSpacing: -1.5 },
  balanceCardSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 32 },
  quickActionsRow: { flexDirection: 'row', gap: 12 },
  quickAction: { 
    flex: 1, height: 56, borderRadius: 100, alignItems: 'center', justifyContent: 'center', 
    flexDirection: 'row', gap: 8,
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  quickActionLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  escrowCard: {
    marginHorizontal: 24, borderRadius: 20, padding: 18, borderWidth: 1,
    marginBottom: 24,
  },
  escrowIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  escrowLabel: { fontSize: 12, fontWeight: '600' },
  escrowAmount: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  escrowSub: { fontSize: 11, lineHeight: 16 },

  sectionTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 24, marginBottom: 12 },
});
