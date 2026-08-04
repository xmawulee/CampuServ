import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { api } from '../../services/api';
import { useToast } from '../../styles/ToastContext';
import { useTheme } from '../../styles/ThemeContext';
import AnimatedBackground from '../../components/AnimatedBackground';

export const DepositScreen = () => {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [depositMethods] = useState<any[]>([
    { id: '1', type: 'MOMO', provider: 'MTN MoMo', accountNumber: '0551234321', isDefault: true, icon: 'phone-portrait-outline' },
    { id: '2', type: 'MOMO', provider: 'Vodafone Cash', accountNumber: '0209876543', isDefault: false, icon: 'phone-portrait-outline' },
    { id: '3', type: 'CARD', provider: 'Visa Card', accountNumber: '**** 1234', isDefault: false, icon: 'card-outline' }
  ]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigation = useNavigation();
  const { showToast } = useToast();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isSubmitting) return;
      e.preventDefault();
      Alert.alert(
        'Transaction Processing',
        'Your deposit is currently processing. Please do not leave this page or close the app.',
        [{ text: 'OK', style: 'cancel' }]
      );
    });
    return unsubscribe;
  }, [navigation, isSubmitting]);

  const handleQuickAdd = (value: number) => {
    const current = parseFloat(amount) || 0;
    const nextVal = current + value;
    setAmount(nextVal.toString());
  };

  const handleDeposit = async () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount to deposit');
      return;
    }

    if (!selectedMethodId) {
      Alert.alert('Error', 'Please select a deposit method');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedMethod = depositMethods.find(m => m.id === selectedMethodId);
      await api.post('/payments/student/wallet/deposit', {
        amount: numericAmount,
        paymentMethod: selectedMethod?.provider,
        mobileNumber: selectedMethod?.type === 'MOMO' ? selectedMethod?.accountNumber : undefined,
        accountNumber: selectedMethod?.type === 'CARD' ? selectedMethod?.accountNumber : undefined,
        referenceId: 'dep-' + Math.random().toString(36).substring(7) + Date.now().toString()
      });

      showToast({
        status: 'success',
        title: 'Deposit Successful',
        subtitle: `${numericAmount.toFixed(2)} GHS added to your wallet.`
      });
      navigation.canGoBack() ? navigation.goBack() : (navigation as any).navigate('Main');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data || error.message || 'Failed to deposit funds');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentNumericAmount = parseFloat(amount);
  const isValidAmount = !isNaN(currentNumericAmount) && currentNumericAmount > 0;

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : (navigation as any).navigate('Main'))}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Deposit Funds</Text>
              <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                Add money to your wallet via Mobile Money or Card
              </Text>
            </View>
          </View>

          {/* Hero Amount Input Card */}
          <View
            style={[
              styles.amountHeroCard,
              {
                backgroundColor: isDark ? 'rgba(255, 107, 53, 0.08)' : '#FFF9F5',
                borderColor: isDark ? 'rgba(255, 107, 53, 0.25)' : '#FCE2D6',
              }
            ]}
          >
            <Text style={[styles.amountLabel, { color: colors.primary }]}>ENTER DEPOSIT AMOUNT</Text>

            <View style={styles.amountInputRow}>
              <Text style={[styles.currencyPrefix, { color: colors.primary }]}>GHS</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.placeholderText}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Quick Amount Chips */}
            <View style={styles.quickChipsRow}>
              {[50, 100, 200, 500].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: isDark ? colors.border : '#EADBCE',
                    }
                  ]}
                  onPress={() => handleQuickAdd(val)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: colors.primary }]}>+₵{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Section Heading */}
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Payment Method</Text>
          </View>

          {/* Dev Sandbox Banner */}
          <View style={styles.sandboxBanner}>
            <Ionicons name="sparkles" size={14} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={styles.sandboxText}>Local Sandbox: Paystack MoMo / Card test mode active</Text>
          </View>

          {/* Deposit Methods List */}
          <View style={styles.methodsList}>
            {depositMethods.map((item) => {
              const isSelected = selectedMethodId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.methodCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                    },
                    isSelected && {
                      borderColor: colors.primary,
                      borderWidth: 2,
                      backgroundColor: isDark ? 'rgba(255, 107, 53, 0.12)' : '#FFF3ED',
                    }
                  ]}
                  onPress={() => setSelectedMethodId(item.id)}
                  activeOpacity={0.88}
                >
                  <View style={styles.methodLeft}>
                    <View
                      style={[
                        styles.iconBadge,
                        { backgroundColor: isSelected ? colors.primaryLight : colors.inputBackground }
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <View style={styles.methodInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.methodProvider, { color: colors.text }]}>{item.provider}</Text>
                        {item.isDefault && (
                          <View style={[styles.defaultBadge, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.methodAccount, { color: colors.textMuted }]}>
                        {item.accountNumber}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.radioWrap}>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    ) : (
                      <View style={[styles.radioUnchecked, { borderColor: colors.border }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Deposit Button */}
          <TouchableOpacity
            style={[
              styles.depositButton,
              { backgroundColor: colors.primary },
              (!isValidAmount || !selectedMethodId || isSubmitting) && {
                backgroundColor: isDark ? colors.border : '#E2DCD5',
                elevation: 0,
                shadowOpacity: 0,
              }
            ]}
            onPress={handleDeposit}
            disabled={!isValidAmount || !selectedMethodId || isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text
                  style={[
                    styles.depositButtonText,
                    (!isValidAmount || !selectedMethodId) && { color: colors.textMuted }
                  ]}
                >
                  {isValidAmount ? `Deposit GHS ${currentNumericAmount.toFixed(2)}` : 'Enter Amount to Deposit'}
                </Text>
                {isValidAmount && (
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                )}
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 20,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextWrap: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  amountHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  currencyPrefix: {
    fontSize: 26,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 42,
    fontWeight: '900',
    minWidth: 160,
    textAlign: 'center',
    paddingVertical: 0,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sandboxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  sandboxText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
  },
  methodsList: {
    gap: 12,
    marginBottom: 28,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  methodInfo: {
    flex: 1,
  },
  methodProvider: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  methodAccount: {
    fontSize: 13,
    marginTop: 3,
  },
  radioWrap: {
    marginLeft: 10,
  },
  radioUnchecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  depositButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default DepositScreen;
