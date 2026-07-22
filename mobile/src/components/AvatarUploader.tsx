import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { uploadAvatar, removeAvatar } from '../services/userService';
import { BASE_URL } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../styles/ThemeContext';
import StatusDialog from './StatusDialog';

interface AvatarUploaderProps {
  currentAvatarUrl: string | null;
  userId: string;
  displayName: string;
  onUploadSuccess: (newUrl: string | null) => void;
  onToast: (toast: { message: string; type: 'success' | 'error' }) => void;
}

export default function AvatarUploader({
  currentAvatarUrl,
  userId,
  displayName,
  onUploadSuccess,
  onToast,
}: AvatarUploaderProps) {
  const { colors } = useTheme();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const navigation = useNavigation<any>();
  const logout = useAuthStore((state) => state.logout);

  const [sessionExpiredDialogVisible, setSessionExpiredDialogVisible] = useState(false);
  const [removeDialogVisible, setRemoveDialogVisible] = useState(false);

  const getFullImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('file://') ||
      url.startsWith('content://') ||
      url.startsWith('ph://') ||
      url.startsWith('data:')
    ) {
      return url;
    }
    return `${BASE_URL}${url}`;
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            "Permission Required",
            "Go to Settings > CampusServ and enable Camera access."
          );
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            "Permission Denied",
            "Please allow camera/photo access in your device settings to update your profile picture."
          );
          return;
        }
      }

      const pickerConfig: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(pickerConfig)
        : await ImagePicker.launchImageLibraryAsync(pickerConfig);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;

      const fileSize = asset.fileSize;
      if (fileSize !== undefined && fileSize > 10000000) {
        onToast({ message: "Image must be smaller than 10 MB.", type: "error" });
        return;
      }

      const { width, height } = asset;
      if (width && height && (width < 50 || height < 50)) {
        onToast({ message: "Image is too small. Please choose a higher resolution photo.", type: "error" });
        return;
      }

      // Optimistic UI update
      setLocalUri(uri);
      setIsUploading(true);

      const mimeType = asset.mimeType || 'image/jpeg';
      const fileExt = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
      const filename = `avatar_${userId}_${Date.now()}.${fileExt}`;

      const formData = new FormData();
      const fileObj = {
        uri: uri,
        type: mimeType,
        name: filename,
      } as any;

      formData.append('avatar', fileObj);
      formData.append('file', fileObj);

      try {
        const response = await uploadAvatar(userId, formData);
        onUploadSuccess(response.avatarUrl);
        onToast({ message: "Profile picture updated.", type: "success" });
      } catch (err: any) {
        // Revert UI on failure
        setLocalUri(null);
        
        if (err.status === 413) {
          onToast({ message: "Please choose an image under 10 MB.", type: "error" });
        } else if (err.status === 415) {
          onToast({ message: "Please use a valid image format.", type: "error" });
        } else if (err.status === 401) {
          setSessionExpiredDialogVisible(true);
        } else {
          onToast({ message: err.message || "Something went wrong. Please check connection and try again.", type: "error" });
        }
      } finally {
        setIsUploading(false);
      }

    } catch (e) {
      onToast({ message: "An unexpected error occurred during selection.", type: "error" });
    }
  };

  const handleRemovePhoto = async () => {
    setRemoveDialogVisible(true);
  };

  const confirmRemovePhoto = async () => {
    setRemoveDialogVisible(false);
    setIsUploading(true);
    try {
      await removeAvatar(userId);
      onUploadSuccess(null);
      setLocalUri(null);
      onToast({ message: "Profile picture removed.", type: "success" });
    } catch (err) {
      onToast({ message: "Could not remove photo. Please try again.", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePress = () => {
    if (isUploading) return;

    const options = [
      { text: "Take Photo", onPress: () => handlePickImage(true) },
      { text: "Choose from Library", onPress: () => handlePickImage(false) },
    ];

    if (currentAvatarUrl || localUri) {
      options.push({ text: "Remove Photo", onPress: handleRemovePhoto });
    }

    options.push({ text: "Cancel", style: "cancel" } as any);

    Alert.alert("Profile Picture", "Update your profile picture", options);
  };

  const imageUri = getFullImageUrl(localUri ?? currentAvatarUrl);
  const initials = getInitials(displayName);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={isUploading}
      accessibilityLabel="Change profile picture"
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      <View style={[styles.avatarContainer, { borderColor: colors.cardBackground }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.initialsContainer, { backgroundColor: colors.border }]}>
            <Text style={[styles.initialsText, { color: colors.text }]}>{initials}</Text>
          </View>
        )}

        {isUploading && (
          <View
            style={styles.uploadingOverlay}
            accessibilityLabel="Uploading profile picture"
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
      </View>

      {!isUploading && (
        <View
          style={[styles.editButton, { backgroundColor: colors.accent, borderColor: colors.cardBackground }]}
          accessibilityLabel="Edit profile picture"
          accessibilityRole="button"
        >
          <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
        </View>
      )}

      <StatusDialog
        visible={sessionExpiredDialogVisible}
        status="warning"
        title="Session Expired"
        description="Please sign in again."
        confirmLabel="OK"
        onConfirm={async () => {
          setSessionExpiredDialogVisible(false);
          await logout();
          navigation.navigate('Auth');
        }}
        onClose={() => setSessionExpiredDialogVisible(false)}
      />

      <StatusDialog
        visible={removeDialogVisible}
        status="error"
        title="Remove Photo"
        description="Are you sure you want to remove your profile picture?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive={true}
        onConfirm={confirmRemovePhoto}
        onCancel={() => setRemoveDialogVisible(false)}
        onClose={() => setRemoveDialogVisible(false)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
    width: 110,
    height: 110,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 2,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  initialsContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 38,
    fontWeight: '800',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
