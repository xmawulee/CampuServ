import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import type { WalletTransaction } from '../../types/walletTransaction';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';

type Wallet = {
  id: string;
  userId: string;
  balance: number;
  escrowHeld?: number;
};

export default function ProviderEarningsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();
  const [withdrawDialogVisible, setWithdrawDialogVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.allSettled([
        api.get('/payments/provider/wallet'),
        api.get('/payments/provider/wallet/transactions'),
      ]);
      if (walletRes.status === 'fulfilled') {
        setWallet(walletRes.value.data);
      }
      if (txRes.status === 'fulfilled') {
        setTransactions(txRes.value.data || []);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast({ status: 'error', title: 'Error', subtitle: 'Please enter a valid amount.' });
      return;
    }
    if (wallet && amount > wallet.balance) {
      showToast({ status: 'error', title: 'Error', subtitle: `Insufficient balance. Available: ${wallet.balance.toFixed(2)} GHS` });
      return;
    }
    setWithdrawDialogVisible(true);
  };

  const getTxIcon = (type: string, status: string) => {
    if (status === 'FAILED') return 'close-circle';
    if (type === 'DEPOSIT') return 'arrow-down-circle';
    return 'arrow-up-circle';
  };

  const getTxColor = (type: string, status: string) => {
    if (status === 'FAILED') return colors.error;
    if (type === 'DEPOSIT') return colors.success;
    return colors.primary;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Balance Card ── */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.balanceLabel}>Available Earnings</Text>
          <Text style={styles.balanceAmount}>
            {(wallet?.balance ?? 0).toFixed(2)} GHS
          </Text>
        </View>

        {/* ── Withdraw Card ── */}
        <View style={[styles.withdrawCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.withdrawTitle, { color: colors.text }]}>Withdraw Earnings</Text>
          <Text style={[styles.withdrawSub, { color: colors.textMuted }]}>
            Funds are sent to your mobile money account
          </Text>
          <View style={styles.withdrawRow}>
            <TextInput
              style={[styles.withdrawInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="Amount (GHS)"
              placeholderTextColor={colors.placeholderText}
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <TouchableOpacity
              style={[styles.withdrawBtn, { backgroundColor: colors.primary }, processing && { opacity: 0.7 }]}
              onPress={handleWithdraw}
              disabled={processing}
              activeOpacity={0.85}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.withdrawBtnText}>Withdraw</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Transaction History ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History</Text>

        {transactions.length === 0 ? (
          <View style={[styles.emptyTx, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTxTitle, { color: colors.text }]}>No Transactions</Text>
            <Text style={[styles.emptyTxSub, { color: colors.textMuted }]}>
              Your earnings and withdrawal history will appear here.
            </Text>
          </View>
        ) : (
          transactions.map((tx) => {
            const iconColor = getTxColor(tx.type, tx.status);
            const iconName = getTxIcon(tx.type, tx.status);
            const amountSign = tx.type === 'DEPOSIT' ? '+' : '-';
            return (
              <TouchableOpacity
                key={tx.walletTxnId}
                style={[styles.txCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => navigation.navigate('WalletReceiptScreen', { transaction: tx })}
                activeOpacity={0.8}
              >
                <View style={[styles.txIconWrap, { backgroundColor: iconColor + '18' }]}>
                  <Ionicons name={iconName as any} size={24} color={iconColor} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txNarration, { color: colors.text }]} numberOfLines={1}>
                    {tx.narration}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textMuted }]}>
                    {new Date(tx.initiatedAt).toLocaleDateString([], { dateStyle: 'medium' })}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: iconColor }]}>
                    {amountSign}{Math.abs(tx.amount).toFixed(2)} GHS
                  </Text>
                  <View style={[styles.txStatusBadge, { backgroundColor: iconColor + '18' }]}>
                    <Text style={[styles.txStatusText, { color: iconColor }]}>
                      {tx.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <StatusDialog
        visible={withdrawDialogVisible}
        status="warning"
        title="Confirm Withdrawal"
        description={`Withdraw ${parseFloat(withdrawAmount || '0').toFixed(2)} GHS to your mobile money?`}
        confirmLabel="Withdraw"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setWithdrawDialogVisible(false);
          setProcessing(true);
          try {
            const amount = parseFloat(withdrawAmount);
            const res = await api.post('/payments/provider/wallet/withdraw', {
              amount,
              paymentMethod: 'MTN MoMo',
              mobileNumber: '0551234321',
            });
            const { walletTxnId } = res.data;
            showToast({ status: 'success', title: 'Withdrawal Requested', subtitle: `Your withdrawal of ${amount.toFixed(2)} GHS is being processed.\nReceipt: ${walletTxnId}`, duration: 4000 });
            setWithdrawAmount('');
            fetchData();
          } catch (e: any) {
            showToast({ status: 'error', title: 'Error', subtitle: e.response?.data || 'Withdrawal failed.' });
          } finally {
            setProcessing(false);
          }
        }}
        onCancel={() => setWithdrawDialogVisible(false)}
        onClose={() => setWithdrawDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 110 },

  balanceCard: {
    borderRadius: 24, padding: 24, marginBottom: 20,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  balanceAmount: { color: '#FFF', fontSize: 40, fontWeight: '800', marginBottom: 16 },
  escrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
  escrowText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  withdrawCard: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 28 },
  withdrawTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  withdrawSub: { fontSize: 12, marginBottom: 14 },
  withdrawRow: { flexDirection: 'row', gap: 10 },
  withdrawInput: {
    flex: 1, height: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15,
  },
  withdrawBtn: { height: 48, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  withdrawBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },

  emptyTx: { borderRadius: 18, borderWidth: 1, padding: 32, alignItems: 'center', gap: 8 },
  emptyTxTitle: { fontSize: 17, fontWeight: '700' },
  emptyTxSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  txCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 12, marginBottom: 12,
  },
  txIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txNarration: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  txDate: { fontSize: 12 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  txStatusText: { fontSize: 10, fontWeight: '700' },
});
