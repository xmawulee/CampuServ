import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../styles/ThemeContext';
import { WalletTransaction } from '../../types/walletTransaction';
import {
  formatShortTxnDate,
  formatSignedGHS,
  amountColor,
  txnTypeIcon,
  walletTxnStatusColor
} from '../../utils/walletReceiptHelpers';

interface WalletTxnCardProps {
  transaction: WalletTransaction;
  onPress: (walletTxnId: string) => void;
}

export default function WalletTxnCard({ transaction, onPress }: WalletTxnCardProps) {
  const { colors } = useTheme();
  const statusColor = walletTxnStatusColor[transaction.status] || colors.textMuted;
  const isDeposit = transaction.type === 'DEPOSIT';
  const leftAccentColor = isDeposit ? colors.success : (transaction.status === 'FAILED' ? colors.warning : colors.error);

  const formatNarration = (text: string) => {
    if (!text) return '';
    const idRegex = /(job-|req-)[a-f0-9\-]{36}/g;
    return text.replace(idRegex, (match) => {
      return match.substring(0, 8) + '...' + match.substring(match.length - 4);
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => onPress(transaction.walletTxnId)}
      activeOpacity={0.85}
    >
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.iconTitleRow}>
            <View style={[styles.directionWrap, { backgroundColor: leftAccentColor + '20' }]}>
              {isDeposit ? (
                <Text style={[styles.directionIcon, { color: leftAccentColor }]}>↓</Text>
              ) : (
                <Text style={[styles.directionIcon, { color: leftAccentColor }]}>↑</Text>
              )}
            </View>
            <View style={styles.titleCol}>
              <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
                {formatNarration(transaction.narration) || (isDeposit ? 'Wallet Top-Up' : 'Earnings Withdrawal')}
              </Text>
              <Text style={[styles.subtext, { color: colors.textMuted }]}>
                {transaction.paymentMethod} • {formatShortTxnDate(transaction.initiatedAt || transaction.createdAt)}
              </Text>
            </View>
          </View>
          <View style={styles.amountCol}>
            <Text style={[styles.amountText, { color: amountColor(transaction.type) }]}>
              {formatSignedGHS(transaction.amount, transaction.type)}
            </Text>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {transaction.status}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 0,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  directionWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  directionIcon: {
    fontSize: 22,
    fontWeight: '900',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  subtext: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
