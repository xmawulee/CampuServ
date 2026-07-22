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
      style={styles.card}
      onPress={() => onPress(transaction.walletTxnId)}
      activeOpacity={0.85}
    >
      {/* Accent strip */}
      <View style={[styles.leftAccent, { backgroundColor: leftAccentColor }]} />

      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.iconTitleRow}>
            <View style={[styles.directionWrap, { backgroundColor: leftAccentColor + '20' }]}>
              <Text style={[styles.directionIcon, { color: leftAccentColor }]}>
                {txnTypeIcon(transaction.type)}
              </Text>
            </View>
            <View style={styles.titleCol}>
              <Text style={[styles.titleText, { color: colors.text }]}>
                {formatNarration(transaction.narration) || (isDeposit ? 'Wallet Top-Up' : 'Earnings Withdrawal')}
              </Text>
              <Text style={[styles.subtext, { color: colors.textMuted }]}>{transaction.paymentMethod}</Text>
            </View>
          </View>
          <View style={styles.amountCol}>
            <Text style={[styles.amountText, { color: amountColor(transaction.type) }]}>
              {formatSignedGHS(transaction.amount, transaction.type)}
            </Text>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '1A', borderColor: statusColor + '33' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {transaction.status}
              </Text>
            </View>
          </View>
        </View>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          {formatShortTxnDate(transaction.initiatedAt || transaction.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    overflow: 'hidden',
  },
  leftAccent: {
    width: 4,
    borderRadius: 4,
    height: '100%',
    marginRight: 12,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  directionWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  directionIcon: {
    fontSize: 16,
    fontWeight: '800',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 11,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
    alignSelf: 'center',
    gap: 4,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    alignSelf: 'flex-end',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 10,
    paddingLeft: 42,
  },
});
