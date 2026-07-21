import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
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
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChange = (text: string, index: number) => {
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
        <View style={[styles.sheetContainer, { backgroundColor: colors.cardBackground, shadowColor: colors.text }]}>
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={[styles.headerLabel, { color: colors.text }]}>Confirm Completion</Text>
              {clientName && (
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>with {clientName}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtnCircle, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {isSuccess ? (
            <View style={styles.successContent}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Job Complete!</Text>
              <Text style={[styles.successSub, { color: colors.textMuted }]}>
                Funds have been released to your wallet.
              </Text>
              {agreedPrice !== undefined && (
                <View style={[styles.payoutBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.payoutLabel, { color: colors.textMuted }]}>Payout Amount</Text>
                  <Text style={[styles.payoutAmount, { color: colors.success }]}>
                    +{(agreedPrice * 0.88).toFixed(2)} GHS
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.content}>
              <View style={[styles.instructionBox, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  {serviceMode === 'REMOTE'
                    ? `Enter the 6-digit code provided by ${clientName || 'the client'} over chat.`
                    : `Ask ${clientName || 'the client'} to read you the code, or check chat if they sent it.`}
                </Text>
              </View>

              <View style={styles.codeContainer}>
                {code.map((digit, idx) => {
                  const isFocused = focusedIndex === idx;
                  const hasValue = digit !== '';
                  const borderColor = error ? '#FF3B30' : (isFocused ? colors.primary : (hasValue ? colors.border : 'transparent'));
                  const bgColor = isFocused ? colors.cardBackground : colors.background;

                  return (
                    <TextInput
                      key={idx}
                      ref={(ref) => { inputs.current[idx] = ref; }}
                      style={[
                        styles.codeInput,
                        { 
                          borderColor: borderColor, 
                          backgroundColor: bgColor,
                          color: colors.text,
                          elevation: isFocused ? 2 : 0,
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isFocused ? 0.2 : 0,
                          shadowRadius: 4,
                        }
                      ]}
                      keyboardType="number-pad"
                      maxLength={6} 
                      value={digit}
                      onChangeText={(text) => handleChange(text, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      onFocus={() => setFocusedIndex(idx)}
                      onBlur={() => setFocusedIndex(null)}
                      selectTextOnFocus
                    />
                  );
                })}
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={16} color="#FF3B30" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={[
                  styles.submitBtn, 
                  { 
                    backgroundColor: submitting ? colors.textMuted : colors.primary, 
                    opacity: isComplete ? 1 : 0.5,
                    shadowColor: colors.primary 
                  }
                ]} 
                onPress={handleSubmit} 
                activeOpacity={0.8}
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheetContainer: { 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    paddingHorizontal: 24, 
    paddingTop: 12, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20
  },
  dragHandle: { width: 48, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  headerLabel: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  headerSub: { fontSize: 15, fontWeight: '500' },
  closeBtnCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center' },
  instructionBox: { 
    flexDirection: 'row', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 32,
    alignItems: 'flex-start',
    width: '100%'
  },
  instructionText: { fontSize: 15, lineHeight: 22, fontWeight: '500', flex: 1 },
  codeContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 32, width: '100%' },
  codeInput: { 
    width: 48, 
    height: 56, 
    borderWidth: 1.5, 
    borderRadius: 14, 
    textAlign: 'center', 
    fontSize: 24, 
    fontWeight: '700' 
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF3B3015', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 24 },
  errorText: { color: '#FF3B30', marginLeft: 8, fontSize: 14, fontWeight: '600' },
  submitBtn: { 
    paddingVertical: 16, 
    borderRadius: 16, 
    width: '100%', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 4
  },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  successContent: { alignItems: 'center', justifyContent: 'center', paddingBottom: 20, paddingTop: 10 },
  iconWrapper: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  successSub: { fontSize: 16, marginBottom: 32, textAlign: 'center' },
  payoutBox: { paddingVertical: 20, paddingHorizontal: 32, borderRadius: 20, alignItems: 'center', width: '100%', borderWidth: 1 },
  payoutLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  payoutAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
});
