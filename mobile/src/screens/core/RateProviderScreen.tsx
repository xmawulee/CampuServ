import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { api } from '../../services/api';
import { useToast } from '../../styles/ToastContext';

export default function RateProviderScreen({ route, navigation }: any) {
  const { jobId, providerName, providerId, categoryName, avatarInitial } = route.params;
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRatingLabel = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Below expectations';
      case 3: return 'Okay';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return 'Rate your experience';
    }
  };

  const getAvailableTags = () => {
    if (rating >= 4) {
      return ['On time', 'Great communication', 'High quality work', 'Friendly'];
    } else if (rating > 0 && rating <= 3) {
      return ['Late', 'Poor communication', 'Work quality issue', "Didn't finish job"];
    }
    return [];
  };

  // Reset tags if rating changes across the threshold
  useEffect(() => {
    setSelectedTags([]);
  }, [rating >= 4]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await api.post(`/reviews/${jobId}`, {
        direction: 'REQUESTER_TO_PROVIDER',
        rating,
        comment,
        tags: selectedTags.map(t => t.toLowerCase().replace(/ /g, '_'))
      });
      showToast({ status: 'success', title: 'Review submitted successfully!' });
      navigation.goBack();
    } catch (e: any) {
      showToast({ status: 'error', title: e.response?.data || 'Failed to submit review' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTags = getAvailableTags();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{avatarInitial || (providerName ? providerName.charAt(0) : 'P')}</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              How was your {categoryName || 'service'} with {providerName}?
            </Text>
          </View>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7} style={styles.starBtn}>
                <Ionicons
                  name={rating >= star ? 'star' : 'star-outline'}
                  size={48}
                  color={rating >= star ? '#FFB800' : colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.ratingLabel, { color: rating > 0 ? colors.text : colors.textMuted }]}>
            {getRatingLabel()}
          </Text>

          {rating > 0 && availableTags.length > 0 && (
            <View style={styles.tagsContainer}>
              {availableTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      { borderColor: isSelected ? colors.primary : colors.border },
                      isSelected && { backgroundColor: colors.primary + '15' }
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagText, { color: isSelected ? colors.primary : colors.text }]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="What went well or could improve? (Optional)"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              value={comment}
              onChangeText={setComment}
            />
          </View>

        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: rating === 0 ? colors.border : colors.primary }]}
            disabled={rating === 0 || isSubmitting}
            onPress={handleSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    textAlign: 'center',
    lineHeight: 30,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 32,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  tagChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  inputContainer: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  }
});
