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
            <View style={[styles.statusCircle, { backgroundColor: `${statusIconColor}1A` }]}>
              <View style={[styles.statusInnerCircle, { backgroundColor: statusIconColor }]}>
                <Ionicons name={statusIcon as any} size={28} color="#FFFFFF" />
              </View>
            </View>
            <Text style={[styles.statusTitleText, { color: statusIconColor }]}>{statusTitle}</Text>
            <Text style={styles.largeAmountText} adjustsFontSizeToFit numberOfLines={1}>
              {amountPrefix}{formatGHS(receipt.amount)}
            </Text>
            <Text style={styles.narrationSubtitle}>{receipt.narration}</Text>
          </View>

          <View style={styles.dashedDividerWrapper}><View style={styles.dashedDivider} /></View>

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
              <View style={[styles.badge, { backgroundColor: `${statusColorValue}15` }]}>
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

          <View style={styles.dashedDividerWrapper}><View style={styles.dashedDivider} /></View>

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

          <View style={styles.dashedDividerWrapper}><View style={styles.dashedDivider} /></View>

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
            
            <View style={[styles.dashedDividerWrapper, { marginVertical: 8 }]}><View style={styles.dashedDivider} /></View>
            
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

          <View style={styles.dashedDividerWrapper}><View style={styles.dashedDivider} /></View>

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
              <View style={styles.dashedDividerWrapper}><View style={styles.dashedDivider} /></View>
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

        {/* Footer Actions */}
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.btnSecondary} onPress={handleShareReceipt}>
            <Ionicons name="download-outline" size={20} color="#111827" />
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
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 20,
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 24,
  },
  statusSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  statusCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusInnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusTitleText: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  largeAmountText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -1.5,
  },
  narrationSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  dashedDividerWrapper: {
    height: 1,
    overflow: 'hidden',
    marginHorizontal: 24,
  },
  dashedDivider: {
    height: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: -1,
  },
  sectionContainer: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  fieldValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  fieldValueBold: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '800',
    flex: 1.5,
    textAlign: 'right',
  },
  fieldValueMuted: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    flex: 1.5,
    textAlign: 'right',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  balanceInfoBox: {
    marginTop: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  failureDetailText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginTop: 4,
  },
  failureDetailLabel: {
    color: '#6B7280',
    fontWeight: '600',
  },
  failureAlertBox: {
    marginTop: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  failureAlertText: {
    fontSize: 12,
    color: '#EF4444',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
  },
  btnPrimary: {
    flex: 1.5,
    height: 56,
    borderRadius: 100,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnSecondary: {
    flex: 1,
    height: 56,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  btnSecondaryCompact: {
    height: 44,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  btnReportLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  btnReportText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '700',
  },
});
