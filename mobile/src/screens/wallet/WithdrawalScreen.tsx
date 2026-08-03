import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useToast } from '../../styles/ToastContext';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';

export const WithdrawalScreen = () => {
    const { user } = useAuthStore();
    const isStudent = user?.role !== 'PROVIDER';

    const [amount, setAmount] = useState('');
    const [payoutMethods] = useState<any[]>([
        { id: '1', type: 'MOMO', provider: 'MTN MoMo', accountNumber: '0551234321', isDefault: true },
        { id: '2', type: 'MOMO', provider: 'Vodafone Cash', accountNumber: '0209876543', isDefault: false },
        { id: '3', type: 'BANK', provider: 'Absa Ghana', accountNumber: '1234567890', isDefault: false }
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
                'Your withdrawal is currently processing. Please do not leave this page or close the app.',
                [{ text: 'OK', style: 'cancel' }]
            );
        });
        return unsubscribe;
    }, [navigation, isSubmitting]);

    const handleWithdraw = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (!selectedMethodId) {
            Alert.alert('Error', 'Please select a payout method');
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedMethod = payoutMethods.find((m: any) => m.id === selectedMethodId);
            const endpoint = isStudent 
                ? '/payments/student/wallet/withdraw' 
                : '/payments/provider/wallet/withdraw';

            await api.post(endpoint, {
                amount: numericAmount,
                paymentMethod: selectedMethod?.provider,
                mobileNumber: selectedMethod?.type === 'MOMO' ? selectedMethod?.accountNumber : undefined,
                accountNumber: selectedMethod?.type === 'BANK' ? selectedMethod?.accountNumber : undefined,
                bankName: selectedMethod?.type === 'BANK' ? selectedMethod?.provider : undefined,
                referenceId: "wit-" + Math.random().toString(36).substring(7) + Date.now().toString()
            });
            showToast({ 
                status: 'success', 
                title: 'Withdrawal Successful', 
                subtitle: `${numericAmount.toFixed(2)} GHS deducted from your wallet.` 
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data || error.message || 'Failed to withdraw');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderMethod = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[
                styles.methodCard, 
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                selectedMethodId === item.id && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
            ]}
            onPress={() => setSelectedMethodId(item.id)}
        >
            <View style={styles.methodInfo}>
                <Ionicons 
                    name={item.type === 'MOMO' ? 'phone-portrait-outline' : 'card-outline'} 
                    size={24} 
                    color={selectedMethodId === item.id ? colors.primary : colors.textMuted} 
                />
                <View style={styles.methodTextContainer}>
                    <Text style={[styles.methodProvider, { color: colors.text }]}>{item.provider}</Text>
                    <Text style={[styles.methodAccount, { color: colors.textMuted }]}>**** {item.accountNumber.slice(-4)}</Text>
                </View>
            </View>
            {selectedMethodId === item.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>Withdraw Funds</Text>

            <View style={styles.amountContainer}>
                <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>GHS</Text>
                <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Payout Method (Simulation)</Text>
            
            <FlatList
                data={payoutMethods}
                keyExtractor={(item) => item.id}
                renderItem={renderMethod}
            />

            <TouchableOpacity 
                style={[
                    styles.withdrawButton, 
                    { backgroundColor: colors.primary },
                    (isSubmitting || !selectedMethodId) && { backgroundColor: isDark ? colors.border : '#E2E8F0' }
                ]} 
                onPress={handleWithdraw}
                disabled={isSubmitting || !selectedMethodId}
            >
                <Text style={[styles.withdrawButtonText, (isSubmitting || !selectedMethodId) && { color: colors.textMuted }]}>
                    {isSubmitting ? 'Processing...' : 'Withdraw'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    currencySymbol: {
        fontSize: 28,
        marginRight: 10,
        fontWeight: 'bold',
    },
    amountInput: {
        fontSize: 48,
        fontWeight: 'bold',
        minWidth: 150,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 15,
    },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
    },
    methodInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    methodTextContainer: {
        marginLeft: 15,
    },
    methodProvider: {
        fontSize: 16,
        fontWeight: '500',
    },
    methodAccount: {
        fontSize: 14,
        marginTop: 2,
    },
    withdrawButton: {
        borderRadius: 8,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    withdrawButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 8,
    },
    emptyText: {
        marginBottom: 15,
    },
    addMethodButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    addMethodText: {
        color: '#fff',
        fontWeight: '500',
    },
});
