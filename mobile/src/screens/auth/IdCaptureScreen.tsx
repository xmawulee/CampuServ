import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tunable constants for image compression.
// TODO: Confirm max dimension and quality targets with backend upload limits.
const MAX_DIMENSION_PX = 1600;
const JPEG_QUALITY = 0.8;

type CaptureState = 'instructions' | 'preview' | 'uploading';
type PermissionState = 'undetermined' | 'denied' | 'blocked' | 'granted';

export default function IdCaptureScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const providerRegistrationData = route.params?.providerRegistrationData;
  const { updateUser, user, logout } = useAuthStore();

  const [captureState, setCaptureState] = useState<CaptureState>('instructions');
  const [permissionState, setPermissionState] = useState<PermissionState>('undetermined');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? You can resume your application later.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: () => logout() 
        }
      ]
    );
  };

  // Check camera permission on mount — request proactively, not lazily on tap.
  useEffect(() => {
    (async () => {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
      if (status === 'granted') {
        setPermissionState('granted');
      } else if (!canAskAgain) {
        setPermissionState('blocked'); // Permanently denied — show settings deep-link
      } else {
        setPermissionState('denied');
      }
    })();
  }, []);

  const openSettings = () => {
    Linking.openSettings();
  };

  const launchCamera = useCallback(async () => {
    // Re-check permission in case it changed since mount
    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      if (!canAskAgain) {
        setPermissionState('blocked');
      } else {
        setPermissionState('denied');
      }
      return;
    }
    setPermissionState('granted');

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      // No allowsEditing — we show our own preview with retake button
      quality: 1, // Capture at full quality; we compress below
    });

    if (!result.canceled && result.assets.length > 0) {
      const rawUri = result.assets[0].uri;

      // Compress/resize using expo-image-manipulator
      const manipulated = await ImageManipulator.manipulateAsync(
        rawUri,
        [{ resize: { width: MAX_DIMENSION_PX } }],
        { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
      );

      setImageUri(manipulated.uri);
      setUploadError(null);
      setCaptureState('preview');
    }
  }, []);

  const handleRetake = () => {
    // Discard the current image — do not keep a reference
    setImageUri(null);
    setUploadError(null);
    setUploadProgress(0);
    setCaptureState('instructions');
  };

  const handleUpload = async () => {
    if (!imageUri) return;

    // Defensive: confirm file is an image (camera output should always be,
    // but guard anyway)
    if (!imageUri.match(/\.(jpg|jpeg|png|webp)$/i) && !imageUri.startsWith('file://')) {
      Alert.alert('Invalid File', 'The captured file does not appear to be a valid image. Please retake the photo.');
      return;
    }

    setCaptureState('uploading');
    setUploadError(null);
    setUploadProgress(0);

    let progressInterval: NodeJS.Timeout | undefined;

    try {
      const providerRegistrationData = route?.params?.providerRegistrationData;
      if (providerRegistrationData) {
        // Legacy: pre-auth signup flow (no longer used after ProviderSignUp registers first)
        navigation.navigate('CategorySelect', {
          providerRegistrationData,
          imageUri,
        });
        return;
      }

      // Authenticated flow: provider is already logged in, upload ID then go to CategorySelect
      const formData = new FormData();
      const uriParts = imageUri.split('/');
      const fileName = uriParts[uriParts.length - 1] || 'student_id.jpg';

      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: 'image/jpeg',
      } as unknown as Blob);

      const token = useAuthStore.getState().accessToken;
      
      // Since fetch doesn't support upload progress natively like axios does,
      // we mock it with a fake progress interval.
      let mockProgress = 0;
      progressInterval = setInterval(() => {
        mockProgress += 15;
        if (mockProgress > 90) mockProgress = 90;
        setUploadProgress(mockProgress);
      }, 500);

      const response = await fetch(`${api.defaults.baseURL}/auth/upload-id`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: formData,
      });

      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      setUploadProgress(100);

      setImageUri(null);

      const isUpgrade = route.params?.isUpgrade || false;
      await updateUser({ studentIdPhotoUrl: 'uploaded' });
      navigation.navigate('CategorySelect', { isUpgrade });
    } catch (error: unknown) {
      clearInterval(progressInterval);
      // Keep the captured image so the user can retry without re-capturing
      let message = 'Upload failed. Please check your connection and try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosErr = error as { response?: { data?: unknown } };
        if (typeof axiosErr.response?.data === 'string') {
          message = axiosErr.response.data;
        }
      }
      setUploadError(message);
      setCaptureState('preview'); // Return to preview so Retry is visible
    }
  };

  // ── Permission Denied States ──────────────────────────────────────────────
  if (permissionState === 'blocked') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centeredContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="camera-outline" size={40} color={colors.error} />
          </View>
          <Text style={[styles.permTitle, { color: colors.text }]}>Camera Access Blocked</Text>
          <Text style={[styles.permSubtitle, { color: colors.textMuted }]}>
            Camera access is required to take a photo of your Student ID for verification. You have permanently denied camera access — please enable it in your device settings.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={openSettings}
          >
            <Ionicons name="settings-outline" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Open Device Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (permissionState === 'denied') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centeredContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="camera-outline" size={40} color={colors.warning} />
          </View>
          <Text style={[styles.permTitle, { color: colors.text }]}>Camera Access Required</Text>
          <Text style={[styles.permSubtitle, { color: colors.textMuted }]}>
            CampusServ needs camera access to capture a photo of your Student ID card. This ensures authenticity of your application.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={async () => {
              const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
              if (status === 'granted') {
                setPermissionState('granted');
              } else if (!canAskAgain) {
                setPermissionState('blocked');
              }
            }}
          >
            <Ionicons name="camera-outline" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Instructions State ────────────────────────────────────────────────────
  if (captureState === 'instructions') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
            accessibilityLabel="Sign Out"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.text} />
            <Text style={[styles.backButtonText, { color: colors.text }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(124, 58, 237, 0.12)', alignSelf: 'center' }]}>
            <Ionicons name="card-outline" size={44} color="#7C3AED" />
          </View>

          <Text style={[styles.stepIndicator, { color: colors.primary }]}>Step 1 of 4</Text>
          <Text style={[styles.heading, { color: colors.text }]}>Student ID Verification</Text>
          <Text style={[styles.subheading, { color: colors.textMuted }]}>
            Take a clear photo of your KNUST Student ID card. This helps us verify your identity as a KNUST student.
          </Text>

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>For best results:</Text>
            {[
              'Place the card on a flat, contrasting surface',
              'Ensure the card is well-lit — avoid shadows',
              'All four corners of the card must be visible',
              'Text must be clearly legible in the photo',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={[styles.tipText, { color: colors.textMuted }]}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Camera only — no gallery option */}
          <TouchableOpacity
            style={[styles.cameraBtn, { backgroundColor: '#7C3AED' }]}
            onPress={launchCamera}
            disabled={permissionState === 'undetermined'}
          >
            <Ionicons name="camera" size={22} color="#FFF" />
            <Text style={styles.cameraBtnText}>Open Camera</Text>
          </TouchableOpacity>

          <Text style={[styles.cameraNote, { color: colors.textMuted }]}>
            Only live camera capture is accepted — gallery uploads are not permitted for security reasons.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Preview State ─────────────────────────────────────────────────────────
  if (captureState === 'preview') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.heading, { color: colors.text }]}>Review Your Photo</Text>
          <Text style={[styles.subheading, { color: colors.textMuted }]}>
            Check that all four corners are visible and all text is clearly legible before submitting.
          </Text>

          {/* Preview image */}
          {imageUri && (
            <View style={[styles.previewContainer, { borderColor: colors.border }]}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            </View>
          )}

          {/* Upload error */}
          {uploadError && (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{uploadError}</Text>
            </View>
          )}

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.retakeBtn, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              onPress={handleRetake}
            >
              <Ionicons name="camera-outline" size={18} color={colors.text} />
              <Text style={[styles.retakeBtnText, { color: colors.text }]}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.usePhotoBtn, { backgroundColor: '#7C3AED' }]}
              onPress={handleUpload}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.usePhotoBtnText}>
                {uploadError ? 'Retry Upload' : 'Use This Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Uploading State ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.centeredContent}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(124, 58, 237, 0.12)' }]}>
          <Ionicons name="cloud-upload-outline" size={40} color="#7C3AED" />
        </View>
        <Text style={[styles.heading, { color: colors.text, textAlign: 'center' }]}>Uploading...</Text>
        <Text style={[styles.subheading, { color: colors.textMuted, textAlign: 'center' }]}>
          Please wait while your Student ID is being uploaded.
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{ height: '100%', borderRadius: 4, width: `${uploadProgress}%`, backgroundColor: '#7C3AED' }}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textMuted }]}>{uploadProgress}%</Text>

        <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 16 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48, alignItems: 'center' },
  centeredContent: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 88, height: 88, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  heading: { fontSize: 26, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  stepIndicator: { fontSize: 13, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 4 },
  subheading: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 16 },
  permTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  permSubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 32, paddingHorizontal: 8 },
  tipsCard: {
    width: '100%', borderRadius: 18, borderWidth: 1,
    padding: 20, marginBottom: 28, gap: 12,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 18 },
  cameraBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', height: 56, borderRadius: 16, justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  cameraBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cameraNote: { fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18, paddingHorizontal: 16 },
  previewContainer: {
    width: '100%', aspectRatio: 1.5,
    borderRadius: 16, overflow: 'hidden', borderWidth: 1,
    marginBottom: 20, backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  previewImage: { width: '100%', height: '100%' },
  headerBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, width: '100%',
  },
  errorBannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
  previewActions: { flexDirection: 'row', gap: 12, width: '100%' },
  retakeBtn: {
    flex: 1, height: 52, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  retakeBtnText: { fontSize: 15, fontWeight: '700' },
  usePhotoBtn: {
    flex: 2, height: 52, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  usePhotoBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 56, paddingHorizontal: 24, borderRadius: 16, justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  progressTrack: {
    width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 24,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '600', marginTop: 8 },
});
