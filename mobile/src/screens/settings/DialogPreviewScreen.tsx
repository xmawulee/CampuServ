/**
 * DialogPreviewScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dev-only screen for visually QA-ing all StatusToast and StatusDialog variants.
 * Accessible from SettingsScreen in development mode.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';
import { DialogStatus } from '../../styles/dialogStatusStyles';

const STATUSES: DialogStatus[] = ['success', 'warning', 'info', 'error', 'cta'];
const STATUS_LABELS: Record<DialogStatus, string> = {
  success: '✓ Success',
  warning: '⚠ Warning',
  info: 'ℹ Info',
  error: '✕ Error',
  cta: '★ CTA / Brand',
};

export default function DialogPreviewScreen({ navigation }: any) {
  const { colors, toggleTheme, isDark } = useTheme();
  const { showToast } = useToast();
  const [dialog, setDialog] = useState<{ visible: boolean; status: DialogStatus }>({
    visible: false,
    status: 'success',
  });

  const fireToast = (status: DialogStatus) => {
    showToast({
      status,
      title: `${STATUS_LABELS[status]} Toast`,
      subtitle: 'Subtitle text for extra context goes here.',
      duration: 3500,
    });
  };

  const fireDialog = (status: DialogStatus) => {
    setDialog({ visible: true, status });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>UI Component Preview</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.backBtn}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Toast section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>StatusToast</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Slides from top — fire multiple to test stacking
        </Text>
        <View style={styles.grid}>
          {STATUSES.map((status) => (
            <TouchableOpacity
              key={`toast-${status}`}
              style={[styles.chip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => fireToast(status)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: colors.text }]}>{STATUS_LABELS[status]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stack stress test */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            STATUSES.forEach((s, i) => {
              setTimeout(() => fireToast(s), i * 300);
            });
          }}
        >
          <Text style={styles.actionBtnText}>Fire All 5 (Stacking Test)</Text>
        </TouchableOpacity>

        {/* Dialog section */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>StatusDialog</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Blocking modal with tinted header + body
        </Text>
        <View style={styles.grid}>
          {STATUSES.map((status) => (
            <TouchableOpacity
              key={`dialog-${status}`}
              style={[styles.chip, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => fireDialog(status)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: colors.text }]}>{STATUS_LABELS[status]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 1-button variant */}
        <Text style={[styles.sectionSub, { color: colors.textMuted, marginTop: 20 }]}>
          1-button variant (no cancel label)
        </Text>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
          onPress={() => showToast({ status: 'info', title: 'Single-button demo — use the dialog buttons above' })}
        >
          <Text style={styles.actionBtnText}>See Info Dialog (1-button)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Shared dialog */}
      <StatusDialog
        visible={dialog.visible}
        status={dialog.status}
        title={`${STATUS_LABELS[dialog.status]} Dialog`}
        description="This is the body description text. It explains what happened and what the user should do next."
        confirmLabel={dialog.status === 'error' ? 'Retry' : dialog.status === 'warning' ? 'Proceed Anyway' : 'Got It'}
        cancelLabel={['error', 'warning', 'cta'].includes(dialog.status) ? 'Cancel' : undefined}
        destructive={dialog.status === 'error'}
        onConfirm={() => setDialog(prev => ({ ...prev, visible: false }))}
        onCancel={() => setDialog(prev => ({ ...prev, visible: false }))}
        onClose={() => setDialog(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionSub: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  actionBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
