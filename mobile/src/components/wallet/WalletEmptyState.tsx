import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CustomIonicons as Ionicons } from '../CustomIcons';
import { useTheme } from '../../styles/ThemeContext';

interface WalletEmptyStateProps {
  onDepositPress?: () => void;
}

export default function WalletEmptyState({ onDepositPress }: WalletEmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="card-outline" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>No Transactions Yet</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Your deposits and withdrawals will appear here.
      </Text>
      {onDepositPress && (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={onDepositPress}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Make Your First Deposit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 220,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
