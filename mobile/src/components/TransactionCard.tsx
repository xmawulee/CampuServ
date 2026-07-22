import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { formatShortDateTime, formatGHS, statusColor } from '../utils/receiptHelpers';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../styles/ThemeContext';

interface TransactionCardProps {
  item: {
    transactionId: string;
    serviceTitle: string;
    payerName: string;
    providerName: string;
    initiatedAt: string;
    agreedBidAmount: number;
    status: 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED';
  };
}

export default function TransactionCard({ item }: TransactionCardProps) {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const { colors } = useTheme();
  const isProvider = user?.role === 'PROVIDER';

  // Accent strip and status color
  const statusColorValue = statusColor[item.status] || colors.textMuted;
  
  // Decide display name based on user role
  const displayName = isProvider ? `Paid by: ${item.payerName || 'Student'}` : `Service by: ${item.providerName || 'Provider'}`;
  
  // Decide amount color and sign (received is positive, paid is negative)
  // Deposits are also positive
  const isDeposit = item.serviceTitle === 'Wallet Deposit';
  const isReceived = isProvider || isDeposit;
  const amountSign = isReceived ? '+' : '-';
  const amountColorValue = isReceived ? colors.success : colors.error;

  const handlePress = () => {
    navigation.navigate('TransactionReceipt', { transactionId: item.transactionId });
  };

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} onPress={handlePress} activeOpacity={0.85}>
      {/* Status accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: statusColorValue }]} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.serviceTitle}
          </Text>
          <Text style={[styles.amount, { color: amountColorValue }]}>
            {amountSign}{formatGHS(item.agreedBidAmount)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.subtext, { color: colors.textMuted }]} numberOfLines={1}>
            {isDeposit ? 'Personal Wallet' : displayName}
          </Text>
          
          {/* Status Badge */}
          <View style={[styles.badge, { backgroundColor: statusColorValue + '1A', borderColor: statusColorValue + '33' }]}>
            <Text style={[styles.badgeText, { color: statusColorValue }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={[styles.date, { color: colors.textMuted }]}>
          {formatShortDateTime(item.initiatedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentStrip: {
    width: 6,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  subtext: {
    flex: 1,
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 10,
  },
});
