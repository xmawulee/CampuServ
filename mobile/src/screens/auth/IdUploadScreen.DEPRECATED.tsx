import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';

export default function IdUploadScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to upload your Student ID.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your camera to take a photo of your Student ID.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!imageUri) {
      showToast({ status: 'error', title: 'Error', subtitle: 'Please select or capture a photo first.' });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      const uriParts = imageUri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      const fileType = fileName.split('.').pop();

      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
      } as any);

      const response = await api.post('/auth/upload-id', formData);
      console.log('Upload success', response.data);
      // Update user state locally
      useAuthStore.getState().updateUser({ studentIdPhotoUrl: response.data.fileUrl, isVerified: false, verificationStatus: 'PENDING_REVIEW' });

      setSuccessDialogVisible(true);
    } catch (err: any) {
      console.warn('Upload error', err);
      showToast({ status: 'error', title: 'Upload Failed', subtitle: err.response?.data || 'Failed to upload your student ID. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Student ID Verification</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        To keep CampusServ safe, please upload a photo of your KNUST Student ID card.
      </Text>

      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={[styles.imageContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={[styles.placeholderText, { color: colors.textMuted }]}>No Image Selected</Text>
            </View>
          )}
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            onPress={takePhoto}
          >
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
            onPress={pickImage}
          >
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Choose Gallery</Text>
          </TouchableOpacity>
        </View>

        {imageUri ? (
          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: colors.primary }, uploading && styles.disabledButton]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>Submit for Verification</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity style={styles.skipButton} onPress={() => {}}>
        <Text style={[styles.skipText, { color: colors.textMuted }]}>Upload Later</Text>
      </TouchableOpacity>

      <StatusDialog
        visible={successDialogVisible}
        status="success"
        title="Upload Success"
        description="Your Student ID has been uploaded successfully."
        confirmLabel="Proceed"
        onConfirm={() => {
          setSuccessDialogVisible(false);
          navigation.navigate('PendingReview');
        }}
        onClose={() => setSuccessDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 30 },
  card: {
    borderRadius: 24, padding: 20, borderWidth: 1, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4,
  },
  imageContainer: {
    width: '100%', aspectRatio: 1.5, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, marginBottom: 20,
  },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 14, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionButton: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionButtonText: { fontSize: 13, fontWeight: '600' },
  uploadButton: {
    borderRadius: 14, height: 52, width: '100%', alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3,
  },
  disabledButton: { opacity: 0.6 },
  uploadButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  skipButton: { marginTop: 24, alignItems: 'center' },
  skipText: { fontSize: 14, fontWeight: '700' },
});
