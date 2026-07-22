import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import { useTheme } from '../styles/ThemeContext';

interface Props {
  visible: boolean;
  clientName?: string;
  agreedPrice?: number;
  onClose: () => void;
  onSubmit: (code: string) => void;
  submitting: boolean;
  isSuccess?: boolean;
  error?: string | null;
  serviceMode?: string;
}

export default function CompletionCodeEntryModal({ visible, clientName, agreedPrice, onClose, onSubmit, submitting, isSuccess, error, serviceMode }: Props) {
  const { colors } = useTheme();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChange = (text: string, index: number) => {
    // Handle paste
    if (text.length > 1) {
      const pasted = text.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const newCode = [...code];
      pasted.forEach((char, i) => {
        newCode[i] = char;
      });
      setCode(newCode);
      const nextIndex = Math.min(pasted.length, 5);
      inputs.current[nextIndex]?.focus();
      return;
    }

    // Handle single digit
    const newCode = [...code];
    newCode[index] = text.replace(/[^0-9]/g, '');
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const isComplete = code.every(c => c !== '');

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit(code.join(''));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerLabel, { color: colors.text }]}>Confirm completion</Text>
              {clientName && (
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>with {clientName}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="chevron-down" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {isSuccess ? (
            <View style={styles.successContent}>
              <Ionicons name="checkmark-circle" size={80} color={colors.success} style={{ marginBottom: 16 }} />
              <Text style={[styles.successTitle, { color: colors.text }]}>Job Complete!</Text>
              <Text style={[styles.successSub, { color: colors.textMuted }]}>
                Funds have been released to your wallet.
              </Text>
              {agreedPrice !== undefined && (
                <View style={[styles.payoutBox, { backgroundColor: colors.inputBackground }]}>
                  <Text style={[styles.payoutLabel, { color: colors.textMuted }]}>Payout Amount</Text>
                  <Text style={[styles.payoutAmount, { color: colors.success }]}>
                    +{(agreedPrice * 0.88).toFixed(2)} GHS
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={[styles.instruction, { color: colors.textMuted }]}>
                {serviceMode === 'REMOTE'
                  ? `Enter the 6-digit code provided by ${clientName || 'the client'} over chat or a call.`
                  : `Ask ${clientName || 'the client'} to read you the code, or check chat if they sent it there.`}
              </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(ref) => { inputs.current[idx] = ref; }}
                style={[
                  styles.codeInput,
                  { 
                    borderColor: error ? '#FF3B30' : (digit ? colors.primary : colors.border), 
                    backgroundColor: colors.inputBackground,
                    color: colors.text
                  }
                ]}
                keyboardType="number-pad"
                maxLength={6} // Allow longer for paste, but handle in onChangeText
                value={digit}
                onChangeText={(text) => handleChange(text, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                selectTextOnFocus
              />
            ))}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity 
            style={[
              styles.submitBtn, 
              { backgroundColor: submitting ? colors.textMuted : colors.primary, opacity: isComplete ? 1 : 0.6 }
            ]} 
            onPress={handleSubmit} 
            disabled={!isComplete || submitting}
          >
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Submit Code</Text>}
          </TouchableOpacity>
        </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheetContainer: { height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(150,150,150,0.3)', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerLabel: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  closeBtn: { padding: 4 },
  content: { flex: 1, alignItems: 'center' },
  instruction: { fontSize: 15, textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 },
  codeContainer: { flexDirection: 'row', gap: 8, marginBottom: 30 },
  codeInput: { width: 45, height: 55, borderWidth: 2, borderRadius: 12, textAlign: 'center', fontSize: 24, fontWeight: '800' },
  errorText: { color: '#FF3B30', marginBottom: 20, textAlign: 'center' },
  submitBtn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 24, width: '100%', alignItems: 'center', marginTop: 'auto', marginBottom: 30 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  successContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  successTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  successSub: { fontSize: 16, marginBottom: 24, textAlign: 'center' },
  payoutBox: { padding: 20, borderRadius: 16, alignItems: 'center', minWidth: 200 },
  payoutLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  payoutAmount: { fontSize: 28, fontWeight: '800' },
});
