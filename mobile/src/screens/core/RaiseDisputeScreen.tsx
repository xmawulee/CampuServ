import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';

export const RaiseDisputeScreen = () => {
    const [reason, setReason] = useState('');
    const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const navigation = useNavigation();
    const route = useRoute();
    const { jobId } = route.params as { jobId: string };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setEvidenceUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!reason.trim()) {
            Alert.alert('Error', 'Please provide a reason for the dispute');
            return;
        }

        setIsSubmitting(true);
        try {
            const disputeRes = await api.post(`/disputes/${jobId}`, { reason });
            const dispute = disputeRes.data;
            
            // If evidence was provided, try to add it (in a real app, upload to S3 first)
            if (evidenceUri) {
                try {
                    await api.post(`/disputes/${dispute.id}/evidence`, { 
                        fileUrl: evidenceUri, 
                        description: "Initial evidence" 
                    });
                } catch (e) {
                    console.log("Failed to add evidence", e);
                }
            }

            Alert.alert('Dispute Raised', 'Your dispute has been sent to our support team.');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data || error.message || 'Failed to raise dispute');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Raise a Dispute</Text>
            
            <Text style={styles.label}>Reason for Dispute</Text>
            <TextInput
                style={styles.input}
                placeholder="Describe the issue in detail..."
                placeholderTextColor="#888"
                multiline
                numberOfLines={6}
                value={reason}
                onChangeText={setReason}
            />

            <Text style={styles.label}>Upload Evidence (Optional)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color="#fff" />
                <Text style={styles.uploadButtonText}>Select Image</Text>
            </TouchableOpacity>

            {evidenceUri && (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: evidenceUri }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => setEvidenceUri(null)}>
                        <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            )}
            
            <TouchableOpacity 
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
            >
                <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 20,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        color: '#ccc',
        fontSize: 16,
        marginBottom: 10,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#1E1E1E',
        color: '#fff',
        borderRadius: 8,
        padding: 15,
        textAlignVertical: 'top',
        minHeight: 150,
        marginBottom: 20,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: 15,
        justifyContent: 'center',
        marginBottom: 20,
    },
    uploadButtonText: {
        color: '#fff',
        marginLeft: 10,
        fontSize: 16,
    },
    imagePreviewContainer: {
        position: 'relative',
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    imagePreview: {
        width: 150,
        height: 150,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#121212',
        borderRadius: 12,
    },
    submitButton: {
        backgroundColor: '#E53935',
        borderRadius: 8,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 40,
    },
    submitButtonDisabled: {
        backgroundColor: '#333',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
