import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { api, BASE_URL } from '../../services/api';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { createRequest } from '../../services/requestService';
import { reverseGeocode, placesAutocomplete, getDirections, getPlaceDetails } from '../../services/locationService';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';

const FALLBACK_CATEGORIES = [
  { id: 'cat-1', name: 'Laundry', icon: 'shirt-outline', bg: '#FFF0E6', iconColor: '#FF6B35' },
  { id: 'cat-2', name: 'Cleaning', icon: 'sparkles-outline', bg: '#E8F8F0', iconColor: '#27AE60' },
  { id: 'cat-3', name: 'Tutoring', icon: 'school-outline', bg: '#EEF0FF', iconColor: '#5C6BC0' },
  { id: 'cat-4', name: 'Errands', icon: 'bicycle-outline', bg: '#FFF9E6', iconColor: '#F39C12' },
  { id: 'cat-6', name: 'Tech Repair', icon: 'construct-outline', bg: '#E6F4FF', iconColor: '#1E88E5' },
];

const BUDGET_SUGGESTIONS = [
  { label: '₵20', value: '20' },
  { label: '₵50', value: '50' },
  { label: '₵100', value: '100' },
  { label: '₵200', value: '200' },
];

export default function PostRequestScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((state) => state.accessToken);
  const { showToast } = useToast();
  const [sessionExpiredDialogVisible, setSessionExpiredDialogVisible] = useState(false);

  // Fetch canonical categories from backend
  const { data: serverCategories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data ?? [];
    },
  });

  const categoriesList = serverCategories.length > 0
    ? serverCategories.map((c) => {
        let mappedIcon = 'briefcase-outline';
        if (c.iconKey) {
          const baseKey = c.iconKey.replace('-outline', '').toLowerCase().trim();
          const ioniconMap: Record<string, string> = {
            'wrench': 'construct-outline',
            'printer': 'print-outline',
            'truck': 'car-outline',
            'scissors': 'cut-outline',
            'sparkles': 'sparkles-outline',
            'calendar': 'calendar-outline'
          };
          mappedIcon = ioniconMap[baseKey] || (c.iconKey.endsWith('-outline') ? c.iconKey : `${c.iconKey}-outline`);
        }
        return {
          id: c.id,
          name: c.name,
          icon: mappedIcon,
          iconColor: c.iconColor || '#1565C0',
          bg: c.bg || '#F8FAFC',
        };
      })
    : FALLBACK_CATEGORIES;

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<any[]>([]);
  const [basePrice, setBasePrice] = useState('');
  const [locationType, setLocationType] = useState<'on_campus' | 'remote'>('on_campus');
  const [locationDetail, setLocationDetail] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'broadcast' | 'targeted'>('broadcast');
  const [targetProvider, setTargetProvider] = useState<any>(null);

  // Location Picker States
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationPlaceId, setLocationPlaceId] = useState('');
  const [locationLandmark, setLocationLandmark] = useState('');
  const [locationMethod, setLocationMethod] = useState<'auto_gps' | 'manual_pin' | 'search'>('auto_gps');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<any>({});
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number | null>(null);

  // Location Picker States
  const [searchInput, setSearchInput] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [pickerRegion, setPickerRegion] = useState<any>({
    latitude: 6.6741,
    longitude: -1.5726,
    latitudeDelta: 0.009,
    longitudeDelta: 0.009,
  });
  const [pickerAddress, setPickerAddress] = useState('');
  const [pickerPlaceId, setPickerPlaceId] = useState('');
  const [landmarkInput, setLandmarkInput] = useState('');
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const lastGeocodedRegion = useRef<{ lat: number; lng: number } | null>(null);

  // Initialize Location Picker when modal opens
  useEffect(() => {
    if (showLocationPicker) {
      initLocationPicker();
    }
  }, [showLocationPicker]);

  const initLocationPicker = async () => {
    setIsGeocoding(true);
    setGpsWarning(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsWarning("Location access was denied. Please pin your location manually on the map or type your location.");
        const defaultRegion = {
          latitude: 6.6741,
          longitude: -1.5726,
          latitudeDelta: 0.009,
          longitudeDelta: 0.009,
        };
        setPickerRegion(defaultRegion);
        mapRef.current?.animateToRegion(defaultRegion, 1000);
        handleReverseGeocode(6.6741, -1.5726);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (location.coords.accuracy && location.coords.accuracy > 50) {
        setGpsWarning("⚠️ Your GPS signal is weak. Your pinned location may be inaccurate. Consider pinning manually.");
      }

      const currentRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setPickerRegion(currentRegion);
      mapRef.current?.animateToRegion(currentRegion, 1000);
      handleReverseGeocode(location.coords.latitude, location.coords.longitude);

    } catch (e) {
      console.warn("initLocationPicker error", e);
      handleReverseGeocode(6.6741, -1.5726);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleReverseGeocode = async (lat: number, lng: number) => {
    if (lastGeocodedRegion.current) {
      const dLat = Math.abs(lat - lastGeocodedRegion.current.lat);
      const dLng = Math.abs(lng - lastGeocodedRegion.current.lng);
      // ~11 meters threshold to avoid geocoding loops from map UI shifts
      if (dLat < 0.0001 && dLng < 0.0001) {
        return;
      }
    }
    lastGeocodedRegion.current = { lat, lng };

    setIsGeocoding(true);
    try {
      const res = await reverseGeocode(lat, lng);
      if (res) {
        setPickerAddress(res.address);
        setPickerPlaceId(res.placeId);
      } else {
        setPickerAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setPickerPlaceId('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleRegionChangeComplete = (region: any) => {
    setPickerRegion(region);
    handleReverseGeocode(region.latitude, region.longitude);
  };

  const handleSearchChange = async (text: string) => {
    setSearchInput(text);
    if (!text.trim()) {
      setAutocompleteResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await placesAutocomplete(text);
      setAutocompleteResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = async (suggestion: any) => {
    setSearchInput('');
    setAutocompleteResults([]);
    setIsGeocoding(true);
    try {
      const coords = await getPlaceDetails(suggestion.placeId);
      const newRegion = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setPickerRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      setPickerAddress(suggestion.description);
      setPickerPlaceId(suggestion.placeId);
      setLocationMethod('search');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleConfirmLocation = () => {
    if (!pickerAddress) {
      showToast({ status: 'error', title: 'Location Required', subtitle: 'Please select a valid location on the map.' });
      return;
    }
    setLocationCoords({ latitude: pickerRegion.latitude, longitude: pickerRegion.longitude });
    setLocationAddress(pickerAddress);
    setLocationPlaceId(pickerPlaceId);
    setLocationLandmark(landmarkInput);
    setShowLocationPicker(false);
  };

  const scrollViewRef = useRef<ScrollView>(null);

  // Handle Target Provider Param (incoming via navigation / route params)
  useEffect(() => {
    if (route.params?.targetProviderId) {
      setTargetProvider({
        id: route.params.targetProviderId,
        name: route.params.targetProviderName || 'Provider',
        avatarUrl: route.params.targetProviderAvatarUrl || null,
        rating: route.params.targetProviderRating || 5.0,
      });
      setDeliveryMode('targeted');
      if (route.params?.categoryId) {
        const matched = categoriesList.find((c: any) => c.id === route.params.categoryId || c.name === route.params.categoryId);
        if (matched) setSelectedCategory(matched);
      }
      // Clear route params to avoid re-triggering
      navigation.setParams({
        targetProviderId: undefined,
        targetProviderName: undefined,
        targetProviderAvatarUrl: undefined,
        targetProviderRating: undefined,
        categoryId: undefined
      });
    }
  }, [route.params?.targetProviderId, categoriesList]);

  // Handle Selected Target Provider (returning fromSelectProviderScreen)
  useEffect(() => {
    if (route.params?.selectedTargetProvider) {
      const p = route.params.selectedTargetProvider;
      setTargetProvider({
        id: p.id,
        name: p.fullName,
        avatarUrl: p.profilePictureUrl || null,
        rating: p.rating || 5.0,
      });
      setDeliveryMode('targeted');
      
      // Auto-fill category if provider has services
      if (p.services && p.services.length > 0) {
        const catId = p.services[0].category?.id || p.services[0].categoryId;
        const matched = categoriesList.find((c: any) => c.id === catId || c.name === catId);
        if (matched) {
          setSelectedCategory(matched);
        }
      }
      navigation.setParams({ selectedTargetProvider: undefined });
    }
  }, [route.params?.selectedTargetProvider, categoriesList]);

  // Image picking
  const handlePickPhoto = () => {
    Alert.alert(
      "Add Photo",
      "Choose photo source",
      [
        { text: "Take Photo", onPress: () => capturePhoto() },
        { text: "Choose from Library", onPress: () => choosePhoto() },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const capturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Go to Settings and enable camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      processPickedPhoto(result.assets[0]);
    }
  };

  const choosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Go to Settings and enable photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      processPickedPhoto(result.assets[0]);
    }
  };

  const processPickedPhoto = (asset: ImagePicker.ImagePickerAsset) => {
    const uri = asset.uri;
    const ext = uri.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      showToast({ status: 'error', title: 'Unsupported Format', subtitle: 'Only JPG, PNG, or WebP images are supported.' });
      return;
    }
    const fileSize = asset.fileSize;
    if (fileSize !== undefined && fileSize > 5000000) {
      showToast({ status: 'error', title: 'File Too Large', subtitle: 'Image must be smaller than 5 MB.' });
      return;
    }
    setPhotos(prev => [...prev, { uri, width: asset.width, height: asset.height, fileSize: fileSize || 0 }]);
  };

  const getReadableDate = (date: Date) => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const standardMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const w = weekdays[date.getDay()];
    const m = standardMonths[date.getMonth()];
    const d = date.getDate();
    return `Selected: ${w}, ${m} ${d}`;
  };

  const handleSuggestBudget = (val: string) => {
    setBasePrice(val);
  };

  const handleCategorySelect = (cat: any) => {
    if (selectedCategory?.id === cat.id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(cat);
    }
  };

  const handlePostRequest = async () => {
    const newErrors: any = {};

    if (!selectedCategory) {
      newErrors.category = "Please select a category.";
    }
    if (!title.trim() || title.length < 5 || title.length > 80) {
      newErrors.title = "Title must be between 5 and 80 characters.";
    }
    // Description is now optional and has no length limits.    
    const parsedBase = parseFloat(basePrice);
    if (!basePrice || isNaN(parsedBase)) {
      newErrors.budget = "Please enter a base price.";
    } else if (parsedBase < 5) {
      newErrors.budget = "Base price must be at least ₵5.";
    }

    if (!locationType) {
      newErrors.location = "Please select a location type.";
    } else if (locationType !== 'remote' && !locationAddress && !locationCoords) {
      newErrors.location = "Please choose a location for your request.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.category) scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      else if (newErrors.title) scrollViewRef.current?.scrollTo({ y: 120, animated: true });
      else if (newErrors.description) scrollViewRef.current?.scrollTo({ y: 240, animated: true });
      else if (newErrors.budget) scrollViewRef.current?.scrollTo({ y: 420, animated: true });
      else if (newErrors.location) scrollViewRef.current?.scrollTo({ y: 620, animated: true });
      return;
    }

    setIsSubmitting(true);
    setBannerError(null);

    try {
      const formData = new FormData();
      formData.append('categoryId', selectedCategory.id);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('budgetMin', basePrice);
      formData.append('budgetMax', basePrice);
      formData.append('locationType', locationType === 'remote' ? 'REMOTE' : 'CHOOSE_LOCATION');
      if (locationType !== 'remote') {
        if (locationCoords) {
          formData.append('pickupLatitude', locationCoords.latitude.toString());
          formData.append('pickupLongitude', locationCoords.longitude.toString());
        }
        if (locationAddress) {
          formData.append('pickupAddress', locationAddress);
        }
        formData.append('pickupPlaceId', locationPlaceId || '');
        formData.append('pickupLandmark', locationLandmark || '');
        formData.append('locationMethod', locationMethod);
        if (locationDetail.trim()) {
          formData.append('locationDetail', locationDetail.trim());
        }
      }
      formData.append('deliveryMode', deliveryMode);
      if (deliveryMode === 'targeted' && targetProvider?.id) {
        formData.append('targetProviderId', targetProvider.id);
      }

      photos.forEach((photo, index) => {
        formData.append('photos', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `request_photo_${index}_${Date.now()}.jpg`,
        } as any);
      });

      const response = await createRequest(formData, token || '');
      
      // Navigate to RequestDetailsScreen replacing the modal in history stack
      navigation.replace('RequestDetails', { 
        requestId: response.id,
        showToastOnMount: "Request posted! We'll notify you when a provider responds."
      });

    } catch (err: any) {
      if (err.status === 401) {
        setSessionExpiredDialogVisible(true);
      } else if (err.status === 413 || err.error === 'PHOTO_TOO_LARGE') {
        setBannerError("One of your photos is too large (> 5 MB). Please remove it or choose a smaller image.");
      } else if (err.error === 'PHOTO_UPLOAD_FAILED') {
        setBannerError(err.message || "Your photo couldn't be uploaded — try a different photo or remove it.");
      } else if (err.status === 400 || (err.status >= 400 && err.status < 500)) {
        setBannerError(err.message || "Please check your request details and try again.");
      } else if (err.isNetworkError || err.status === 0) {
        setBannerError("Unable to reach server. Please check your connection and try again.");
      } else {
        setBannerError("Something went wrong on our end. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProviderPicker = () => {
    navigation.navigate('SelectProvider', {
      categoryId: selectedCategory?.id,
      categoryName: selectedCategory?.name
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* ── Fixed Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Post a Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {bannerError && (
          <View style={[styles.bannerError, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.bannerErrorText, { color: colors.error }]}>{bannerError}</Text>
          </View>
        )}

        {/* ── Category Selector ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>What kind of service do you need?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categoriesList.map((cat) => {
              const isActive = selectedCategory?.id === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catCard,
                    { backgroundColor: isActive ? '#1565C0' : (isDark ? colors.cardBackground : '#F8FAFC') }
                  ]}
                  onPress={() => handleCategorySelect(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  disabled={isSubmitting}
                >
                  <View style={[
                    styles.catIconWrap,
                    { backgroundColor: isActive ? '#1565C0' : (isDark ? colors.inputBackground : '#FFFFFF') }
                  ]}>
                    <Ionicons
                      name={cat.icon as any}
                      size={20}
                      color={isActive ? '#FFFFFF' : (isDark ? colors.primary : cat.iconColor)}
                    />
                  </View>
                  <Text style={[
                    styles.catLabel,
                    { color: isActive ? '#FFFFFF' : (isDark ? colors.textMuted : '#334155') }
                  ]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {errors.category && <Text style={styles.fieldError}>{errors.category}</Text>}
        </View>

        {/* ── Request Title ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g. Need help with Calculus II assignment"
            placeholderTextColor={colors.placeholderText}
            maxLength={80}
            value={title}
            onChangeText={setTitle}
            editable={!isSubmitting}
            accessibilityLabel="Request title input"
          />
          <View style={styles.counterRow}>
            {errors.title ? <Text style={styles.fieldError}>{errors.title}</Text> : <View />}
            {title.length >= 60 && (
              <Text style={[styles.counterText, { color: title.length === 80 ? colors.error : colors.textMuted }]}>
                {title.length}/80
              </Text>
            )}
          </View>
        </View>

        {/* ── Description ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Describe what you need</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            placeholder="Give as much detail as possible — deadlines, specific requirements, materials needed, etc."
            placeholderTextColor={colors.placeholderText}
            multiline={true}
            numberOfLines={5}
            value={description}
            onChangeText={setDescription}
            editable={!isSubmitting}
            textAlignVertical="top"
            accessibilityLabel="Request description input"
          />
          <View style={styles.counterRow}>
            {errors.description ? <Text style={styles.fieldError}>{errors.description}</Text> : <View />}
          </View>
        </View>

        {/* ── Photo Attachments ── */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Add photos</Text>
            <Text style={[styles.subLabelText, { color: colors.textMuted }]}> (optional, up to 3)</Text>
          </View>
          <View style={styles.photoRow}>
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.photoSlot, { borderColor: colors.border }]}
                onPress={() => setPreviewPhotoIndex(index)}
                disabled={isSubmitting}
                accessibilityLabel={`Photo ${index + 1} added, tap to preview`}
              >
                <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.photoDeleteBtn}
                  onPress={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                  disabled={isSubmitting}
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Ionicons name="close" size={14} color="#FFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {photos.length < 3 && (
              <TouchableOpacity
                style={[styles.photoSlot, styles.photoPlaceholder, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                onPress={handlePickPhoto}
                disabled={isSubmitting}
                accessibilityLabel={`Add photo, slot ${photos.length + 1} of 3`}
              >
                <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.photoPlaceholderText, { color: colors.textMuted }]}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Base Price ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Base Price</Text>
          {basePrice && !isNaN(parseFloat(basePrice)) ? (
            <Text style={[styles.subLabelTextDesc, { color: colors.primary }]}>
              Providers can bid between GHS {(parseFloat(basePrice) * 0.5).toFixed(0)} and GHS {(parseFloat(basePrice) * 2).toFixed(0)}
            </Text>
          ) : (
            <Text style={[styles.subLabelTextDesc, { color: colors.textMuted }]}>
              Set a base price to anchor provider bids.
            </Text>
          )}
          <View style={styles.budgetRow}>
            <TextInput
              style={[styles.budgetInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="Base Price (₵)"
              placeholderTextColor={colors.placeholderText}
              keyboardType="numeric"
              value={basePrice}
              onChangeText={setBasePrice}
              editable={!isSubmitting}
            />
          </View>
          {errors.budget && <Text style={styles.fieldError}>{errors.budget}</Text>}
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsScroll}
            contentContainerStyle={styles.suggestionsContent}
          >
            {BUDGET_SUGGESTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.suggestionChip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => handleSuggestBudget(item.value)}
                disabled={isSubmitting}
              >
                <Text style={[styles.suggestionText, { color: colors.primary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Preferred Timing ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Location</Text>
          {errors.location && <Text style={styles.fieldError}>{errors.location}</Text>}

          <View style={styles.locationDetailContainer}>
            {locationAddress ? (
              <View style={[{ backgroundColor: isDark ? colors.cardBackground : '#F8FAFC', borderColor: colors.border, padding: 12, borderRadius: 8, borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="location" size={20} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.text, fontWeight: '600', flex: 1, fontSize: 14 }} numberOfLines={2}>
                    {locationAddress}
                  </Text>
                </View>
                {locationLandmark ? (
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8, fontStyle: 'italic' }}>
                    Landmark hint: "{locationLandmark}"
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={{ borderColor: colors.primary, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4, alignSelf: 'flex-start' }}
                  onPress={() => setShowLocationPicker(true)}
                  disabled={isSubmitting}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Change Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.primary,
                  borderStyle: 'dashed',
                  backgroundColor: isDark ? colors.cardBackground : '#F0F7FF',
                  padding: 16,
                  borderRadius: 8,
                }}
                onPress={() => setShowLocationPicker(true)}
                disabled={isSubmitting}
              >
                <Ionicons name="map-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Set Location</Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border, marginTop: 12 }]}
              placeholder="e.g. Room number, building name details (Optional)"
              placeholderTextColor={colors.placeholderText}
              value={locationDetail}
              onChangeText={setLocationDetail}
              editable={!isSubmitting}
            />
          </View>
        </View>

        {/* ── Delivery Mode Toggle ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Who should see this request?</Text>
          <View style={[styles.deliveryToggle, { backgroundColor: colors.inputBackground }]}>
            <TouchableOpacity
              style={[
                styles.deliveryToggleOption,
                deliveryMode === 'broadcast' && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                setDeliveryMode('broadcast');
                setTargetProvider(null);
              }}
              disabled={isSubmitting}
              accessibilityLabel="Post to all providers"
            >
              <Ionicons
                name="globe-outline"
                size={15}
                color={deliveryMode === 'broadcast' ? '#FFF' : colors.textMuted}
                style={{ marginBottom: 2 }}
              />
              <Text style={[styles.deliveryToggleText, { color: deliveryMode === 'broadcast' ? '#FFF' : colors.textMuted }]}>
                All Providers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.deliveryToggleOption,
                deliveryMode === 'targeted' && { backgroundColor: colors.accent },
              ]}
              onPress={() => {
                setDeliveryMode('targeted');
                if (!targetProvider) handleOpenProviderPicker();
              }}
              disabled={isSubmitting}
              accessibilityLabel="Direct hire a specific provider"
            >
              <Ionicons
                name="person-outline"
                size={15}
                color={deliveryMode === 'targeted' ? '#FFF' : colors.textMuted}
                style={{ marginBottom: 2 }}
              />
              <Text style={[styles.deliveryToggleText, { color: deliveryMode === 'targeted' ? '#FFF' : colors.textMuted }]}>
                Direct Hire
              </Text>
            </TouchableOpacity>
          </View>

          {deliveryMode === 'broadcast' && (
            <View style={[styles.broadcastInfo, { marginTop: 10 }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.broadcastText, { color: colors.textMuted, marginLeft: 8 }]}>
                All {selectedCategory?.name || 'matching'} providers will see this. First to accept gets matched.
              </Text>
            </View>
          )}

          {deliveryMode === 'targeted' && (
            <View style={[styles.targetedContainer, { marginTop: 10 }]}>
              {targetProvider ? (
                <View style={[styles.broadcastInfo, { backgroundColor: colors.cardBackground, borderRadius: 10, padding: 10, borderColor: colors.accent, borderWidth: 1 }]}>
                  <Ionicons name="person-circle-outline" size={26} color={colors.accent} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{targetProvider.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Only this provider will receive your request</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => { setTargetProvider(null); setDeliveryMode('broadcast'); }}
                    accessibilityLabel="Remove selected provider"
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.broadcastInfo, { borderColor: colors.accent, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 14, justifyContent: 'center' }]}
                  onPress={handleOpenProviderPicker}
                  disabled={isSubmitting}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontWeight: '700', marginLeft: 8 }}>Select a Provider</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky Submit Button ── */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.accent }]}
          onPress={handlePostRequest}
          disabled={isSubmitting}
          accessibilityLabel="Post your request"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Post Request</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Fullscreen Image Preview Modal ── */}
      <Modal
        visible={previewPhotoIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewPhotoIndex(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewPhotoIndex(null)}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          {previewPhotoIndex !== null && photos[previewPhotoIndex] && (
            <Image
              source={{ uri: photos[previewPhotoIndex].uri }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ── Location Picker Modal ── */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={[styles.pickerModalContainer, { backgroundColor: colors.background }]}>
          {/* Header search bar */}
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowLocationPicker(false)}
              style={styles.pickerCloseBtn}
              accessibilityLabel="Close location picker"
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            
            <View style={[styles.pickerSearchContainer, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="search-outline" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.pickerSearchInput, { color: colors.text }]}
                placeholder="Search places or landmarks in Kumasi..."
                placeholderTextColor={colors.placeholderText}
                value={searchInput}
                onChangeText={handleSearchChange}
                clearButtonMode="while-editing"
              />
              {isSearching && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
            </View>
          </View>

          {/* Autocomplete suggestions dropdown overlay */}
          {autocompleteResults.length > 0 && (
            <View style={[styles.suggestionsDropdown, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
              <FlatList
                data={autocompleteResults}
                keyExtractor={(item: any) => item.placeId}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }: any) => (
                  <TouchableOpacity
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectPlace(item)}
                  >
                    <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
                    <Text style={[styles.suggestionItemText, { color: colors.text }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* GPS Warning Banner */}
          {gpsWarning && (
            <View style={[styles.gpsWarningBanner, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="warning-outline" size={16} color={colors.warning} style={{ marginRight: 8 }} />
              <Text style={[styles.gpsWarningText, { color: colors.warning }]}>{gpsWarning}</Text>
            </View>
          )}

          {/* Map Section */}
          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              style={styles.pickerMap}
              initialRegion={pickerRegion}
              showsUserLocation={true}
              onRegionChangeComplete={handleRegionChangeComplete}
            />
            {/* Center Pin Crosshair (Uber-style) */}
            <View style={styles.centerPinContainer} pointerEvents="none">
              <View style={[styles.centerPinIconWrap]}>
                <Ionicons name="location" size={40} color="#E53935" />
              </View>
              <View style={styles.centerPinDot} />
            </View>
          </View>

          {/* Bottom Sheet Card */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.pickerBottomSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}
          >
            <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Address Location</Text>
            <View style={[styles.addressTextContainer, { backgroundColor: colors.inputBackground }]}>
              {isGeocoding ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.addressText, { color: colors.textMuted }]}>Resolving address...</Text>
                </View>
              ) : (
                <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>
                  {pickerAddress || 'Select a point on the map'}
                </Text>
              )}
            </View>

            <Text style={[styles.bottomSheetSubtitle, { color: colors.text, marginTop: 12 }]}>
              Add Landmark / Room Details
            </Text>
            <TextInput
              style={[styles.pickerLandmarkInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Unity Hall Room 304B, or opposite the canteen"
              placeholderTextColor={colors.placeholderText}
              value={landmarkInput}
              onChangeText={setLandmarkInput}
            />

            <TouchableOpacity
              style={[styles.pickerConfirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirmLocation}
              disabled={isGeocoding}
            >
              <Text style={styles.pickerConfirmBtnText}>Confirm This Location</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <StatusDialog
        visible={sessionExpiredDialogVisible}
        status="warning"
        title="Session Expired"
        description="Please sign in again."
        confirmLabel="OK"
        onConfirm={() => {
          setSessionExpiredDialogVisible(false);
          navigation.navigate('Auth');
        }}
        onClose={() => setSessionExpiredDialogVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  
  bannerError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  bannerErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },

  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  subLabelText: { fontSize: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  categoryScroll: { marginHorizontal: -20, marginBottom: 4 },
  categoryScrollContent: { paddingHorizontal: 20, gap: 10, paddingVertical: 6 },
  catCard: {
    width: 90,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  catIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 14 },
  textArea: { height: 130, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingTop: 14, fontSize: 14 },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 4 },
  counterText: { fontSize: 11, fontWeight: '500' },
  fieldError: { color: '#D32F2F', fontSize: 12, fontWeight: '600', marginTop: 4 },

  photoRow: { flexDirection: 'row', gap: 12 },
  photoSlot: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumb: { width: '100%', height: '100%' },
  photoPlaceholder: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPlaceholderText: { fontSize: 11, fontWeight: '700' },
  photoDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  subLabelTextDesc: { fontSize: 12, marginBottom: 12 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budgetInput: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 14, textAlign: 'center' },
  budgetDash: { fontSize: 16, fontWeight: '600' },
  suggestionsScroll: { marginHorizontal: -20, marginTop: 10 },
  suggestionsContent: { paddingHorizontal: 20, gap: 8 },
  suggestionChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  suggestionText: { fontSize: 12, fontWeight: '700' },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pillOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillText: { fontSize: 13, fontWeight: '600' },
  datePickerContainer: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
  },
  datePickerTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePickerText: { fontSize: 14, fontWeight: '600' },

  locationDetailContainer: { marginTop: 12 },
  inputHelperText: { fontSize: 12, marginTop: 4, paddingHorizontal: 4 },

  deliveryToggle: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  deliveryToggleOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  deliveryToggleText: { fontSize: 13, fontWeight: '700' },
  broadcastInfo: { flexDirection: 'row', gap: 8, marginTop: 12, paddingHorizontal: 4 },
  broadcastText: { flex: 1, fontSize: 12, lineHeight: 18 },
  targetedContainer: { marginTop: 12 },
  chooseProviderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 6,
  },
  chooseProviderText: { fontSize: 14, fontWeight: '700' },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    position: 'relative',
  },
  providerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  providerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 14, fontWeight: '700' },
  providerRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  providerRatingText: { fontSize: 12, fontWeight: '600' },
  providerRemoveBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // Image Preview Modal
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  modalCloseBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  modalImage: { width: '90%', height: '80%' },

  // Location Picker styles
  pickerModalContainer: { flex: 1 },
  pickerHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
    zIndex: 10,
  },
  pickerCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    maxHeight: 250,
    borderBottomWidth: 1,
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  suggestionItemText: {
    fontSize: 14,
    flex: 1,
  },
  gpsWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 16,
  },
  gpsWarningText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerMap: {
    ...StyleSheet.absoluteFillObject,
  },
  centerPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPinIconWrap: {
    transform: [{ translateY: -20 }],
  },
  centerPinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
    opacity: 0.4,
    transform: [{ scaleX: 2 }],
  },
  pickerBottomSheet: {
    padding: 20,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  bottomSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  bottomSheetSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  addressTextContainer: {
    padding: 12,
    borderRadius: 10,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  pickerLandmarkInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 16,
  },
  pickerConfirmBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerConfirmBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
