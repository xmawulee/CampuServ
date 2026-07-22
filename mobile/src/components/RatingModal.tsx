import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import { useTheme } from '../styles/ThemeContext';
import { api } from '../services/api';
import { useToast } from '../styles/ToastContext';
import StatusDialog from './StatusDialog';

interface RatingModalProps {
  visible: boolean;
  jobId: string;
  providerName: string;
  onSuccess: () => void;
}

export default function RatingModal({ visible, jobId, providerName, onSuccess }: RatingModalProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ visible: false, message: '' });

  const handleSubmit = async () => {
    if (rating === 0) {
      setErrorDialog({ visible: true, message: 'Please select a star rating before submitting.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/reviews/${jobId}`, {
        rating,
        comment: comment.trim(),
        tags: []
      });
      showToast({ status: 'success', title: 'Rating submitted!', subtitle: 'Thank you for your feedback.' });
      onSuccess();
    } catch (e: any) {
      setErrorDialog({
        visible: true,
        message: e.response?.data || 'Failed to submit rating. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
            {/* CTA Header strip */}
            <View style={[styles.header, { backgroundColor: 'rgba(255,120,70,0.12)', borderBottomColor: '#FFA787' }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.headerLabel, { color: colors.primary }]}>Rate Provider</Text>
              </View>
            </View>

            {/* Star icon */}
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <Ionicons name="star" size={30} color="#FFFFFF" />
            </View>

            <Text style={[styles.title, { color: colors.primary }]}>Rate Your Experience</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              How was your experience with {providerName}?
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.75}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? colors.primary : colors.border}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="Write a review (optional)..."
              placeholderTextColor={colors.placeholderText}
              multiline
              numberOfLines={3}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.82}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
            <Text style={[styles.mandatoryText, { color: colors.textMuted }]}>
              This rating is mandatory to complete the job.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Error dialog for validation and submission failures */}
      <StatusDialog
        visible={errorDialog.visible}
        status={errorDialog.message.includes('select a star') ? 'warning' : 'error'}
        headerLabel={errorDialog.message.includes('select a star') ? 'Rating Required' : 'Submission Failed'}
        title={errorDialog.message.includes('select a star') ? 'Rating Required' : 'Submission Failed'}
        description={errorDialog.message}
        confirmLabel="OK"
        onConfirm={() => setErrorDialog({ visible: false, message: '' })}
        onClose={() => setErrorDialog({ visible: false, message: '' })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 14,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  input: {
    width: '88%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 80,
    fontSize: 14,
    marginBottom: 20,
  },
  submitBtn: {
    width: '88%',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  mandatoryText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
});
