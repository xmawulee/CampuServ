import React, { useState, useEffect } from 'react';
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
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import {
  formatReceiptDateTime,
  formatShortDateTime,
  formatGHS,
  statusColor,
  generateTxnId
} from '../../utils/receiptHelpers';

export default function TransactionReceiptScreen({ route, navigation }: any) {
  const { transactionId } = route.params;
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [reportDialogVisible, setReportDialogVisible] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const response = await api.get(`/payments/transactions/${transactionId}`);
        setReceipt(response.data);
      } catch (err: any) {
        showToast({ status: 'error', title: 'Error', subtitle: 'Failed to load transaction receipt details.' });
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      fetchReceipt();
    } else {
      showToast({ status: 'error', title: 'Error', subtitle: 'No transaction ID specified.' });
      navigation.goBack();
    }
  }, [transactionId, navigation]);

  const handleShareReceipt = async () => {
    if (!receipt) return;
    try {
      const formattedTxnId = generateTxnId(receipt.orderId, receipt.initiatedAt);
      const shareContent = `CampusServ Transaction Receipt\n` +
        `-----------------------------\n` +
        `Receipt No: ${formattedTxnId}\n` +
        `Service: ${receipt.serviceTitle}\n` +
        `Amount: ${formatGHS(receipt.agreedBidAmount)}\n` +
        `Status: ${receipt.status}\n` +
        `Payer: ${receipt.payerName}\n` +
        `Provider: ${receipt.providerName}\n` +
        `Date: ${formatShortDateTime(receipt.initiatedAt)}\n` +
        `-----------------------------\n` +
        `Thank you for using CampusServ!`;

      await Share.share({
        message: shareContent,
        title: `Receipt ${formattedTxnId}`,
      });
    } catch (error: any) {
      showToast({ status: 'error', title: 'Error', subtitle: 'Failed to share receipt.' });
    }
  };

  const handleReportIssue = () => {
    setReportDialogVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#F9FAFB' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!receipt) return null;

  const formattedTxnId = generateTxnId(receipt.orderId, receipt.initiatedAt);
  const statusColorValue = statusColor[receipt.status as 'HELD' | 'RELEASED' | 'REFUNDED' | 'FAILED'] || '#9CA3AF';

  // Determine timeline steps based on transaction state
  const isInitiated = true;
  const isConfirmed = receipt.confirmedAt != null;
  const isDelivered = receipt.escrowReleasedAt != null || receipt.status === 'RELEASED';
  const isReleased = receipt.escrowReleasedAt != null && receipt.status === 'RELEASED';
  const isRefunded = receipt.status === 'REFUNDED';
  const isFailed = receipt.status === 'FAILED';

  // Header status icon configuration
  let statusIcon = 'checkmark';
  let statusIconColor = '#10B981'; // Neon green
  let statusTitleText = 'Escrow Funds HELD';

  if (receipt.status === 'RELEASED') {
    statusIcon = 'checkmark';
    statusIconColor = '#10B981';
    statusTitleText = 'Payment Completed';
  } else if (isRefunded) {
    statusIcon = 'arrow-undo';
    statusIconColor = '#F59E0B';
    statusTitleText = 'Payment Refunded';
  } else if (isFailed) {
    statusIcon = 'close';
    statusIconColor = '#EF4444';
    statusTitleText = 'Payment Failed';
  } else if (receipt.status === 'HELD') {
    statusIcon = 'lock-closed';
    statusIconColor = '#3B82F6';
    statusTitleText = 'Funds Held in Escrow';
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: '#F9FAFB' }]}>
      {/* Custom Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Job Payment Receipt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.mainContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Card containing receipt details */}
        <View style={styles.receiptCard}>
          
          {/* Logo & Headline */}
          <View style={styles.statusSection}>
            <View style={[styles.statusCircle, { backgroundColor: statusIconColor }]}>
              <Ionicons name={statusIcon as any} size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.statusTitleText}>{statusTitleText}</Text>
            <Text style={styles.largeAmountText}>{formatGHS(receipt.agreedBidAmount)}</Text>
            <Text style={styles.narrationSubtitle}>Service: {receipt.serviceTitle}</Text>
          </View>

          <View style={styles.divider} />

          {/* Section 1: Summary Details */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Receipt Summary</Text>
            
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Receipt No.</Text>
              <Text style={styles.fieldValueBold}>#{formattedTxnId}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={[styles.badge, { backgroundColor: `${statusColorValue}15`, borderColor: `${statusColorValue}40` }]}>
                <Text style={[styles.badgeText, { color: statusColorValue }]}>{receipt.status}</Text>
              </View>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Payment Method</Text>
              <Text style={styles.fieldValue}>{receipt.paymentMethod || 'MTN MoMo'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Channel</Text>
              <Text style={styles.fieldValue}>{receipt.paymentChannel || 'mobile_money'}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Initiated At</Text>
              <Text style={styles.fieldValue}>{formatReceiptDateTime(receipt.initiatedAt)}</Text>
            </View>
            {receipt.confirmedAt && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Confirmed At</Text>
                <Text style={styles.fieldValue}>{formatReceiptDateTime(receipt.confirmedAt)}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Section 2: Service Details */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Service Details</Text>
            
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Service Title</Text>
              <Text style={styles.fieldValueBold}>{receipt.serviceTitle}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Category</Text>
              <Text style={styles.fieldValue}>{receipt.serviceCategory}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Campus Zone</Text>
              <Text style={styles.fieldValue}>{receipt.campusZone || 'KNUST Campus'}</Text>
            </View>
            
            <View style={styles.descriptionBlock}>
              <Text style={styles.fieldLabel}>Description</Text>
              <Text style={styles.descriptionText}>{receipt.serviceDescription || 'No description provided.'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Section 3: Parties Involved */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Parties Involved</Text>
            
            <View style={styles.partyBox}>
              <Ionicons name="card-outline" size={16} color="#6B7280" style={{ marginTop: 2 }} />
              <View style={styles.partyInfo}>
                <Text style={styles.partyLabel}>PAID BY (STUDENT)</Text>
                <Text style={styles.partyName}>{receipt.payerName}</Text>
                <Text style={styles.partyId}>ID: {receipt.payerStudentId} • {receipt.payerEmail}</Text>
              </View>
            </View>

            <View style={styles.partyBox}>
              <Ionicons name="construct-outline" size={16} color="#6B7280" style={{ marginTop: 2 }} />
              <View style={styles.partyInfo}>
                <Text style={styles.partyLabel}>SERVICE BY (PROVIDER)</Text>
                <Text style={styles.partyName}>{receipt.providerName}</Text>
                <Text style={styles.partyId}>ID: {receipt.providerStudentId}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Section 4: Financial Breakdown */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Financial Breakdown</Text>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Agreed Bid Amount</Text>
              <Text style={styles.breakdownValue}>{formatGHS(receipt.agreedBidAmount)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform Commission (5%)</Text>
              <Text style={[styles.breakdownValue, { color: '#EF4444' }]}>- {formatGHS(receipt.platformCommission || 0)}</Text>
            </View>
            
            <View style={styles.breakdownDivider} />
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Provider Payout</Text>
              <Text style={[styles.breakdownTotalValue, { color: '#10B981' }]}>
                {formatGHS(receipt.providerPayout || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Section 5: Stepper Timeline */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Escrow & Order Timeline</Text>
            
            <View style={styles.timeline}>
              {/* Step 1 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineDotActive}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Payment Initiated</Text>
                  <Text style={styles.timelineDate}>{formatShortDateTime(receipt.initiatedAt)}</Text>
                </View>
              </View>
              
              {/* Connector */}
              <View style={[styles.timelineLine, isConfirmed && styles.timelineLineActive]} />

              {/* Step 2 */}
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, isConfirmed && styles.timelineDotActive]}>
                  {isConfirmed && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, !isConfirmed && styles.timelineTitleMuted]}>Payment Confirmed</Text>
                  {isConfirmed && <Text style={styles.timelineDate}>{formatShortDateTime(receipt.confirmedAt)}</Text>}
                </View>
              </View>

              {/* Connector */}
              <View style={[styles.timelineLine, isDelivered && styles.timelineLineActive]} />

              {/* Step 3 */}
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, isDelivered && styles.timelineDotActive]}>
                  {isDelivered && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, !isDelivered && styles.timelineTitleMuted]}>
                    {isRefunded ? 'Payment Refunded' : 'Service Delivered'}
                  </Text>
                  {isDelivered && (
                    <Text style={styles.timelineDate}>
                      {formatShortDateTime(receipt.escrowReleasedAt || receipt.confirmedAt)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Connector */}
              <View style={[styles.timelineLine, (isReleased || isRefunded) && styles.timelineLineActive]} />

              {/* Step 4 */}
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, (isReleased || isRefunded) && styles.timelineDotActive]}>
                  {(isReleased || isRefunded) && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, !(isReleased || isRefunded) && styles.timelineTitleMuted]}>
                    {isRefunded ? 'Funds Returned to Student' : 'Funds Released to Provider'}
                  </Text>
                  {(isReleased || isRefunded) && (
                    <Text style={styles.timelineDate}>
                      {formatShortDateTime(receipt.escrowReleasedAt || receipt.confirmedAt)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Section 6: References */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Reference Keys</Text>
            
            <View style={styles.refRow}>
              <Text style={styles.refLabel}>Paystack Reference</Text>
              <Text style={styles.refValue} selectable={true}>{receipt.paystackReference || 'N/A'}</Text>
            </View>
            <View style={styles.refRow}>
              <Text style={styles.refLabel}>Order ID</Text>
              <Text style={styles.refValue} selectable={true}>{receipt.orderId}</Text>
            </View>
            <View style={styles.refRow}>
              <Text style={styles.refLabel}>Transaction ID</Text>
              <Text style={styles.refValue} selectable={true}>{receipt.transactionId}</Text>
            </View>
          </View>

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
        description="Would you like to open a dispute for this transaction? Our administration team will review your order details."
        confirmLabel="Report"
        cancelLabel="Cancel"
        onConfirm={() => {
          setReportDialogVisible(false);
          showToast({ status: 'success', title: 'Ticket Created', subtitle: 'A support ticket has been created. A representative will contact you via email.', duration: 4000 });
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
  descriptionBlock: {
    marginTop: 10,
    gap: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  partyBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  partyInfo: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  partyId: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
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
  },
  timeline: {
    marginTop: 6,
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineContent: {
    flex: 1,
    marginTop: -2,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  timelineTitleMuted: {
    color: '#9CA3AF',
  },
  timelineDate: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginLeft: 7,
    marginVertical: -2,
    zIndex: 1,
  },
  timelineLineActive: {
    backgroundColor: '#10B981',
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  refLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  refValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
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
});
