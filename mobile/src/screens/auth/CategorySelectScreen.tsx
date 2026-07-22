import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { CategoryIcon } from '../../utils/categoryIcons';
import type { ServiceCategory } from '../../types/provider';

export default function CategorySelectScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const providerRegistrationData = route.params?.providerRegistrationData || null;
  const imageUri = route.params?.imageUri || null;
  const isUpgrade = route.params?.isUpgrade || false;

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: categories, isLoading: isFetching } = useQuery<ServiceCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data ?? [];
    },
  });

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedCategoryIds.length === 0) {
      setErrorMsg('Please select at least one service category.');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (user?.id) {
        const selectedCats = categories?.filter((c) => selectedCategoryIds.includes(c.id)) || [];
        const primaryCatName = selectedCats.map((c) => c.name).join(', ');

        // Update serviceCategory summary and add provider_services via auth-service
        await api.patch(`/auth/users/${user.id}/category`, {
          serviceCategory: primaryCatName,
          categoryIds: selectedCategoryIds,
        });

        await updateUser({
          isProvider: true,
          serviceCategory: primaryCatName,
        });
      }

      setIsSubmitting(false);
      navigation.navigate('ProviderBio');
    } catch (err: any) {
      setIsSubmitting(false);
      let message = 'Failed to submit application. Please try again.';
      if (err?.response?.data && typeof err.response.data === 'string') {
        message = err.response.data;
      }
      setErrorMsg(message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {navigation.canGoBack() && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isSubmitting}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}

          <Text style={[styles.stepIndicator, { color: colors.primary }]}>Step 2 of 4</Text>
          <Text style={[styles.heading, { color: colors.text }]}>What services will you offer?</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Select one or more categories. You can add or edit your prices and services later at any time.
        </Text>

        {errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{errorMsg}</Text>
          </View>
        )}

        {isFetching ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {categories?.map((cat) => {
              const isSelected = selectedCategoryIds.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    { borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => toggleCategory(cat.id)}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <CategoryIcon
                    name={cat.name}
                    size={20}
                    color={isSelected ? '#FFF' : colors.text}
                  />
                  <Text style={[styles.chipText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {cat.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary },
            (isSubmitting || selectedCategoryIds.length === 0) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || selectedCategoryIds.length === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              Continue ({selectedCategoryIds.length} selected)
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  backBtn: { marginBottom: 16, width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  stepIndicator: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  subheading: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
