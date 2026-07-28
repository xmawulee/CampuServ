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
import * as ImagePicker from 'expo-image-picker';
import { uploadPortfolioPhoto, deletePortfolioPhoto, updateProviderService, deleteProviderService } from '../../services/userService';
import { BASE_URL } from '../../services/api';
import { Image } from 'react-native';

const CATEGORY_ICONS: Record<string, { icon: string; bg: string; iconColor: string }> = {
  'Laundry':  { icon: 'water',         bg: 'rgba(0, 150, 255, 0.1)',   iconColor: '#0096FF' },
  'Cleaning': { icon: 'sparkles',      bg: 'rgba(0, 200, 150, 0.1)',   iconColor: '#00C896' },
  'Tutoring': { icon: 'book',          bg: 'rgba(150, 0, 255, 0.1)',   iconColor: '#9600FF' },
  'Delivery': { icon: 'bicycle',       bg: 'rgba(255, 100, 0, 0.1)',   iconColor: '#FF6400' },
  'Design':   { icon: 'color-palette', bg: 'rgba(255, 0, 150, 0.1)',   iconColor: '#FF0096' },
  'Repairs':  { icon: 'hammer',        bg: 'rgba(100, 100, 100, 0.1)', iconColor: '#646464' },
};

const SUGGESTED_TAGS = [
  'Express Delivery',
  '24hr Turnaround',
  'Doorstep Pickup',
  'Ironing Included',
  'Affordable Rates',
  'Weekend Available',
  'Custom Quotes',
  'Student Discount',
  'Same-Day Service',
  'Emergency Repairs',
];

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
  const [deletingListing, setDeletingListing] = useState(false);
  const [photos, setPhotos] = useState<string[]>(user?.portfolio || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [whatsappNumber, setWhatsappNumber] = useState(
    existingListing?.whatsappNumber || user?.whatsappNumber || ''
  );
  const [bio, setBio] = useState(
    existingListing?.bio || user?.bio || ''
  );
  const [keyServices, setKeyServices] = useState<string[]>(
    existingListing?.keyServices || user?.keyServices || ['Express Delivery', 'Doorstep Pickup']
  );
  const [customTagInput, setCustomTagInput] = useState('');

  const toggleTag = (tag: string) => {
    if (keyServices.includes(tag)) {
      setKeyServices(keyServices.filter((t) => t !== tag));
    } else {
      setKeyServices([...keyServices, tag]);
    }
  };

  const addCustomTag = () => {
    if (!customTagInput.trim()) return;
    const newTag = customTagInput.trim();
    if (!keyServices.includes(newTag)) {
      setKeyServices([...keyServices, newTag]);
    }
    setCustomTagInput('');
  };

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

  const isCategoryAllowed = (catName: string, catId: string) => {
    if (!user?.serviceCategory) return true;
    const approved = user.serviceCategory.split(',').map(s => s.trim().toLowerCase());
    return approved.includes(catName.toLowerCase()) || approved.includes(catId.toLowerCase());
  };

  useEffect(() => {
    if (!existingListing && !categoryId && categories.length > 0 && user?.serviceCategory) {
      const allowed = categories.find(cat => isCategoryAllowed(cat.name, cat.id));
      if (allowed) setCategoryId(allowed.id);
    }
  }, [categories, user, existingListing, categoryId]);

  const handleSave = async () => {
    if (!categoryId) {
      showToast('Please select a service category.', 'error');
      return;
    }
    const selectedCat = categories.find(cat => cat.id === categoryId);
    if (selectedCat && !isCategoryAllowed(selectedCat.name, selectedCat.id)) {
      showToast(`You are approved strictly for ${user?.serviceCategory} listings only.`, 'error');
      return;
    }
    const price = 1.0; // Quote-based pricing model default
    if (!user) {
      showToast('Authentication error. Please re-login.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        categoryId,
        basePrice: price,
        whatsappNumber: whatsappNumber.trim(),
        bio: bio.trim(),
        keyServices,
        portfolio: photos,
      };
      if (existingListing) {
        await updateProviderService(user.id, existingListing.id, payload);
        showToast('Listing updated successfully!', 'success');
      } else {
        await api.post(`/providers/${user.id}/services`, payload);
        showToast('Service listing created successfully!', 'success');
      }
      const { updateUser } = useAuthStore.getState();
      await updateUser({
        bio: bio.trim(),
        whatsappNumber: whatsappNumber.trim(),
        keyServices,
        portfolio: photos,
      });
      setTimeout(() => navigation.goBack(), 800);
    } catch (e: any) {
      const msg = e.response?.data || 'Failed to save listing.';
      showToast(typeof msg === 'string' ? msg : 'Failed to save listing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteListing = () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this service listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user || !existingListing) return;
            setDeletingListing(true);
            try {
              await deleteProviderService(user.id, existingListing.id);
              showToast('Listing deleted.', 'success');
              setTimeout(() => navigation.goBack(), 800);
            } catch (e: any) {
              showToast(e.message || 'Failed to delete listing.', 'error');
              setDeletingListing(false);
            }
          },
        },
      ]
    );
  };

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('file:') || url.startsWith('data:')) return url;
    return `${BASE_URL}${url}`;
  };

  const handleAddPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Please allow photo library access in settings.', 'error');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      if (!user) return;

      setUploadingPhoto(true);
      const formData = new FormData();
      const mimeType = asset.mimeType || 'image/jpeg';
      const fileExt = mimeType.includes('png') ? 'png' : 'jpg';
      const fileObj = {
        uri: asset.uri,
        type: mimeType,
        name: `listing_${user.id}_${Date.now()}.${fileExt}`,
      } as any;
      formData.append('file', fileObj);

      const res = await uploadPortfolioPhoto(user.id, formData);
      setPhotos(res.portfolio || []);
      const { accessToken, refreshToken, setAuth } = useAuthStore.getState();
      if (accessToken && refreshToken) {
        await setAuth(accessToken, refreshToken, {
          ...user,
          portfolio: res.portfolio || [],
        });
      }
      showToast('Photo uploaded successfully!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to upload photo.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (url: string) => {
    if (!user) return;
    try {
      const res = await deletePortfolioPhoto(user.id, url);
      setPhotos(res.portfolio || []);
      const { accessToken, refreshToken, setAuth } = useAuthStore.getState();
      if (accessToken && refreshToken) {
        await setAuth(accessToken, refreshToken, {
          ...user,
          portfolio: res.portfolio || [],
        });
      }
      showToast('Photo removed.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to remove photo.', 'error');
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
          <View style={[styles.infoBanner, { backgroundColor: 'rgba(0, 150, 255, 0.08)', borderColor: 'rgba(0, 150, 255, 0.3)' }]}>
            <Ionicons name="create-outline" size={18} color="#0096FF" />
            <Text style={[styles.infoBannerText, { color: colors.text }]}>
              Editing existing service listing. Price or category updates and photo uploads take effect immediately across all student feeds.
            </Text>
          </View>
        )}

        {/* Price */}
        {/* Price indicator */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Pricing Model</Text>
          <View style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, justifyContent: 'center' }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Contact for quote</Text>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            All listings on CampusServ use a quote-based pricing model. Students will contact you for a custom rate per job.
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
              const allowed = isCategoryAllowed(cat.name, cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catCard,
                    { backgroundColor: config.bg, width: 110, opacity: allowed ? 1 : 0.45 },
                    isSelected && { borderWidth: 2.5, borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    if (!allowed) {
                      showToast(`You are approved strictly for ${user?.serviceCategory} listings only.`, 'error');
                      return;
                    }
                    setCategoryId(cat.id);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: '#FFFFFF' }]}>
                    <Ionicons
                      name={allowed ? (config.icon as any) : "lock-closed"}
                      size={20}
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

        {/* Contact / WhatsApp Number */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Contact / WhatsApp Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. 0241234567 or +233241234567"
            placeholderTextColor={colors.placeholderText}
            keyboardType="phone-pad"
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Used when students tap the "Call Now" or WhatsApp buttons on your marketplace listing.
          </Text>
        </View>

        {/* Detailed Service Description / Bio */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Detailed Service Description</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
                height: 100,
                paddingTop: 12,
                textAlignVertical: 'top',
              },
            ]}
            placeholder="Describe your service guarantees, turnaround times, delivery rules, pricing breakdown, or special offers..."
            placeholderTextColor={colors.placeholderText}
            multiline
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Appears under "About This Service & Seller" on your full marketplace detail screen.
          </Text>
        </View>

        {/* Key Specialty Tags */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Key Specialties & Badges</Text>
          <Text style={[styles.hint, { color: colors.textMuted, marginTop: 0, marginBottom: 12 }]}>
            Select or type badges that highlight why your service stands out. These appear directly on your feed card!
          </Text>

          {/* Quick chip suggestions */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {SUGGESTED_TAGS.map((tag) => {
              const isSelected = keyServices.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tagChipText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {isSelected ? '✓ ' : '+ '}{tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom tag adder */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[
                styles.input,
                { flex: 1, backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, height: 46 },
              ]}
              placeholder="Add custom tag (e.g. Free Detergent)..."
              placeholderTextColor={colors.placeholderText}
              value={customTagInput}
              onChangeText={setCustomTagInput}
              onSubmitEditing={addCustomTag}
            />
            <TouchableOpacity
              style={[styles.addTagBtn, { backgroundColor: colors.primary }]}
              onPress={addCustomTag}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Display active custom tags not in SUGGESTED_TAGS */}
          {keyServices.filter((t) => !SUGGESTED_TAGS.includes(t)).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {keyServices
                .filter((t) => !SUGGESTED_TAGS.includes(t))
                .map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagChipText, { color: '#FFF' }]}>✓ {tag} ✕</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>

        {/* Listing Photos & Work Samples */}
        <View style={styles.formGroup}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>
              Listing Photos & Work Samples ({photos.length})
            </Text>
            <TouchableOpacity onPress={handleAddPhoto} disabled={uploadingPhoto} style={styles.addPhotoBtn}>
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={[styles.addPhotoText, { color: colors.primary }]}>+ Add Photo</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted, marginTop: 0, marginBottom: 12 }]}>
            Upload high-quality photos of your past work, equipment, or service results. These appear in the photo carousel when students view your marketplace listing.
          </Text>

          {uploadingPhoto && (
            <View style={[styles.uploadingBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.text, marginLeft: 8 }}>Uploading image...</Text>
            </View>
          )}

          {photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {photos.map((url, idx) => (
                <View key={idx} style={[styles.photoThumbWrap, { borderColor: colors.border }]}>
                  <Image source={{ uri: getFullUrl(url) }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.deletePhotoBtn}
                    onPress={() => handleDeletePhoto(url)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={[styles.emptyPhotoBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              onPress={handleAddPhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={28} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>
                No photos uploaded yet. Tap to upload your first sample.
              </Text>
            </TouchableOpacity>
          )}
        </View>

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
          disabled={saving || deletingListing}
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

        {existingListing && (
          <TouchableOpacity
            style={[styles.deleteBtn, deletingListing && { opacity: 0.7 }]}
            onPress={handleDeleteListing}
            disabled={saving || deletingListing}
            activeOpacity={0.85}
          >
            {deletingListing ? (
              <ActivityIndicator color="#FF3B30" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                <Text style={styles.deleteBtnText}>Delete Listing</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
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

  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0, 150, 255, 0.1)' },
  addPhotoText: { fontSize: 12, fontWeight: '700' },
  uploadingBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  photoThumbWrap: { width: 100, height: 100, borderRadius: 12, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  deletePhotoBtn: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  emptyPhotoBox: { alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  deleteBtn: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: '#FF3B30' },
  deleteBtnText: { color: '#FF3B30', fontSize: 15, fontWeight: '700' },
  tagChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tagChipText: { fontSize: 12, fontWeight: '600' },
  addTagBtn: { paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center', height: 46 },
});
