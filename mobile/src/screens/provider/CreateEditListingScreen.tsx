import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import Toast from '../../components/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServiceCategory } from '../../types/provider';

const CATEGORY_ICONS: Record<string, { icon: string; bg: string; iconColor: string }> = {
  'Laundry':  { icon: 'water',         bg: 'rgba(0, 150, 255, 0.1)',   iconColor: '#0096FF' },
  'Cleaning': { icon: 'sparkles',      bg: 'rgba(0, 200, 150, 0.1)',   iconColor: '#00C896' },
  'Tutoring': { icon: 'book',          bg: 'rgba(150, 0, 255, 0.1)',   iconColor: '#9600FF' },
  'Delivery': { icon: 'bicycle',       bg: 'rgba(255, 100, 0, 0.1)',   iconColor: '#FF6400' },
  'Design':   { icon: 'color-palette', bg: 'rgba(255, 0, 150, 0.1)',   iconColor: '#FF0096' },
  'Repairs':  { icon: 'hammer',        bg: 'rgba(100, 100, 100, 0.1)', iconColor: '#646464' },
};

export default function CreateEditListingScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const existingListing = route.params?.listing;

  const [basePrice, setBasePrice] = useState(
    existingListing?.basePrice?.toString() || ''
  );
  const [categoryId, setCategoryId] = useState(
    existingListing?.category?.id || ''
  );
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data || []);
      } catch {
        // Fallback to static list
        setCategories([
          { id: 'cat-1', name: 'Laundry' },
          { id: 'cat-2', name: 'Cleaning' },
          { id: 'cat-3', name: 'Tutoring' },
          { id: 'cat-4', name: 'Delivery' },
          { id: 'cat-6', name: 'Repairs' },
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const handleSave = async () => {
    if (!categoryId) {
      showToast('Please select a service category.', 'error');
      return;
    }
    const price = parseFloat(basePrice);
    if (isNaN(price) || price <= 0) {
      showToast('Please enter a valid price.', 'error');
      return;
    }
    if (!user) {
      showToast('Authentication error. Please re-login.', 'error');
      return;
    }

    setSaving(true);
    try {
      // POST /providers/{id}/services — creates a new ProviderService record
      await api.post(`/providers/${user.id}/services`, {
        categoryId,
        basePrice: price,
      });
      showToast('Service listing created successfully!', 'success');
      setTimeout(() => navigation.goBack(), 800);
    } catch (e: any) {
      const msg = e.response?.data || 'Failed to save listing.';
      showToast(typeof msg === 'string' ? msg : 'Failed to save listing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {existingListing ? 'Edit Listing' : 'Add a Service'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Note for editing */}
        {existingListing && (
          <View style={[styles.infoBanner, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>
              You can only create new listings. To modify pricing, add a new listing for the same category.
            </Text>
          </View>
        )}

        {/* Price */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Base Price (GHS)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. 50.00"
            placeholderTextColor={colors.placeholderText}
            keyboardType="numeric"
            value={basePrice}
            onChangeText={setBasePrice}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            This is your base rate. You can negotiate per-job pricing when bidding.
          </Text>
        </View>

        {/* Category picker */}
        <Text style={[styles.label, { color: colors.textMuted }]}>Service Category</Text>
        {loadingCategories ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -24, marginBottom: 28 }}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
          >
            {categories.map((cat) => {
              const config = CATEGORY_ICONS[cat.name] || {
                icon: 'apps-outline',
                bg: colors.inputBackground,
                iconColor: colors.textMuted,
              };
              const isSelected = categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catCard,
                    { backgroundColor: config.bg, width: 110 },
                    isSelected && { borderWidth: 2.5, borderColor: colors.primary },
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: '#FFFFFF' }]}>
                    <Ionicons
                      name={config.icon as any}
                      size={22}
                      color={isSelected ? colors.primary : config.iconColor}
                    />
                  </View>
                  <Text style={[styles.catLabel, { color: isSelected ? colors.primary : '#444' }]}>
                    {cat.name}
                  </Text>
                  {isSelected && (
                    <View style={[styles.catCheck, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Info about what a listing does */}
        <View style={[styles.tipCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
          <Ionicons name="bulb-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: colors.primary }]}>How listings work</Text>
            <Text style={[styles.tipText, { color: colors.text }]}>
              Adding a service registers you as a provider for that category. Students can then find you when they post requests for that service.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>
              {existingListing ? 'Save Changes' : 'Add Service'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Toast message={toastMessage} visible={toastVisible} type={toastType} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 24, paddingBottom: 100 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20,
  },
  infoBannerText: { fontSize: 12, lineHeight: 17, flex: 1 },

  formGroup: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { height: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  hint: { fontSize: 12, marginTop: 6, lineHeight: 16 },

  catCard: {
    borderRadius: 14, padding: 12, alignItems: 'center',
    gap: 8, minHeight: 80, justifyContent: 'center', position: 'relative',
  },
  catIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  catCheck: {
    position: 'absolute', top: -5, right: -5,
    width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },

  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  tipText: { fontSize: 12, lineHeight: 17 },

  footer: { padding: 24, paddingTop: 16, borderTopWidth: 1 },
  saveBtn: {
    height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
