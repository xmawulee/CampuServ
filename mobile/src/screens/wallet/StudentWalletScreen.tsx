import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import WalletTxnCard from '../../components/wallet/WalletTxnCard';
import WalletEmptyState from '../../components/wallet/WalletEmptyState';
import { useToast } from '../../styles/ToastContext';

export default function StudentWalletScreen() {
  const { showToast } = useToast();
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
      const response = await api.get('/payments/student/wallet');
      setWallet(response.data);
      
      const txResponse = await api.get('/payments/student/wallet/transactions');
      setTransactions(txResponse.data || []);
    } catch (e) {
      console.warn("Student wallet fetch error details:", e);
      logError('Failed to fetch student wallet details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const logError = (msg: string) => {
    console.warn(msg);
  };

  useEffect(() => { fetchWalletData(); }, [fetchWalletData]);
  const onRefresh = () => { setRefreshing(true); fetchWalletData(); };

  const handleDeposit = () => {
    navigation.navigate('Deposit');
  };

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
      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <View style={styles.balanceHeaderRow}>
          <Text style={styles.balanceCardLabel}>
            Escrow Spending Balance
          </Text>
          <Ionicons name="wallet" size={20} color="rgba(255,255,255,0.7)" />
        </View>
        <Text style={styles.balanceCardAmount}>
          GHS {wallet ? Number(wallet.balance).toFixed(2) : '0.00'}
        </Text>
        <Text style={styles.balanceCardSub}>
          Available for booking campus service providers
        </Text>

        {/* Quick actions row */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: '#FFFFFF' }]} onPress={handleDeposit}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={[styles.quickActionLabel, { color: colors.primary }]}>Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: 'rgba(255,255,255,0.15)' }]} onPress={handleWithdrawal}>
            <Ionicons name="arrow-up" size={18} color="#FFF" />
            <Text style={[styles.quickActionLabel, { color: '#FFF' }]}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Escrow Card ── */}
      <View style={[styles.escrowCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <View style={[styles.escrowIcon, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Ionicons name="lock-closed" size={20} color="#F59E0B" />
          </View>
          <View>
            <Text style={[styles.escrowLabel, { color: colors.textMuted }]}>
              Pending Escrow Payments
            </Text>
            <Text style={[styles.escrowAmount, { color: colors.text }]}>
              GHS {wallet ? Number(wallet.heldBalance).toFixed(2) : '0.00'}
            </Text>
          </View>
        </View>
        <Text style={[styles.escrowSub, { color: colors.textMuted }]}>
          These funds are locked securely in active service contracts and will be released upon job completion.
        </Text>
      </View>

      {/* ── Transaction History ── */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Recent Transactions</Text>

      {(!txnList || txnList.length === 0) ? (
        <WalletEmptyState onDepositPress={handleDeposit} />
      ) : (
        <View style={styles.txnListContainer}>
          {txnList.map((tx: any) => (
            <WalletTxnCard
              key={tx.walletTxnId}
              transaction={tx}
              onPress={(id) => navigation.navigate('WalletReceiptScreen', { walletTxnId: id })}
            />
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  balanceCard: {
    margin: 24, borderRadius: 28, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 8,
  },
  balanceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceCardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceCardAmount: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', marginVertical: 8, letterSpacing: -1.5 },
  balanceCardSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 28, fontWeight: '500' },
  quickActionsRow: { flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, height: 48, borderRadius: 100, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  quickActionLabel: { fontSize: 15, fontWeight: '800' },

  escrowCard: {
    marginHorizontal: 24, borderRadius: 24, padding: 20, borderWidth: 1,
    marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
  },
  escrowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  escrowLabel: { fontSize: 13, fontWeight: '700' },
  escrowAmount: { fontSize: 22, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 },
  escrowSub: { fontSize: 12, lineHeight: 18 },

  sectionTitle: { fontSize: 18, fontWeight: '800', paddingHorizontal: 24, marginBottom: 16, letterSpacing: -0.3 },
  txnListContainer: { paddingHorizontal: 20 },
});
