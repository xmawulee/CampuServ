import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import { useTheme } from '../styles/ThemeContext';

interface Props {
  visible: boolean;
  code: string | null;
  providerName?: string;
  onClose: () => void;
  onRegenerate: () => void;
  onDispute: () => void;
  loadingRegenerate: boolean;
  serviceMode?: string;
}

export default function CompletionCodeClientModal({ visible, code, providerName, onClose, onRegenerate, onDispute, loadingRegenerate, serviceMode }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerLabel, { color: colors.text }]}>Confirm completion</Text>
              {providerName && (
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>with {providerName}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="chevron-down" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

        <View style={styles.content}>
          <Text style={[styles.instruction, { color: colors.textMuted }]}>
            {serviceMode === 'REMOTE'
              ? 'Share this code with your provider over chat or a call.'
              : `Read this out loud to ${providerName || 'your provider'} once the job is done.`}
          </Text>

          {code ? (
            <View style={styles.codeContainer}>
              {code.split('').map((char, idx) => (
                <View key={idx} style={[styles.codeBox, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
                  <Text style={[styles.codeText, { color: colors.text }]}>{char}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.codeContainer, { minHeight: 80, justifyContent: 'center' }]}>
               <Text style={{color: colors.textMuted}}>Code not available. Regenerate to get a new one.</Text>
            </View>
          )}

          <View style={styles.footerActions}>
            <TouchableOpacity style={[styles.regenBtn, { borderColor: colors.border }]} onPress={onRegenerate} disabled={loadingRegenerate}>
              {loadingRegenerate ? <ActivityIndicator color={colors.primary} /> : (
                <Text style={[styles.regenText, { color: colors.primary }]}>Resend code</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.disputeBtn} onPress={onDispute}>
              <Text style={styles.disputeText}>Something's wrong</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheetContainer: { height: '55%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(150,150,150,0.3)', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerLabel: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  closeBtn: { padding: 4 },
  content: { flex: 1, alignItems: 'center' },
  instruction: { fontSize: 15, textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 },
  codeContainer: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  codeBox: { width: 45, height: 55, borderWidth: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontSize: 28, fontWeight: '800' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 'auto', marginBottom: 30 },
  regenBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  regenText: { fontSize: 14, fontWeight: '600' },
  disputeBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  disputeText: { color: '#FF3B30', fontSize: 14, fontWeight: '600' },
});
