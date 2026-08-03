import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useToast } from '../../styles/ToastContext';
import { useTheme } from '../../styles/ThemeContext';

export const DepositScreen = () => {
    const [amount, setAmount] = useState('');
    const [depositMethods] = useState<any[]>([
        { id: '1', type: 'MOMO', provider: 'MTN MoMo', accountNumber: '0551234321', isDefault: true },
        { id: '2', type: 'MOMO', provider: 'Vodafone Cash', accountNumber: '0209876543', isDefault: false },
        { id: '3', type: 'CARD', provider: 'Visa', accountNumber: '****1234', isDefault: false }
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

    const handleDeposit = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
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
                referenceId: "dep-" + Math.random().toString(36).substring(7) + Date.now().toString()
            });
            
            showToast({ 
                status: 'success', 
                title: 'Deposit Successful', 
                subtitle: `${numericAmount.toFixed(2)} GHS added to your wallet.` 
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data || error.message || 'Failed to deposit funds');
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
                    <Text style={[styles.methodAccount, { color: colors.textMuted }]}>{item.accountNumber}</Text>
                </View>
            </View>
            {selectedMethodId === item.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>Deposit Funds</Text>

            <View style={styles.amountContainer}>
                <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>GHS</Text>
                <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    autoFocus={true}
                />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Deposit Method</Text>
            
            <View style={{ backgroundColor: 'rgba(255, 165, 0, 0.15)', padding: 10, borderRadius: 8, marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#FFA500' }}>
                <Text style={{ color: '#FFA500', fontSize: 12, fontWeight: '600' }}>💡 Simulated in Local Development Mode (Paystack Dev Sandbox)</Text>
            </View>

            <FlatList
                data={depositMethods}
                keyExtractor={(item) => item.id}
                renderItem={renderMethod}
            />

            <TouchableOpacity 
                style={[
                    styles.depositButton, 
                    { backgroundColor: colors.primary },
                    (isSubmitting || !selectedMethodId) && { backgroundColor: isDark ? colors.border : '#E2E8F0' }
                ]} 
                onPress={handleDeposit}
                disabled={isSubmitting || !selectedMethodId}
            >
                <Text style={[styles.depositButtonText, (isSubmitting || !selectedMethodId) && { color: colors.textMuted }]}>
                    {isSubmitting ? 'Processing...' : 'Deposit'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
    amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
    currencySymbol: { fontSize: 28, marginRight: 10, fontWeight: 'bold' },
    amountInput: { fontSize: 48, fontWeight: 'bold', minWidth: 150, textAlign: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
    methodCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1 },
    methodInfo: { flexDirection: 'row', alignItems: 'center' },
    methodTextContainer: { marginLeft: 15 },
    methodProvider: { fontSize: 16, fontWeight: '500' },
    methodAccount: { fontSize: 14, marginTop: 2 },
    depositButton: { borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginTop: 20, marginBottom: 40 },
    depositButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
