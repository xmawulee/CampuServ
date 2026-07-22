import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform
} from 'react-native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import {
  formatFullReceiptDate,
  formatGHS,
  formatSignedGHS,
  amountColor,
  walletTxnStatusColor
} from '../../utils/walletReceiptHelpers';

export default function WalletReceiptScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { walletTxnId } = route.params || {};
  const { showToast } = useToast();
  const [reportDialogVisible, setReportDialogVisible] = useState(false);

  const { data: receipt, isLoading, error } = useQuery<any>({
    queryKey: ['walletReceipt', walletTxnId],
    queryFn: () => api.get(`/wallet/transactions/${walletTxnId}`).then((r) => r.data),
    enabled: !!walletTxnId,
    retry: 1,
  });

  const handleShareReceipt = async () => {
    if (!receipt) return;
    try {
      const shareContent = `CampusServ Wallet Transaction Receipt\n` +
        `-----------------------------\n` +
        `Receipt No: ${receipt.walletTxnId}\n` +
        `Narration: ${receipt.narration}\n` +
        `Type: ${receipt.type}\n` +
        `Amount: ${formatGHS(receipt.amount)}\n` +
        `Status: ${receipt.status}\n` +
        `Owner: ${receipt.ownerName}\n` +
        `Date: ${formatFullReceiptDate(receipt.initiatedAt)}\n` +
        `-----------------------------\n` +
        `Thank you for using CampusServ!`;

      await Share.share({
        message: shareContent,
        title: `Receipt ${receipt.walletTxnId}`,
      });
    } catch (error: any) {
      showToast({ status: 'error', title: 'Error', subtitle: 'Failed to share receipt.' });
    }
  };

  const handleReportIssue = () => {
    setReportDialogVisible(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#F9FAFB' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (error || !receipt) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#F9FAFB' }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load receipt details.</Text>
        <TouchableOpacity style={styles.btnSecondaryCompact} onPress={() => navigation.goBack()}>
          <Text style={styles.btnSecondaryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSuccess = receipt.status === 'SUCCESS';
  const isFailed = receipt.status === 'FAILED';
  const isProcessing = receipt.status === 'PROCESSING' || receipt.status === 'PENDING';
  const statusColorValue = walletTxnStatusColor[receipt.status as 'PENDING' | 'SUCCESS' | 'FAILED' | 'PROCESSING'] || '#9CA3AF';

  // Header status icon and text
  let statusIcon = 'checkmark';
  let statusIconColor = '#10B981'; // Neon Green
  let statusTitle = 'Transaction Successful';
  
  if (isFailed) {
    statusIcon = 'close';
    statusIconColor = '#EF4444';
    statusTitle = 'Transaction Failed';
  } else if (isProcessing) {
    statusIcon = 'time';
    statusIconColor = receipt.status === 'PENDING' ? '#F59E0B' : '#3B82F6';
    statusTitle = receipt.status === 'PENDING' ? 'Awaiting Payment' : 'Transaction Processing';
  }

  // Determine direction indicator (- or +)
  const isWithdrawal = receipt.type === 'WITHDRAWAL';
  const amountPrefix = isWithdrawal ? '-' : '';

  return (
    <View style={[styles.mainContainer, { backgroundColor: '#F9FAFB' }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Wallet Receipt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* Receipt Container */}
        <View style={styles.receiptCard}>
          
          {/* Header Status Circle & Amount */}
          <View style={styles.statusSection}>
            <View style={[styles.statusCircle, { backgroundColor: statusIconColor }]}>
              <Ionicons name={statusIcon as any} size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.statusTitleText}>{statusTitle}</Text>
            <Text style={styles.largeAmountText}>
              {amountPrefix}{formatGHS(receipt.amount)}
            </Text>
            <Text style={styles.narrationSubtitle}>{receipt.narration}</Text>
          </View>

          <View style={styles.divider} />

          {/* Section 1: Transaction Info */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Transaction Info</Text>
            
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Receipt No.</Text>
              <Text style={styles.fieldValueBold}>{receipt.walletTxnId}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Type</Text>
              <Text style={styles.fieldValue}>{receipt.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={[styles.badge, { backgroundColor: `${statusColorValue}15`, borderColor: `${statusColorValue}40` }]}>
                <Text style={[styles.badgeText, { color: statusColorValue }]}>{receipt.status}</Text>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date & Time</Text>
              <Text style={styles.fieldValue}>{formatFullReceiptDate(receipt.initiatedAt)}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Completed At</Text>
              <Text style={styles.fieldValue}>{receipt.completedAt ? formatFullReceiptDate(receipt.completedAt) : '—'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Narration</Text>
              <Text style={styles.fieldValue}>{receipt.narration} via {receipt.paymentMethod}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Section 2: Payment Channel */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Payment Channel</Text>
            
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Payment Method</Text>
              <Text style={styles.fieldValueBold}>{receipt.paymentMethod}</Text>
            </View>

            {receipt.mobileNumber && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <Text style={styles.fieldValue}>{receipt.mobileNumber}</Text>
              </View>
            )}

            {receipt.bankName && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Bank Name</Text>
                <Text style={styles.fieldValue}>{receipt.bankName}</Text>
              </View>
            )}

            {receipt.accountNumberMasked && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Account Number</Text>
                <Text style={styles.fieldValue}>{receipt.accountNumberMasked}</Text>
              </View>
            )}

            {receipt.paystackReference && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Paystack Reference</Text>
                <Text style={styles.fieldValueMuted} selectable={true}>{receipt.paystackReference}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Section 3: Financial Breakdown */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Financial Breakdown</Text>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Amount</Text>
              <Text style={[styles.breakdownValue, isFailed && styles.strikethrough]}>
                {formatGHS(receipt.amount)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Processing Fee</Text>
              <Text style={styles.breakdownValue}>{formatGHS(receipt.feesCharged || 0)}</Text>
            </View>
            
            <View style={styles.breakdownDivider} />
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Net Amount</Text>
              <Text style={[styles.breakdownTotalValue, isFailed && styles.strikethrough]}>
                {amountPrefix}{formatGHS(receipt.netAmount || receipt.amount)}
              </Text>
            </View>

            {!isFailed && (
              <View style={styles.balanceInfoBox}>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Wallet Balance Before:</Text>
                  <Text style={styles.balanceValue}>{formatGHS(receipt.balanceBefore || 0)}</Text>
                </View>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Wallet Balance After:</Text>
                  <Text style={styles.balanceValue}>{formatGHS(receipt.balanceAfter || 0)}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Section 4: Account Details */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Account Details</Text>
            
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Account Name</Text>
              <Text style={styles.fieldValueBold}>{receipt.ownerName}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Student ID</Text>
              <Text style={styles.fieldValue}>{receipt.ownerStudentId}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{receipt.ownerEmail}</Text>
            </View>
          </View>

          {/* Section 5: Failure Details */}
          {isFailed && (
            <>
              <View style={styles.divider} />
              <View style={[styles.sectionContainer, styles.failureContainer]}>
                <View style={styles.failureHeaderRow}>
                  <Ionicons name="warning" size={16} color="#EF4444" />
                  <Text style={styles.failureTitle}>Transaction Failed</Text>
                </View>
                <Text style={styles.failureDetailText}>
                  <Text style={styles.failureDetailLabel}>Reason: </Text>
                  {receipt.failureReason || 'Declined by payment provider'}
                </Text>
                <Text style={styles.failureDetailText}>
                  <Text style={styles.failureDetailLabel}>Failed At: </Text>
                  {receipt.failedAt ? formatFullReceiptDate(receipt.failedAt) : formatFullReceiptDate(receipt.updatedAt)}
                </Text>
                <View style={styles.failureAlertBox}>
                  <Text style={styles.failureAlertText}>
                    Your wallet balance was not affected. {formatGHS(receipt.amount)} has NOT been deducted.
                  </Text>
                </View>
              </View>
            </>
          )}

        </View>

        {/* Footer Actions - Side by Side layout from wireframe */}
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.btnSecondary} onPress={handleShareReceipt}>
            <Ionicons name="download-outline" size={20} color="#374151" />
            <Text style={styles.btnSecondaryText}>Download</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnPrimary} onPress={handleShareReceipt}>
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>Share</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnReportLink} onPress={handleReportIssue}>
          <Text style={styles.btnReportText}>Report an Issue</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <StatusDialog
        visible={reportDialogVisible}
        status="warning"
        title="Report Issue"
        description="Would you like to report an issue for this transaction to our support team?"
        confirmLabel="Report"
        cancelLabel="Cancel"
        onConfirm={() => {
          setReportDialogVisible(false);
          showToast({ status: 'success', title: 'Ticket Created', subtitle: 'Our support team has been notified. A representative will contact you via email.', duration: 4000 });
        }}
        onCancel={() => setReportDialogVisible(false)}
        onClose={() => setReportDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 12,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  headerBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 24,
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  statusCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statusTitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  largeAmountText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  narrationSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
  },
  sectionContainer: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  fieldValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  fieldValueBold: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
  fieldValueMuted: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  balanceInfoBox: {
    marginTop: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  balanceValue: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  failureContainer: {
    backgroundColor: '#FEF2F2',
  },
  failureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  failureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  failureDetailText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    marginTop: 4,
  },
  failureDetailLabel: {
    color: '#6B7280',
  },
  failureAlertBox: {
    marginTop: 14,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#FCA5A5',
  },
  failureAlertText: {
    fontSize: 11,
    color: '#EF4444',
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  btnPrimary: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#10B981', // Neon green matching screenshots
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  btnSecondaryCompact: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnReportLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  btnReportText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
});
