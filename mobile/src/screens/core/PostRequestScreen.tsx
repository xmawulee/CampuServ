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
  RefreshControl,
} from 'react-native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, BASE_URL } from '../../services/api';
import RequestCard from '../../components/RequestCard';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabSpacing } from '../../hooks/useBottomTabSpacing';
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
  const bottomTabSpacing = useBottomTabSpacing();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const [sessionExpiredDialogVisible, setSessionExpiredDialogVisible] = useState(false);

  // Active Requests Tab States & Query
  const [activeTab, setActiveTab] = useState<'create' | 'active'>('create');
  const [refreshingActiveRequests, setRefreshingActiveRequests] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: activeRequestsData = [],
    isLoading: loadingActiveRequests,
    refetch: refetchActiveRequests,
  } = useQuery({
    queryKey: ['myRequests-postscreen-active'],
    queryFn: async () => {
      if (!token) return [];
      const res = await api.get('/requests', {
        params: {
          page: 0,
          size: 50
        }
      });
      const all = res.data?.content || [];
      return all.filter((r: any) => r.requesterId === user?.id && r.status !== 'COMPLETED' && r.status !== 'CANCELLED');
    },
    enabled: activeTab === 'active' && !!token,
  });

  const handleRefreshActiveRequests = async () => {
    setRefreshingActiveRequests(true);
    await refetchActiveRequests();
    setRefreshingActiveRequests(false);
  };

  const handleDeclineOffer = async (requestId: string, offerId: string) => {
    // Optimistic update — mark the offer as DECLINED in the cache immediately
    queryClient.setQueryData<any[]>(['myRequests-postscreen-active'], (old) =>
      (old ?? []).map((req) =>
        req.id === requestId
          ? {
              ...req,
              offers: (req.offers ?? []).map((o: any) =>
                o.id === offerId ? { ...o, status: 'DECLINED' } : o
              ),
            }
          : req
      )
    );
    try {
      await api.put(`/requests/${requestId}/offers/${offerId}/decline`);
      showToast({ status: 'info', title: 'Declined', subtitle: 'The offer was declined.' });
    } catch (err: any) {
      // Rollback on failure
      refetchActiveRequests();
      showToast({ status: 'error', title: 'Error', subtitle: err.response?.data || 'Failed to decline offer.' });
    }
  };

  const handleAcceptOffer = async (requestId: string, offerId: string) => {
    // Optimistic update — mark the offer as ACCEPTED in the cache immediately
    queryClient.setQueryData<any[]>(['myRequests-postscreen-active'], (old) =>
      (old ?? []).map((req) =>
        req.id === requestId
          ? {
              ...req,
              offers: (req.offers ?? []).map((o: any) =>
                o.id === offerId ? { ...o, status: 'ACCEPTED' } : { ...o, status: o.status === 'PENDING' ? 'DECLINED' : o.status }
              ),
            }
          : req
      )
    );
    try {
      await api.put(`/requests/${requestId}/offers/${offerId}/accept`);
      showToast({ status: 'success', title: 'Accepted!', subtitle: 'Job created. Chat with the provider.' });
    } catch (err: any) {
      // Rollback on failure
      refetchActiveRequests();
      showToast({ status: 'error', title: 'Error', subtitle: err.response?.data || 'Failed to accept offer.' });
    }
  };

  const renderRequestBids = ({ item }: { item: any }) => {
    const catName = item.category?.name || '';
    
    const getCategoryStyles = (name: string) => {
      const normalized = name.toLowerCase();
      if (normalized.includes('laundry')) return { bg: '#FFF0E6', iconColor: '#FF6B35' };
      if (normalized.includes('clean')) return { bg: '#E8F8F0', iconColor: '#27AE60' };
      if (normalized.includes('tutor')) return { bg: '#EEF0FF', iconColor: '#5C6BC0' };
      if (normalized.includes('errand')) return { bg: '#FFF9E6', iconColor: '#F39C12' };
      if (normalized.includes('delivery')) return { bg: '#E0F7FA', iconColor: '#00838F' };
      if (normalized.includes('event') || normalized.includes('setup')) return { bg: '#EDE7F6', iconColor: '#651FFF' };
      return { bg: '#F8FAFC', iconColor: '#1565C0' };
    };

    const catStyle = getCategoryStyles(catName);

    return (
      <View style={[styles.bidsGroupCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        {/* Request Header */}
        <TouchableOpacity 
          style={styles.bidsGroupHeader}
          onPress={() => navigation.navigate('RequestDetails', { requestId: item.id })}
          activeOpacity={0.7}
        >
          <View style={[styles.bidsGroupIconBg, { backgroundColor: catStyle.bg }]}>
            <Ionicons name={
              catName.toLowerCase().includes('laundry') ? 'shirt-outline' :
              catName.toLowerCase().includes('clean') ? 'sparkles-outline' :
              catName.toLowerCase().includes('tutor') ? 'school-outline' :
              catName.toLowerCase().includes('errand') ? 'bicycle-outline' :
              catName.toLowerCase().includes('delivery') ? 'cube-outline' :
              (catName.toLowerCase().includes('event') || catName.toLowerCase().includes('setup')) ? 'calendar-outline' : 'briefcase-outline'
            } size={18} color={catStyle.iconColor} />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.bidsGroupTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: 2 }}>
              {catName} • Budget: GHS {item.budgetMin ? Number(item.budgetMin).toFixed(2) : 'Quote'}
            </Text>
          </View>
          <View style={[styles.bidsCountBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.bidsCountText, { color: colors.primary }]}>
              {item.offers ? item.offers.length : 0} {item.offers && item.offers.length === 1 ? 'Bid' : 'Bids'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Bids List */}
        {item.offers && item.offers.length > 0 ? (
          <View style={{ marginTop: 4 }}>
            {item.offers.map((offer: any) => (
              <View key={offer.id} style={[styles.providerBidRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                <View style={styles.providerRowTop}>
                  <View style={[styles.providerAvatarWrap, { backgroundColor: colors.primaryLight }]}>
                    {offer.providerAvatar ? (
                      <Image source={{ uri: offer.providerAvatar }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                    ) : (
                      <Ionicons name="person" size={16} color={colors.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.providerNameText, { color: colors.text }]} numberOfLines={1}>
                        {offer.providerName || 'Provider'}
                      </Text>
                      {offer.providerIsVerified && (
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#F59E0B' }}>
                        ⭐ {Number(offer.providerRating || 5).toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        • {offer.providerCompletedJobs || 0} jobs done
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.bidPriceText, { color: colors.primary }]}>
                      GHS {Number(offer.price).toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      ETA: {offer.eta || 'N/A'}
                    </Text>
                  </View>
                </View>

                {offer.message ? (
                  <Text style={[styles.bidMessageText, { color: colors.text }]}>
                    "{offer.message}"
                  </Text>
                ) : null}

                {/* Bid Actions */}
                {offer.status === 'PENDING' && item.status === 'OPEN' && (
                  <View style={styles.bidActionRow}>
                    <TouchableOpacity
                      style={[styles.bidDeclineBtn, { backgroundColor: colors.inputBackground }]}
                      onPress={() => handleDeclineOffer(item.id, offer.id)}
                    >
                      <Text style={[styles.bidDeclineText, { color: colors.text }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bidAcceptBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleAcceptOffer(item.id, offer.id)}
                    >
                      <Text style={styles.bidAcceptText}>Accept Bid</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {offer.status === 'ACCEPTED' && (
                  <View style={[styles.bidStatusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981', marginLeft: 4 }}>
                      ACCEPTED & HIRED
                    </Text>
                  </View>
                )}
                {offer.status === 'DECLINED' && (
                  <View style={[styles.bidStatusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444', marginLeft: 4 }}>
                      DECLINED
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
              No bids placed yet. Providers will bid shortly!
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Fetch canonical categories from backend
  const { data: serverCategories = [], isSuccess: isCategoriesLoaded } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data ?? [];
    },
  });

  const categoriesList = serverCategories.length > 0
    ? serverCategories.map((c) => {
        const normalizedName = c.name.toLowerCase();
        let mappedIcon = 'briefcase-outline';
        let iconColor = '#1565C0';
        let bg = '#F8FAFC';
        
        if (normalizedName.includes('laundry')) { mappedIcon = 'shirt-outline'; bg = '#FFF0E6'; iconColor = '#FF6B35'; }
        else if (normalizedName.includes('clean')) { mappedIcon = 'sparkles-outline'; bg = '#E8F8F0'; iconColor = '#27AE60'; }
        else if (normalizedName.includes('tutor')) { mappedIcon = 'school-outline'; bg = '#EEF0FF'; iconColor = '#5C6BC0'; }
        else if (normalizedName.includes('errand')) { mappedIcon = 'bicycle-outline'; bg = '#FFF9E6'; iconColor = '#F39C12'; }
        else if (normalizedName.includes('delivery')) { mappedIcon = 'cube-outline'; bg = '#E0F7FA'; iconColor = '#00838F'; }
        else if (normalizedName.includes('event') || normalizedName.includes('setup')) { mappedIcon = 'calendar-outline'; bg = '#EDE7F6'; iconColor = '#651FFF'; }
        else if (normalizedName.includes('tech') || normalizedName.includes('repair')) { mappedIcon = 'construct-outline'; bg = '#E6F4FF'; iconColor = '#1E88E5'; }
        else if (normalizedName.includes('design') || normalizedName.includes('print')) { mappedIcon = 'print-outline'; bg = '#FCE4EC'; iconColor = '#E91E63'; }
        else if (normalizedName.includes('style') || normalizedName.includes('groom')) { mappedIcon = 'cut-outline'; bg = '#F3E5F5'; iconColor = '#9C27B0'; }
        else if (normalizedName.includes('photo') || normalizedName.includes('video')) { mappedIcon = 'camera-outline'; bg = '#FFF3E0'; iconColor = '#FF9800'; }
        else if (normalizedName.includes('food') || normalizedName.includes('cater')) { mappedIcon = 'restaurant-outline'; bg = '#EFEBE9'; iconColor = '#795548'; }

        return {
          id: c.id,
          name: c.name,
          icon: mappedIcon,
          iconColor: iconColor,
          bg: bg,
          requiresDualLocation: c.requiresDualLocation || c.requires_dual_location || false,
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
  const [isTargetProviderLocked, setIsTargetProviderLocked] = useState(false);

  // Location Picker States
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationPlaceId, setLocationPlaceId] = useState('');
  const [locationLandmark, setLocationLandmark] = useState('');
  const [locationMethod, setLocationMethod] = useState<'auto_gps' | 'manual_pin' | 'search'>('auto_gps');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Dual Location Support (for delivery requests)
  const [activeLocationPicker, setActiveLocationPicker] = useState<'pickup' | 'dropoff' | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupPlaceId, setPickupPlaceId] = useState('');
  const [pickupLandmark, setPickupLandmark] = useState('');

  const [dropoffCoords, setDropoffCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffPlaceId, setDropoffPlaceId] = useState('');
  const [dropoffLandmark, setDropoffLandmark] = useState('');

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
    if (showLocationPicker || activeLocationPicker !== null) {
      if (activeLocationPicker === 'dropoff' && dropoffCoords) {
        const dropoffReg = {
          latitude: dropoffCoords.latitude,
          longitude: dropoffCoords.longitude,
          latitudeDelta: 0.009,
          longitudeDelta: 0.009,
        };
        setPickerRegion(dropoffReg);
        setPickerAddress(dropoffAddress);
        setPickerPlaceId(dropoffPlaceId);
        setLandmarkInput(dropoffLandmark);
        setIsGeocoding(false);
        setTimeout(() => {
          mapRef.current?.animateToRegion(dropoffReg, 500);
        }, 100);
      } else if (activeLocationPicker === 'pickup' && pickupCoords) {
        const pickupReg = {
          latitude: pickupCoords.latitude,
          longitude: pickupCoords.longitude,
          latitudeDelta: 0.009,
          longitudeDelta: 0.009,
        };
        setPickerRegion(pickupReg);
        setPickerAddress(pickupAddress);
        setPickerPlaceId(pickupPlaceId);
        setLandmarkInput(pickupLandmark);
        setIsGeocoding(false);
        setTimeout(() => {
          mapRef.current?.animateToRegion(pickupReg, 500);
        }, 100);
      } else if (!activeLocationPicker && locationCoords) {
        const locReg = {
          latitude: locationCoords.latitude,
          longitude: locationCoords.longitude,
          latitudeDelta: 0.009,
          longitudeDelta: 0.009,
        };
        setPickerRegion(locReg);
        setPickerAddress(locationAddress);
        setPickerPlaceId(locationPlaceId);
        setLandmarkInput(locationLandmark);
        setIsGeocoding(false);
        setTimeout(() => {
          mapRef.current?.animateToRegion(locReg, 500);
        }, 100);
      } else {
        setPickerAddress('');
        setPickerPlaceId('');
        setLandmarkInput('');
        initLocationPicker();
      }
    }
  }, [showLocationPicker, activeLocationPicker]);

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
    if (activeLocationPicker === 'pickup') {
      setPickupCoords({ latitude: pickerRegion.latitude, longitude: pickerRegion.longitude });
      setPickupAddress(pickerAddress);
      setPickupPlaceId(pickerPlaceId);
      setPickupLandmark(landmarkInput);
      
      // Keep single location states updated for compatibility
      setLocationCoords({ latitude: pickerRegion.latitude, longitude: pickerRegion.longitude });
      setLocationAddress(pickerAddress);
      setLocationPlaceId(pickerPlaceId);
      setLocationLandmark(landmarkInput);
    } else if (activeLocationPicker === 'dropoff') {
      setDropoffCoords({ latitude: pickerRegion.latitude, longitude: pickerRegion.longitude });
      setDropoffAddress(pickerAddress);
      setDropoffPlaceId(pickerPlaceId);
      setDropoffLandmark(landmarkInput);
    } else {
      setLocationCoords({ latitude: pickerRegion.latitude, longitude: pickerRegion.longitude });
      setLocationAddress(pickerAddress);
      setLocationPlaceId(pickerPlaceId);
      setLocationLandmark(landmarkInput);
    }
    setShowLocationPicker(false);
    setActiveLocationPicker(null);
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
      setIsTargetProviderLocked(true);
      if (route.params?.categoryId) {
        const matched = categoriesList.find((c: any) => 
          (c.id && c.id.toLowerCase() === route.params.categoryId.toLowerCase()) || 
          (c.name && c.name.toLowerCase() === route.params.categoryId.toLowerCase())
        );
        if (matched) {
          setSelectedCategory(matched);
          navigation.setParams({
            targetProviderId: undefined,
            targetProviderName: undefined,
            targetProviderAvatarUrl: undefined,
            targetProviderRating: undefined,
            categoryId: undefined
          });
        } else if (isCategoriesLoaded) {
          // If categories resolved but no match, clear to prevent loop
          navigation.setParams({
            targetProviderId: undefined,
            targetProviderName: undefined,
            targetProviderAvatarUrl: undefined,
            targetProviderRating: undefined,
            categoryId: undefined
          });
        }
      } else {
        navigation.setParams({
          targetProviderId: undefined,
          targetProviderName: undefined,
          targetProviderAvatarUrl: undefined,
          targetProviderRating: undefined,
          categoryId: undefined
        });
      }
    }
  }, [route.params?.targetProviderId, categoriesList, isCategoriesLoaded]);

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
        if (catId) {
          const matched = categoriesList.find((c: any) => 
            c.id.toLowerCase() === catId.toLowerCase() || 
            c.name.toLowerCase() === catId.toLowerCase()
          );
          if (matched) {
            setSelectedCategory(matched);
            navigation.setParams({ selectedTargetProvider: undefined });
          } else if (isCategoriesLoaded) {
            navigation.setParams({ selectedTargetProvider: undefined });
          }
        } else {
          navigation.setParams({ selectedTargetProvider: undefined });
        }
      } else {
        navigation.setParams({ selectedTargetProvider: undefined });
      }
    }
  }, [route.params?.selectedTargetProvider, categoriesList, isCategoriesLoaded]);

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

    const isDelivery = selectedCategory?.requiresDualLocation;

    if (!locationType) {
      newErrors.location = "Please select a location type.";
    } else if (locationType !== 'remote') {
      if (isDelivery) {
        if (!pickupAddress || !pickupCoords) {
          newErrors.pickupLocation = "Please set a pickup location.";
        }
        if (!dropoffAddress || !dropoffCoords) {
          newErrors.dropoffLocation = "Please set a drop-off location.";
        }
      } else {
        if (!locationAddress && !locationCoords) {
          newErrors.location = "Please choose a location for your request.";
        }
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.category) scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      else if (newErrors.title) scrollViewRef.current?.scrollTo({ y: 120, animated: true });
      else if (newErrors.description) scrollViewRef.current?.scrollTo({ y: 240, animated: true });
      else if (newErrors.budget) scrollViewRef.current?.scrollTo({ y: 420, animated: true });
      else if (newErrors.location || newErrors.pickupLocation || newErrors.dropoffLocation) scrollViewRef.current?.scrollTo({ y: 620, animated: true });
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
        if (isDelivery) {
          if (pickupCoords) {
            formData.append('pickupLatitude', pickupCoords.latitude.toString());
            formData.append('pickupLongitude', pickupCoords.longitude.toString());
          }
          if (pickupAddress) {
            formData.append('pickupAddress', pickupAddress);
          }
          formData.append('pickupPlaceId', pickupPlaceId || '');
          formData.append('pickupLandmark', pickupLandmark || '');

          if (dropoffCoords) {
            formData.append('dropoffLatitude', dropoffCoords.latitude.toString());
            formData.append('dropoffLongitude', dropoffCoords.longitude.toString());
          }
          if (dropoffAddress) {
            formData.append('dropoffAddress', dropoffAddress);
          }
          formData.append('dropoffPlaceId', dropoffPlaceId || '');
          formData.append('dropoffLandmark', dropoffLandmark || '');
        } else {
          if (locationCoords) {
            formData.append('pickupLatitude', locationCoords.latitude.toString());
            formData.append('pickupLongitude', locationCoords.longitude.toString());
          }
          if (locationAddress) {
            formData.append('pickupAddress', locationAddress);
          }
          formData.append('pickupPlaceId', locationPlaceId || '');
          formData.append('pickupLandmark', locationLandmark || '');
        }
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
      
      if (route?.name === 'Search') {
        navigation.navigate('RequestDetails', { 
          requestId: response.id,
          showToastOnMount: "Request posted! We'll notify you when a provider responds."
        });

        // Refetch active requests
        refetchActiveRequests();

        // Reset all states for next use
        setSelectedCategory(null);
        setTitle('');
        setDescription('');
        setPhotos([]);
        setBasePrice('');
        setLocationType('on_campus');
        setLocationDetail('');
        setDeliveryMode('broadcast');
        setTargetProvider(null);
        setIsTargetProviderLocked(false);
        setLocationCoords(null);
        setLocationAddress('');
        setLocationPlaceId('');
        setLocationLandmark('');
        setLocationMethod('auto_gps');
        setErrors({});
        setBannerError(null);
      } else {
        // Navigate to RequestDetailsScreen replacing the modal in history stack
        navigation.replace('RequestDetails', { 
          requestId: response.id,
          showToastOnMount: "Request posted! We'll notify you when a provider responds."
        });
      }

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
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {navigation.canGoBack() && route?.name !== 'Search' ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Request</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar header */}
      <View style={[styles.tabBarContainer, { paddingBottom: 12 }]}>
        <View style={[styles.tabSegmentedControl, { backgroundColor: isDark ? colors.cardBackground : '#F1F5F9' }]}>
          <TouchableOpacity
            style={[
              styles.tabSegmentButton,
              activeTab === 'create' && [styles.tabSegmentActive, { backgroundColor: colors.cardBackground }]
            ]}
            onPress={() => setActiveTab('create')}
          >
            <Text style={[styles.tabSegmentText, { color: activeTab === 'create' ? colors.text : colors.textMuted }]}>
              Post Request
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabSegmentButton,
              activeTab === 'active' && [styles.tabSegmentActive, { backgroundColor: colors.cardBackground }]
            ]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabSegmentText, { color: activeTab === 'active' ? colors.text : colors.textMuted }]}>
              Incoming Bids
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'create' ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomTabSpacing + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
        {bannerError && (
          <View style={[styles.bannerError, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.bannerErrorText, { color: colors.error }]}>{bannerError}</Text>
          </View>
        )}

        {/* ── Category Selector ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Service Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categoriesList.map((cat) => {
              const isActive = selectedCategory?.id === cat.id;
              const isLocked = !!targetProvider && !isActive;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catCard,
                    { 
                      backgroundColor: isActive ? colors.primary : (isDark ? colors.inputBackground : '#F8FAFC'),
                      borderColor: isActive ? colors.primary : (isDark ? colors.border : '#E2E8F0'),
                      opacity: isLocked ? 0.5 : 1,
                    }
                  ]}
                  onPress={() => handleCategorySelect(cat)}
                  disabled={isSubmitting || !!targetProvider}
                >
                  <View style={[
                    styles.catIconWrap,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : (isDark ? colors.cardBackground : '#FFFFFF') }
                  ]}>
                    <Ionicons
                      name={cat.icon as any}
                      size={20}
                      color={isActive ? '#FFFFFF' : (isDark ? colors.primary : cat.iconColor)}
                    />
                  </View>
                  <Text style={[
                    styles.catLabel,
                    { color: isActive ? '#FFFFFF' : colors.text }
                  ]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {errors.category && <Text style={styles.fieldError}>{errors.category}</Text>}
        </View>

        {/* ── Request Details Card ── */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 16 }]}>Request Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Title</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. Need help with Calculus II assignment"
                placeholderTextColor={colors.placeholderText}
                maxLength={80}
                value={title}
                onChangeText={setTitle}
                editable={!isSubmitting}
              />
            </View>
            <View style={styles.counterRow}>
              {errors.title ? <Text style={styles.fieldError}>{errors.title}</Text> : <View />}
              {title.length >= 60 && (
                <Text style={[styles.counterText, { color: title.length === 80 ? colors.error : colors.textMuted }]}>
                  {title.length}/80
                </Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Description</Text>
            <View style={[styles.textAreaWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="Include deadlines, requirements, materials needed..."
                placeholderTextColor={colors.placeholderText}
                multiline={true}
                numberOfLines={5}
                value={description}
                onChangeText={setDescription}
                editable={!isSubmitting}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.counterRow}>
              {errors.description ? <Text style={styles.fieldError}>{errors.description}</Text> : <View />}
            </View>
          </View>

          {/* ── Photo Attachments ── */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Photos</Text>
              <Text style={[styles.subLabelText, { color: colors.textMuted }]}> (up to 3)</Text>
            </View>
            
            <View style={styles.photoContainer}>
              {photos.length === 0 ? (
                <TouchableOpacity 
                  style={[styles.photoUploadArea, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} 
                  onPress={handlePickPhoto}
                  disabled={isSubmitting}
                >
                  <View style={[styles.photoUploadIconWrap, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="camera" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.photoUploadText, { color: colors.text }]}>Tap to add photos</Text>
                  <Text style={[styles.photoUploadSub, { color: colors.textMuted }]}>JPG, PNG up to 5MB</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoRow}>
                  {photos.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.photoSlot, { borderColor: colors.border }]}
                      onPress={() => setPreviewPhotoIndex(index)}
                      disabled={isSubmitting}
                    >
                      <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                      <TouchableOpacity
                        style={styles.photoDeleteBtn}
                        onPress={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                        disabled={isSubmitting}
                      >
                        <Ionicons name="close" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                  {photos.length < 3 && (
                    <TouchableOpacity
                      style={[styles.photoSlot, styles.photoPlaceholder, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                      onPress={handlePickPhoto}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="add" size={28} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Budget & Location Card ── */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Base Price (₵)</Text>
            <View style={[styles.budgetInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₵</Text>
              <TextInput
                style={[styles.budgetInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.placeholderText}
                keyboardType="numeric"
                value={basePrice}
                onChangeText={setBasePrice}
                editable={!isSubmitting}
              />
            </View>
            
            {basePrice && !isNaN(parseFloat(basePrice)) && (
              <Text style={[styles.budgetGuideText, { color: colors.primary }]}>
                Providers can bid between ₵{(parseFloat(basePrice) * 0.5).toFixed(0)} and ₵{(parseFloat(basePrice) * 2).toFixed(0)}
              </Text>
            )}
            {errors.budget && <Text style={styles.fieldError}>{errors.budget}</Text>}
            
            <View style={styles.suggestionsContainer}>
              {BUDGET_SUGGESTIONS.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.suggestionChip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  onPress={() => handleSuggestBudget(item.value)}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.inputGroup}>
            {selectedCategory?.requiresDualLocation ? (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Pickup Location</Text>
                  {errors.pickupLocation && <Text style={styles.fieldError}>{errors.pickupLocation}</Text>}
                  {pickupAddress ? (
                    <View style={[styles.locationSelectedCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <View style={styles.locationIconWrap}>
                        <Ionicons name="location" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.locationAddressText, { color: colors.text }]} numberOfLines={2}>
                          {pickupAddress}
                        </Text>
                        {pickupLandmark ? (
                          <Text style={[styles.locationLandmarkText, { color: colors.textMuted }]} numberOfLines={1}>
                            {pickupLandmark}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => setActiveLocationPicker('pickup')} style={styles.locationEditBtn}>
                        <Ionicons name="pencil" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.locationEmptyCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                      onPress={() => setActiveLocationPicker('pickup')}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="map-outline" size={22} color={colors.primary} />
                      <Text style={[styles.locationEmptyText, { color: colors.primary }]}>Set pickup location</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Drop-off Location</Text>
                  {errors.dropoffLocation && <Text style={styles.fieldError}>{errors.dropoffLocation}</Text>}
                  {dropoffAddress ? (
                    <View style={[styles.locationSelectedCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <View style={styles.locationIconWrap}>
                        <Ionicons name="flag" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.locationAddressText, { color: colors.text }]} numberOfLines={2}>
                          {dropoffAddress}
                        </Text>
                        {dropoffLandmark ? (
                          <Text style={[styles.locationLandmarkText, { color: colors.textMuted }]} numberOfLines={1}>
                            {dropoffLandmark}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => setActiveLocationPicker('dropoff')} style={styles.locationEditBtn}>
                        <Ionicons name="pencil" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.locationEmptyCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                      onPress={() => setActiveLocationPicker('dropoff')}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="map-outline" size={22} color={colors.primary} />
                      <Text style={[styles.locationEmptyText, { color: colors.primary }]}>Set drop-off location</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Location</Text>
                {errors.location && <Text style={styles.fieldError}>{errors.location}</Text>}

                {locationAddress ? (
                  <View style={[styles.locationSelectedCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <View style={styles.locationIconWrap}>
                      <Ionicons name="location" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.locationAddressText, { color: colors.text }]} numberOfLines={2}>
                        {locationAddress}
                      </Text>
                      {locationLandmark ? (
                        <Text style={[styles.locationLandmarkText, { color: colors.textMuted }]} numberOfLines={1}>
                          {locationLandmark}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => setShowLocationPicker(true)} style={styles.locationEditBtn}>
                      <Ionicons name="pencil" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.locationEmptyCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => setShowLocationPicker(true)}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="map-outline" size={22} color={colors.primary} />
                    <Text style={[styles.locationEmptyText, { color: colors.primary }]}>Set meeting location</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border, marginTop: 12 }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Room number or specific details (Optional)"
                placeholderTextColor={colors.placeholderText}
                value={locationDetail}
                onChangeText={setLocationDetail}
                editable={!isSubmitting}
              />
            </View>
          </View>
        </View>

        {/* ── Audience / Visibility ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 12 }]}>Visibility</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.inputBackground, borderColor: colors.border, opacity: isTargetProviderLocked ? 0.75 : 1 }]}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                deliveryMode === 'broadcast' && [styles.segmentBtnActive, { backgroundColor: colors.cardBackground, shadowColor: isDark ? '#000' : '#000' }],
                isTargetProviderLocked && { opacity: 0.5 }
              ]}
              onPress={() => {
                if (isTargetProviderLocked) return;
                setDeliveryMode('broadcast');
                setTargetProvider(null);
              }}
              disabled={isSubmitting || isTargetProviderLocked}
            >
              <Text style={[
                styles.segmentText,
                { color: deliveryMode === 'broadcast' ? colors.text : colors.textMuted }
              ]}>All Providers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                deliveryMode === 'targeted' && [styles.segmentBtnActive, { backgroundColor: colors.cardBackground, shadowColor: isDark ? '#000' : '#000' }]
              ]}
              onPress={() => {
                if (isTargetProviderLocked) return;
                setDeliveryMode('targeted');
                if (!targetProvider) handleOpenProviderPicker();
              }}
              disabled={isSubmitting || isTargetProviderLocked}
            >
              <Text style={[
                styles.segmentText,
                { color: deliveryMode === 'targeted' ? colors.text : colors.textMuted }
              ]}>Direct Hire</Text>
            </TouchableOpacity>
          </View>

          {deliveryMode === 'broadcast' && (
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              Your request will be visible to all {selectedCategory?.name || 'matching'} providers. The first to accept will be matched with you.
            </Text>
          )}

          {deliveryMode === 'targeted' && (
            <View style={{ marginTop: 16 }}>
              {targetProvider ? (
                <View style={[styles.targetProviderCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  {targetProvider.avatarUrl ? (
                    <Image source={{ uri: targetProvider.avatarUrl }} style={styles.targetProviderAvatar} />
                  ) : (
                    <View style={[styles.targetProviderAvatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons name="person" size={24} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.targetProviderName, { color: colors.text }]}>{targetProvider.name}</Text>
                    <View style={styles.targetProviderRating}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={[styles.targetProviderRatingText, { color: colors.text }]}>{targetProvider.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                  {!isTargetProviderLocked && (
                    <TouchableOpacity
                      onPress={() => { setTargetProvider(null); setDeliveryMode('broadcast'); }}
                      style={styles.targetProviderRemove}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.chooseProviderBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  onPress={handleOpenProviderPicker}
                  disabled={isSubmitting}
                >
                  <Ionicons name="search" size={20} color={colors.primary} />
                  <Text style={[styles.chooseProviderText, { color: colors.primary }]}>Search for a Provider</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Submit Button (inside scroll) ── */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, marginHorizontal: 20, marginTop: 8 }]}
          onPress={handlePostRequest}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Post Request</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  ) : (
    <View style={{ flex: 1 }}>
      {loadingActiveRequests && !refreshingActiveRequests ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeRequestsData}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestBids}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomTabSpacing }}
          refreshControl={
            <RefreshControl
              refreshing={refreshingActiveRequests}
              onRefresh={handleRefreshActiveRequests}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(255, 120, 70, 0.1)' }]}>
                <Ionicons name="document-text-outline" size={56} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No incoming bids yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Bids placed by providers on your active requests will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  )}

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
        visible={showLocationPicker || activeLocationPicker !== null}
        animationType="slide"
        onRequestClose={() => { setShowLocationPicker(false); setActiveLocationPicker(null); }}
      >
        <View style={[styles.pickerModalContainer, { backgroundColor: colors.background }]}>
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
                <View style={styles.pinGlow} />
                <Ionicons name="location" size={48} color="#E53935" />
              </View>
              <View style={styles.centerPinDot} />
            </View>
          </View>

          {/* Floating Header search bar */}
          <View style={[styles.floatingPickerHeader, { paddingTop: Math.max(insets.top, 20) }]} pointerEvents="box-none">
            <View style={[styles.pickerSearchContainer, { backgroundColor: colors.cardBackground }]}>
              <TouchableOpacity
                onPress={() => { setShowLocationPicker(false); setActiveLocationPicker(null); }}
                style={styles.pickerCloseBtn}
                accessibilityLabel="Close location picker"
              >
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              
              <TextInput
                style={[styles.pickerSearchInput, { color: colors.text }]}
                placeholder="Search places or landmarks in Kumasi..."
                placeholderTextColor={colors.placeholderText}
                value={searchInput}
                onChangeText={handleSearchChange}
                clearButtonMode="while-editing"
              />
              {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Autocomplete suggestions dropdown overlay */}
            {autocompleteResults.length > 0 && (
              <View style={[styles.suggestionsDropdown, { backgroundColor: colors.cardBackground }]}>
                <FlatList
                  data={autocompleteResults}
                  keyExtractor={(item: any) => item.placeId}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }: any) => (
                    <TouchableOpacity
                      style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                      onPress={() => handleSelectPlace(item)}
                    >
                      <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginRight: 12 }} />
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
                <Ionicons name="warning" size={18} color={colors.warning} style={{ marginRight: 8 }} />
                <Text style={[styles.gpsWarningText, { color: colors.warning }]}>{gpsWarning}</Text>
              </View>
            )}
          </View>

          {/* Bottom Sheet Card */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.pickerBottomSheet, { backgroundColor: colors.cardBackground }]}
          >
            <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
              {activeLocationPicker === 'pickup' ? 'Select Pickup Location' : activeLocationPicker === 'dropoff' ? 'Select Drop-off Location' : 'Address Location'}
            </Text>
            <View style={[styles.addressTextContainer, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
              <View style={styles.addressLeftAccent} />
              <Ionicons name="location" size={20} color={colors.primary} style={{ marginRight: 12 }} />
              {isGeocoding ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.addressText, { color: colors.textMuted }]}>Resolving address...</Text>
                </View>
              ) : (
                <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>
                  {pickerAddress || 'Select a point on the map'}
                </Text>
              )}
            </View>

            <Text style={[styles.bottomSheetSubtitle, { color: colors.text }]}>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    zIndex: 10,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  
  bannerError: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 24,
  },
  bannerErrorText: { flex: 1, fontSize: 13, fontWeight: '600' },

  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 12, letterSpacing: -0.2 },
  
  categoryScroll: { marginHorizontal: -20 },
  categoryScrollContent: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  catCard: {
    width: 110,
    height: 110,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  catIconWrap: {
    width: 46, height: 46, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  subLabelText: { fontSize: 13 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  
  inputWrapper: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: { flex: 1, fontSize: 15 },
  
  textAreaWrapper: {
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  textArea: { flex: 1, fontSize: 15, textAlignVertical: 'top' },
  
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 },
  counterText: { fontSize: 12, fontWeight: '500' },
  fieldError: { color: '#E53935', fontSize: 13, fontWeight: '600', marginTop: 6, paddingHorizontal: 4 },

  photoContainer: { marginTop: 4 },
  photoUploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoUploadIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  photoUploadText: { fontSize: 15, fontWeight: '700' },
  photoUploadSub: { fontSize: 13 },
  
  photoRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  photoSlot: {
    width: (Dimensions.get('window').width - 80 - 24) / 3,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumb: { width: '100%', height: '100%' },
  photoPlaceholder: {
    borderStyle: 'dashed', borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  budgetInputWrapper: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  currencySymbol: { fontSize: 18, fontWeight: '600', marginRight: 8 },
  budgetInput: { flex: 1, fontSize: 18, fontWeight: '700' },
  budgetGuideText: { fontSize: 13, marginTop: 8, fontWeight: '500', paddingHorizontal: 4 },
  
  suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  suggestionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  suggestionText: { fontSize: 14, fontWeight: '600' },

  divider: { height: 1, marginVertical: 20 },

  locationSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  locationIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(21, 101, 192, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locationAddressText: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  locationLandmarkText: { fontSize: 12 },
  locationEditBtn: { padding: 8 },
  
  locationEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  locationEmptyText: { fontSize: 15, fontWeight: '700' },

  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentText: { fontSize: 14, fontWeight: '700' },
  helperText: { fontSize: 13, lineHeight: 18, marginTop: 12, paddingHorizontal: 4 },

  targetProviderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  targetProviderAvatar: { width: 44, height: 44, borderRadius: 22 },
  targetProviderAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  targetProviderName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  targetProviderRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  targetProviderRatingText: { fontSize: 13, fontWeight: '600' },
  targetProviderRemove: { padding: 4 },
  
  chooseProviderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  chooseProviderText: { fontSize: 15, fontWeight: '700' },

  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 20,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Image Preview Modal
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  modalCloseBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  modalImage: { width: '90%', height: '80%' },

  // Location Picker styles
  pickerModalContainer: { flex: 1 },
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
    transform: [{ translateY: -24 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 57, 53, 0.2)',
    top: 8,
  },
  centerPinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    transform: [{ scaleX: 2.5 }],
  },
  floatingPickerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  pickerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 100,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  pickerCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    paddingRight: 16,
    fontWeight: '500',
  },
  suggestionsDropdown: {
    marginTop: 12,
    borderRadius: 24,
    maxHeight: 280,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  suggestionItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  gpsWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  gpsWarningText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  pickerBottomSheet: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  addressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  addressLeftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#3b82f6',
  },
  addressText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    flex: 1,
  },
  bottomSheetSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  pickerLandmarkInput: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 24,
  },
  pickerConfirmBtn: {
    height: 56,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  pickerConfirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  tabSegmentedControl: {
    flexDirection: 'row',
    borderRadius: 100,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tabSegmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  tabSegmentActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabSegmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  bidsGroupCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  bidsGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  bidsGroupIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bidsGroupTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bidsCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  bidsCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  providerBidRow: {
    paddingVertical: 14,
  },
  providerRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  providerNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bidPriceText: {
    fontSize: 15,
    fontWeight: '800',
  },
  bidMessageText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
    paddingLeft: 42,
  },
  bidActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingLeft: 42,
  },
  bidDeclineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bidDeclineText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bidAcceptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  bidAcceptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  bidStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 42,
  },
});
